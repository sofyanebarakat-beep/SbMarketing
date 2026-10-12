// SB Marketing — receives the public contact form on /contact/ and
// /en/contact/ (it replaced the old sbmarketing2.lovable.app iframe and its
// send-contact-email function). It saves the request to
// contact_submissions (shown in the admin "Contact" tab) and emails the
// admin a notification via Resend, with reply-to set to the visitor.
//
// Deployed with verify_jwt: false — the page calls it with the publishable
// key, which is not a JWT. It only ever writes one validated row and emails
// the fixed admin address, and drops honeypot (bot) submissions.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM = "SB Marketing <admin@partners.sbmarketing.fr>";
const ADMIN_EMAIL = "sofyanebarakat@gmail.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));

    // Honeypot: real visitors never see or fill this field.
    if (clean(body.website, 200)) return json({ ok: true });

    const row = {
      language: body.language === "en" ? "en" : "fr",
      full_name: clean(body.name, 150),
      company: clean(body.company, 200) || null,
      email: clean(body.email, 254),
      country: clean(body.country, 80) || null,
      phone: clean(body.phone, 80) || null,
      service: clean(body.service, 120),
      message: clean(body.message, 5000),
      source_page: clean(body.source_page, 200) || null,
    };

    if (row.full_name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || !row.service || !row.message) {
      return json({ error: "Missing or invalid fields" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const insert = await fetch(`${supabaseUrl}/rest/v1/contact_submissions`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (!insert.ok) throw new Error(`Database insert failed: ${await insert.text()}`);

    // The request is saved at this point; a failed notification email is
    // logged but doesn't fail the submission.
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY) {
      const lines: [string, string | null][] = [
        ["Nom", row.full_name],
        ["Entreprise", row.company],
        ["Email", row.email],
        ["Téléphone", row.phone],
        ["Pays", row.country],
        ["Service", row.service],
        ["Langue", row.language.toUpperCase()],
        ["Page", row.source_page],
      ];
      const html = `<div style="font-family:Arial,sans-serif;color:#041020;max-width:600px">
<h2 style="margin:0 0 16px">Nouvelle demande de contact</h2>
<table style="border-collapse:collapse;width:100%">${lines
        .filter(([, v]) => v)
        .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#667085;white-space:nowrap">${k}</td><td style="padding:6px 0"><strong>${escapeHtml(v!)}</strong></td></tr>`)
        .join("")}</table>
<p style="margin:20px 0 6px;color:#667085">Message</p>
<div style="background:#f5f5f5;border-radius:10px;padding:14px;white-space:pre-wrap">${escapeHtml(row.message)}</div>
<p style="margin-top:20px"><a href="https://www.sbmarketing.fr/admin/#contacts" style="color:#041020">Voir dans l'admin →</a></p>
</div>`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: FROM,
          to: [ADMIN_EMAIL],
          reply_to: row.email,
          subject: `Nouveau contact : ${row.full_name}${row.company ? ` (${row.company})` : ""} — ${row.service}`,
          html,
        }),
      });
      if (!res.ok) console.error("Resend error", res.status, await res.text());
    } else {
      console.error("RESEND_API_KEY not configured — contact saved without email");
    }

    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
