"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveDaily } from "@/lib/daily/actions";
import type { DailyInput, DailySummary } from "@/lib/daily/model";
import { ResultMessage } from "@/components/admin/result-message";
export function DailyEditor({
  locationId,
  date,
  initial,
}: {
  locationId: string;
  date: string;
  initial: DailySummary | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState<DailyInput>({
    notes: initial?.notes ?? "",
    diners: initial?.diners ?? "",
    rides: initial?.rides ?? [],
    waste: initial?.waste ?? [],
  });
  const [version, setVersion] = useState(initial?.version ?? 0),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{ error?: string; success?: string }>({});
  function change(update: (old: DailyInput) => DailyInput) {
    setValue(update);
    setDirty(true);
    setResult({});
  }
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return (
    <section className="panel management-editor no-print">
      <h2>Dagoverzicht invullen</h2>
      <p className="form-help">
        {dirty ? "Niet opgeslagen. " : ""}Sla wijzigingen op voordat je dit
        scherm verlaat. Dit dagoverzicht wordt samen met de beschikbare
        kassa-afslag hieronder getoond.
      </p>
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setResult({});
          try {
            const response = await saveDaily({
              locationId,
              date,
              version,
              values: value,
            });
            setResult(response);
            if ("summary" in response && response.summary) {
              setVersion(response.summary.version);
              setDirty(false);
              router.refresh();
            }
          } catch {
            setResult({
              error:
                "Opslaan niet bevestigd. Laat dit scherm open; je invoer blijft hier staan.",
            });
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="form-stack">
          <legend>Gegevens van de dag</legend>
          <label>
            Opmerkingen over de dag
            <textarea
              rows={4}
              maxLength={4000}
              value={value.notes}
              onChange={(e) =>
                change((old) => ({ ...old, notes: e.target.value }))
              }
            />
          </label>
          <section>
            <h3>Wie reed in welke auto?</h3>
            <p className="form-help">
              Vul de auto, bestuurder en eventuele meerijders in.
            </p>
            {value.rides.map((ride, i) => (
              <div className="daily-entry" key={i}>
                {(["car", "driver", "passengers"] as const).map((key) => (
                  <label key={key}>
                    {key === "car"
                      ? "Auto"
                      : key === "driver"
                        ? "Bestuurder"
                        : "Meerijders"}
                    <input
                      required={key !== "passengers"}
                      maxLength={500}
                      value={ride[key]}
                      onChange={(e) =>
                        change((old) => ({
                          ...old,
                          rides: old.rides.map((r, j) =>
                            j === i ? { ...r, [key]: e.target.value } : r,
                          ),
                        }))
                      }
                    />
                  </label>
                ))}
                <button
                  type="button"
                  className="button subtle"
                  onClick={() =>
                    change((old) => ({
                      ...old,
                      rides: old.rides.filter((_, j) => j !== i),
                    }))
                  }
                >
                  Autorit verwijderen
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button secondary"
              disabled={value.rides.length >= 50}
              onClick={() =>
                change((old) => ({
                  ...old,
                  rides: [
                    ...old.rides,
                    { car: "", driver: "", passengers: "" },
                  ],
                }))
              }
            >
              Autorit toevoegen
            </button>
          </section>
          <label>
            Wie heeft meegegeten?
            <textarea
              rows={3}
              maxLength={4000}
              value={value.diners}
              onChange={(e) =>
                change((old) => ({ ...old, diners: e.target.value }))
              }
              placeholder="Eén naam per regel"
            />
          </label>
          <section>
            <h3>Verspilling van de avond</h3>
            <p className="form-help">
              Bijvoorbeeld: kipsaté — 2 porties. Vermeld de eenheid bij de
              hoeveelheid.
            </p>
            {value.waste.map((waste, i) => (
              <div className="daily-entry" key={i}>
                {(["product", "quantity", "reason"] as const).map((key) => (
                  <label key={key}>
                    {key === "product"
                      ? "Product"
                      : key === "quantity"
                        ? "Hoeveelheid en eenheid"
                        : "Reden (optioneel)"}
                    <input
                      required={key !== "reason"}
                      maxLength={500}
                      value={waste[key]}
                      onChange={(e) =>
                        change((old) => ({
                          ...old,
                          waste: old.waste.map((w, j) =>
                            j === i ? { ...w, [key]: e.target.value } : w,
                          ),
                        }))
                      }
                    />
                  </label>
                ))}
                <button
                  type="button"
                  className="button subtle"
                  onClick={() =>
                    change((old) => ({
                      ...old,
                      waste: old.waste.filter((_, j) => j !== i),
                    }))
                  }
                >
                  Verspilling verwijderen
                </button>
              </div>
            ))}
            <button
              type="button"
              className="button secondary"
              disabled={value.waste.length >= 50}
              onClick={() =>
                change((old) => ({
                  ...old,
                  waste: [
                    ...old.waste,
                    { product: "", quantity: "", reason: "" },
                  ],
                }))
              }
            >
              Verspilling toevoegen
            </button>
          </section>
        </fieldset>
        <ResultMessage result={result} />
        <button className="button primary" disabled={busy}>
          {busy ? "Bezig met opslaan…" : "Dagoverzicht opslaan"}
        </button>
      </form>
    </section>
  );
}
export function PrintDaily() {
  return (
    <button
      className="button secondary no-print"
      onClick={() => window.print()}
    >
      Dagdocument afdrukken / PDF
    </button>
  );
}
