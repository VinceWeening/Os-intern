import { validPermissions } from "@/lib/auth/permissions";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type UserChange = {
  id: string;
  name: string;
  roleId: string;
  active: boolean;
  locationIds: string[];
  version: number;
  reason: string;
};
export type RoleChange = {
  id: string | null;
  name: string;
  description: string;
  isAdmin: boolean;
  allLocations: boolean;
  permissions: string[];
  version: number;
  reason: string;
};
function validVersion(value: unknown) {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}
function validReason(value: unknown) {
  return (
    typeof value === "string" &&
    value.trim().length >= 3 &&
    value.trim().length <= 500
  );
}
export function validateUser(change: UserChange) {
  return (
    change &&
    uuid.test(change.id) &&
    typeof change.name === "string" &&
    change.name.trim().length > 0 &&
    change.name.trim().length <= 120 &&
    uuid.test(change.roleId) &&
    typeof change.active === "boolean" &&
    Array.isArray(change.locationIds) &&
    change.locationIds.every((id) => typeof id === "string" && uuid.test(id)) &&
    validVersion(change.version) &&
    validReason(change.reason)
  );
}
export function validateRole(change: RoleChange) {
  return (
    change &&
    (change.id === null || uuid.test(change.id)) &&
    typeof change.name === "string" &&
    change.name.trim().length >= 2 &&
    change.name.trim().length <= 60 &&
    typeof change.description === "string" &&
    change.description.length <= 300 &&
    typeof change.isAdmin === "boolean" &&
    typeof change.allLocations === "boolean" &&
    validPermissions(change.permissions) &&
    validVersion(change.version) &&
    validReason(change.reason)
  );
}
export function managementError(error: {
  code?: string;
  message?: string;
}): string {
  if (error.message === "LAST_ADMIN")
    return "Er moet minimaal één actieve beheerder overblijven. Koppel eerst een andere beheerder.";
  if (error.code === "PT409" || error.message === "VERSION_CONFLICT")
    return "Dit is intussen op een ander apparaat gewijzigd. Vernieuw de pagina en controleer de nieuwste gegevens.";
  if (error.code === "42501")
    return "Alleen een actieve beheerder met bevestigde authenticator mag dit wijzigen.";
  if (error.code === "23505") return "Er bestaat al een rol met deze naam.";
  return "Opslaan is niet bevestigd. Controleer je verbinding en vernieuw de gegevens voordat je opnieuw probeert.";
}
