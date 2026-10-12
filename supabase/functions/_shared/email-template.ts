// SB Marketing — shared branded email template for client monthly reports.
// Kept in _shared/ so any future email-sending function (welcome emails,
// invoices, etc.) can reuse the same header/footer chrome.

export interface ReportHighlight {
  label: string;
  value: string;
}

export interface ClientReportEmailInput {
  businessName: string;
  contactName?: string;
  language: "fr" | "en";
  monthLabel: string; // e.g. "October 2026" / "Octobre 2026"
  highlights: ReportHighlight[]; // 2-5 short metric/result lines
  summary?: string; // optional free-text paragraph
  reportUrl?: string; // optional link to a fuller PDF/dashboard
}

function escapeHtml(value: string): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)
  );
}

const COPY = {
  fr: {
    preheader: (month: string) => `Votre rapport SB Marketing — ${month}`,
    eyebrow: "Rapport mensuel",
    greeting: (name: string) => `Bonjour ${name},`,
    intro: (month: string, business: string) =>
      `Voici le récapitulatif de ${month} pour <strong>${escapeHtml(business)}</strong>.`,
    highlightsTitle: "Points clés du mois",
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
    highlightsTitle: "This month's highlights",
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

  const highlightsHtml = input.highlights
    .map(
      (h) => `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #26314a;">
            <span style="display:block;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#9aa7c2;margin-bottom:4px;">${escapeHtml(
              h.label
            )}</span>
            <span style="display:block;font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(
              h.value
            )}</span>
          </td>
        </tr>`
    )
    .join("");

  const summaryHtml = input.summary
    ? `<p style="font-size:15px;line-height:1.65;color:#374151;margin:0 0 24px;">${escapeHtml(
        input.summary
      )}</p>`
    : "";

  const ctaHtml = input.reportUrl
    ? `
      <p style="text-align:center;margin:30px 0 4px;">
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

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111c2b;border-radius:14px;padding:4px 20px;margin:4px 0 8px;">
                <tr><td style="padding-top:10px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#f2c94c;font-weight:700;">${escapeHtml(
                  t.highlightsTitle
                )}</td></tr>
                ${highlightsHtml}
              </table>

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
