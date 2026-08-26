from __future__ import annotations

import json
import re
import shutil
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

from argostranslate import translate
from bs4 import BeautifulSoup, Comment, NavigableString
from langdetect import DetectorFactory, LangDetectException, detect

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = "https://www.sbmarketing.fr"
SKIP_TAGS = {"script", "style", "svg", "noscript", "code", "pre"}
ASSET_SUFFIXES = {".css", ".js", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".mp4", ".webm", ".ttf", ".woff", ".woff2", ".ico", ".pdf"}
FRENCH_MARKERS = re.compile(
    r"[àâçéèêëîïôùûüÿœ]|\b(?:le|la|les|de|des|du|un|une|vous|votre|vos|nous|notre|pour|avec|et|est|sur|dans|que|qui|aux|ce|cette|ces|plus|par|au|en|sans|projet|agence|réseaux|données|voir|nos|offre|vente|technologie|nouveau|centre|appel|recrutement|mai|lecture|mis|jour|confidentialité|accès|cookies)\b",
    re.IGNORECASE,
)
MANUAL = {
    "Vous gérez le business.": "You run the business.",
    "Nous gérons le marketing.": "We handle the marketing.",
    "Vous gérez le business. Nous gérons le marketing.": "You run the business. We handle the marketing.",
    "Concentre-toi sur ton business, on s’occupe du reste.": "Focus on your business—we’ll take care of the rest.",
    "Discuter avec nous": "Talk to us",
    "Nos projets": "Our work",
    "Voir nos projets": "View our work",
    "Voir tous nos projets": "View all our work",
    "Offre": "Services",
    "Centre d'appel": "Call center",
    "On crée du contenu engageant": "We create engaging content",
    "On vous amène des prospects": "We bring you qualified leads",
    "On les transforme en rendez-vous qualifiés": "We turn them into qualified appointments",
    "Planifier un appel avec Soufiane": "Book a call with Soufiane",
    "Pack présence digitale à Nice": "Digital presence package in Nice",
    "Confidentialité": "Privacy",
    "Accès aux données": "Data access",
    "Consentement aux cookies": "Cookie consent",
    "En savoir plus": "Learn more",
    "Projets similaires": "Related projects",
    "Sb Marketing | Agence Marketing Digital à Nice, Côte d'Azur": "Sb Marketing | Digital Marketing Agency in Nice, France",
    "On est payé aux résultats": "We’re paid based on results",
    "On qualifie vos leads": "We qualify your leads",
    "Revenus générés pour nos clients": "Revenue generated for our clients",
    "Ven": "Fri",
    "Site Web": "Website",
    "SEO local": "Local SEO",
    "SEO Local": "Local SEO",
    "Marketing Digital": "Digital Marketing",
    "Nouveau RDV : Claudia": "New appointment: Claudia",
    "Nouveau RDV : François": "New appointment: François",
    "Nouveau RDV : Brian": "New appointment: Brian",
    "Nouveau RDV : Sophie": "New appointment: Sophie",
    "On a essayé 4 agences avant Sb Marketing et c’est la seule qui a réussi à lever la compagnie. Le game changer, c'est leur centre d'appel!": "We tried four agencies before Sb Marketing, and this is the only one that helped the company take off. Their call center was the game changer!",
}
cache: dict[str, str] = {}
DetectorFactory.seed = 0


def public_pages() -> list[Path]:
    pages = []
    for path in ROOT.rglob("*.html"):
        if any(part in {".git", "en"} for part in path.parts):
            continue
        text = path.read_text(encoding="utf-8")
        if "navbar2_component" in text and "footer7_component" in text:
            pages.append(path)
    return sorted(pages)


def route_for(path: Path) -> str:
    rel = path.relative_to(ROOT)
    if rel == Path("index.html"):
        return "/"
    if rel.name == "index.html":
        return "/" + rel.parent.as_posix().strip("/") + "/"
    return "/" + rel.as_posix()


def english_route(route: str) -> str:
    return "/en/" if route == "/" else "/en" + route


def looks_french(text: str) -> bool:
    if FRENCH_MARKERS.search(text):
        return True
    if len(text) < 18:
        return False
    try:
        return detect(text) == "fr"
    except LangDetectException:
        return False


