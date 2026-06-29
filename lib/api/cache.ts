export type ApiCacheProfile = "static" | "realtime" | "private";

export function getCacheProfile(path: string): ApiCacheProfile {
  if (path.includes("/api/v1/currencies")) return "static";
  if (path.includes("/api/v1/export")) return "private";
  if (path.includes("/api/health")) return "private";
  return "realtime";
}

export function getCacheSeconds(profile: ApiCacheProfile): number {
  if (profile === "static") return 3600;
  if (profile === "private") return 0;
  return 60;
}
