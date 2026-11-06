"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendFeedback, updateFeedback } from "@/lib/daily/actions";
import type { Feedback } from "@/lib/daily/model";
import type { Location } from "@/lib/supabase/database.types";
import { ResultMessage } from "@/components/admin/result-message";
const statuses = { new: "Nieuw", planned: "In behandeling", done: "Afgerond" };
export function FeedbackBoard({
  items,
  locations,
  admin,
}: {
  items: Feedback[];
  locations: Location[];
  admin: boolean;
}) {
  const router = useRouter();
  const requestId = useRef<string | null>(null);
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [kind, setKind] = useState("idea"),
    [locationId, setLocationId] = useState("");
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState<{ error?: string; success?: string }>({});
  return (
    <div className="feedback-layout">
      <section className="panel management-editor">
        <h2>Deel je idee of meld een fout</h2>
        <p>
          Vertel wat je wilt verbeteren, of wat er gebeurde en wat je
          verwachtte. Deel geen wachtwoorden of authenticatorcodes.
        </p>
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setResult({});
            requestId.current ??= crypto.randomUUID();
            try {
              const response = await sendFeedback({
                id: requestId.current,
                locationId: locationId || null,
                kind,
                title,
                description,
              });
              setResult(response);
              if (response.success) {
                requestId.current = null;
                setTitle("");
                setDescription("");
                router.refresh();
              }
            } catch {
              setResult({
                error:
                  "Verzenden is niet bevestigd. Je tekst blijft staan; je kunt opnieuw proberen.",
              });
            } finally {
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy} className="form-stack">
            <legend>Nieuwe melding</legend>
            <label>
              Soort
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="idea">Idee of verzoek</option>
                <option value="bug">Fout melden</option>
              </select>
            </label>
            <label>
              Vestiging
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">Algemeen / de app</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Korte titel
              <input
                required
                minLength={3}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label>
              Omschrijving
              <textarea
                required
                minLength={3}
                maxLength={4000}
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </fieldset>
          <ResultMessage result={result} />
          <button className="button primary" disabled={busy}>
            {busy ? "Bezig met versturen…" : "Melding versturen"}
          </button>
        </form>
      </section>
      <section className="form-stack">
        <h2>{admin ? "Binnengekomen ideeën en fouten" : "Jouw meldingen"}</h2>
        <p className="form-help">
          {admin
            ? "Beheerders kunnen de status bijwerken."
            : "Je eigen meldingen zijn zichtbaar voor jou en de beheerders."}{" "}
          De nieuwste 100 meldingen worden getoond.
        </p>
        {items.length ? (
          items.map((item) => (
            <article className="panel management-editor" key={item.id}>
              <div className="editor-heading">
                <h3>{item.title}</h3>
                <span className="badge">{statuses[item.status]}</span>
              </div>
              <p className="form-help">
                {item.kind === "idea" ? "Idee" : "Fout"} · {item.author_name} ·{" "}
                {locations.find((l) => l.id === item.location_id)?.name ??
                  "Algemeen"}{" "}
                ·{" "}
                {new Date(item.created_at).toLocaleDateString("nl-NL", {
                  timeZone: "Europe/Amsterdam",
                })}
              </p>
              <p className="preserve-lines">{item.description}</p>
              {admin ? (
                <label>
                  Status
                  <select
                    value={item.status}
                    disabled={busy}
                    onChange={async (e) => {
                      setBusy(true);
                      try {
                        const response = await updateFeedback(
                          item.id,
                          item.version,
                          e.target.value,
                        );
                        setResult(response);
                        router.refresh();
                      } catch {
                        setResult({
                          error:
                            "Statuswijziging niet bevestigd. Vernieuw de gegevens.",
                        });
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {Object.entries(statuses).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </article>
          ))
        ) : (
          <p className="notice">Nog geen meldingen.</p>
        )}
      </section>
    </div>
  );
}
