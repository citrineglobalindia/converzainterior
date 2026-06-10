import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_ROLES = ["admin", "manager", "user", "client", "bd_marketing", "digital_marketer", "graphic_designer", "sales"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // --- Verify the caller is an authenticated admin ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Missing Authorization header" }, 401);

    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(jwt);
    if (callerErr || !caller) return json({ error: "Invalid or expired token" }, 401);

    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!callerRole) return json({ error: "Admin role required" }, 403);

    const body = await req.json();
    const { action } = body;

    // --- Delete action ---
    if (action === "delete") {
      const { userId } = body;
      if (!userId) return json({ error: "User ID is required" }, 400);

      const { error: leadsUpdateError } = await supabaseAdmin
        .from("leads")
        .update({ assigned_to: null, assigned_by: null, assigned_at: null })
        .eq("assigned_to", userId);
      if (leadsUpdateError) console.error("Error unassigning leads:", leadsUpdateError);

      const { error: createdByError } = await supabaseAdmin
        .from("leads")
        .update({ created_by: null })
        .eq("created_by", userId);
      if (createdByError) console.error("Error clearing created_by:", createdByError);

      const { error: activitiesError } = await supabaseAdmin
        .from("lead_activities")
        .update({ user_id: null })
        .eq("user_id", userId);
      if (activitiesError) console.error("Error clearing lead activities:", activitiesError);

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error("Delete error:", deleteError);
        return json({ error: deleteError.message }, 400);
      }

      console.log(`User deleted: ${userId}`);
      return json({ success: true, message: "User deleted successfully" });
    }

    // --- Create action ---
    const { email, password, fullName, role = "user" } = body;
    if (!email || !password) return json({ error: "Email and password are required" }, 400);

    const validRole = VALID_ROLES.includes(role) ? role : "user";

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || email.split("@")[0] },
    });
    if (authError) {
      console.error("Auth error:", authError);
      return json({ error: authError.message }, 400);
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName || email.split("@")[0],
    });
    if (profileError) console.error("Profile error:", profileError);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
    const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
      user_id: userId,
      role: validRole,
    });
    if (roleError) console.error("Role error:", roleError);

    console.log(`User created: ${email} with role: ${validRole}`);
    return json({ success: true, user: { id: userId, email }, role: validRole });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("User management error:", message);
    return json({ error: message }, 500);
  }
});
