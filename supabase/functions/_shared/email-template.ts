// SB Marketing — shared branded email templates. One header/footer "shell"
// (renderShell) used by three content types: the monthly report (traffic +
// Google Search), a marketing tip, and a custom message — so every email a
// client gets looks like it came from the same place, whatever it's about.

export interface Metric {
  value: string;
  previous?: string; // last month's value, if known — drives the trend badge
}

export interface Branding {
  companyName?: string;
  logoUrl?: string; // real logo image — used in the header when set
  logoPart1?: string; // red half of the text fallback, e.g. "SB"
  logoPart2?: string; // blue half of the text fallback, e.g. "MARKETING"
  footerTaglineFr?: string;
  footerTaglineEn?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  phone?: string; // shown in the footer contact block when set
  whatsappNumber?: string; // E.164 — shown as a footer WhatsApp link when set
}

const DEFAULT_BRANDING: Required<Branding> = {
  companyName: "SB Marketing",
  logoUrl: "https://www.sbmarketing.fr/images/sb-marketing-email-logo.png",
  logoPart1: "SB",
  logoPart2: "MARKETING",
  footerTaglineFr: "Agence marketing digital à Nice, Côte d'Azur",
  footerTaglineEn: "Digital marketing agency in Nice, French Riviera",
  websiteUrl: "https://www.sbmarketing.fr",
  instagramUrl: "https://www.instagram.com/sb.marketing06/",
  facebookUrl: "https://www.facebook.com/profile.php?id=61556671255980",
  phone: "",
  whatsappNumber: "",
};

function escapeHtml(value: string): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

function parseNumber(value?: string): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function trendBadge(metric: Metric | undefined, lowerIsBetter: boolean, lang: "fr" | "en"): string {
  if (!metric) return "";
  const cur = parseNumber(metric.value);
  const prev = parseNumber(metric.previous);
  if (cur === null || prev === null || prev === 0) return "";
  const diffPct = ((cur - prev) / Math.abs(prev)) * 100;
  const flat = Math.abs(diffPct) < 1;
  const improved = lowerIsBetter ? diffPct < 0 : diffPct > 0;
  const arrow = flat ? "→" : improved ? "▲" : "▼";
  const color = flat ? "#9aa7c2" : improved ? "#34d399" : "#f87171";
  let text: string;
  if (flat) {
    text = lang === "en" ? "No change" : "Stable";
  } else if (lowerIsBetter) {
    text = improved ? (lang === "en" ? "Improved" : "Amélioré") : lang === "en" ? "Dropped" : "En baisse";
  } else {
    text = Math.abs(diffPct).toFixed(0) + "%";
  }
  return `<span style="color:${color};font-weight:800;font-size:12px;">${arrow} ${text}</span>`;
}

function metricCell(label: string, metric: Metric | undefined, lowerIsBetter: boolean, lang: "fr" | "en", rowBg?: string): string {
  if (!metric?.value) return "";
  const badge = trendBadge(metric, lowerIsBetter, lang);
  return `
    <td align="center" ${rowBg ? `bgcolor="${rowBg}"` : ""} style="padding:16px 10px;${rowBg ? `background:${rowBg};` : ""}">
      <div style="font-size:24px;font-weight:800;color:#ffffff;line-height:1;">${escapeHtml(metric.value)}</div>
      <div style="margin-top:6px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#9aa7c2;">${escapeHtml(label)}</div>
      <div style="margin-top:6px;min-height:14px;">${badge}</div>
    </td>`;
}

export interface MetricGroup {
  title: string;
  metrics: { label: string; metric?: Metric; lowerIsBetter?: boolean }[];
}

export interface CustomMetric {
  label: string;
  value: string;
}

