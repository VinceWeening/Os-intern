"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { transitionCash } from "@/lib/cash/actions";
export function ClosingControls({
  id,
  version,
  status,
  canReview,
  canReopen,
}: {
  id: string;
  version: number;
  status: string;
  canReview: boolean;
  canReopen: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  async function run(action: "review" | "reopen") {
    setBusy(true);
    setError("");
    try {
      const result = await transitionCash(id, version, action, reason);
      if (result.error) setError(result.error);
      else {
        setOpen(false);
        setReason("");
        router.refresh();
      }
    } catch {
      setError(
        "De wijziging kon niet worden bevestigd. Vernieuw de afslag voordat je opnieuw probeert.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel closing-controls no-print">
      <div className="button-row">
        <button className="button secondary" onClick={() => window.print()}>
          Afdrukken / bewaren als PDF
        </button>
        {status === "submitted" && canReview ? (
          <button
            className="button primary"
            disabled={busy}
            onClick={() => run("review")}
          >
            {busy ? "Bezig…" : "Als gecontroleerd markeren"} →
          </button>
        ) : null}
        {status !== "draft" && canReopen ? (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => setOpen((value) => !value)}
          >
            Heropenen met reden
          </button>
        ) : null}
      </div>
      {open ? (
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            run("reopen");
          }}
        >
          <label htmlFor="reopen-reason">
            Waarom moet deze afslag worden heropend?
          </label>
          <textarea
            id="reopen-reason"
            required
            minLength={3}
            maxLength={4000}
            value={reason}
            disabled={busy}
            onChange={(event) => setReason(event.target.value)}
          />
          <p className="form-help">
            De oude waarden blijven in de historie. De oorspronkelijke
            medewerker of een bevoegde manager kan het heropende concept
            aanpassen.
          </p>
          <button className="button primary" disabled={busy}>
            Heropenen bevestigen →
          </button>
        </form>
      ) : null}
      {error ? (
        <p className="notice error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
