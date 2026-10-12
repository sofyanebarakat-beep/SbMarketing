// SB Marketing — emails a devis (quote) or a facture (invoice) to a client
// via Resend, with the PDF attached. The PDF is generated in the admin (/admin/#devis, jsPDF)
// and sent here base64-encoded, so the email always carries exactly the
// document the admin previewed/downloaded. The email itself reuses the
// branded "custom message" shell from _shared/email-template.ts.
//
// Deployed as a standard Supabase Edge Function (verify_jwt: true), so only
// a signed-in admin session can call it. Like send-client-report it only
// sends — admin-devis.js updates the devis row and logs client_emails.
//
// Pass "preview": true to get back { subject, html } without sending.
import { renderCustomEmail, type Branding } from "../_shared/email-template.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Same verified Resend sending domain as send-client-report.
const FROM = "SB Marketing <admin@partners.sbmarketing.fr>";

// Resend caps a whole email at 40 MB; a devis PDF is a few hundred KB, so
// anything near this is a bug on the caller's side, not a real quote.
const MAX_PDF_BASE64_LENGTH = 8 * 1024 * 1024;

interface RequestBody {
  preview?: boolean;
  to: string;
  business_name: string;
  contact_name?: string;
  language?: "fr" | "en";
  subject: string;
  body: string;
  cta_label?: string;
  cta_url?: string;
  branding?: Branding;
  reply_to?: string;
  view_online_url?: string;
  pdf_base64?: string;
  filename?: string;
  // extra files from public URLs (CGV, portfolio PDF), fetched here
  extra_attachments?: { filename: string; url: string }[];
}

const MAX_EXTRA_ATTACHMENTS = 3;
const MAX_EXTRA_BYTES = 15 * 1024 * 1024;

async function fetchAttachment(file: { filename: string; url: string }) {
  const url = new URL(file.url);
  if (url.protocol !== "https:") throw new Error(`Attachment must be an https link: ${file.filename}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch attachment ${file.filename} (${res.status})`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length > MAX_EXTRA_BYTES) throw new Error(`Attachment too large: ${file.filename}`);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return { filename: file.filename, content: btoa(binary) };
}

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: RequestBody = await req.json();
    const { to, business_name, contact_name, language = "fr", branding } = body || ({} as RequestBody);

    if (!body.preview) {
      if (!to || !business_name) return json(400, { error: "Missing to or business_name" });
      if (!body.subject || !body.body) return json(400, { error: "Missing subject or body" });
      if (!body.pdf_base64 || !body.filename) return json(400, { error: "Missing the devis PDF" });
      if (body.pdf_base64.length > MAX_PDF_BASE64_LENGTH) return json(400, { error: "The devis PDF is too large" });
    }

    const rendered = renderCustomEmail({
      businessName: business_name || "",
      contactName: contact_name,
      language,
      subject: body.subject || "",
      body: body.body || "",
      ctaLabel: body.cta_label,
      ctaUrl: body.cta_url,
      branding,
      extras: body.view_online_url ? { viewOnlineUrl: body.view_online_url } : undefined,
    });

    if (body.preview) return json(200, rendered);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const extras = (body.extra_attachments || [])
      .filter((f) => f?.url && f?.filename)
      .slice(0, MAX_EXTRA_ATTACHMENTS);
    const extraFiles = await Promise.all(extras.map(fetchAttachment));

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
        attachments: [{ filename: body.filename, content: body.pdf_base64 }, ...extraFiles],
      }),
    });

    const resendBody = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      throw new Error(resendBody?.message || `Resend request failed (${resendRes.status})`);
    }

    return json(200, { ok: true, id: resendBody?.id, html: rendered.html });
  } catch (e) {
    console.error("send-devis error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