// Renders one dark card per group — up to 3 metric cells per row, wrapping
// to further rows for groups with more than 3 (e.g. Google Business
// Profile). A group with no filled-in metrics renders nothing at all,
// rather than an empty card.
function metricGroupHtml(group: MetricGroup, lang: "fr" | "en"): string {
  const present = group.metrics.filter((m) => m.metric?.value);
  if (!present.length) return "";
  const rowsHtml: string[] = [];
  for (let i = 0; i < present.length; i += 3) {
    // Alternating shading: every other row of 3 gets a slightly lighter
    // background, so groups with more than one row of metrics (e.g. Google
    // Business Profile) are easier to scan.
    const rowBg = i / 3 % 2 === 1 ? "#15203a" : undefined;
    const cells = present
      .slice(i, i + 3)
      .map((m) => metricCell(m.label, m.metric, !!m.lowerIsBetter, lang, rowBg))
      .join("");
    rowsHtml.push(`<tr>${cells}</tr>`);
  }
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111c2b;border-radius:14px;margin:12px 0 4px;">
      <tr><td colspan="3" style="padding:14px 20px 0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#f2c94c;font-weight:700;">${escapeHtml(
        group.title
      )}</td></tr>
      ${rowsHtml.join("")}
    </table>`;
}

// Freeform rows the admin typed by hand — no trend badge (no tracked
// "previous" value for these), just label: value.
function customMetricsHtml(items: CustomMetric[] | undefined, lang: "fr" | "en"): string {
  const present = (items || []).filter((i) => i.label?.trim() && i.value?.trim());
  if (!present.length) return "";
  const title = lang === "en" ? "Other" : "Autres indicateurs";
  const rows = present
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 20px;border-bottom:1px solid #26314a;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:13px;color:#9aa7c2;">${escapeHtml(i.label)}</td>
            <td align="right" style="font-size:14px;font-weight:700;color:#fff;">${escapeHtml(i.value)}</td>
          </tr></table>
        </td>
      </tr>`
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111c2b;border-radius:14px;margin:12px 0 4px;">
      <tr><td style="padding:14px 20px 10px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#f2c94c;font-weight:700;">${escapeHtml(
        title
      )}</td></tr>
      ${rows}
    </table>`;
}

function ctaHtml(label: string | undefined, url: string | undefined): string {
  if (!url) return "";
  const text = label?.trim() || url;
  return `
    <p style="text-align:center;margin:28px 0 4px;">
      <a href="${escapeHtml(url)}"
         style="background:#f2c94c;color:#041021;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:700;font-size:14px;display:inline-block;">
        ${escapeHtml(text)}
      </a>
    </p>`;
}

// ── "Recommend us on WhatsApp" banner ─────────────────────────────
// Optional block under the email body: shows the client a ready-written
// message and one big button that opens WhatsApp with it pre-filled, so
// they only have to pick who to send it to. A second, smaller button opens
// /partager/ on the site (copy the message, or send it by SMS, email or any
// other app) — emails can't run a "copy" script themselves. The link back
// to the site is appended here (with a ref tag naming the client), so the
// admin only writes the message itself.
export interface Referral {
  message: string;
  ref?: string; // who shared it, e.g. the client's business name
  offer?: string; // what the friend gets, e.g. "-20 % sur le premier mois"
  reward?: string; // what the client gets per referral that signs up
}

const REFERRAL_COPY = {
  fr: {
    eyebrow: "Vous aimez notre travail ?",
    headline: "Un proche a une entreprise ? Recommandez-nous en 1 clic",
    offerHeadline: (offer: string) => `Offrez ${offer} à un proche`,
    text: "Le message est déjà rédigé : appuyez sur le bouton et choisissez simplement à qui l'envoyer sur WhatsApp.",
    offerLine: (offer: string) => `🎁 En mentionnant mon nom, tu as droit à : ${offer}`,
    reward: (reward: string) =>
      `<strong style="color:#f2c94c;">🎁 Pour vous :</strong> pour chaque entreprise recommandée qui devient cliente, ${reward}.`,
    button: "Partager sur WhatsApp",
    copyButton: "Copier le message ou l'envoyer autrement",
    thanks: "Merci, c'est grâce à vos recommandations qu'on grandit 🙏",
    contactPath: "/contact/",
    sharePath: "/partager/",
  },
  en: {
    eyebrow: "Happy with our work?",
    headline: "Know someone with a business? Recommend us in 1 tap",
    offerHeadline: (offer: string) => `Give a friend ${offer}`,
    text: "The message is already written: tap the button and just pick who to send it to on WhatsApp.",
    offerLine: (offer: string) => `🎁 Mention my name and you get: ${offer}`,
    reward: (reward: string) =>
      `<strong style="color:#f2c94c;">🎁 For you:</strong> for every business you refer that becomes a client, ${reward}.`,
    button: "Share on WhatsApp",
    copyButton: "Copy the message or send it another way",
    thanks: "Thank you, your recommendations are how we grow 🙏",
    contactPath: "/en/contact/",
    sharePath: "/partager/",
  },
};

function slug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function referralHtml(referral: Referral | undefined, lang: "fr" | "en", websiteUrl: string): string {
  const message = referral?.message?.trim();
  if (!message) return "";
  const t = REFERRAL_COPY[lang];
  const offer = referral?.offer?.trim();
  const reward = referral?.reward?.trim();
  const site = websiteUrl.replace(/\/+$/, "");
  // Kept short on purpose — it's read inside a personal message. The ref
  // tag is what the admin's Contact tab shows as "Referred by".
  const refSlug = referral?.ref ? slug(referral.ref) : "";
  const link = `${site}${t.contactPath}${refSlug ? `?ref=${refSlug}` : ""}`;
  // What the friend actually receives: the message, the offer, the link.
  const sentText = offer ? `${message}\n\n${t.offerLine(offer)}` : message;
  const fullText = `${sentText}\n\n👉 ${link}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
  const shareUrl = `${site}${t.sharePath}?${new URLSearchParams({ l: lang, t: fullText }).toString()}`;
  const rewardHtml = reward
    ? `<p style="margin:16px 0 0;padding:12px 14px;border:1px dashed #f2c94c;border-radius:10px;font-size:14px;line-height:1.55;color:#ffffff;">${t.reward(
        escapeHtml(reward)
      )}</p>`
    : "";
  return `
          <tr>
            <td style="padding:0 32px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#041021;border-radius:16px;">
                <tr>
                  <td style="padding:26px 24px 22px;">
                    <div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#f2c94c;font-weight:700;">🤝 ${t.eyebrow}</div>
                    <div style="margin-top:8px;font-size:19px;line-height:1.3;font-weight:800;color:#ffffff;">${
                      offer ? escapeHtml(t.offerHeadline(offer)) : t.headline
                    }</div>
                    <p style="margin:10px 0 16px;font-size:14px;line-height:1.6;color:#c7cfdd;">${t.text}</p>
                    <div style="background:#111c2b;border-left:3px solid #25d366;border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.6;color:#e5e9f0;font-style:italic;">${escapeHtml(
                      sentText
                    ).replace(/\n/g, "<br>")}</div>
                    ${rewardHtml}
                    <p style="text-align:center;margin:20px 0 0;">
                      <a href="${escapeHtml(whatsappUrl)}"
                         style="background:#25d366;color:#ffffff;text-decoration:none;padding:15px 30px;border-radius:999px;font-weight:800;font-size:16px;display:inline-block;">
                        ${t.button}
                      </a>
                    </p>
                    <p style="text-align:center;margin:12px 0 0;">
                      <a href="${escapeHtml(shareUrl)}"
                         style="color:#ffffff;text-decoration:none;padding:9px 18px;border:1px solid #3a4660;border-radius:999px;font-weight:700;font-size:13px;display:inline-block;">
                        📋 ${t.copyButton}
                      </a>
                    </p>
                    <p style="text-align:center;margin:18px 0 0;font-size:13px;color:#9aa7c2;">${t.thanks}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

// ── Extra content blocks (banner, image, video, before/after, testimonial,
// link list) — optional, reusable across all three email types so the
// admin can dress up a report, a tip or a custom message the same way. ──
export interface LinkItem {
  label: string;
  url: string;
}

export interface Testimonial {
  quote: string;
  author?: string;
  rating?: number; // 1-5, rounded; omit for no stars
}

export interface BeforeAfter {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export interface VideoBlock {
  url: string; // where the play button links out to
  thumbnailUrl: string;
  caption?: string;
}

export interface ImageBlock {
  url: string;
  caption?: string;
  alt?: string;
}

export interface EmailExtras {
  bannerUrl?: string;
  bannerAlt?: string;
  image?: ImageBlock;
  video?: VideoBlock;
  beforeAfter?: BeforeAfter;
  testimonial?: Testimonial;
  links?: LinkItem[];
  viewOnlineUrl?: string; // set once the email's client_emails row exists
}

function bannerHtml(url: string | undefined, alt: string | undefined): string {
  if (!url) return "";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td>
      <img src="${escapeHtml(url)}" alt="${escapeHtml(alt || "")}" width="100%" style="display:block;width:100%;border-radius:14px;">
    </td></tr></table>`;
}

