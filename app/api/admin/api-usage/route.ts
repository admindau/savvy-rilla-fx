import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { getApiUsageAnalytics } from "@/lib/admin/api-usage-analytics";

async function requireAdmin() {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days") ?? "30");
    const analytics = await getApiUsageAnalytics(Number.isFinite(days) ? days : 30);

    return NextResponse.json({ analytics });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Failed to load API usage analytics",
        details: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
