import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { amsterdamWorkDate } from "@/lib/dates";
import { euro } from "@/lib/cash/model";
import {
  byLocation,
  monthRange,
  shortageOf,
  summarize,
  tipOf,
  type ReportTotals,
} from "@/lib/cash/report";
import { resultTone } from "@/components/cash/cash-sheet";
import "../kassa-afslag/cash.css";
import "./report.css";

export const metadata = { title: "Rapportage" };
export const dynamic = "force-dynamic";

function TotalsCard({
  title,
  totals,
}: {
  title: string;
  totals: ReportTotals;
}) {
  return (
    <section className="panel report-card">
      <h2>{title}</h2>
      <p className="report-count">
        {totals.closings} {totals.closings === 1 ? "afslag" : "afslagen"}
      </p>
      <div className="report-highlights">
        <div className="is-good">
          <span>Fooi totaal</span>
          <strong>{euro(totals.tips)}</strong>
        </div>
        <div className={totals.shortages ? "is-bad" : "is-good"}>
          <span>{totals.shortages ? "Tekort totaal" : "Tekorten"}</span>
          <strong>{totals.shortages ? euro(totals.shortages) : "Geen"}</strong>
        </div>
      </div>
      <dl className="report-lines">
        <div>
          <dt>Omzet</dt>
          <dd>{euro(totals.turnover)}</dd>
        </div>
        <div>
          <dt>Contant</dt>
          <dd>{euro(totals.cash)}</dd>
        </div>
        <div>
          <dt>PAX</dt>
          <dd>{euro(totals.pax)}</dd>
        </div>
        <div>
          <dt>Pay.nl</dt>
          <dd>{euro(totals.paynl)}</dd>
        </div>
        <div>
          <dt>iDEAL</dt>
          <dd>{euro(totals.ideal)}</dd>
        </div>
        <div>
          <dt>Bonnen</dt>
          <dd>{euro(totals.vouchers)}</dd>
        </div>
      </dl>
    </section>
  );
}

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ maand?: string; vestiging?: string }>;
}) {
  const { supabase } = await requirePermission("cash.reports");
  const params = await searchParams;
  const month = monthRange(params.maand ?? "")
    ? params.maand!
    : amsterdamWorkDate().slice(0, 7);
  const range = monthRange(month)!;
  const [report, locations] = await Promise.all([
    supabase.rpc("cash_report", { p_from: range.from, p_to: range.to }),
    supabase.from("locations").select("*").order("name"),
  ]);
  if (report.error || locations.error) throw new Error("REPORT_UNAVAILABLE");
  const location = locations.data?.find((l) => l.id === params.vestiging);
  const rows = (report.data ?? []).filter(
    (row) => !location || row.location_id === location.id,
  );
  const groups = byLocation(rows);
  const query = new URLSearchParams({ maand: month });
  if (location) query.set("vestiging", location.id);
  const monthName = new Date(`${range.from}T12:00:00Z`).toLocaleDateString(
    "nl-NL",
    { month: "long", year: "numeric", timeZone: "Europe/Amsterdam" },
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">INZICHT PER MAAND</span>
          <h1>
            Rapportage<span>.</span>
          </h1>
          <p>
            Ingediende en gecontroleerde afslagen van {monthName}. Concepten
            tellen niet mee.
          </p>
        </div>
        <a className="button secondary" href={`/rapportage/export?${query}`}>
          Exporteren naar Excel ↓
        </a>
      </div>
      <form className="panel cash-filters" method="get">
        <div>
          <label htmlFor="maand">Maand</label>
          <input id="maand" name="maand" type="month" defaultValue={month} />
        </div>
        <div>
          <label htmlFor="vestiging">Vestiging</label>
          <select
            id="vestiging"
            name="vestiging"
            defaultValue={location?.id ?? ""}
          >
            <option value="">Alle vestigingen</option>
            {locations.data?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <button className="button secondary">Tonen</button>
        <Link className="text-link" href="/rapportage">
          Deze maand
        </Link>
      </form>
      {rows.length ? (
        <>
          <div className="report-grid">
            {groups.length > 1 ? (
              <TotalsCard title="Totaal" totals={summarize(rows)} />
            ) : null}
            {groups.map((group) => (
              <TotalsCard
                key={group.id}
                title={group.name}
                totals={group.totals}
              />
            ))}
          </div>
          <section className="panel report-days">
            <h2>Per dag</h2>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Datum</th>
                    <th>Vestiging</th>
                    <th>Medewerker</th>
                    <th>Omzet</th>
                    <th>Fooi</th>
                    <th>Tekort</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link
                          className="text-link"
                          href={`/kassa-afslag/${row.id}`}
                        >
                          {row.work_date}
                        </Link>
                      </td>
                      <td>{row.location_name}</td>
                      <td>{row.employee_name}</td>
                      <td className="num">{euro(row.turnover_cents)}</td>
                      <td className={`num ${tipOf(row) ? resultTone(-1) : ""}`}>
                        {tipOf(row) ? euro(tipOf(row)) : "—"}
                      </td>
                      <td
                        className={`num ${shortageOf(row) ? resultTone(1) : ""}`}
                      >
                        {shortageOf(row) ? euro(shortageOf(row)) : "—"}
                      </td>
                      <td>
                        <span className={`badge closing-status ${row.status}`}>
                          {row.status === "reviewed"
                            ? "Gecontroleerd"
                            : "Ingediend"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="panel cash-empty">
          <h2>Geen ingediende afslagen in {monthName}.</h2>
          <p>Kies een andere maand of vestiging.</p>
        </section>
      )}
    </>
  );
}
