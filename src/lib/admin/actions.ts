"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/session";
import {
  managementError,
  validateRole,
  validateUser,
  type RoleChange,
  type UserChange,
} from "./validation";

export async function saveUser(change: UserChange) {
  const { supabase } = await requireAdmin();
  if (!validateUser(change))
    return { error: "Controleer naam, rol, vestigingen en reden." };
  const { error } = await supabase
    .rpc("admin_save_user", {
      p_id: change.id,
      p_name: change.name.trim(),
      p_role_id: change.roleId,
      p_active: change.active,
      p_location_ids: change.locationIds,
      p_expected_version: change.version,
      p_reason: change.reason.trim(),
    })
    .retry(false);
  if (error) {
    console.error(
      JSON.stringify({ event: "admin_save_user_failed", code: error.code }),
    );
    return { error: managementError(error) };
  }
  revalidatePath("/", "layout");
  return { success: "Gebruiker opgeslagen. De nieuwe rechten gelden direct." };
}
export async function saveRole(change: RoleChange) {
  const { supabase } = await requireAdmin();
  if (!validateRole(change))
    return { error: "Controleer rolnaam, rechten en reden." };
  const { error } = await supabase
    .rpc("admin_save_role", {
      p_id: change.id,
      p_name: change.name.trim(),
      p_description: change.description.trim(),
      p_is_admin: change.isAdmin,
      p_all_locations: change.allLocations,
      p_permissions: change.permissions,
      p_expected_version: change.version,
      p_reason: change.reason.trim(),
    })
    .retry(false);
  if (error) {
    console.error(
      JSON.stringify({ event: "admin_save_role_failed", code: error.code }),
    );
    return { error: managementError(error) };
  }
  revalidatePath("/", "layout");
  return {
    success:
      "Rol opgeslagen. Gebruikers met deze rol krijgen direct de gewijzigde rechten.",
  };
}
