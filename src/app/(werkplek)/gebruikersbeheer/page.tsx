import { requireAdmin } from "@/lib/auth/session";
import { UserManagement } from "@/components/admin/user-management";
import "@/components/admin/admin.css";

export const metadata = { title: "Gebruikersbeheer" };
export const dynamic = "force-dynamic";
export default async function UserManagementPage() {
  const { supabase } = await requireAdmin();
  const [users, roles, locations, events, profiles, grants] = await Promise.all(
    [
      supabase.rpc("admin_list_users", {}),
      supabase.from("app_roles").select("*").order("name"),
      supabase.from("locations").select("*").order("name"),
      supabase
        .from("access_events")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(30),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("user_permission_grants").select("*"),
    ],
  );
  if (
    users.error ||
    roles.error ||
    locations.error ||
    events.error ||
    profiles.error ||
    grants.error
  )
    throw new Error("USER_MANAGEMENT_UNAVAILABLE");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DE JUISTE TOEGANG VOOR IEDEREEN</span>
          <h1>
            Gebruikersbeheer<span>.</span>
          </h1>
          <p>Stel rollen samen en bepaal wie welke onderdelen mag gebruiken.</p>
        </div>
        <span className="badge">Alleen beheerders</span>
      </div>
      <UserManagement
        grants={grants.data ?? []}
        users={users.data ?? []}
        roles={roles.data ?? []}
        locations={locations.data ?? []}
        events={events.data ?? []}
        actors={profiles.data ?? []}
      />
    </>
  );
}
