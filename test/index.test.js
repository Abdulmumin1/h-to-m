import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { htmlToMarkdown, htmlToMarkdownTurbo } from "../src/index.js";

describe("htmlToMarkdown", () => {
  it("converts headings and paragraphs", () => {
    assert.equal(htmlToMarkdown("<h1>Hello</h1><p>World</p>"), "# Hello\n\nWorld");
  });

  it("converts inline formatting", () => {
    assert.equal(
      htmlToMarkdown("<p><strong>Bold</strong> <em>move</em> <code>x()</code></p>"),
      "**Bold** _move_ `x()`",
    );
  });

  it("converts links and images", () => {
    assert.equal(
      htmlToMarkdown('<p><a href="/a">A</a><img src="/x.png" alt="X"></p>', {
        baseUrl: "https://example.com/docs/",
      }),
      "[A](https://example.com/a)![X](https://example.com/x.png)",
    );
  });

  it("converts nested lists", () => {
    assert.equal(
      htmlToMarkdown("<ol><li>One</li><li>Two<ul><li>Deep</li></ul></li></ol>"),
      "1. One\n2. Two\n  - Deep",
    );
  });

  it("keeps preformatted code fenced", () => {
    assert.equal(
      htmlToMarkdown("<pre><code>const x = 1;\n</code></pre>"),
      "```\nconst x = 1;\n```",
    );
  });

  it("drops script and style content", () => {
    assert.equal(
      htmlToMarkdown("<style>p{}</style><p>Text</p><script>alert(1)</script>"),
      "Text",
    );
  });

  it("decodes common entities", () => {
    assert.equal(htmlToMarkdown("<p>A&amp;B&nbsp;&lt;ok&gt;</p>"), "A&B \\<ok\\>");
  });

  it("has a turbo path for sanitized html", () => {
    assert.equal(
      htmlToMarkdownTurbo('<h1>Hello</h1><p><strong>Server</strong> <a href="/x">link</a></p>', {
        baseUrl: "https://example.com",
      }),
      "# Hello\n\n**Server** [link](https://example.com/x)",
    );
  });
});
