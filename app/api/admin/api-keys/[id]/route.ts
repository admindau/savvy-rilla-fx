import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { supabaseServer } from "@/lib/supabase/server";

async function requireAdmin() {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function getId(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return id;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const id = await getId(context);
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "revoke");

  const updates =
    action === "activate"
      ? { status: "active", revoked_at: null, updated_at: new Date().toISOString() }
      : { status: "revoked", revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() };

  const { error } = await supabaseServer.from("fx_api_keys").update(updates).eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update API key", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const id = await getId(context);

  const { error } = await supabaseServer
    .from("fx_api_keys")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to revoke API key", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
