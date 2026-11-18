const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const FROM = "SB Marketing <admin@partners.sbmarketing.fr>";
const ADMIN = "sofyanebarakat@gmail.com";

function esc(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { access_token, upload_ids } = await req.json();
    if (!access_token || !Array.isArray(upload_ids) || !upload_ids.length || upload_ids.length > 100) throw new Error("Invalid upload notification");
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
    const clientRes = await fetch(`${url}/rest/v1/clients?portal_token=eq.${encodeURIComponent(access_token)}&portal_enabled=eq.true&status=eq.active&select=id,business_name,contact_name`, { headers: auth });
    const clients = await clientRes.json();
    const client = clients?.[0];
    if (!client) throw new Error("Invalid portal access");
    const ids = upload_ids.map((id: string) => String(id).replace(/[^a-f0-9-]/gi, "")).join(",");
    const uploadsRes = await fetch(`${url}/rest/v1/client_uploads?client_id=eq.${client.id}&id=in.(${ids})&select=id,created_at,file_size`, { headers: auth });
    const uploads = await uploadsRes.json();
    if (!Array.isArray(uploads) || uploads.length !== upload_ids.length) throw new Error("Uploads not found");
    const total = uploads.reduce((n: number, item: { file_size: number }) => n + Number(item.file_size || 0), 0);
    const uploadedAt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" }).format(new Date(Math.max(...uploads.map((u: { created_at: string }) => new Date(u.created_at).getTime()))));
    const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#041021"><div style="padding:24px;background:#041021;color:white;border-radius:16px 16px 0 0"><strong style="font-size:20px">Nouvelles photos client</strong></div><div style="padding:28px;border:1px solid #e9eaf3;border-top:0;border-radius:0 0 16px 16px"><p><strong>${esc(client.business_name)}</strong> vient d'ajouter de nouvelles photos.</p><table style="width:100%;background:#f7f9fc;border-radius:12px;padding:16px"><tr><td>Client</td><td align="right"><strong>${esc(client.business_name)}</strong></td></tr><tr><td>Photos ajoutées</td><td align="right"><strong>${uploads.length}</strong></td></tr><tr><td>Taille totale</td><td align="right"><strong>${(total / 1048576).toFixed(1)} Mo</strong></td></tr><tr><td>Date</td><td align="right"><strong>${esc(uploadedAt)}</strong></td></tr></table><p style="text-align:center;margin-top:24px"><a href="https://www.sbmarketing.fr/admin/#uploads" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#f2c94c;color:#041021;text-decoration:none;font-weight:bold">Voir les photos</a></p></div></div>`;
    const resend = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: FROM, to: [ADMIN], subject: `${uploads.length} nouvelle${uploads.length > 1 ? "s" : ""} photo${uploads.length > 1 ? "s" : ""} — ${client.business_name}`, html }) });
    if (!resend.ok) throw new Error((await resend.json().catch(() => ({})))?.message || "Email failed");
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
