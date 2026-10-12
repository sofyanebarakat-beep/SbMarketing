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
  logoPart1?: string; // red half of the wordmark, e.g. "SB"
  logoPart2?: string; // blue half, e.g. "MARKETING"
  footerTaglineFr?: string;
  footerTaglineEn?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
}

const DEFAULT_BRANDING: Required<Branding> = {
  companyName: "SB Marketing",
  logoPart1: "SB",
  logoPart2: "MARKETING",
  footerTaglineFr: "Agence marketing digital à Nice, Côte d'Azur",
  footerTaglineEn: "Digital marketing agency in Nice, French Riviera",
  websiteUrl: "https://www.sbmarketing.fr",
  instagramUrl: "https://www.instagram.com/sb.marketing06/",
  facebookUrl: "https://www.facebook.com/profile.php?id=61556671255980",
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

function metricCell(label: string, metric: Metric | undefined, lowerIsBetter: boolean, lang: "fr" | "en"): string {
  if (!metric?.value) return "";
  const badge = trendBadge(metric, lowerIsBetter, lang);
  return `
    <td align="center" style="padding:16px 10px;">
      <div style="font-size:24px;font-weight:800;color:#ffffff;line-height:1;">${escapeHtml(metric.value)}</div>
      <div style="margin-top:6px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#9aa7c2;">${escapeHtml(label)}</div>
      <div style="margin-top:6px;min-height:14px;">${badge}</div>
    </td>`;
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
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">

          <!-- Header -->
          <tr>
            <td style="background:#041021;padding:28px 32px;">
              <span style="font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;">
                <span style="color:#ff5a4e;">${escapeHtml(b.logoPart1)}</span><span style="color:#5c6cff;">${escapeHtml(
    b.logoPart2
  )}</span>
              </span>
              <div style="margin-top:6px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#f2c94c;font-weight:700;">${escapeHtml(
                opts.eyebrow
              )}</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${opts.bodyHtml}
              <p style="font-size:13px;color:#6b7280;margin:28px 0 0;">${t.signoff}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f7f7f8;border-top:1px solid #ececec;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">${escapeHtml(b.companyName)} · ${escapeHtml(footerTagline)}</p>
              <p style="margin:6px 0 0;font-size:12px;">
                <a href="${escapeHtml(b.websiteUrl)}" style="color:#9ca3af;margin-right:12px;">${escapeHtml(
    b.websiteUrl.replace(/^https?:\/\//, "")
  )}</a>${socialLinks}
              </p>
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
  websiteVisits?: Metric;
  googleImpressions?: Metric;
  googleClicks?: Metric;
  googleAvgPosition?: Metric; // lower is better
  summary?: string;
  reportUrl?: string;
  branding?: Branding;
}

const REPORT_COPY = {
  fr: {
    greeting: (name: string) => `Bonjour ${name},`,
    intro: (month: string, business: string) => `Voici le récapitulatif de ${month} pour <strong>${escapeHtml(business)}</strong>.`,
    trafficTitle: "Trafic du site",
    visits: "Visites",
    searchTitle: "Performance sur Google",
    impressions: "Impressions",
    clicks: "Clics",
    avgPosition: "Position moyenne",
    cta: "Voir le rapport complet",
    closing: "Des questions sur ces chiffres ou sur la suite ? Répondez simplement à cet email, on vous lit.",
  },
  en: {
    greeting: (name: string) => `Hi ${name},`,
    intro: (month: string, business: string) => `Here's the recap for ${month} for <strong>${escapeHtml(business)}</strong>.`,
    trafficTitle: "Website traffic",
    visits: "Visits",
    searchTitle: "Google Search performance",
    impressions: "Impressions",
    clicks: "Clicks",
    avgPosition: "Avg. position",
    cta: "View the full report",
    closing: "Questions about these numbers or what's next? Just reply to this email.",
  },
};

export function renderReportEmail(input: ReportEmailInput): { subject: string; html: string } {
  const lang = input.language === "en" ? "en" : "fr";
  const t = REPORT_COPY[lang];
  const greetName = input.contactName?.trim() || input.businessName;
  const subject =
    lang === "en" ? `${input.businessName} — ${input.monthLabel} report` : `${input.businessName} — Rapport ${input.monthLabel}`;

  const summaryHtml = input.summary
    ? `<p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 24px;">${escapeHtml(input.summary)}</p>`
    : "";

  const trafficHtml = input.websiteVisits?.value
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111c2b;border-radius:14px;margin:4px 0;">
        <tr><td style="padding:14px 20px 0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#f2c94c;font-weight:700;">${escapeHtml(
          t.trafficTitle
        )}</td></tr>
        <tr>${metricCell(t.visits, input.websiteVisits, false, lang)}</tr>
      </table>`
    : "";

  const searchCells = [
    metricCell(t.impressions, input.googleImpressions, false, lang),
    metricCell(t.clicks, input.googleClicks, false, lang),
    metricCell(t.avgPosition, input.googleAvgPosition, true, lang),
  ]
    .filter(Boolean)
    .join("");

  const searchHtml = searchCells
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111c2b;border-radius:14px;margin:12px 0 4px;">
        <tr><td colspan="3" style="padding:14px 20px 0;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#f2c94c;font-weight:700;">${escapeHtml(
          t.searchTitle
        )}</td></tr>
        <tr>${searchCells}</tr>
      </table>`
    : "";

  const bodyHtml = `
    <h1 style="margin:0 0 16px;font-size:22px;color:#111c2b;">${escapeHtml(t.greeting(greetName))}</h1>
    <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 20px;">${t.intro(input.monthLabel, input.businessName)}</p>
    ${summaryHtml}
    ${trafficHtml}
    ${searchHtml}
    ${ctaHtml(t.cta, input.reportUrl)}
    <p style="font-size:14px;line-height:1.6;color:#6b7280;margin:28px 0 0;">${t.closing}</p>`;

  const html = renderShell({
    lang,
    eyebrow: `${SHELL_COPY[lang].reportEyebrow} · ${input.monthLabel}`,
    preheader: subject,
    bodyHtml,
    branding: input.branding,
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
  });

  return { subject: input.subject, html };
}
