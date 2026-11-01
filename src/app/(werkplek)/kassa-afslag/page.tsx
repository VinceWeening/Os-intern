import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { LocalDrafts } from "@/components/cash/local-drafts";
import { euro } from "@/lib/cash/model";
import "./cash.css";
export const metadata = { title: "Kassa-afslag" };
export const dynamic = "force-dynamic";
export default async function CashPage({
  searchParams,
}: {
  searchParams: Promise<{
    vestiging?: string;
    datum?: string;
    status?: string;
  }>;
}) {
  const { supabase, role, user } =
    await requirePermission("cash.open");
  const filters = await searchParams;
  let query = supabase
    .from("cash_closings")
    .select("*")
    .order("work_date", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(100);
  // RLS limits both queries to the user's own locations, so they can run together.
  if (/^[0-9a-f-]{36}$/i.test(filters.vestiging ?? ""))
    query = query.eq("location_id", filters.vestiging!);
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(filters.datum ?? "") &&
    !Number.isNaN(Date.parse(filters.datum!))
  )
    query = query.eq("work_date", filters.datum!);
  if (["draft", "submitted", "reviewed"].includes(filters.status ?? ""))
    query = query.eq(
      "status",
      filters.status as "draft" | "submitted" | "reviewed",
    );
  const [
    { data: locations, error },
    { data: closings, error: closingError },
  ] = await Promise.all([
    supabase.from("locations").select("*").order("name"),
    query,
  ]);
  if (error) throw new Error("LOCATIONS_UNAVAILABLE");
  if (closingError) throw new Error("CLOSINGS_UNAVAILABLE");
  const labels = {
    draft: "Concept",
    submitted: "Ingediend",
    reviewed: "Gecontroleerd",
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">DE AVOND NETJES AFRONDEN</span>
          <h1>
            Kassa-afslag<span>.</span>
          </h1>
          <p>
            Je tellingen, concepten en gecontroleerde afsluitingen op één plek.
          </p>
        </div>
        {hasPermission(role, "cash.submit") ? (
          <Link className="button primary" href="/kassa-afslag/nieuw">
            ＋ Nieuwe afslag
          </Link>
        ) : null}
      </div>
      <LocalDrafts userId={user.id} />
      <form className="panel cash-filters" method="get">
        <div>
          <label htmlFor="vestiging">Vestiging</label>
          <select
            id="vestiging"
            name="vestiging"
            defaultValue={filters.vestiging ?? ""}
          >
            <option value="">Alle toegestane vestigingen</option>
            {locations?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="datum">Werkdatum</label>
          <input
            id="datum"
            name="datum"
            type="date"
            defaultValue={filters.datum ?? ""}
          />
        </div>
        <div>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">Alle statussen</option>
            <option value="draft">Concept</option>
            <option value="submitted">Ingediend</option>
            <option value="reviewed">Gecontroleerd</option>
          </select>
        </div>
        <button className="button secondary">Filteren</button>
        <Link className="text-link" href="/kassa-afslag">
          Wissen
        </Link>
      </form>
      <div className="closings-list">
        {closings?.map((closing) => (
          <Link
            href={`/kassa-afslag/${closing.id}`}
            className="panel closing-card"
            key={closing.id}
          >
            <div>
              <span className="eyebrow">
                {locations?.find((l) => l.id === closing.location_id)?.name}
              </span>
              <h2>{closing.work_date}</h2>
              <p>{closing.employee_name}</p>
            </div>
            <div>
              <span className={`badge closing-status ${closing.status}`}>
                {labels[closing.status]}
              </span>
              <dl>
                <div>
                  <dt>Geteld</dt>
                  <dd>{euro(closing.counted_cents)}</dd>
                </div>
                <div>
                  <dt>
                    {closing.result_cents !== null && closing.result_cents < 0
                      ? "Fooi"
                      : closing.result_cents !== null &&
                          closing.result_cents > 0
                        ? "Tekort"
                        : "Resultaat"}
                  </dt>
                  <dd>
                    {euro(
                      closing.result_cents === null
                        ? null
                        : Math.abs(closing.result_cents),
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            <span aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
      {!closings?.length ? (
        <section className="panel cash-empty">
          <h2>Nog geen afsluitingen gevonden.</h2>
          <p>Begin een nieuwe afslag of pas je filters aan.</p>
        </section>
      ) : null}
      <p className="form-help">
        Maximaal de 100 meest recente passende afsluitingen. Gebruik filters om
        gericht te zoeken.
      </p>
    </>
  );
}
