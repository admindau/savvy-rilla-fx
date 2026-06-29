import { NextResponse } from "next/server";
import { getOpenApiYaml } from "@/lib/openapi";

export const dynamic = "force-static";

export function GET() {
  return new NextResponse(getOpenApiYaml(), {
    headers: {
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      "Content-Type": "application/yaml; charset=utf-8",
    },
  });
}
