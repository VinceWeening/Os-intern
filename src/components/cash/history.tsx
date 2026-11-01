import type { CashEvent } from "@/lib/cash/model";
export function CashHistory({
  events,
}: {
  events: (CashEvent & { actor_name?: string })[];
}) {
  const labels: Record<string, string> = {
    created: "Concept aangemaakt",
    saved: "Concept gewijzigd",
    submitted: "Ingediend",
    reviewed: "Gecontroleerd",
    reopened: "Heropend",
  };
  return (
    <section className="panel cash-history no-print">
      <h2>Historie</h2>
      {events.length === 0 ? (
        <p className="form-help">Nog geen gebeurtenissen.</p>
      ) : (
        events.map((event) => (
          <details className="audit-event" key={event.id}>
            <summary>
              <strong>{labels[event.action] ?? event.action}</strong>
              <span>
                {event.actor_name ?? event.actor_id} ·{" "}
                {new Intl.DateTimeFormat("nl-NL", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Europe/Amsterdam",
                }).format(new Date(event.occurred_at))}
              </span>
            </summary>
            {event.reason ? <p>Reden: {event.reason}</p> : null}
            <div className="audit-values">
              <div>
                <h3>Vóór</h3>
                <pre>
                  {JSON.stringify(event.before_values, null, 2) ?? "Nieuw"}
                </pre>
              </div>
              <div>
                <h3>Na</h3>
                <pre>{JSON.stringify(event.after_values, null, 2)}</pre>
              </div>
            </div>
          </details>
        ))
      )}
    </section>
  );
}
