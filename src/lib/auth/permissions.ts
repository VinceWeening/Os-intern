export const PERMISSIONS = [
  {
    key: "cash.open",
    label: "Kassa-afslag openen",
    description: "Het onderdeel Kassa-afslag gebruiken.",
    available: true,
  },
  {
    key: "cash.submit",
    label: "Afslag invullen en indienen",
    description: "Tellen, concepten bewaren en definitief indienen.",
    available: true,
  },
  {
    key: "cash.read_own",
    label: "Eigen afsluitingen bekijken",
    description: "Eigen afsluitingen binnen toegestane vestigingen bekijken.",
    available: true,
  },
  {
    key: "cash.read_all",
    label: "Afsluitingen van collega’s bekijken",
    description:
      "Ook afsluitingen van anderen binnen toegestane vestigingen bekijken.",
    available: true,
  },
  {
    key: "cash.review",
    label: "Afsluitingen controleren",
    description: "Een ingediende afslag als gecontroleerd markeren.",
    available: true,
  },
  {
    key: "cash.reopen",
    label: "Afsluitingen heropenen",
    description: "Een afslag met een verplichte reden heropenen.",
    available: true,
  },
] as const;
export type Permission = (typeof PERMISSIONS)[number]["key"];
export type AccessRole = {
  id: string;
  name: string;
  description: string;
  is_admin: boolean;
  all_locations: boolean;
  permissions: string[];
  version: number;
};
export function hasPermission(role: AccessRole, permission: Permission) {
  return role.is_admin || role.permissions.includes(permission);
}
export function validPermissions(values: unknown): values is Permission[] {
  return (
    Array.isArray(values) &&
    values.every((value) => PERMISSIONS.some((item) => item.key === value)) &&
    (values.length === 0 || values.includes("cash.open"))
  );
}
