import { performance } from "node:perf_hooks";
import { htmlToMarkdown, htmlToMarkdownTurbo } from "../src/index.js";

const baseUrl = "https://example.com";
const warmupRuns = 5;
const measuredRuns = 20;

const cases = [
  {
    name: "docs-mix",
    html: repeat(
      `
<article>
  <h2>Fast conversion</h2>
  <p>HTML with <strong>bold</strong>, <em>emphasis</em>, <a href="/docs">links</a>, and images.</p>
  <ul><li>One</li><li>Two</li><li>Three</li></ul>
  <pre><code>const value = 42;</code></pre>
</article>`,
      10_000,
    ),
  },
  {
    name: "links-heavy",
    html: repeat(
      `
<section>
  <p>
    <a href="/docs/1">One</a>
    <a href="/docs/2">Two</a>
    <a href="/docs/3">Three</a>
    <a href="/docs/4">Four</a>
    <a href="/docs/5">Five</a>
  </p>
</section>`,
      12_000,
    ),
  },
  {
    name: "media-heavy",
    html: repeat(
      `
<figure>
  <img src="/images/hero.png" alt="Hero" title="Hero image">
  <figcaption><strong>Hero</strong> asset for the page.</figcaption>
</figure>`,
      15_000,
    ),
  },
  {
    name: "messy-html",
    html: repeat(
      `
<!-- comment -->
<div>
  <style>.x{color:red}</style>
  <script>window.__x = true</script>
  <h3>Mixed content &amp; entities</h3>
  <p>Some text with <em>inline</em> markup, <code>code()</code>, and <blockquote>quotes</blockquote>.</p>
</div>`,
      8_000,
    ),
  },
];

for (const { name, html } of cases) {
  const inputMb = Buffer.byteLength(html) / 1024 / 1024;
  console.log(`\n${name}`);
  console.log(`input: ${inputMb.toFixed(2)} MB`);
  run("scanner", htmlToMarkdown, html, inputMb);
  run("turbo", htmlToMarkdownTurbo, html, inputMb);
}

function run(name, convert, html, inputMb) {
  let output = "";
  const timings = [];

  for (let i = 0; i < warmupRuns + measuredRuns; i++) {
    const start = performance.now();
    output = convert(html, { baseUrl });
    const ms = performance.now() - start;
    if (i >= warmupRuns) timings.push(ms);
  }

  const stats = summarize(timings);
  console.log(`  ${name} output: ${(Buffer.byteLength(output) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  ${name} avg: ${stats.avg.toFixed(2)} ms`);
  console.log(`  ${name} p95: ${stats.p95.toFixed(2)} ms`);
  console.log(`  ${name} throughput: ${(inputMb / (stats.avg / 1000)).toFixed(2)} MB/s`);
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  const avg = sum / sorted.length;
  const p95Index = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);

  return {
    avg,
    p95: sorted[p95Index],
  };
}

function repeat(snippet, count) {
  return snippet.repeat(count);
}