function preparedForBadge(businessName: string, lang: "fr" | "en"): string {
  const label = lang === "en" ? "Prepared for" : "Préparé pour";
  return `
    <p style="margin:0 0 14px;">
      <span style="display:inline-block;background:#eef1ff;color:#3952c9;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;padding:6px 12px;border-radius:999px;">${escapeHtml(
        label
      )} ${escapeHtml(businessName)}</span>
    </p>`;
}

function imageBlockHtml(image: ImageBlock | undefined): string {
  if (!image?.url) return "";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td>
      <img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt || "")}" width="100%" style="display:block;width:100%;border-radius:14px;">
      ${
        image.caption
          ? `<p style="text-align:center;margin:8px 0 0;font-size:12px;color:#6b7280;">${escapeHtml(image.caption)}</p>`
          : ""
      }
    </td></tr></table>`;
}

// Thumbnail + centered play-circle, linking out to the video. The overlay
// (position:absolute) renders fine in Gmail, Apple Mail and most webmail,
// and simply disappears in Outlook desktop — the "▶ Watch" caption under
// the thumbnail keeps the affordance even there.
function videoHtml(video: VideoBlock | undefined, lang: "fr" | "en"): string {
  if (!video?.url || !video?.thumbnailUrl) return "";
  const watchLabel = lang === "en" ? "Watch the video" : "Voir la vidéo";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td>
      <a href="${escapeHtml(video.url)}" style="text-decoration:none;">
        <div style="position:relative;line-height:0;border-radius:14px;overflow:hidden;">
          <img src="${escapeHtml(video.thumbnailUrl)}" width="100%" alt="${escapeHtml(
            video.caption || ""
          )}" style="display:block;width:100%;">
          <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:58px;height:58px;background:rgba(4,16,33,.78);border-radius:50%;text-align:center;line-height:58px;">
            <span style="color:#ffffff;font-size:20px;">▶</span>
          </div>
        </div>
      </a>
      <p style="text-align:center;margin:8px 0 0;font-size:13px;color:#6b7280;">▶ ${escapeHtml(video.caption || watchLabel)}</p>
    </td></tr></table>`;
}

