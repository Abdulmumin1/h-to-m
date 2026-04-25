const DEFAULT_OPTIONS = {
  headingStyle: "atx",
  bullet: "-",
  codeBlockFence: "```",
  preserveImages: true,
};

const TAG_A = 130;
const TAG_ARTICLE = 3002618027;
const TAG_B = 131;
const TAG_BLOCKQUOTE = 491911139;
const TAG_BR = 5526;
const TAG_CODE = 8425727;
const TAG_DEL = 220152;
const TAG_DIV = 220294;
const TAG_EM = 5620;
const TAG_FOOTER = 3286439317;
const TAG_H1 = 5659;
const TAG_H6 = 5664;
const TAG_HEADER = 3352330351;
const TAG_HR = 5724;
const TAG_I = 138;
const TAG_IMG = 225856;
const TAG_LI = 5847;
const TAG_MAIN = 8770025;
const TAG_NAV = 230920;
const TAG_NOSCRIPT = 2620285786;
const TAG_OL = 5949;
const TAG_P = 145;
const TAG_PRE = 233642;
const TAG_S = 148;
const TAG_SCRIPT = 3781064571;
const TAG_SECTION = 4245686172;
const TAG_STRIKE = 3801225048;
const TAG_STRONG = 3801231683;
const TAG_STYLE = 336362006;
const TAG_TD = 6106;
const TAG_TH = 6110;
const TAG_TR = 6120;
const TAG_UL = 6147;

export function htmlToMarkdown(html, options = {}) {
  return new Converter({ ...DEFAULT_OPTIONS, ...options }).convert(String(html));
}

export { htmlToMarkdown as convert };

