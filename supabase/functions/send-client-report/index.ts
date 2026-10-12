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
  type Metric,
  type Branding,
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
  // report
  month_label?: string;
  website_visits?: Metric;
  google_impressions?: Metric;
  google_clicks?: Metric;
  google_avg_position?: Metric;
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
      const hasAnyMetric = [body.website_visits, body.google_impressions, body.google_clicks, body.google_avg_position].some(
        (m) => m?.value
      );
      if (!body.month_label || !hasAnyMetric) {
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
        websiteVisits: body.website_visits,
        googleImpressions: body.google_impressions,
        googleClicks: body.google_clicks,
        googleAvgPosition: body.google_avg_position,
        summary: body.summary,
        reportUrl: body.report_url,
        branding,
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
      }),
    });

    const resendBody = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      throw new Error(resendBody?.message || `Resend request failed (${resendRes.status})`);
    }

    return new Response(JSON.stringify({ ok: true, id: resendBody?.id }), {
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
