// Sends the RSVP confirmation email via Resend. Secrets (never in frontend code):
//   RESEND_API_KEY, FROM_EMAIL   (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { email } = await req.json();
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const pattern = String(email).trim().replace(/[\\%_]/g, "\\$&");
    const { data } = await sb.from("rsvps").select("email,first_name,attendance_status,updated_at").ilike("email", pattern).maybeSingle();
    // Only email people whose RSVP was saved in the last 2 minutes (stops misuse of this endpoint)
    if (!data || Date.now() - new Date(data.updated_at).getTime() > 120000) return new Response("not found", { status: 400, headers: cors });
    if (data.attendance_status === "declined") return new Response("skipped", { headers: cors });

    const loc = "Unit 10, Wild Fig Business Park, 1494 Cranberry Street, Honeydew, Roodepoort, 2170";
    const cal = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + encodeURIComponent("GOLE Cloud Go-Live Launch") +
      "&dates=20261029T080000Z/20261029T100000Z&location=" + encodeURIComponent(loc) + "&details=" + encodeURIComponent("Join us for the official GOLE Cloud Go-Live Launch.");
    const html = `<div style="background:#0b1826;padding:24px 12px;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto;background:#10243a;border-radius:16px;overflow:hidden;color:#fff">
<div style="padding:28px;border-bottom:3px solid #08d3d0"><div style="font-size:30px;font-weight:800;letter-spacing:4px">GOLE</div><div style="font-size:12px;color:#a9b8c9">Africa's cloud, global brilliance.</div></div>
<div style="padding:28px"><div style="color:#08d3d0;letter-spacing:3px;font-size:12px">GO-LIVE LAUNCH</div><h1 style="margin:8px 0 18px;font-size:30px">You're on the list.</h1>
<p>Hello ${esc(data.first_name)},</p><p>Thank you for confirming your attendance at the GOLE Cloud Go-Live Launch.</p>
<p style="font-size:18px;margin:20px 0 4px"><b>29 October 2026</b><br><b>10:00</b></p><p style="color:#a9b8c9;margin:0 0 24px">Unit 10, Wild Fig Business Park<br>1494 Cranberry Street<br>Honeydew<br>Roodepoort<br>2170</p>
<a href="${cal}" style="background:#08d3d0;color:#062a33;text-decoration:none;font-weight:bold;padding:14px 26px;border-radius:10px;display:inline-block">Add to Calendar</a>
<p style="color:#a9b8c9;font-size:13px;margin-top:28px">www.gole.africa &nbsp;·&nbsp; Global Outreach • Local Expertise</p></div></div></div>`;

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: Deno.env.get("FROM_EMAIL"), to: [data.email], subject: "You're Invited — GOLE Cloud Go-Live Launch", html }),
    });
    return new Response(await r.text(), { status: r.status, headers: cors });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: cors });
  }
});
