import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { amsterdamWorkDate } from "@/lib/dates";
import { DailyEditor, PrintDaily } from "@/components/daily/daily-editor";
import { CashSheet } from "@/components/cash/cash-sheet";
import { closingToDraft, validateDraft } from "@/lib/cash/model";
import "@/components/admin/admin.css";
import "../kassa-afslag/cash.css";
import "./daily.css";
export const dynamic = "force-dynamic";
export const metadata = { title: "Dagoverzicht" };
export default async function DailyPage({
  searchParams,
}: {
  searchParams: Promise<{ vestiging?: string; datum?: string }>;
}) {
  const { supabase, role, profile } = await requirePermission("day.open");
  const params = await searchParams;
  const date =
    params.datum &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.datum) &&
    !Number.isNaN(Date.parse(params.datum)) &&
    new Date(params.datum + "T12:00:00Z").toISOString().slice(0, 10) ===
      params.datum
      ? params.datum
      : amsterdamWorkDate();
  const locations = await supabase.from("locations").select("*").order("name");
  if (locations.error) throw new Error("DAILY_LOCATIONS_UNAVAILABLE");
  const location =
    locations.data?.find((l) => l.id === params.vestiging) ??
    locations.data?.find((l) => l.id === profile.default_location_id) ??
    locations.data?.[0];
  if (!location)
    return (
      <p className="notice">Er is geen vestiging aan je account toegewezen.</p>
    );
  const [summary, cash] = await Promise.all([
    supabase
      .from("daily_summaries")
      .select("*")
      .eq("location_id", location.id)
      .eq("work_date", date)
      .maybeSingle(),
    supabase
      .from("cash_closings")
      .select("*")
      .eq("location_id", location.id)
      .eq("work_date", date)
      .not("first_submitted_at", "is", null)
      .maybeSingle(),
  ]);
  if (summary.error || cash.error)
    throw new Error("DAILY_OVERVIEW_UNAVAILABLE");
  const day = summary.data;
  const closing = cash.data;
  const lines = closing
    ? await supabase
        .from("cash_count_lines")
        .select("*")
        .eq("closing_id", closing.id)
    : null;
  if (lines?.error) throw new Error("DAILY_CASH_UNAVAILABLE");
  const payload = closing
    ? validateDraft(
        closingToDraft(
          closing,
          Object.fromEntries(
            (lines?.data ?? []).map((l) => [l.denomination_cents, l.quantity]),
          ),
        ),
        false,
        closing.opening_default_cents,
      ).payload
    : null;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">EEN DAG, EEN OVERZICHT</span>
          <h1>Dagoverzicht.</h1>
          <p>
            {location.name} · {date}
          </p>
        </div>
        <PrintDaily />
      </div>
      <form className="panel daily-filters no-print" method="get">
        <label>
          Vestiging
          <select name="vestiging" defaultValue={location.id}>
            {locations.data?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Werkdatum
          <input type="date" name="datum" defaultValue={date} required />
        </label>
        <button className="button secondary">Dag bekijken</button>
      </form>
      {hasPermission(role, "day.edit") ? (
        <DailyEditor
          key={`${location.id}-${date}-${day?.version ?? 0}`}
          locationId={location.id}
          date={date}
          initial={day}
        />
      ) : null}
      <section className="panel management-editor daily-document">
        <span className="eyebrow">OPGESLAGEN DAGDOCUMENT</span>
        <h2>
          {location.name} · {date}
        </h2>
        {day ? (
          <>
            <p className="form-help">
              Laatst opgeslagen door {day.updated_name} ·{" "}
              {new Date(day.updated_at).toLocaleString("nl-NL", {
                timeZone: "Europe/Amsterdam",
              })}
            </p>
            <h3>Opmerkingen over de dag</h3>
            <p className="preserve-lines">
              {day.notes || "Geen opmerkingen ingevuld."}
            </p>
            <h3>Autoritten</h3>
            {day.rides.length ? (
              <table className="daily-table">
                <thead>
                  <tr>
                    <th>Auto</th>
                    <th>Bestuurder</th>
                    <th>Meerijders</th>
                  </tr>
                </thead>
                <tbody>
                  {day.rides.map((r, i) => (
                    <tr key={i}>
                      <td>{r.car}</td>
                      <td>{r.driver}</td>
                      <td>{r.passengers || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Geen autoritten ingevuld.</p>
            )}
            <h3>Meegegeten</h3>
            <p className="preserve-lines">
              {day.diners || "Geen mee-eters ingevuld."}
            </p>
            <h3>Verspilling</h3>
            {day.waste.length ? (
              <table className="daily-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Hoeveelheid</th>
                    <th>Reden</th>
                  </tr>
                </thead>
                <tbody>
                  {day.waste.map((w, i) => (
                    <tr key={i}>
                      <td>{w.product}</td>
                      <td>{w.quantity}</td>
                      <td>{w.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>Geen verspilling ingevuld.</p>
            )}
          </>
        ) : (
          <p className="notice">
            Voor deze dag zijn nog geen daggegevens opgeslagen.
          </p>
        )}
      </section>
      <section className="daily-cash">
        <div className="editor-heading">
          <h2>Bijbehorende kassa-afslag</h2>
          {closing ? (
            <Link
              className="text-link no-print"
              href={`/kassa-afslag/${closing.id}`}
            >
              Afslag openen →
            </Link>
          ) : null}
        </div>
        {payload && closing ? (
          <CashSheet
            payload={payload}
            name={closing.employee_name}
            location={location.name}
            status={
              closing.status === "reviewed"
                ? "Gecontroleerd"
                : closing.status === "submitted"
                  ? "Ingediend"
                  : "Heropend"
            }
          />
        ) : (
          <p className="notice">
            Er is nog geen ingediende kassa-afslag beschikbaar voor deze dag
            binnen jouw rechten.
          </p>
        )}
      </section>
    </>
  );
}
