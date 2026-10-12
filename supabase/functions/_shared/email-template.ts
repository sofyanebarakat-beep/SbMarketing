// SB Marketing — shared branded email template for client monthly reports.
// Built specifically around the two things these reports are meant to show:
// website traffic and Google Search performance. Kept in _shared/ so any
// future email-sending function can reuse the same header/footer chrome.

export interface Metric {
  value: string;
  previous?: string; // last month's value, if known — drives the trend badge
}

export interface ClientReportEmailInput {
  businessName: string;
  contactName?: string;
  language: "fr" | "en";
  monthLabel: string; // e.g. "October 2026" / "Octobre 2026"
  websiteVisits?: Metric;
  googleImpressions?: Metric;
  googleClicks?: Metric;
  googleAvgPosition?: Metric; // lower is better
  summary?: string; // optional free-text paragraph
  reportUrl?: string; // optional link to a fuller dashboard/export
}

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

// Renders a small ▲/▼/→ badge comparing this month to last. Returns "" when
// there's no previous value to compare against (first report, or field left
// blank) — no badge is shown rather than a misleading one.
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
  // For "lower is better" metrics (ranking position), a numeric decrease is
  // the good outcome — pairing a ▲ with a shrinking number reads as
  // contradictory, so say "Improved/Dropped" instead of a signed percentage.
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

const COPY = {
  fr: {
    preheader: (month: string) => `Votre rapport SB Marketing — ${month}`,
    eyebrow: "Rapport mensuel",
    greeting: (name: string) => `Bonjour ${name},`,
    intro: (month: string, business: string) =>
      `Voici le récapitulatif de ${month} pour <strong>${escapeHtml(business)}</strong>.`,
    trafficTitle: "Trafic du site",
    visits: "Visites",
    searchTitle: "Performance sur Google",
    impressions: "Impressions",
    clicks: "Clics",
    avgPosition: "Position moyenne",
    cta: "Voir le rapport complet",
    closing:
      "Des questions sur ces chiffres ou sur la suite ? Répondez simplement à cet email, on vous lit.",
    signoff: "— L'équipe SB Marketing",
    footerTagline: "Agence marketing digital à Nice, Côte d'Azur",
  },
  en: {
    preheader: (month: string) => `Your SB Marketing report — ${month}`,
    eyebrow: "Monthly report",
    greeting: (name: string) => `Hi ${name},`,
    intro: (month: string, business: string) =>
      `Here's the recap for ${month} for <strong>${escapeHtml(business)}</strong>.`,
    trafficTitle: "Website traffic",
    visits: "Visits",
    searchTitle: "Google Search performance",
    impressions: "Impressions",
    clicks: "Clicks",
    avgPosition: "Avg. position",
    cta: "View the full report",
    closing: "Questions about these numbers or what's next? Just reply to this email.",
    signoff: "— The SB Marketing team",
    footerTagline: "Digital marketing agency in Nice, French Riviera",
  },
};

export function renderClientReportEmail(input: ClientReportEmailInput): {
  subject: string;
  html: string;
} {
  const lang = input.language === "en" ? "en" : "fr";
  const t = COPY[lang];
  const greetName = input.contactName?.trim() || input.businessName;
  const subject =
    lang === "en"
      ? `${input.businessName} — ${input.monthLabel} report`
      : `${input.businessName} — Rapport ${input.monthLabel}`;

  const summaryHtml = input.summary
    ? `<p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 24px;">${escapeHtml(
        input.summary
      )}</p>`
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

  const ctaHtml = input.reportUrl
    ? `
      <p style="text-align:center;margin:28px 0 4px;">
        <a href="${escapeHtml(input.reportUrl)}"
           style="background:#f2c94c;color:#041021;text-decoration:none;padding:13px 26px;border-radius:999px;font-weight:700;font-size:14px;display:inline-block;">
          ${t.cta}
        </a>
      </p>`
    : "";

  const html = `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f5f7;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(
    t.preheader(input.monthLabel)
  )}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">

          <!-- Header -->
          <tr>
            <td style="background:#041021;padding:28px 32px;">
              <span style="font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;">
                <span style="color:#ff5a4e;">SB</span><span style="color:#5c6cff;">MARKETING</span>
              </span>
              <div style="margin-top:6px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#f2c94c;font-weight:700;">${escapeHtml(
                t.eyebrow
              )} · ${escapeHtml(input.monthLabel)}</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:22px;color:#111c2b;">${escapeHtml(
                t.greeting(greetName)
              )}</h1>
              <p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 20px;">${t.intro(
                input.monthLabel,
                input.businessName
              )}</p>
              ${summaryHtml}
              ${trafficHtml}
              ${searchHtml}
              ${ctaHtml}

              <p style="font-size:14px;line-height:1.6;color:#6b7280;margin:28px 0 0;">${t.closing}</p>
              <p style="font-size:13px;color:#6b7280;margin:18px 0 0;">${t.signoff}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background:#f7f7f8;border-top:1px solid #ececec;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">SB Marketing · ${t.footerTagline}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">
                <a href="https://www.sbmarketing.fr" style="color:#9ca3af;">sbmarketing.fr</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
