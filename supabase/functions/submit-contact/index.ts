// SB Marketing — receives the public contact form on /contact/ and
// /en/contact/ (it replaced the old sbmarketing2.lovable.app iframe and its
// send-contact-email function). It validates the request (consent required,
// honeypot dropped) and saves it to contact_submissions, shown in the admin
// "Contact" tab. The admin alert email is sent by the database trigger on
// that table (supabase/contact_schema.sql), so it fires whether the row came
// through here or through the page's direct-insert fallback.
//
// Deployed with verify_jwt: false — the page calls it with the publishable
// key, which is not a JWT. It only ever writes one validated row.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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
      privacy_consent: body.privacy_consent === true,
      utm_source: clean(body.utm_source, 200) || null,
      utm_medium: clean(body.utm_medium, 200) || null,
      utm_campaign: clean(body.utm_campaign, 200) || null,
      utm_content: clean(body.utm_content, 200) || null,
      utm_term: clean(body.utm_term, 200) || null,
      landing_page: clean(body.landing_page, 300) || null,
      referrer: clean(body.referrer, 300) || null,
    };

    if (!row.privacy_consent) return json({ error: "Privacy consent is required" }, 400);
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

    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
