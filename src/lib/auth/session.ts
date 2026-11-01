import "server-only";
import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { getPublicConfig } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { needsAuthenticator } from "./access";
import { hasPermission, type Permission } from "./permissions";

export const requireUser = cache(async () => {
  if (!getPublicConfig()) redirect("/inloggen");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/inloggen");
  return { supabase, user: data.user };
});

export const requireStaff = cache(async () => {
  const { supabase, user } = await requireUser();
  // getUser() above already verified the user with Auth and returned its
  // factors; the assurance level is read from the session without a request.
  const factors = (user.factors ?? []).filter(
    (factor) => factor.factor_type === "totp" && factor.status === "verified",
  );
  const [assurance, { data, error }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase
      .from("profiles")
      .select("*, app_roles(*)")
      .eq("id", user.id)
      .single(),
  ]);
  if (
    assurance.error ||
    needsAuthenticator(assurance.data?.currentLevel ?? null, factors.length)
  ) {
    redirect("/authenticator");
  }
  if (error || !data?.active) redirect("/geen-toegang");
  const { app_roles: role, ...profile } = data;
  if (!role) redirect("/geen-toegang");
  return { supabase, user, profile, role, factors };
});

export async function requireAdmin() {
  const context = await requireStaff();
  if (!context.role.is_admin) notFound();
  return context;
}
export async function requirePermission(permission: Permission) {
  const context = await requireStaff();
  if (!hasPermission(context.role, permission)) redirect("/beveiliging");
  return context;
}
