import { performance } from "node:perf_hooks";
import { htmlToMarkdown, htmlToMarkdownTurbo } from "../src/index.js";

const item = `
<article>
  <h2>Fast conversion</h2>
  <p>HTML with <strong>bold</strong>, <em>emphasis</em>, <a href="/docs">links</a>, and images.</p>
  <ul><li>One</li><li>Two</li><li>Three</li></ul>
  <pre><code>const value = 42;</code></pre>
</article>`;

const html = item.repeat(10_000);
const mb = Buffer.byteLength(html) / 1024 / 1024;

console.log(`input: ${mb.toFixed(2)} MB`);

run("scanner", htmlToMarkdown);
run("turbo", htmlToMarkdownTurbo);

function run(name, convert) {
  let best = Number.POSITIVE_INFINITY;
  let output = "";

  for (let i = 0; i < 20; i++) {
    const start = performance.now();
    output = convert(html, { baseUrl: "https://example.com" });
    const ms = performance.now() - start;
    if (i > 0) best = Math.min(best, ms);
  }

  console.log(`${name} output: ${(Buffer.byteLength(output) / 1024 / 1024).toFixed(2)} MB`);
  console.log(`${name} best: ${best.toFixed(2)} ms`);
  console.log(`${name} throughput: ${(mb / (best / 1000)).toFixed(2)} MB/s`);
}
