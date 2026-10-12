// SB Marketing — sends a client's monthly report email via Resend.
// Deployed as a standard Supabase Edge Function (verify_jwt: true), so only
// a signed-in admin session (the same JWT the /admin/ dashboard already
// holds) can call it. It only sends the email — the caller (admin.js) is
// responsible for patching clients.last_report_sent_at afterwards using its
// own authenticated session, so this function never needs elevated access.
import { renderClientReportEmail, type ReportHighlight } from "../_shared/email-template.ts";

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
  to: string;
  business_name: string;
  contact_name?: string;
  language?: "fr" | "en";
  month_label: string;
  highlights: ReportHighlight[];
  summary?: string;
  report_url?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const body: RequestBody = await req.json();
    const {
      to,
      business_name,
      contact_name,
      language = "fr",
      month_label,
      highlights,
      summary,
      report_url,
    } = body || ({} as RequestBody);

    if (!to || !business_name || !month_label || !Array.isArray(highlights) || highlights.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing to, business_name, month_label or highlights" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = renderClientReportEmail({
      businessName: business_name,
      contactName: contact_name,
      language,
      monthLabel: month_label,
      highlights,
      summary,
      reportUrl: report_url,
    });

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
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
