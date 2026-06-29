import { NextResponse } from "next/server";
import { getOpenApiJson } from "@/lib/openapi";

export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(getOpenApiJson(), {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
