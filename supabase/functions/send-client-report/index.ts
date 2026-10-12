// SB Marketing — sends a client email (monthly report, marketing tip, or a
// custom message) via Resend, all through one branded template shell.
// Deployed as a standard Supabase Edge Function (verify_jwt: true), so only
// a signed-in admin session (the same JWT the /admin/ dashboard already
// holds) can call it. It only sends the email — the caller (admin.js) is
// responsible for logging it and patching clients.last_report_sent_at
// afterwards using its own authenticated session, so this function never
// needs elevated access.
//
// Pass "preview": true to get back { subject, html } without sending —
// used by the admin's live-preview pane so it never has to duplicate the
// template logic client-side.
import {
  renderReportEmail,
  renderTipEmail,
  renderCustomEmail,
  type MetricGroup,
  type CustomMetric,
  type Branding,
  type Referral,
  type EmailExtras,
} from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// partners.sbmarketing.fr is already a verified sending domain in Resend
// (confirmed via the Resend API: status "verified", sending enabled).
// Resend verifies at the domain level, so any local-part @ this domain
// works — using "admin" to match the inbox this is meant to read as.
const FROM = "SB Marketing <admin@partners.sbmarketing.fr>";

interface RequestBody {
  preview?: boolean;
  type: "report" | "tip" | "custom";
  to: string;
  business_name: string;
  contact_name?: string;
  language?: "fr" | "en";
  client_id?: string; // used to build the unsubscribe link for tip/custom
  branding?: Branding;
  reply_to?: string;
  // optional "recommend us on WhatsApp" banner (any type)
  referral?: Referral;
  // optional rich content blocks (banner, image, video, before/after,
  // testimonial, link list, view-online link) — any type
  extras?: EmailExtras;
  // optional PDF attached via Resend — fetched server-side and base64-encoded
  attachment?: { filename: string; url: string };
  // report
  month_label?: string;
  groups?: MetricGroup[];
  custom_metrics?: CustomMetric[];
  summary?: string;
  report_url?: string;
  // tip
  headline?: string;
  body?: string;
  // custom
  subject?: string;
  // tip/custom shared
  cta_label?: string;
  cta_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    const { type, to, business_name, contact_name, language = "fr", branding, client_id } = body || ({} as RequestBody);

    if (!type || !["report", "tip", "custom"].includes(type)) {
      return new Response(JSON.stringify({ error: "type must be report, tip or custom" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!body.preview && (!to || !business_name)) {
      return new Response(JSON.stringify({ error: "Missing to or business_name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unsubscribeUrl =
      type !== "report" && client_id
        ? `https://www.sbmarketing.fr/unsubscribe/?client=${encodeURIComponent(client_id)}`
        : undefined;

    let rendered: { subject: string; html: string };

    if (type === "report") {
      const groups = body.groups || [];
      const hasAnyMetric = groups.some((g) => g.metrics?.some((m) => m.metric?.value));
      const hasAnyCustom = (body.custom_metrics || []).some((m) => m.label?.trim() && m.value?.trim());
      if (!body.month_label || (!hasAnyMetric && !hasAnyCustom)) {
        return new Response(
          JSON.stringify({ error: "Report emails need month_label and at least one metric" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      rendered = renderReportEmail({
        businessName: business_name,
        contactName: contact_name,
        language,
        monthLabel: body.month_label,
        groups,
        customMetrics: body.custom_metrics,
        summary: body.summary,
        reportUrl: body.report_url,
        branding,
        referral: body.referral,
        extras: body.extras,
      });
    } else if (type === "tip") {
      if (!body.headline || !body.body) {
        return new Response(JSON.stringify({ error: "Tip emails need headline and body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      rendered = renderTipEmail({
        businessName: business_name,
        contactName: contact_name,
        language,
        headline: body.headline,
        body: body.body,
        ctaLabel: body.cta_label,
        ctaUrl: body.cta_url,
        branding,
        unsubscribeUrl,
        referral: body.referral,
        extras: body.extras,
      });
    } else {
      if (!body.subject || !body.body) {
        return new Response(JSON.stringify({ error: "Custom emails need subject and body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      rendered = renderCustomEmail({
        businessName: business_name,
        contactName: contact_name,
        language,
        subject: body.subject,
        body: body.body,
        ctaLabel: body.cta_label,
        ctaUrl: body.cta_url,
        branding,
        unsubscribeUrl,
        referral: body.referral,
        extras: body.extras,
      });
    }

    if (body.preview) {
      return new Response(JSON.stringify(rendered), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    let attachments: { filename: string; content: string }[] | undefined;
    if (body.attachment?.url && body.attachment?.filename) {
      const fileRes = await fetch(body.attachment.url);
      if (!fileRes.ok) throw new Error(`Could not fetch attachment (${fileRes.status})`);
      const bytes = new Uint8Array(await fileRes.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      attachments = [{ filename: body.attachment.filename, content: btoa(binary) }];
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        subject: rendered.subject,
        html: rendered.html,
        ...(body.reply_to ? { reply_to: body.reply_to } : {}),
        ...(attachments ? { attachments } : {}),
      }),
    });

    const resendBody = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      throw new Error(resendBody?.message || `Resend request failed (${resendRes.status})`);
    }

    return new Response(JSON.stringify({ ok: true, id: resendBody?.id, html: rendered.html }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-client-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
