import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignoredDirs = new Set([".git", "node_modules"]);
const scannedExtensions = new Set([".html", ".css", ".js", ".xml"]);
const assetExtensions = new Set([
  ".css",
  ".js",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".gif",
  ".mp4",
  ".webm",
  ".ttf",
  ".woff",
  ".woff2",
  ".html",
  ".xml"
]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeUrl(rawUrl) {
  const trimmed = rawUrl.trim().replace(/^['"]|['"]$/g, "").trim();
  if (
    !trimmed ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:") ||
    trimmed.startsWith("javascript:") ||
    /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ||
    trimmed.startsWith("//")
  ) {
    return null;
  }

  const withoutHash = trimmed.split("#")[0];
  const withoutQuery = withoutHash.split("?")[0];
  if (!withoutQuery || withoutQuery === "/") return null;

  try {
    return decodeURIComponent(withoutQuery);
  } catch {
    return withoutQuery;
  }
}

function resolveReference(file, url) {
  const resolved = url.startsWith("/")
    ? path.join(root, url)
    : path.resolve(path.dirname(file), url);
  return path.normalize(resolved);
}

function collectReferences(file, content) {
  const refs = new Set();
  const patterns = [
    /\b(?:src|href|poster|content)=["']([^"']+)["']/gi,
    /url\(([^)]+)\)/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const normalized = normalizeUrl(match[1]);
      if (normalized) refs.add(normalized);
    }
  }

  const srcsetPattern = /\bsrcset=["']([^"']+)["']/gi;
  let srcsetMatch;
  while ((srcsetMatch = srcsetPattern.exec(content)) !== null) {
    for (const candidate of srcsetMatch[1].split(",")) {
      const normalized = normalizeUrl(candidate.trim().split(/\s+/)[0]);
      if (normalized) refs.add(normalized);
    }
  }

  return refs;
}

const files = walk(root);
const scannedFiles = files.filter((file) => scannedExtensions.has(path.extname(file)));
const missing = [];

for (const file of scannedFiles) {
  const content = fs.readFileSync(file, "utf8");
  for (const ref of collectReferences(file, content)) {
    const target = resolveReference(file, ref);
    if (!target.startsWith(root) || assetExtensions.has(path.extname(target)) === false) {
      continue;
    }

    if (!fs.existsSync(target)) {
      missing.push({
        file: path.relative(root, file),
        ref
      });
    }
  }
}

if (missing.length > 0) {
  console.error("Missing local asset references:");
  for (const item of missing) {
    console.error(`- ${item.file}: ${item.ref}`);
  }
  process.exit(1);
}

console.log(`Validated ${scannedFiles.length} source files. No missing local assets found.`);
