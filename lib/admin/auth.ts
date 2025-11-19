// lib/admin/auth.ts
import { cookies } from "next/headers";

export const ADMIN_COOKIE_NAME = "fx_admin_session";

export function isAdminAuthenticated(): boolean {
  const store = cookies();
  const session = store.get(ADMIN_COOKIE_NAME);
  return !!session && session.value === "ok";
}
