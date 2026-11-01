import { requireStaff } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { WorkplaceShell } from "@/components/workplace-shell";

// Sidebar and topbar stay mounted between pages; only the content swaps.
// Each page still runs its own permission check.
export default async function WerkplekLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, role } = await requireStaff();
  return (
    <WorkplaceShell
      name={profile.full_name}
      role={role.name}
      canManage={role.is_admin}
      cashAllowed={hasPermission(role, "cash.open")}
      canReport={hasPermission(role, "cash.reports")}
    >
      {children}
    </WorkplaceShell>
  );
}