function beforeAfterHtml(ba: BeforeAfter | undefined, lang: "fr" | "en"): string {
  if (!ba?.beforeUrl || !ba?.afterUrl) return "";
  const beforeLabel = ba.beforeLabel || (lang === "en" ? "Before" : "Avant");
  const afterLabel = ba.afterLabel || (lang === "en" ? "After" : "Après");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr>
      <td width="48%" valign="top" style="padding-right:4%;">
        <img src="${escapeHtml(ba.beforeUrl)}" width="100%" style="display:block;width:100%;border-radius:12px;">
        <p style="text-align:center;margin:8px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:#9aa7c2;">${escapeHtml(
          beforeLabel
        )}</p>
      </td>
      <td width="48%" valign="top">
        <img src="${escapeHtml(ba.afterUrl)}" width="100%" style="display:block;width:100%;border-radius:12px;">
        <p style="text-align:center;margin:8px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:800;color:#1a7f3c;">${escapeHtml(
          afterLabel
        )}</p>
      </td>
    </tr></table>`;
}

function testimonialHtml(testimonial: Testimonial | undefined): string {
  const quote = testimonial?.quote?.trim();
  if (!quote) return "";
  const rating = testimonial.rating ? Math.max(0, Math.min(5, Math.round(testimonial.rating))) : 0;
  const stars = rating ? "★".repeat(rating) + "☆".repeat(5 - rating) : "";
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr>
      <td style="background:#fafbfc;border-left:4px solid #f2c94c;border-radius:12px;padding:20px 22px;">
        ${stars ? `<div style="color:#f2c94c;font-size:16px;letter-spacing:2px;margin-bottom:8px;">${stars}</div>` : ""}
        <p style="margin:0;font-size:15px;line-height:1.6;color:#111c2b;font-style:italic;">“${escapeHtml(quote)}”</p>
        ${
          testimonial.author
            ? `<p style="margin:10px 0 0;font-size:13px;font-weight:800;color:#6b7280;">— ${escapeHtml(testimonial.author)}</p>`
            : ""
        }
      </td>
    </tr></table>`;
}

