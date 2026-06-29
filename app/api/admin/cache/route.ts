import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin/auth";
import { clearCache, clearCacheByTag, getCacheAnalytics } from "@/lib/admin/cache-analytics";
import { CACHE_TAGS, type CacheTag } from "@/lib/cache";

async function requireAdmin() {
  const ok = await isAdminAuthenticated();
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function isCacheTag(value: string): value is CacheTag {
  return Object.values(CACHE_TAGS).includes(value as CacheTag);
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  return NextResponse.json({ analytics: getCacheAnalytics() });
}

export async function DELETE(req: NextRequest) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(req.url);
  const tag = url.searchParams.get("tag");

  if (tag) {
    if (!isCacheTag(tag)) {
      return NextResponse.json(
        {
          error: "Invalid cache tag",
          allowedTags: Object.values(CACHE_TAGS),
        },
        { status: 400 },
      );
    }

    const result = clearCacheByTag(tag);
    return NextResponse.json({
      message: `Cleared ${result.cleared} cache entr${result.cleared === 1 ? "y" : "ies"} for ${tag}.`,
      cleared: result.cleared,
      analytics: result.analytics,
    });
  }

  return NextResponse.json({
    message: "Cache cleared.",
    analytics: clearCache(),
  });
}