export function htmlToMarkdownTurbo(html, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const urlCache = opts.baseUrl ? new Map() : null;
  const resolve = (value) => {
    if (!value) return "";
    if (!opts.baseUrl) return escapeUrl(value);
    const cached = urlCache.get(value);
    if (cached !== undefined) return cached;
    let resolved;
    try {
      resolved = escapeUrl(new URL(value, opts.baseUrl).toString());
    } catch {
      resolved = escapeUrl(value);
    }
    urlCache.set(value, resolved);
    return resolved;
  };

  let source = decodeEntities(String(html));
  if (source.indexOf("<!--") !== -1) source = source.replace(/<!--[\s\S]*?-->/g, "");
  if (
    source.indexOf("<script") !== -1 ||
    source.indexOf("<style") !== -1 ||
    source.indexOf("<noscript") !== -1
  ) {
    source = source.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  }
  if (source.indexOf("\r") !== -1) source = source.replace(/\r\n?/g, "\n");

  return source
    .replace(/<pre\b[^>]*>\s*<code\b[^>]*>/gi, `\n\n${opts.codeBlockFence}\n`)
    .replace(/<\/code>\s*<\/pre>/gi, `\n${opts.codeBlockFence}\n\n`)
    .replace(/<h([1-6])\b[^>]*>/gi, (_, level) => `\n\n${"#".repeat(Number(level))} `)
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<p\b[^>]*>/gi, "\n\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "  \n")
    .replace(/<hr\s*\/?>/gi, "\n\n---\n\n")
    .replace(/<(strong|b)\b[^>]*>/gi, "**")
    .replace(/<\/(strong|b)>/gi, "**")
    .replace(/<(em|i)\b[^>]*>/gi, "_")
    .replace(/<\/(em|i)>/gi, "_")
    .replace(/<(s|strike|del)\b[^>]*>/gi, "~~")
    .replace(/<\/(s|strike|del)>/gi, "~~")
    .replace(/<code\b[^>]*>/gi, "`")
    .replace(/<\/code>/gi, "`")
    .replace(/<a\b[^>]*href=(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi, (_, d, s, b, text) => {
      const href = resolve(d || s || b || "");
      return href ? `[${text}](${href})` : text;
    })
    .replace(/<img\b([^>]*)\/?>/gi, (_, attrs) => {
      if (!opts.preserveImages) return "";
      const src = findAttr(attrs, "src");
      if (!src) return "";
      const alt = escapeBrackets(findAttr(attrs, "alt") || "");
      const title = findAttr(attrs, "title");
      return `![${alt}](${resolve(src)}${title ? ` "${escapeTitle(title)}"` : ""})`;
    })
    .replace(/<li\b[^>]*>/gi, `\n${opts.bullet} `)
    .replace(/<\/li>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

class Converter {
  constructor(options) {
    this.options = options;
    this.out = "";
    this.listStack = [];
    this.linkStack = [];
    this.headingStack = [];
    this.blockquoteDepth = 0;
    this.inPre = false;
    this.inCode = false;
    this.skipTag = "";
    this.lastWasSpace = false;
    this.tailNewlines = 0;
    this.size = 0;
    this.urlCache = options.baseUrl ? new Map() : null;
  }

  convert(html) {
    let textStart = 0;

    while (textStart < html.length) {
      const i = html.indexOf("<", textStart);
      if (i === -1) break;

      if (textStart < i) this.text(html.slice(textStart, i));

      if (html.startsWith("<!--", i)) {
        const end = html.indexOf("-->", i + 4);
        textStart = end === -1 ? html.length : end + 3;
        continue;
      }

      const end = findTagEnd(html, i + 1);
      if (end === -1) {
        textStart = i;
        break;
      }

      this.tag(html, i + 1, end);
      textStart = end + 1;
    }

    if (textStart < html.length) this.text(html.slice(textStart));
    return cleanup(this.out);
  }

  tag(raw, rawStart, rawEnd) {
    let start = rawStart;
    let end = rawEnd;
    while (start < end && isWhitespaceCode(raw.charCodeAt(start))) start++;
    while (end > start && isWhitespaceCode(raw.charCodeAt(end - 1))) end--;
    if (start >= end) return;
    if (raw.charCodeAt(start) === 33 || raw.charCodeAt(start) === 63) return;

    const closing = raw.charCodeAt(start) === 47;
    if (closing) {
      start++;
      while (start < end && isWhitespaceCode(raw.charCodeAt(start))) start++;
    }

    const nameStart = start;
    while (start < end && isNameCode(raw.charCodeAt(start))) {
      start++;
    }
    if (nameStart === start) return;
    const tagId = computeTagId(raw, nameStart, start);

    if (closing) {
      this.closeId(tagId);
      return;
    }

    const attrs = tagId === TAG_A || tagId === TAG_IMG ? parseAttrs(raw, start, end) : EMPTY_ATTRS;
    this.openId(tagId, attrs);
    if (raw.charCodeAt(end - 1) === 47 || isVoidTagId(tagId)) {
      this.closeId(tagId);
    }
  }

  openId(tagId, attrs) {
    if (tagId === TAG_SCRIPT || tagId === TAG_STYLE || tagId === TAG_NOSCRIPT) {
      this.skipTag = tagId;
      return;
    }
    if (this.skipTag) return;

    switch (tagId) {
      case TAG_H1:
      case 5660:
      case 5661:
      case 5662:
      case 5663:
      case TAG_H6: {
        this.ensureBlankLine();
        const level = tagId - TAG_H1 + 1;
        this.headingStack.push({ level, start: this.size });
        if (this.options.headingStyle === "atx" || level > 2) {
          this.write(`${"#".repeat(level)} `);
        }
        break;
      }
      case TAG_P:
      case TAG_DIV:
      case TAG_SECTION:
      case TAG_ARTICLE:
      case TAG_HEADER:
      case TAG_FOOTER:
      case TAG_MAIN:
      case TAG_NAV:
        this.ensureBlankLine();
        break;
      case TAG_BR:
        this.write("  \n");
        break;
      case TAG_HR:
        this.ensureBlankLine();
        this.write("---");
        this.ensureBlankLine();
        break;
      case TAG_STRONG:
      case TAG_B:
        this.write("**");
        break;
      case TAG_EM:
      case TAG_I:
        this.write("_");
        break;
      case TAG_S:
      case TAG_STRIKE:
      case TAG_DEL:
        this.write("~~");
        break;
      case TAG_CODE:
        if (!this.inPre) {
          this.inCode = true;
          this.write("`");
        }
        break;
      case TAG_PRE:
        this.ensureBlankLine();
        this.inPre = true;
        this.write(`${this.options.codeBlockFence}\n`);
        break;
      case TAG_BLOCKQUOTE:
        this.ensureBlankLine();
        this.blockquoteDepth++;
        break;
      case TAG_UL:
        if (this.listStack.length === 0) this.ensureBlankLine();
        else this.ensureNewLine();
        this.listStack.push({ ordered: false, index: 0 });
        break;
      case TAG_OL:
        if (this.listStack.length === 0) this.ensureBlankLine();
        else this.ensureNewLine();
        this.listStack.push({ ordered: true, index: 0 });
        break;
      case TAG_LI:
        this.ensureNewLine();
        this.writeListMarker();
        break;
      case TAG_A: {
        const href = this.resolveUrl(attrs.href);
        if (href) {
          this.write("[");
          this.linkStack.push({ href, title: attrs.title, start: this.size });
        }
        break;
      }
      case TAG_IMG:
        this.writeImage(attrs);
        break;
      case TAG_TR:
        this.ensureNewLine();
        break;
      case TAG_TD:
      case TAG_TH:
        this.write("| ");
        break;
    }
  }

  closeId(tagId) {
    if (this.skipTag) {
      if (tagId === this.skipTag) this.skipTag = 0;
      return;
    }

    switch (tagId) {
      case TAG_H1:
      case 5660:
      case 5661:
      case 5662:
      case 5663:
      case TAG_H6:
        this.closeHeading();
        break;
      case TAG_P:
      case TAG_DIV:
      case TAG_SECTION:
      case TAG_ARTICLE:
      case TAG_HEADER:
      case TAG_FOOTER:
      case TAG_MAIN:
      case TAG_NAV:
        this.ensureBlankLine();
        break;
      case TAG_STRONG:
      case TAG_B:
        this.write("**");
        break;
      case TAG_EM:
      case TAG_I:
        this.write("_");
        break;
      case TAG_S:
      case TAG_STRIKE:
      case TAG_DEL:
        this.write("~~");
        break;
      case TAG_CODE:
        if (!this.inPre) {
          this.write("`");
          this.inCode = false;
        }
        break;
      case TAG_PRE:
        this.trimTrailingNewlines();
        this.write(`\n${this.options.codeBlockFence}`);
        this.inPre = false;
        this.ensureBlankLine();
        break;
      case TAG_BLOCKQUOTE:
        this.blockquoteDepth = Math.max(0, this.blockquoteDepth - 1);
        this.ensureBlankLine();
        break;
      case TAG_UL:
      case TAG_OL:
        this.listStack.pop();
        if (this.listStack.length === 0) this.ensureBlankLine();
        else this.ensureNewLine();
        break;
      case TAG_LI:
        this.ensureNewLine();
        break;
      case TAG_A:
        this.closeLink();
        break;
      case TAG_TR:
        this.write("|");
        this.ensureNewLine();
        break;
      case TAG_TD:
      case TAG_TH:
        this.write(" ");
        break;
    }
  }

  text(value) {
    if (this.skipTag) return;
    if (this.inPre) {
      value = decodeEntities(value);
      this.write(value.indexOf("\r") === -1 ? value : value.replace(/\r\n?/g, "\n"));
      return;
    }
    if (this.inCode) {
      value = decodeEntities(value);
      this.write(compactWhitespace(value).replace(/`/g, "\\`"));
      return;
    }

    const normalized = normalizeText(value);
    if (normalized === " ") {
      this.space();
      return;
    }
    this.write(normalized);
  }

  closeHeading() {
    const heading = this.headingStack.pop();
    if (heading && this.options.headingStyle === "setext" && heading.level <= 2) {
      const width = Math.max(1, this.size - heading.start);
      this.write(`\n${(heading.level === 1 ? "=" : "-").repeat(width)}`);
    }
    this.ensureBlankLine();
  }

  closeLink() {
    const link = this.linkStack.pop();
    if (!link) return;
    if (this.size === link.start) {
      this.out = this.out.slice(0, link.start - 1);
      this.size--;
      return;
    }

    const title = link.title ? ` "${escapeTitle(link.title)}"` : "";
    this.write(`](${link.href}${title})`);
  }

  writeImage(attrs) {
    if (!this.options.preserveImages) return;
    const src = this.resolveUrl(attrs.src);
    if (!src) return;

    const alt = escapeBrackets(attrs.alt || "");
    const title = attrs.title ? ` "${escapeTitle(attrs.title)}"` : "";
    this.write(`![${alt}](${src}${title})`);
  }

  writeListMarker() {
    const state = this.listStack[this.listStack.length - 1];
    const depth = Math.max(0, this.listStack.length - 1);
    this.write("  ".repeat(depth));
    if (state?.ordered) {
      state.index++;
      this.write(`${state.index}. `);
    } else {
      this.write(`${this.options.bullet} `);
    }
  }

  resolveUrl(value) {
    if (!value) return "";
    if (!this.options.baseUrl) return escapeUrl(value);
    const cached = this.urlCache.get(value);
    if (cached !== undefined) return cached;

    let resolved;
    try {
      resolved = escapeUrl(new URL(value, this.options.baseUrl).toString());
    } catch {
      resolved = escapeUrl(value);
    }
    this.urlCache.set(value, resolved);
    return resolved;
  }

  ensureBlankLine() {
    this.trimTrailingSpaces();
    if (this.size === 0) return;
    if (this.tailNewlines >= 2) return;
    this.write(this.tailNewlines === 1 ? "\n" : "\n\n");
  }

  ensureNewLine() {
    this.trimTrailingSpaces();
    if (this.size === 0 || this.tailNewlines > 0) return;
    this.write("\n");
  }

  trimTrailingSpaces() {
    if (!this.lastWasSpace) return;
    const next = trimRightSpaces(this.out);
    this.size = next.length;
    this.out = next;
    this.lastWasSpace = false;
  }

  trimTrailingNewlines() {
    if (this.tailNewlines === 0) return;
    this.out = this.out.slice(0, this.size - this.tailNewlines);
    this.size -= this.tailNewlines;
    this.tailNewlines = 0;
    this.lastWasSpace = false;
  }

  space() {
    if (this.lastWasSpace || this.size === 0) return;
    if (this.tailNewlines > 0) return;
    this.write(" ");
  }

  write(value) {
    if (!value) return;
    const prefixed =
      this.blockquoteDepth > 0 && this.tailNewlines > 0
        ? `${"> ".repeat(this.blockquoteDepth)}${value}`
        : value;
    this.out += prefixed;
    this.size += prefixed.length;
    const lastCode = prefixed.charCodeAt(prefixed.length - 1);
    this.lastWasSpace = lastCode === 32 || lastCode === 9;
    this.tailNewlines = countTailNewlines(prefixed, this.tailNewlines);
  }

  endsWith(suffix) {
    return this.out.endsWith(suffix);
  }
}

function findTagEnd(html, start) {
  let quote = "";
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (quote) {
      if (char === quote) quote = "";
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === ">") {
      return i;
    }
  }
  return -1;
}

function computeTagId(source, start, end) {
  let hash = end - start;
  for (let i = start; i < end; i++) {
    hash = (hash * 33 + (source.charCodeAt(i) | 32)) >>> 0;
  }
  return hash;
}

function isVoidTagId(tagId) {
  return tagId === TAG_BR || tagId === TAG_HR || tagId === TAG_IMG;
}

const EMPTY_ATTRS = Object.freeze({});

function parseAttrs(source, start, end) {
  const attrs = {};
  while (start < end) {
    while (start < end && isWhitespaceCode(source.charCodeAt(start))) start++;
    if (start >= end || source.charCodeAt(start) === 47) break;

    const nameStart = start;
    while (start < end) {
      const code = source.charCodeAt(start);
      if (isWhitespaceCode(code) || code === 61 || code === 47 || code === 62) break;
      start++;
    }
    if (nameStart === start) {
      start++;
      continue;
    }

    const name = source.slice(nameStart, start).toLowerCase();
    while (start < end && isWhitespaceCode(source.charCodeAt(start))) start++;

    let value = "";
    if (source.charCodeAt(start) === 61) {
      start++;
      while (start < end && isWhitespaceCode(source.charCodeAt(start))) start++;

      const quote = source.charCodeAt(start);
      if (quote === 34 || quote === 39) {
        start++;
        const valueStart = start;
        while (start < end && source.charCodeAt(start) !== quote) start++;
        value = source.slice(valueStart, start);
        if (start < end) start++;
      } else {
        const valueStart = start;
        while (start < end) {
          const code = source.charCodeAt(start);
          if (isWhitespaceCode(code) || code === 62) break;
          start++;
        }
        value = source.slice(valueStart, start);
      }
    }

    if (name === "href" || name === "src" || name === "alt" || name === "title") {
      attrs[name] = decodeEntities(value);
    }
  }
  return attrs;
}

function findAttr(source, name) {
  const pattern = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>` + "`" + `]+))`, "i");
  const match = pattern.exec(source);
  return match ? decodeEntities(match[1] ?? match[2] ?? match[3] ?? "") : "";
}

function decodeEntities(value) {
  if (value.indexOf("&") === -1) return value;
  return value
    .replace(/&#(\d+);?/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);?/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-z][a-z0-9]+);/gi, (_, name) => ENTITIES[name] ?? `&${name};`);
}

const ENTITIES = {
  amp: "&",
  apos: "'",
  copy: "(c)",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
  reg: "(R)",
};

function escapeBrackets(value) {
  return value.replace(/[[\]\\]/g, "\\$&");
}

function escapeTitle(value) {
  return value.replace(/"/g, '\\"');
}

function escapeUrl(value) {
  return value.replace(/\s/g, "%20").replace(/\)/g, "%29");
}

function cleanup(value) {
  return value.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function compactWhitespace(value) {
  let result = "";
  let start = 0;
  let seenWhitespace = false;

  for (let i = 0; i < value.length; i++) {
    if (!isWhitespaceCode(value.charCodeAt(i))) continue;
    if (start < i) {
      result += value.slice(start, i);
      seenWhitespace = false;
    }
    if (!seenWhitespace) {
      result += " ";
      seenWhitespace = true;
    }
    start = i + 1;
  }

  if (start === 0) return value;
  if (start < value.length) result += value.slice(start);
  return result;
}

function normalizeText(value) {
  value = decodeEntities(value);

  let result = "";
  let start = 0;
  let changed = false;
  let seenWhitespace = false;

  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (isWhitespaceCode(code)) {
      changed = true;
      if (start < i) {
        result += value.slice(start, i);
        seenWhitespace = false;
      }
      if (!seenWhitespace) {
        result += " ";
        seenWhitespace = true;
      }
      start = i + 1;
      continue;
    }

    if (isMarkdownSpecialCode(code)) {
      changed = true;
      if (start < i) result += value.slice(start, i);
      result += `\\${value[i]}`;
      start = i + 1;
      seenWhitespace = false;
    }
  }

  if (!changed) return value;
  if (start < value.length) result += value.slice(start);
  return result;
}

function trimRightSpaces(value) {
  let end = value.length;
  while (end > 0) {
    const code = value.charCodeAt(end - 1);
    if (code !== 32 && code !== 9) break;
    end--;
  }
  return end === value.length ? value : value.slice(0, end);
}

function trimRightNewlines(value) {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 10) end--;
  return end === value.length ? value : value.slice(0, end);
}

function countTailNewlines(value, previous) {
  let count = 0;
  for (let i = value.length - 1; i >= 0 && value.charCodeAt(i) === 10; i--) count++;
  if (count === 0) return 0;
  return count === value.length ? Math.min(2, previous + count) : Math.min(2, count);
}

function isMarkdownSpecialCode(code) {
  return (
    code === 42 ||
    code === 60 ||
    code === 62 ||
    code === 91 ||
    code === 92 ||
    code === 93 ||
    code === 95 ||
    code === 96
  );
}

function isNameCode(code) {
  return (
    (code >= 65 && code <= 90) ||
    (code >= 97 && code <= 122) ||
    (code >= 48 && code <= 57) ||
    code === 45 ||
    code === 58
  );
}

function isWhitespaceCode(code) {
  return code === 32 || code === 9 || code === 10 || code === 12 || code === 13;
}
