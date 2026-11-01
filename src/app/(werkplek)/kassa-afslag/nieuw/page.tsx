import { randomUUID } from "node:crypto";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { WorkplaceShell } from "@/components/workplace-shell";
import { CashForm } from "@/components/cash/cash-form";
import { amsterdamWorkDate } from "@/lib/dates";
import type { CashSnapshot } from "@/lib/supabase/database.types";
import "../cash.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nieuwe kassa-afslag" };
export default async function NewClosing({
  searchParams,
}: {
  searchParams: Promise<{ locatie?: string; herstel?: string }>;
}) {
  const { supabase, profile, role, user } =
    await requirePermission("cash.submit");
  const params = await searchParams;
  const { data: locations, error } = await supabase
    .from("locations")
    .select("*")
    .order("name");
  if (error) throw new Error("LOCATIONS_UNAVAILABLE");
  const id = /^[0-9a-f-]{36}$/i.test(params.herstel ?? "")
    ? params.herstel!
    : randomUUID();
  let initial: CashSnapshot | null = null;
  if (params.herstel) {
    const { data: closing } = await supabase
      .from("cash_closings")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (closing) {
      const { data: lines } = await supabase
        .from("cash_count_lines")
        .select("*")
        .eq("closing_id", id);
      initial = {
        closing,
        counts: Object.fromEntries(
          (lines ?? []).map((line) => [line.denomination_cents, line.quantity]),
        ),
      };
    }
  }
  const locationId =
    locations?.find((l) => l.id === params.locatie)?.id ??
    locations?.[0]?.id ??
    "";
  return (
    <WorkplaceShell
      name={profile.full_name}
      role={role.name}
      canManage={role.is_admin}
      cashAllowed={hasPermission(role, "cash.open")}
      active="cash"
    >
      <div className="page-heading no-print">
        <div>
          <span className="eyebrow">KASTELLING FORMULIER</span>
          <h1>
            Nieuwe afslag<span>.</span>
          </h1>
          <p>Tel je geld, controleer de betaalwijzen en rond de avond af.</p>
        </div>
      </div>
      {!locations?.length ? (
        <p className="notice">
          Er is nog geen vestiging aan je account toegewezen.
        </p>
      ) : initial && initial.closing.status !== "draft" ? (
        <p className="notice">
          Deze afslag is al ingediend.{" "}
          <a className="text-link" href={`/kassa-afslag/${id}`}>
            Bekijk de serverversie →
          </a>
        </p>
      ) : (
        <CashForm
          key={id}
          id={id}
          userId={user.id}
          name={initial?.closing.employee_name ?? profile.full_name}
          locations={locations}
          date={amsterdamWorkDate()}
          locationId={locationId}
          initial={initial}
        />
      )}
    </WorkplaceShell>
  );
}