def translate_text(text: str) -> str:
    stripped = " ".join(text.split())
    if stripped in MANUAL:
        return MANUAL[stripped]
    if not stripped or not any(char.isalpha() for char in stripped) or not looks_french(stripped):
        return stripped
    if stripped not in cache:
        cache[stripped] = translate.translate(stripped, "fr", "en")
    return cache[stripped]


def localized_internal_url(value: str, source_route: str, routes: set[str]) -> str:
    if not value or value.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return value
    parsed = urlparse(value)
    if parsed.scheme and parsed.netloc not in {"www.sbmarketing.fr", "sbmarketing.fr"}:
        return value
    absolute = urlparse(urljoin(DOMAIN + source_route, value))
    path = unquote(absolute.path)
    if Path(path).suffix.lower() in ASSET_SUFFIXES:
        return absolute.path + (("?" + absolute.query) if absolute.query else "") + (("#" + absolute.fragment) if absolute.fragment else "")
    normalized = path[:-10] if path.endswith("index.html") else path
    if normalized not in routes and normalized + "/" in routes:
        normalized += "/"
    if normalized in routes:
        return english_route(normalized) + (("?" + absolute.query) if absolute.query else "") + (("#" + absolute.fragment) if absolute.fragment else "")
    return value


def normalize_asset(value: str, source_route: str) -> str:
    if not value or value.startswith(("data:", "http:", "https:", "//", "#")):
        return value
    parsed = urlparse(value)
    if Path(parsed.path).suffix.lower() not in ASSET_SUFFIXES:
        return value
    absolute = urlparse(urljoin(DOMAIN + source_route, value))
    return absolute.path + (("?" + absolute.query) if absolute.query else "")


def normalize_css_urls(css: str, source_route: str) -> str:
    def replace(match: re.Match) -> str:
        quote, value = match.group(1), match.group(2)
        return "url(" + quote + normalize_asset(value, source_route) + quote + ")"
    return re.sub(r"url\(\s*(['\"]?)([^)'\"]+)\1\s*\)", replace, css)


def translate_json(value):
    if isinstance(value, dict):
        return {key: translate_json(item) for key, item in value.items()}
    if isinstance(value, list):
        return [translate_json(item) for item in value]
    if isinstance(value, str):
        if value.startswith(DOMAIN):
            parsed = urlparse(value)
            if Path(parsed.path).suffix.lower() in ASSET_SUFFIXES:
                return value
            return DOMAIN + english_route(parsed.path)
        return translate_text(value)
    return value


def add_hreflang(soup: BeautifulSoup, fr_url: str, en_url: str) -> None:
    for old in soup.select('link[rel="alternate"][hreflang]'):
        old.decompose()
    for language, href in (("fr", fr_url), ("en", en_url), ("x-default", fr_url)):
        soup.head.append(soup.new_tag("link", rel="alternate", hreflang=language, href=href))


