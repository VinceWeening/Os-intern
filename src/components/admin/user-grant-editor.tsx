"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EXTRA_PERMISSIONS, type AccessRole } from "@/lib/auth/permissions";
import { saveUserGrants } from "@/lib/admin/actions";
import type {
  ManagedUser,
  PermissionGrant,
} from "@/lib/supabase/database.types";
import { ResultMessage } from "./result-message";

function localDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function UserGrantEditor({
  user,
  role,
  grants,
  onSaved,
}: {
  user: ManagedUser;
  role?: AccessRole;
  grants: PermissionGrant[];
  onSaved: (message: string) => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(() =>
    Object.fromEntries(
      grants.map((g) => [
        g.permission,
        { temporary: g.expires_at !== null, end: localDate(g.expires_at) },
      ]),
    ),
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: string }>(
    {},
  );
  return (
    <section className="form-stack" aria-labelledby="personal-rights-title">
      <h3 id="personal-rights-title">Extra rechten voor deze gebruiker</h3>
      <p className="form-help">
        Boven op de opgeslagen rol {role?.name}. Elk extra recht kan permanent
        of tijdelijk gelden. De toegewezen vestigingen blijven gelden. Het
          onderdeel Kassa-afslag opent automatisch bij een extra kassarecht. Een
          extra bewerkrecht voor het dagoverzicht geeft ook toegang tot dat scherm. De
        instelling voor een gedeelde kassacomputer blijft bij de rol.
      </p>
      <form
        className="form-stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setResult({});
          try {
            const response = await saveUserGrants({
              userId: user.id,
              version: user.management_version,
              reason,
              grants: Object.entries(selected).map(([permission, value]) => ({
                permission,
                expires_at: value.temporary
                  ? new Date(value.end).toISOString()
                  : null,
              })),
            });
            setResult(response);
            if (response.success) {
              onSaved(response.success);
              router.refresh();
            }
          } catch {
            setResult({
              error:
                "Opslaan niet bevestigd. Controleer het eindmoment en vernieuw de gegevens voordat je opnieuw probeert.",
            });
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <legend>Persoonlijke uitzonderingen</legend>
          {EXTRA_PERMISSIONS.map((item) => {
            const value = selected[item.key];
            const fromRole =
              role?.is_admin || role?.permissions.includes(item.key);
            const original = grants.find((g) => g.permission === item.key);
            return (
              <div key={item.key} className="permission-grant">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={!!value}
                    onChange={(event) =>
                      setSelected((old) => {
                        const next = { ...old };
                        if (event.target.checked)
                          next[item.key] = { temporary: false, end: "" };
                        else delete next[item.key];
                        return next;
                      })
                    }
                  />
                  <span>
                    {item.label}
                    <small>
                      {item.description}
                      {fromRole
                        ? " Dit recht is ook via de rol toegekend; een eindmoment beperkt dat rolrecht niet."
                        : ""}
                    </small>
                  </span>
                </label>
                {original?.expires_at ? (
                  <p className="form-help">
                    Opgeslagen eindmoment:{" "}
                    {new Date(original.expires_at).toLocaleString("nl-NL", {
                      timeZone: "Europe/Amsterdam",
                    })}{" "}
                    (Amsterdam). Na dit moment is deze uitzondering vervallen.
                  </p>
                ) : null}
                {value ? (
                  <div className="editor-grid">
                    <label>
                      Geldigheid
                      <select
                        value={value.temporary ? "temporary" : "permanent"}
                        onChange={(e) =>
                          setSelected((old) => ({
                            ...old,
                            [item.key]: {
                              ...value,
                              temporary: e.target.value === "temporary",
                            },
                          }))
                        }
                      >
                        <option value="permanent">Permanent</option>
                        <option value="temporary">Tot datum en tijd</option>
                      </select>
                    </label>
                    {value.temporary ? (
                      <label>
                        Eindmoment (tijdzone van je apparaat)
                        <input
                          type="datetime-local"
                          required
                          value={value.end}
                          onChange={(e) =>
                            setSelected((old) => ({
                              ...old,
                              [item.key]: { ...value, end: e.target.value },
                            }))
                          }
                        />
                      </label>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </fieldset>
        <p className="form-help">
          Vink een extra recht uit om het in te trekken. Rechten uit de rol
          blijven bestaan. Verlopen uitzonderingen moet je verwijderen of een
          nieuw eindmoment geven voordat je opslaat.
        </p>
        <label>
          Reden voor persoonlijke rechten
          <input
            required
            minLength={3}
            maxLength={500}
            value={reason}
            disabled={busy}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <ResultMessage result={result} />
        <button className="button secondary" disabled={busy}>
          {busy ? "Bezig met opslaan…" : "Persoonlijke rechten opslaan"}
        </button>
      </form>
    </section>
  );
}
