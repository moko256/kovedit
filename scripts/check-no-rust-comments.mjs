import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scanRoots = [
  path.join(root, "src-tauri", "src"),
  path.join(root, "src-tauri", "build.rs"),
];

async function collectRustFiles(entry) {
  const st = await readdir(entry, { withFileTypes: true }).catch(() => null);
  if (st === null) {
    return entry.endsWith(".rs") ? [entry] : [];
  }

  const files = [];
  for (const dirent of st) {
    const full = path.join(entry, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...(await collectRustFiles(full)));
    } else if (dirent.isFile() && dirent.name.endsWith(".rs")) {
      files.push(full);
    }
  }
  return files;
}

function lineCol(source, index) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < index; i++) {
    if (source[i] === "\n") {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
  }
  return { line, col };
}

function findComments(source) {
  const hits = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const next = source[i + 1];

    if (c === "/" && next === "/") {
      const { line, col } = lineCol(source, i);
      hits.push({ line, col, kind: "line" });
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }

    if (c === "/" && next === "*") {
      const { line, col } = lineCol(source, i);
      hits.push({ line, col, kind: "block" });
      i += 2;
      while (
        i < source.length &&
        !(source[i] === "*" && source[i + 1] === "/")
      ) {
        i++;
      }
      i = Math.min(i + 2, source.length);
      continue;
    }

    if (c === '"') {
      if (source.startsWith('b"', i)) i += 1;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === '"') {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (c === "'") {
      if (source.startsWith("b'", i)) i += 1;
      i += 1;
      while (i < source.length) {
        if (source[i] === "\\") {
          i += 2;
          continue;
        }
        if (source[i] === "'") {
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }

    if (c === "r" || (c === "b" && source[i + 1] === "r")) {
      let j = c === "b" ? i + 2 : i + 1;
      let hashes = 0;
      while (source[j] === "#") {
        hashes += 1;
        j += 1;
      }
      if (source[j] === '"') {
        const closer = '"' + "#".repeat(hashes);
        i = j + 1;
        const end = source.indexOf(closer, i);
        i = end === -1 ? source.length : end + closer.length;
        continue;
      }
    }

    i += 1;
  }
  return hits;
}

const files = [];
for (const entry of scanRoots) {
  files.push(...(await collectRustFiles(entry)));
}

let failed = false;
for (const file of files.sort()) {
  const source = await readFile(file, "utf8");
  const hits = findComments(source);
  for (const hit of hits) {
    failed = true;
    const rel = path.relative(root, file);
    console.error(
      `${rel}:${hit.line}:${hit.col}: rust comments are banned (${hit.kind}); express intent in code`,
    );
  }
}

if (failed) {
  console.error(
    "\nClippy has no lint that forbids source comments; this script enforces the ban for src-tauri Rust sources.",
  );
  process.exit(1);
}

console.log(`ok: no rust comments in ${files.length} file(s)`);
