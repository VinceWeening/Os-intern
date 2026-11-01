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
  const [assurance, factors] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  if (
    assurance.error ||
    factors.error ||
    needsAuthenticator(
      assurance.data?.currentLevel ?? null,
      factors.data?.totp.length ?? 0,
    )
  ) {
    redirect("/authenticator");
  }
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error || !profile?.active) redirect("/geen-toegang");
  const { data: role, error: roleError } = await supabase
    .from("app_roles")
    .select("*")
    .eq("id", profile.access_role_id)
    .single();
  if (roleError || !role) redirect("/geen-toegang");
  return { supabase, user, profile, role, factors: factors.data!.totp };
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
