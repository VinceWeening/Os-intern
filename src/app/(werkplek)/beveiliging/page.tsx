import { requireStaff } from "@/lib/auth/session";
import { AuthenticatorPanel } from "@/components/authenticator-panel";
import { InstallApp } from "@/components/install-app";
import { FeedbackBoard } from "@/components/daily/feedback-board";
import "@/components/admin/admin.css";
import "../dagoverzicht/daily.css";
export const metadata = { title: "Mijn account" };
export const dynamic = "force-dynamic";
export default async function SecurityPage() {
  const { factors, supabase, role } = await requireStaff();
  const [items, locations] = await Promise.all([
    supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("locations").select("*").order("name"),
  ]);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">JOUW ACCOUNT</span>
          <h1>
            Mijn account<span>.</span>
          </h1>
          <p>
            Beheer je authenticator, installeer de app en deel hieronder je
            ideeën of meld een fout.
          </p>
        </div>
      </div>
      <div className="security-grid">
        <div>
          <AuthenticatorPanel factors={factors} mode="manage" />
        </div>
        <InstallApp />
      </div>
      <section id="feedback" className="account-feedback">
        {items.error || locations.error ? (
          <p className="notice error">
            Feedback kon niet worden geladen. Vernieuw de pagina om het opnieuw
            te proberen.
          </p>
        ) : (
          <FeedbackBoard
            items={items.data ?? []}
            locations={locations.data ?? []}
            admin={role.is_admin}
          />
        )}
      </section>
    </>
  );
}
