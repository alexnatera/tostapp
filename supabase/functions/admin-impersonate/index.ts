import { createClient } from "jsr:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: callerData, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !callerData?.user) return json({ error: "Invalid session" }, 401);
    const caller = callerData.user;

    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: callerProfile, error: profileErr } = await adminClient
      .from("profiles")
      .select("is_admin")
      .eq("id", caller.id)
      .single();
    if (profileErr || !callerProfile?.is_admin) return json({ error: "Admin access required" }, 403);

    const { user_id } = await req.json().catch(() => ({ user_id: null }));
    if (!user_id) return json({ error: "user_id requerido" }, 400);
    if (user_id === caller.id) return json({ error: "No puedes impersonarte a ti mismo" }, 400);

    const { data: targetData, error: targetErr } = await adminClient.auth.admin.getUserById(user_id);
    if (targetErr || !targetData?.user?.email) return json({ error: "Usuario no encontrado" }, 404);

    const { data: linkData, error: linkErr } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: targetData.user.email,
    });
    if (linkErr) return json({ error: linkErr.message }, 500);

    return json({
      action_link: linkData.properties.action_link,
      target_email: targetData.user.email,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
