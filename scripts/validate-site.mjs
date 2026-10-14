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

function templateSignature(content) {
  const body = content.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? content;
  const signature = [];
  const tagPattern = /<\/?([a-z][a-z0-9-]*)\b([^>]*)>/gi;
  let match;

  while ((match = tagPattern.exec(body)) !== null) {
    const raw = match[0];
    const closing = raw.startsWith("</");
    const tag = match[1].toLowerCase();
    if (["script", "noscript"].includes(tag)) continue;
    if (closing) {
      signature.push(`/${tag}`);
      continue;
    }

    const classes = match[2].match(/\bclass=["']([^"']*)["']/i)?.[1]
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .sort()
      .join(".") ?? "";
    signature.push(classes ? `${tag}.${classes}` : tag);
  }

  return signature;
}

function validateLocalizedHomepageParity() {
  const frenchPath = path.join(root, "index.html");
  const englishPath = path.join(root, "en", "index.html");
  const french = fs.readFileSync(frenchPath, "utf8");
  const english = fs.readFileSync(englishPath, "utf8");
  const errors = [];

  for (const [language, content] of [["French", french], ["English", english]]) {
    if (!/<meta\s+[^>]*name=["']viewport["'][^>]*content=["'][^"']*width=device-width/i.test(content) &&
        !/<meta\s+[^>]*content=["'][^"']*width=device-width[^"']*["'][^>]*name=["']viewport["']/i.test(content)) {
      errors.push(`${language} homepage is missing a mobile viewport meta tag.`);
    }
    if (!/href=["']\/css\/home-responsive\.css["']/.test(content)) {
      errors.push(`${language} homepage is missing the shared responsive stylesheet.`);
    }
  }

  const frenchSignature = templateSignature(french);
  const englishSignature = templateSignature(english);
  if (frenchSignature.join("\n") !== englishSignature.join("\n")) {
    const limit = Math.max(frenchSignature.length, englishSignature.length);
    let difference = 0;
    while (difference < limit && frenchSignature[difference] === englishSignature[difference]) difference += 1;
    errors.push(
      `French and English homepage templates differ at element ${difference + 1}: ` +
      `${frenchSignature[difference] ?? "<missing>"} vs ${englishSignature[difference] ?? "<missing>"}.`
    );
  }

  return errors;
}

function validateHomepageSeo() {
  const errors = [];
  const pages = [
    ["French", path.join(root, "index.html"), "fr"],
    ["English", path.join(root, "en", "index.html"), "en"]
  ];

  for (const [label, file, language] of pages) {
    const content = fs.readFileSync(file, "utf8");
    const h1Count = (content.match(/<h1\b/gi) ?? []).length;
    const canonicalCount = (content.match(/<link\b[^>]*rel=["']canonical["']/gi) ?? []).length;
    const alternateCount = (content.match(/hreflang=["'](?:fr|en|x-default)["']/gi) ?? []).length;

    if (h1Count !== 1) errors.push(`${label} homepage must contain exactly one H1; found ${h1Count}.`);
    if (canonicalCount !== 1) errors.push(`${label} homepage must contain exactly one canonical URL; found ${canonicalCount}.`);
    if (alternateCount !== 3) errors.push(`${label} homepage must contain fr, en, and x-default hreflang links.`);
    if (!new RegExp(`<html[^>]+lang=["']${language}`, "i").test(content)) errors.push(`${label} homepage has an incorrect HTML language.`);
    if (!/\/js\/homepage-seo\.js/.test(content)) errors.push(`${label} homepage is missing the shared SEO enhancement script.`);

    for (const match of content.matchAll(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)) {
      try {
        JSON.parse(match[1]);
      } catch {
        errors.push(`${label} homepage contains invalid JSON-LD.`);
      }
    }
  }

  return errors;
}

for (const file of scannedFiles) {
  const content = fs.readFileSync(file, "utf8");
  const contentWithoutDisabledHtml = path.extname(file) === ".html"
    ? content.replace(/<!--[\s\S]*?-->/g, "")
    : content;
  for (const ref of collectReferences(file, contentWithoutDisabledHtml)) {
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

const homepageErrors = validateLocalizedHomepageParity();
if (homepageErrors.length > 0) {
  console.error("Localized homepage validation failed:");
  for (const error of homepageErrors) console.error(`- ${error}`);
  process.exit(1);
}

const seoErrors = validateHomepageSeo();
if (seoErrors.length > 0) {
  console.error("Homepage SEO validation failed:");
  for (const error of seoErrors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${scannedFiles.length} source files, homepage parity, mobile support, and SEO essentials.`);
