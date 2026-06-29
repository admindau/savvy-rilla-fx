import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { createApiKey } from "@/lib/api/api-keys";
import { supabaseServer } from "@/lib/supabase/server";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

async function requireAdmin() {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { data, error } = await supabaseServer
    .from("fx_api_keys")
    .select(
      "id, developer_id, name, key_prefix, environment, status, scopes, daily_quota, monthly_quota, rate_limit_per_minute, last_used_at, expires_at, revoked_at, created_at, fx_developer_accounts(name, email, company, plan, status)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load API keys", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json().catch(() => ({}));

    const developerName = String(body.developerName ?? "").trim();
    const developerEmail = String(body.developerEmail ?? "").trim().toLowerCase();
    const company = String(body.company ?? "").trim();
    const plan = String(body.plan ?? "free").trim() || "free";
    const keyName = String(body.keyName ?? "Default API key").trim();
    const environment = body.environment === "test" || body.environment === "admin" ? body.environment : "live";

    if (!developerName) {
      return NextResponse.json({ error: "Developer name is required" }, { status: 400 });
    }

    let developerId: string | null = null;

    if (developerEmail) {
      const { data: existingDeveloper, error: lookupError } = await supabaseServer
        .from("fx_developer_accounts")
        .select("id")
        .eq("email", developerEmail)
        .maybeSingle();

      if (lookupError) {
        return NextResponse.json(
          { error: "Failed to check existing developer", details: lookupError.message },
          { status: 500 },
        );
      }

      if (existingDeveloper?.id) {
        developerId = existingDeveloper.id as string;

        await supabaseServer
          .from("fx_developer_accounts")
          .update({
            name: developerName,
            company: company || null,
            plan,
            updated_at: new Date().toISOString(),
          })
          .eq("id", developerId);
      } else {
        const { data: newDeveloper, error: developerError } = await supabaseServer
          .from("fx_developer_accounts")
          .insert({
            name: developerName,
            email: developerEmail,
            company: company || null,
            plan,
            status: "active",
          })
          .select("id")
          .single();

        if (developerError || !newDeveloper) {
          return NextResponse.json(
            { error: "Failed to create developer", details: developerError?.message },
            { status: 500 },
          );
        }

        developerId = newDeveloper.id as string;
      }
    } else {
      const { data: newDeveloper, error: developerError } = await supabaseServer
        .from("fx_developer_accounts")
        .insert({
          name: developerName,
          company: company || null,
          plan,
          status: "active",
        })
        .select("id")
        .single();

      if (developerError || !newDeveloper) {
        return NextResponse.json(
          { error: "Failed to create developer", details: developerError?.message },
          { status: 500 },
        );
      }

      developerId = newDeveloper.id as string;
    }

    const created = await createApiKey({
      developerId,
      name: keyName,
      environment,
      scopes: Array.isArray(body.scopes) ? body.scopes : ["rates:read", "summary:read"],
      dailyQuota: Number.isFinite(Number(body.dailyQuota)) ? Number(body.dailyQuota) : null,
      monthlyQuota: Number.isFinite(Number(body.monthlyQuota)) ? Number(body.monthlyQuota) : null,
      rateLimitPerMinute: Number.isFinite(Number(body.rateLimitPerMinute))
        ? Number(body.rateLimitPerMinute)
        : null,
      expiresAt: body.expiresAt ? String(body.expiresAt) : null,
    });

    return NextResponse.json(
      {
        ok: true,
        apiKey: created,
        warning: "Copy this key now. It will not be shown again.",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Failed to create API key", details: getErrorMessage(error, "Unexpected error") },
      { status: 500 },
    );
  }
}
