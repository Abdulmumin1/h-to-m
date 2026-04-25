# h-to-m

Fast server-side HTML to Markdown conversion for Node.js applications.

```ts
import { htmlToMarkdown } from "h-to-m";

const markdown = htmlToMarkdown("<h1>Hello</h1><p><strong>fast</strong> output.</p>");
```

## Goals

- No browser DOM dependency.
- Single-pass conversion with a zero-dependency tokenizer.
- Small API surface for use in web apps, workers, queues, and API routes.

## API

```ts
htmlToMarkdown(html, options?)
htmlToMarkdownTurbo(html, options?)
```

`htmlToMarkdown` is the tolerant scanner. `htmlToMarkdownTurbo` is a faster regex/native-engine path for sanitized application HTML where `>` inside quoted attributes is not expected.

Options:

- `baseUrl`: resolves relative links and image sources.
- `headingStyle`: `"atx"` or `"setext"`, defaults to `"atx"`.
- `bullet`: unordered list marker, defaults to `"-"`.
- `codeBlockFence`: fenced code marker, defaults to `` ``` ``.
- `preserveImages`: include image markdown, defaults to `true`.

## CLI

```sh
h-to-m input.html > output.md
cat input.html | h-to-m
npx h-to-m input.html
```

After publish, the CLI command is `npx h-to-m`.

## Development

```sh
npm install
npm run check
npm run bench
```

## Releases

Releases are triggered by pushing a semver tag (e.g. `v1.0.0`):

```sh
git tag v1.0.0
git push origin v1.0.0
```

