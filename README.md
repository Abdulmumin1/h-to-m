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

Next.js App Router does not have a global response-transform hook, so negotiation is typically done at the route level:

```ts
// app/docs/route.ts
import { createElement } from "react";
import { htmlToMarkdown } from "h-to-md";
import { renderToStaticMarkup } from "react-dom/server";
import { DocsPage } from "./DocsPage";

export async function GET(request: Request) {
  const html = renderToStaticMarkup(createElement(DocsPage));
  const isMarkdown = request.headers.get("accept")?.includes("text/markdown");

  if (isMarkdown) {
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
// src/hooks.server.ts
import { htmlToMarkdown } from "h-to-md";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);

  if (response.headers.get("content-type")?.startsWith("text/html")) {
    response.headers.set("vary", "accept");

    if (
      event.request.headers.get("accept")?.includes("text/markdown") &&
      event.request.method === "GET"
    ) {
      const html = await response.text();
      return new Response(htmlToMarkdown(html, { baseUrl: event.url.href }), {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "vary": "accept",
        },
      });
    }
  }

  return response;
};
```

### Express

```ts
import express from "express";
import { htmlToMarkdown } from "h-to-md";

const app = express();

app.use((req, res, next) => {
  const originalSend = res.send.bind(res);

  res.send = function (body) {
    if (
      req.method === "GET" &&
      res.get("content-type")?.startsWith("text/html") &&
      req.accepts(["text/markdown", "html"]) === "text/markdown"
    ) {
      res.removeHeader("content-length");
      res.removeHeader("etag");
      res.set("content-type", "text/markdown; charset=utf-8");
      res.set("vary", "accept");
      return originalSend(
        htmlToMarkdown(String(body), {
          baseUrl: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
        })
      );
    }
    return originalSend(body);
  };

  next();
});
```

### Hono

```ts
import { Hono } from "hono";
import { htmlToMarkdown } from "h-to-md";

const app = new Hono();

app.use("*", async (c, next) => {
  await next();

  const response = c.res;
  if (!response.headers.get("content-type")?.startsWith("text/html")) return;

  response.headers.set("vary", "accept");

  if (
    c.req.header("accept")?.includes("text/markdown") &&
    c.req.method === "GET"
  ) {
    const html = await response.text();
    c.res = new Response(
      htmlToMarkdown(html, { baseUrl: c.req.url }),
      {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "vary": "accept",
        },
      }
    );
  }
});
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
