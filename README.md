# h-to-md

Fast server-side HTML to Markdown conversion for Node.js applications.

```ts
import { htmlToMarkdown } from "h-to-md";

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

## Markdown Negotiation

Many AI agents request Markdown directly:

```sh
curl -H "Accept: text/markdown" https://example.com/docs
```

`h-to-md` can sit at the server boundary: render the normal HTML page, convert it when the request prefers Markdown, and return `text/markdown`.

### Next.js App Router

```ts
// app/docs/route.ts
import { createElement } from "react";
import { htmlToMarkdown } from "h-to-md";
import { renderToStaticMarkup } from "react-dom/server";
import { DocsPage } from "./DocsPage";

export async function GET(request: Request) {
  const html = renderToStaticMarkup(createElement(DocsPage));

  if (request.headers.get("accept")?.includes("text/markdown")) {
    return new Response(htmlToMarkdown(html, { baseUrl: request.url }), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "vary": "accept",
      },
    });
  }

  return new Response(`<!doctype html>${html}`, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "vary": "accept",
    },
  });
}
```

### SvelteKit

```ts
// src/routes/docs/+server.ts
import { htmlToMarkdown } from "h-to-md";
import { render } from "svelte/server";
import DocsPage from "./DocsPage.svelte";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ request, url }) => {
  const { body, head } = render(DocsPage);
  const html = `<!doctype html><html><head>${head}</head><body>${body}</body></html>`;

  if (request.headers.get("accept")?.includes("text/markdown")) {
    return new Response(htmlToMarkdown(html, { baseUrl: url.href }), {
      headers: {
        "content-type": "text/markdown; charset=utf-8",
        "vary": "accept",
      },
    });
  }

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "vary": "accept",
    },
  });
};
```

### Express

```ts
import express from "express";
import { htmlToMarkdown } from "h-to-md";
import { renderPage } from "./render-page.js";

const app = express();

app.get("/docs", async (req, res) => {
  const html = await renderPage();

  res.vary("accept");

  if (req.accepts(["text/markdown", "html"]) === "text/markdown") {
    res.type("text/markdown").send(htmlToMarkdown(html, {
      baseUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
    }));
    return;
  }

  res.type("html").send(html);
});
```

### Hono

```ts
import { Hono } from "hono";
import { htmlToMarkdown } from "h-to-md";
import { renderPage } from "./render-page";

const app = new Hono();

app.get("/docs", async (c) => {
  const html = await renderPage();

  if (c.req.header("accept")?.includes("text/markdown")) {
    return c.text(htmlToMarkdown(html, { baseUrl: c.req.url }), 200, {
      "content-type": "text/markdown; charset=utf-8",
      "vary": "accept",
    });
  }

  return c.html(html, 200, { "vary": "accept" });
});

export default app;
```

## CLI

```sh
h-to-md input.html > output.md
cat input.html | h-to-md
npx h-to-md input.html
```

After publish, the CLI command is `npx h-to-md`.

## Development

```sh
npm install
npm run check
npm run bench
```

`npm run bench` now reports average and `p95` timings across several HTML shapes, not just one repeated sample.

## Releases

Releases are triggered by pushing a semver tag (e.g. `v1.0.0`):

```sh
git tag v1.0.0
git push origin v1.0.0
```
