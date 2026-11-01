"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ResultMessage } from "./result-message";
import { saveUser } from "@/lib/admin/actions";
import type { AccessRole } from "@/lib/auth/permissions";
import type { Location, ManagedUser } from "@/lib/supabase/database.types";

export function UserEditor({
  user,
  roles,
  locations,
  onClose,
  onSaved,
}: {
  user: ManagedUser;
  roles: AccessRole[];
  locations: Location[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const router = useRouter();
  const editorRef = useRef<HTMLElement>(null);
  useEffect(() => {
    editorRef.current?.focus();
    editorRef.current?.scrollIntoView({ block: "start" });
  }, []);
  const [name, setName] = useState(user.full_name);
  const [roleId, setRoleId] = useState(user.access_role_id ?? "");
  const [active, setActive] = useState(user.active);
  const [selectedLocations, setSelectedLocations] = useState(user.location_ids);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: string }>(
    {},
  );
  const role = roles.find((item) => item.id === roleId);
  return (
    <section
      ref={editorRef}
      tabIndex={-1}
      className="panel management-editor"
      aria-labelledby="edit-user-title"
    >
      <div className="editor-heading">
        <div>
          <span className="eyebrow">TOEGANG INSTELLEN</span>
          <h2 id="edit-user-title">
            {user.has_profile ? "Gebruiker bewerken" : "Gebruiker activeren"}
          </h2>
          <p>{user.email}</p>
        </div>
        <button className="button subtle" disabled={busy} onClick={onClose}>
          Sluiten ×
        </button>
      </div>
      <form
        className="form-stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setResult({});
          try {
            const response = await saveUser({
              id: user.id,
              name,
              roleId,
              active,
              locationIds: selectedLocations,
              version: user.management_version,
              reason,
            });
            setResult(response);
            if (response.success) {
              onSaved(response.success);
              router.refresh();
            }
          } catch {
            setResult({
              error:
                "Opslaan is niet bevestigd. Vernieuw de gegevens voordat je opnieuw probeert.",
            });
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="editor-grid">
          <div>
            <label htmlFor="staff-name">Naam</label>
            <input
              id="staff-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={120}
              disabled={busy}
            />
          </div>
          <div>
            <label htmlFor="staff-role">Rol</label>
            <select
              id="staff-role"
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
              required
              disabled={busy}
            >
              <option value="" disabled>
                Kies een rol
              </option>
              {roles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.is_admin ? " · beheerder" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <fieldset disabled={busy}>
          <legend>Vestigingen</legend>
          {role?.is_admin || role?.all_locations ? (
            <p className="notice">
              Deze rol geeft toegang tot alle vestigingen. De persoonlijke
              toewijzingen blijven bewaard voor een eventuele andere rol.
            </p>
          ) : null}
          {locations.map((location) => (
            <label className="check-row" key={location.id}>
              <input
                type="checkbox"
                checked={selectedLocations.includes(location.id)}
                onChange={(event) =>
                  setSelectedLocations((old) =>
                    event.target.checked
                      ? [...old, location.id]
                      : old.filter((id) => id !== location.id),
                  )
                }
              />
              <span>{location.name}</span>
            </label>
          ))}
        </fieldset>
        <label className="check-row">
          <input
            type="checkbox"
            checked={active}
            disabled={busy}
            onChange={(event) => setActive(event.target.checked)}
          />
          <span>
            Account actief
            <small>
              Uitgeschakeld: geen toegang tot bedrijfsgegevens, ook met een
              bestaande sessie.
            </small>
          </span>
        </label>
        <div className="change-summary">
          <strong>Je gaat opslaan</strong>
          <p>
            {name || "Naam nog invullen"} · {role?.name ?? "Geen rol"} ·{" "}
            {active ? "Actief" : "Geblokkeerd"} ·{" "}
            {role?.is_admin || role?.all_locations
              ? "Alle vestigingen"
              : locations
                  .filter((l) => selectedLocations.includes(l.id))
                  .map((l) => l.name)
                  .join(", ") || "Geen vestiging"}
          </p>
          {role?.is_admin ? (
            <p>Deze gebruiker mag ook gebruikers en rollen beheren.</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="user-reason">Reden van de wijziging</label>
          <input
            id="user-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            minLength={3}
            maxLength={500}
            disabled={busy}
            placeholder="Bijvoorbeeld: toegang voor nieuwe medewerker"
          />
        </div>
        <ResultMessage result={result} />
        <button className="button primary" disabled={busy}>
          {busy ? "Bezig met opslaan…" : "Gebruiker opslaan"}
          <span>→</span>
        </button>
      </form>
    </section>
  );
}
