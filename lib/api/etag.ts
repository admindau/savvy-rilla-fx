import { createHash } from "crypto";

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(",")}}`;
}

export function generateEtag(value: unknown): string {
  const payload = stableStringify(value);
  const hash = createHash("sha256").update(payload).digest("base64url").slice(0, 32);
  return `"${hash}"`;
}

export function normalizeEtag(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("W/") ? trimmed.slice(2) : trimmed;
}

export function etagMatches(requestHeader: string | null, etag: string): boolean {
  if (!requestHeader) return false;
  if (requestHeader.trim() === "*") return true;

  const normalizedEtag = normalizeEtag(etag);
  if (!normalizedEtag) return false;

  return requestHeader
    .split(",")
    .map((part) => normalizeEtag(part))
    .some((candidate) => candidate === normalizedEtag);
}
