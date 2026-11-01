import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { WorkplaceShell } from "@/components/workplace-shell";
import { CashForm } from "@/components/cash/cash-form";
import { CashSheet } from "@/components/cash/cash-sheet";
import { CashHistory } from "@/components/cash/history";
import { ClosingControls } from "@/components/cash/closing-controls";
import { closingToDraft, validateDraft } from "@/lib/cash/model";
import "../cash.css";
import "@/components/admin/admin.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Kassa-afslag" };
export default async function ClosingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase, profile, role, user } =
    await requirePermission("cash.open");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [{ data: closing, error }, lines, locations, events] = await Promise.all([
    supabase.from("cash_closings").select("*").eq("id", id).maybeSingle(),
    supabase.from("cash_count_lines").select("*").eq("closing_id", id),
    supabase.from("locations").select("*").order("name"),
    supabase
      .from("closing_events")
      .select("*")
      .eq("closing_id", id)
      .order("occurred_at", { ascending: false }),
  ]);
  if (error) throw new Error("CLOSING_UNAVAILABLE");
  if (!closing) notFound();
  if (lines.error || locations.error || events.error)
    throw new Error("CLOSING_DETAIL_UNAVAILABLE");
  const counts = Object.fromEntries(
    (lines.data ?? []).map((line) => [line.denomination_cents, line.quantity]),
  );
  const canEdit =
    closing.status === "draft" &&
    hasPermission(role, "cash.submit") &&
    (closing.employee_id === user.id ||
      (Boolean(closing.first_submitted_at) &&
        hasPermission(role, "cash.reopen")));
  const status = {
    draft: "Concept",
    submitted: "Ingediend",
    reviewed: "Gecontroleerd",
  }[closing.status];
  const payload = validateDraft(
    closingToDraft(closing, counts),
    false,
    closing.opening_default_cents,
  ).payload;
  return (
    <WorkplaceShell
      name={profile.full_name}
      role={role.name}
      canManage={role.is_admin}
      active="cash"
    >
      <div className="page-heading no-print">
        <div>
          <Link className="text-link" href="/kassa-afslag">
            ← Alle afsluitingen
          </Link>
          <h1>
            Kassa-afslag<span>.</span>
          </h1>
          <p>
            {locations.data?.find((l) => l.id === closing.location_id)?.name} ·{" "}
            {closing.work_date} · {closing.employee_name}
          </p>
        </div>
        <span className={`badge closing-status ${closing.status}`}>
          {status}
        </span>
      </div>
      {closing.first_submitted_at ? (
        <p className="form-help no-print">
          Eerste indiening:{" "}
          {new Date(closing.first_submitted_at).toLocaleString("nl-NL", {
            timeZone: "Europe/Amsterdam",
          })}
          {closing.last_submitted_at !== closing.first_submitted_at
            ? ` · Laatste indiening: ${new Date(closing.last_submitted_at!).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })}`
            : ""}
        </p>
      ) : null}
      {canEdit ? (
        <CashForm
          key={id}
          id={id}
          userId={user.id}
          name={closing.employee_name}
          locations={locations.data ?? []}
          date={closing.work_date}
          locationId={closing.location_id}
          initial={{ closing, counts }}
        />
      ) : (
        <CashSheet
          payload={payload}
          name={closing.employee_name}
          location={
            locations.data?.find((l) => l.id === closing.location_id)?.name ??
            ""
          }
          status={status}
        />
      )}
      <ClosingControls
        id={id}
        version={closing.version}
        status={closing.status}
        canReview={hasPermission(role, "cash.review")}
        canReopen={hasPermission(role, "cash.reopen")}
      />
      <CashHistory events={events.data ?? []} />
    </WorkplaceShell>
  );
}
