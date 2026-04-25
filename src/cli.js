#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import process from "node:process";
import { htmlToMarkdown } from "./index.js";

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

const inputPath = process.argv[2];
const html = inputPath ? await readFile(inputPath, "utf8") : await readStdin();
process.stdout.write(`${htmlToMarkdown(html)}\n`);