function linksHtml(links: LinkItem[] | undefined): string {
  const present = (links || []).filter((l) => l.label?.trim() && l.url?.trim());
  if (!present.length) return "";
  const rows = present
    .map(
      (l) => `
      <p style="text-align:center;margin:0 0 10px;">
        <a href="${escapeHtml(l.url)}" style="background:#ffffff;border:1.5px solid #111c2b;color:#111c2b;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;font-size:14px;display:inline-block;">${escapeHtml(
          l.label
        )}</a>
      </p>`
    )
    .join("");
  return `<div style="margin:0 0 10px;">${rows}</div>`;
}

function extrasHtml(extras: EmailExtras | undefined, lang: "fr" | "en"): string {
  if (!extras) return "";
  return [
    imageBlockHtml(extras.image),
    videoHtml(extras.video, lang),
    beforeAfterHtml(extras.beforeAfter, lang),
    testimonialHtml(extras.testimonial),
    linksHtml(extras.links),
  ]
    .filter(Boolean)
    .join("");
}

const VIEW_ONLINE_COPY = {
  fr: "Un souci d'affichage ? Voir la version en ligne",
  en: "Trouble viewing this email? View it online",
};

function viewOnlineHtml(url: string | undefined, lang: "fr" | "en"): string {
  if (!url) return "";
  return `
    <tr><td align="center" style="padding:0 0 10px;">
      <a href="${escapeHtml(url)}" style="font-size:12px;color:#6b7280;text-decoration:underline;">${escapeHtml(
        VIEW_ONLINE_COPY[lang]
      )}</a>
    </td></tr>`;
}

const SHELL_COPY = {
  fr: {
    reportEyebrow: "Rapport mensuel",
    tipEyebrow: "Conseil marketing",
    customEyebrow: "Message",
    signoff: "— L'équipe SB Marketing",
    unsubscribe: "Se désinscrire des conseils marketing",
  },
  en: {
    reportEyebrow: "Monthly report",
    tipEyebrow: "Marketing tip",
    customEyebrow: "Message",
    signoff: "— The SB Marketing team",
    unsubscribe: "Unsubscribe from marketing tips",
  },
};

