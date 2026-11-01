import { requirePermission } from "@/lib/auth/session";
import { amsterdamWorkDate } from "@/lib/dates";
import { monthRange, toCsv } from "@/lib/cash/report";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { supabase } = await requirePermission("cash.reports");
  const params = new URL(request.url).searchParams;
  const month = monthRange(params.get("maand") ?? "")
    ? params.get("maand")!
    : amsterdamWorkDate().slice(0, 7);
  const range = monthRange(month)!;
  const { data, error } = await supabase.rpc("cash_report", {
    p_from: range.from,
    p_to: range.to,
  });
  if (error)
    return new Response("Rapportage is niet beschikbaar.", { status: 503 });
  const location = params.get("vestiging");
  const rows = (data ?? []).filter(
    (row) => !location || row.location_id === location,
  );
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kassa-afslagen-${month}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
