import { requireAdmin } from "@/lib/auth/session";
import { CashFormSettings } from "@/components/admin/cash-form-settings";
import "@/components/admin/admin.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Kasformulier instellen" };
export default async function FormSettingsPage() {
  const { supabase } = await requireAdmin();
  const [locations, forms] = await Promise.all([
    supabase.from("locations").select("*").order("name"),
    supabase
      .from("cash_form_versions")
      .select("*")
      .order("version", { ascending: false }),
  ]);
  if (locations.error || forms.error)
    throw new Error("FORM_SETTINGS_UNAVAILABLE");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ALLEEN BEHEERDERS</span>
          <h1>Kasformulier instellen.</h1>
          <p>
            Pas velden, bedragen en rekenregels per vestiging aan. Eerdere
            afsluitingen blijven hun oorspronkelijke versie gebruiken.
          </p>
        </div>
      </div>
      <CashFormSettings
        locations={locations.data ?? []}
        forms={forms.data ?? []}
      />
    </>
  );
}