function renderShell(opts: {
  lang: "fr" | "en";
  eyebrow: string;
  preheader: string;
  bodyHtml: string;
  branding?: Branding;
  unsubscribeUrl?: string; // present only for marketing (tip/custom) sends
  referral?: Referral;
  preparedFor?: string; // business name — shown as a badge above the greeting
  extras?: EmailExtras;
}): string {
  const b = { ...DEFAULT_BRANDING, ...opts.branding };
  const t = SHELL_COPY[opts.lang];
  const footerTagline = opts.lang === "en" ? b.footerTaglineEn : b.footerTaglineFr;

  const socialLinks = [
    b.instagramUrl ? `<a href="${escapeHtml(b.instagramUrl)}" style="color:#9ca3af;margin-right:12px;">Instagram</a>` : "",
    b.facebookUrl ? `<a href="${escapeHtml(b.facebookUrl)}" style="color:#9ca3af;">Facebook</a>` : "",
  ]
    .filter(Boolean)
    .join("");

  const contactLine = [
    b.phone ? `<a href="tel:${escapeHtml(b.phone.replace(/[^+\d]/g, ""))}" style="color:#9ca3af;margin-right:12px;">📞 ${escapeHtml(b.phone)}</a>` : "",
    b.whatsappNumber
      ? `<a href="https://wa.me/${escapeHtml(b.whatsappNumber.replace(/\D/g, ""))}" style="color:#9ca3af;">💬 WhatsApp</a>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const unsubscribeHtml = opts.unsubscribeUrl
    ? `<p style="margin:10px 0 0;font-size:11px;"><a href="${escapeHtml(
        opts.unsubscribeUrl
      )}" style="color:#9ca3af;">${t.unsubscribe}</a></p>`
    : "";

  return `<!doctype html>
<html lang="${opts.lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
${viewOnlineHtml(opts.extras?.viewOnlineUrl, opts.lang)}
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">

          <!-- Header -->
          <tr>
            <td style="background:#041021;padding:28px 32px;">
              ${
                b.logoUrl
                  ? `<img src="${escapeHtml(b.logoUrl)}" height="28" alt="${escapeHtml(
                      b.companyName
                    )}" style="display:block;height:28px;width:auto;border:0;">`
                  : `<span style="font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;">
                <span style="color:#ff5a4e;">${escapeHtml(b.logoPart1)}</span><span style="color:#5c6cff;">${escapeHtml(
                      b.logoPart2
                    )}</span>
              </span>`
              }
              <div style="margin-top:10px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#f2c94c;font-weight:700;">${escapeHtml(
                opts.eyebrow
              )}</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bannerHtml(opts.extras?.bannerUrl, opts.extras?.bannerAlt)}
              ${opts.preparedFor ? preparedForBadge(opts.preparedFor, opts.lang) : ""}
              ${opts.bodyHtml}
              ${extrasHtml(opts.extras, opts.lang)}
              <p style="font-size:13px;color:#6b7280;margin:28px 0 0;">${t.signoff}</p>
            </td>
          </tr>
${referralHtml(opts.referral, opts.lang, b.websiteUrl)}

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f7f7f8;border-top:1px solid #ececec;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">${escapeHtml(b.companyName)} · ${escapeHtml(footerTagline)}</p>
              <p style="margin:6px 0 0;font-size:12px;">
                <a href="${escapeHtml(b.websiteUrl)}" style="color:#9ca3af;margin-right:12px;">${escapeHtml(
    b.websiteUrl.replace(/^https?:\/\//, "")
  )}</a>${socialLinks}
              </p>
              ${contactLine ? `<p style="margin:6px 0 0;font-size:12px;">${contactLine}</p>` : ""}
              ${unsubscribeHtml}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Monthly report ──────────────────────────────────────────────────
export interface ReportEmailInput {
  businessName: string;
  contactName?: string;
  language: "fr" | "en";
  monthLabel: string;
  groups: MetricGroup[]; // whatever metric categories the client tracks
  customMetrics?: CustomMetric[]; // freeform "add your own metric" rows
  summary?: string;
  reportUrl?: string;
  branding?: Branding;
  referral?: Referral;
  extras?: EmailExtras;
}

const REPORT_COPY = {
  fr: {
    greeting: (name: string) => `Bonjour ${name},`,
    intro: (month: string, business: string) => `Voici le récapitulatif de ${month} pour <strong>${escapeHtml(business)}</strong>.`,
    cta: "Voir le rapport complet",
    closing: "Des questions sur ces chiffres ou sur la suite ? Répondez simplement à cet email, on vous lit.",
  },
  en: {
    greeting: (name: string) => `Hi ${name},`,
    intro: (month: string, business: string) => `Here's the recap for ${month} for <strong>${escapeHtml(business)}</strong>.`,
    cta: "View the full report",
    closing: "Questions about these numbers or what's next? Just reply to this email.",
  },
};

export function renderReportEmail(input: ReportEmailInput): { subject: string; html: string } {
  const lang = input.language === "en" ? "en" : "fr";
  const t = REPORT_COPY[lang];
  const greetName = input.contactName?.trim() || input.businessName;
  // Preview calls can arrive with no month set yet — fall back to
  // something readable rather than letting "undefined" show up.
  const monthLabel = input.monthLabel || (lang === "en" ? "this month" : "ce mois-ci");
  const subject = lang === "en" ? `${input.businessName} — ${monthLabel} report` : `${input.businessName} — Rapport ${monthLabel}`;

  const tldrLabel = lang === "en" ? "TL;DR" : "En bref";
  const summaryHtml = input.summary
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;"><tr><td style="background:#fff9ec;border-left:4px solid #f2c94c;border-radius:12px;padding:16px 18px;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#b45309;margin-bottom:6px;">${escapeHtml(
          tldrLabel
        )}</div>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${escapeHtml(input.summary)}</p>
      </td></tr></table>`
    : "";

  const groupsHtml = (input.groups || []).map((g) => metricGroupHtml(g, lang)).join("");
  const customHtml = customMetricsHtml(input.customMetrics, lang);

  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#111c2b;">${escapeHtml(t.greeting(greetName))}</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 20px;">${t.intro(monthLabel, input.businessName)}</p>
    ${summaryHtml}
    ${groupsHtml}
    ${customHtml}
    ${ctaHtml(t.cta, input.reportUrl)}
    <p style="font-size:14px;line-height:1.6;color:#6b7280;margin:28px 0 0;">${t.closing}</p>`;

  const html = renderShell({
    lang,
    eyebrow: `${SHELL_COPY[lang].reportEyebrow} · ${monthLabel}`,
    preheader: subject,
    bodyHtml,
    branding: input.branding,
    referral: input.referral,
    preparedFor: input.businessName,
    extras: input.extras,
    // Reports are part of the paid service, not opt-in marketing — no
    // unsubscribe link here.
  });

  return { subject, html };
}