def build_page(source: Path, routes: set[str]) -> None:
    source_route = route_for(source)
    target = ROOT / "en" / source.relative_to(ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    soup = BeautifulSoup(source.read_text(encoding="utf-8"), "html.parser")
    soup.html["lang"] = "en"

    for node in list(soup.find_all(string=True)):
        if isinstance(node, Comment) or node.parent.name in SKIP_TAGS:
            continue
        original = str(node)
        stripped = " ".join(original.split())
        if not stripped or (stripped not in MANUAL and not looks_french(stripped)):
            continue
        leading = re.match(r"^\s*", original).group(0)
        trailing = re.search(r"\s*$", original).group(0)
        node.replace_with(NavigableString(leading + translate_text(stripped) + trailing))

    for meta in soup.select("meta[content]"):
        key = meta.get("name") or meta.get("property") or ""
        if key in {"description", "og:title", "og:description", "twitter:title", "twitter:description"}:
            meta["content"] = translate_text(meta["content"])
        elif key == "og:locale":
            meta["content"] = "en_GB"
        elif key == "og:url":
            meta["content"] = DOMAIN + english_route(source_route)
    og_locale = soup.select_one('meta[property="og:locale"]')
    if og_locale:
        alternate = soup.new_tag("meta")
        alternate["property"] = "og:locale:alternate"
        alternate["content"] = "fr_FR"
        og_locale.insert_after(alternate)

    canonical = soup.select_one('link[rel="canonical"]')
    if canonical:
        canonical["href"] = DOMAIN + english_route(source_route)
    else:
        soup.head.append(soup.new_tag("link", rel="canonical", href=DOMAIN + english_route(source_route)))
    add_hreflang(soup, DOMAIN + source_route, DOMAIN + english_route(source_route))

    for script in soup.select('script[type="application/ld+json"]'):
        try:
            script.string = json.dumps(translate_json(json.loads(script.string)), ensure_ascii=False, separators=(",", ":"))
        except (TypeError, json.JSONDecodeError):
            pass

    for tag in soup.select("a[href]"):
        tag["href"] = localized_internal_url(tag["href"], source_route, routes)
    for tag in soup.find_all(True):
        for attribute in ("alt", "title", "aria-label", "placeholder"):
            if tag.has_attr(attribute) and looks_french(tag[attribute]):
                tag[attribute] = translate_text(tag[attribute])
    for tag in soup.select("[src]"):
        tag["src"] = normalize_asset(tag["src"], source_route)
    for tag in soup.select('link[href]:not([rel="canonical"]):not([hreflang])'):
        tag["href"] = normalize_asset(tag["href"], source_route)
    for tag in soup.select("[poster]"):
        tag["poster"] = normalize_asset(tag["poster"], source_route)
    for tag in soup.select("[srcset]"):
        candidates = []
        for candidate in tag["srcset"].split(","):
            parts = candidate.strip().split()
            if parts:
                parts[0] = normalize_asset(parts[0], source_route)
            candidates.append(" ".join(parts))
        tag["srcset"] = ", ".join(candidates)
    for tag in soup.find_all("style"):
        if tag.string:
            tag.string.replace_with(normalize_css_urls(tag.string, source_route))
    for tag in soup.select("[style]"):
        tag["style"] = normalize_css_urls(tag["style"], source_route)

    target.write_text(str(soup), encoding="utf-8")


def add_french_hreflang(source: Path) -> None:
    route = route_for(source)
    text = source.read_text(encoding="utf-8")
    text = re.sub(r'<link[^>]+rel=["\']alternate["\'][^>]+hreflang=["\'][^"\']+["\'][^>]*>', "", text)
    links = (
        f'<link rel="alternate" hreflang="fr" href="{DOMAIN + route}">'
        f'<link rel="alternate" hreflang="en" href="{DOMAIN + english_route(route)}">'
        f'<link rel="alternate" hreflang="x-default" href="{DOMAIN + route}">'
    )
    text = text.replace("</head>", links + "</head>", 1)
    source.write_text(text, encoding="utf-8")


def update_sitemap(routes: set[str]) -> None:
    path = ROOT / "sitemap.xml"
    namespace = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("", namespace)
    tree = ET.parse(path)
    root = tree.getroot()
    locations = {node.text for node in root.findall(f"{{{namespace}}}url/{{{namespace}}}loc")}
    for url_node in list(root.findall(f"{{{namespace}}}url")):
        loc = url_node.find(f"{{{namespace}}}loc")
        if loc is None or not loc.text or not loc.text.startswith(DOMAIN):
            continue
        route = urlparse(loc.text).path
        if route not in routes:
            continue
        en_url = DOMAIN + english_route(route)
        if en_url in locations:
            continue
        copy = ET.fromstring(ET.tostring(url_node, encoding="unicode"))
        copy.find(f"{{{namespace}}}loc").text = en_url
        root.append(copy)
        locations.add(en_url)
    for route in sorted(routes):
        for localized in (DOMAIN + route, DOMAIN + english_route(route)):
            if localized in locations:
                continue
            node = ET.SubElement(root, f"{{{namespace}}}url")
            ET.SubElement(node, f"{{{namespace}}}loc").text = localized
            ET.SubElement(node, f"{{{namespace}}}changefreq").text = "monthly"
            ET.SubElement(node, f"{{{namespace}}}priority").text = "0.7"
            locations.add(localized)
    ET.indent(tree, space="  ")
    tree.write(path, encoding="utf-8", xml_declaration=True)
    cleaned = "\n".join(line.rstrip() for line in path.read_text(encoding="utf-8").splitlines()) + "\n"
    path.write_text(cleaned, encoding="utf-8")


def main() -> None:
    pages = public_pages()
    routes = {route_for(path) for path in pages}
    output = ROOT / "en"
    if output.exists():
        shutil.rmtree(output)
    for page in pages:
        build_page(page, routes)
    for page in pages:
        add_french_hreflang(page)
    update_sitemap(routes)
    print(f"Generated {len(pages)} English pages with {len(cache)} translated strings.")


if __name__ == "__main__":
    main()
