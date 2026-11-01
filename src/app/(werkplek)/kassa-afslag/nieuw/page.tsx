import { randomUUID } from "node:crypto";
import { requirePermission } from "@/lib/auth/session";
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
  const { supabase, profile, user } =
    await requirePermission("cash.submit");
  const params = await searchParams;
  const restoring = /^[0-9a-f-]{36}$/i.test(params.herstel ?? "");
  const id = restoring ? params.herstel! : randomUUID();
  const [{ data: locations, error }, { data: closing }, { data: lines }] =
    await Promise.all([
      supabase.from("locations").select("*").order("name"),
      restoring
        ? supabase.from("cash_closings").select("*").eq("id", id).maybeSingle()
        : Promise.resolve({ data: null }),
      restoring
        ? supabase.from("cash_count_lines").select("*").eq("closing_id", id)
        : Promise.resolve({ data: null }),
    ]);
  if (error) throw new Error("LOCATIONS_UNAVAILABLE");
  let initial: CashSnapshot | null = null;
  if (restoring) {
    if (closing) {
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
    locations?.find((l) => l.id === profile.default_location_id)?.id ??
    locations?.[0]?.id ??
    "";
  return (
    <>
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
          defaultLocationId={profile.default_location_id}
          initial={initial}
        />
      )}
    </>
  );
}
