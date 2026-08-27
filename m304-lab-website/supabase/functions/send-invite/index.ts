import { createClient } from "jsr:@supabase/supabase-js@2";

const configuredSiteUrl = Deno.env.get("SITE_URL")?.replace(/\/$/, "") || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": configuredSiteUrl,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function createInviteCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (value) => (value % 36).toString(36)).join("").toUpperCase();
}

async function hashCode(value: string) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const siteUrl = Deno.env.get("SITE_URL");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !siteUrl) return response({ error: "Function environment is incomplete" }, 500);

  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return response({ error: "Unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: userResult, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userResult.user) return response({ error: "Unauthorized" }, 401);

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: inviter } = await adminClient.from("profiles").select("role").eq("id", userResult.user.id).maybeSingle();
  if (inviter?.role !== "admin") return response({ error: "Administrator permission required" }, 403);

  let payload: { email?: string; role?: string };
  try { payload = await request.json(); } catch { return response({ error: "Invalid JSON" }, 400); }
  const email = payload.email?.trim().toLowerCase();
  const role = payload.role === "moderator" ? "moderator" : "member";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return response({ error: "A valid email is required" }, 400);

  const inviteCode = createInviteCode();
  const { data: inviteResult, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { invite_code: inviteCode, role },
    redirectTo: `${siteUrl.replace(/\/$/, "")}/login.html?mode=invite`
  });
  if (inviteError || !inviteResult.user) return response({ error: inviteError?.message || "Unable to send invitation" }, 400);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await adminClient.from("profiles").upsert({
    id: inviteResult.user.id,
    email,
    display_name: email.split("@")[0],
    role,
    invited_by: userResult.user.id,
    invited_at: new Date().toISOString()
  });
  await adminClient.from("invitation_audit").insert({
    email,
    recipient_id: inviteResult.user.id,
    invited_by: userResult.user.id,
    assigned_role: role,
    invite_code_hash: await hashCode(inviteCode),
    expires_at: expiresAt
  });

  return response({ ok: true, inviteCode, expiresAt });
});