// ── Marketing tip ───────────────────────────────────────────────────
export interface TipEmailInput {
  businessName: string;
  contactName?: string;
  language: "fr" | "en";
  headline: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  branding?: Branding;
  unsubscribeUrl?: string;
  referral?: Referral;
  extras?: EmailExtras;
}

const TIP_COPY = {
  fr: { greeting: (name: string) => `Bonjour ${name},` },
  en: { greeting: (name: string) => `Hi ${name},` },
};

export function renderTipEmail(input: TipEmailInput): { subject: string; html: string } {
  const lang = input.language === "en" ? "en" : "fr";
  const greetName = input.contactName?.trim() || input.businessName;
  const subject = input.headline;

  const bodyParagraphs = input.body
    .split(/\n{2,}/)
    .map((p) => `<p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#111c2b;">${escapeHtml(TIP_COPY[lang].greeting(greetName))}</h1>
    <h2 style="margin:0 0 16px;font-size:18px;color:#111c2b;">${escapeHtml(input.headline)}</h2>
    ${bodyParagraphs}
    ${ctaHtml(input.ctaLabel, input.ctaUrl)}`;

  const html = renderShell({
    lang,
    eyebrow: SHELL_COPY[lang].tipEyebrow,
    preheader: input.headline,
    bodyHtml,
    branding: input.branding,
    unsubscribeUrl: input.unsubscribeUrl,
    referral: input.referral,
    preparedFor: input.businessName,
    extras: input.extras,
  });

  return { subject, html };
}

// ── Custom message ──────────────────────────────────────────────────
export interface CustomEmailInput {
  businessName: string;
  contactName?: string;
  language: "fr" | "en";
  subject: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  branding?: Branding;
  unsubscribeUrl?: string;
  referral?: Referral;
  extras?: EmailExtras;
}

export function renderCustomEmail(input: CustomEmailInput): { subject: string; html: string } {
  const lang = input.language === "en" ? "en" : "fr";
  const greetName = input.contactName?.trim() || input.businessName;

  const bodyParagraphs = input.body
    .split(/\n{2,}/)
    .map((p) => `<p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 16px;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  const bodyHtml = `
    <h1 style="margin:0 0 20px;font-size:22px;color:#111c2b;">${escapeHtml(TIP_COPY[lang].greeting(greetName))}</h1>
    ${bodyParagraphs}
    ${ctaHtml(input.ctaLabel, input.ctaUrl)}`;

  const html = renderShell({
    lang,
    eyebrow: SHELL_COPY[lang].customEyebrow,
    preheader: input.subject,
    bodyHtml,
    branding: input.branding,
    unsubscribeUrl: input.unsubscribeUrl,
    referral: input.referral,
    preparedFor: input.businessName,
    extras: input.extras,
  });

  return { subject: input.subject, html };
}
