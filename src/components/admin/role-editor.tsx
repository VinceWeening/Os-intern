"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ResultMessage } from "./result-message";
import { saveRole } from "@/lib/admin/actions";
import { PERMISSIONS, type AccessRole } from "@/lib/auth/permissions";

export function RoleEditor({
  role,
  onClose,
  onSaved,
}: {
  role?: AccessRole;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const router = useRouter();
  const editorRef = useRef<HTMLElement>(null);
  useEffect(() => {
    editorRef.current?.focus();
    editorRef.current?.scrollIntoView({ block: "start" });
  }, []);
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [isAdmin, setIsAdmin] = useState(role?.is_admin ?? false);
  const [allLocations, setAllLocations] = useState(
    role?.all_locations ?? false,
  );
  const [permissions, setPermissions] = useState(role?.permissions ?? []);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ error?: string; success?: string }>(
    {},
  );
  function togglePermission(key: string, checked: boolean) {
    setPermissions((old) =>
      !checked && key === "cash.open"
        ? []
        : checked
          ? Array.from(new Set([...old, "cash.open", key]))
          : old.filter((item) => item !== key),
    );
  }
  return (
    <section
      ref={editorRef}
      tabIndex={-1}
      className="panel management-editor"
      aria-labelledby="edit-role-title"
    >
      <div className="editor-heading">
        <div>
          <span className="eyebrow">ZELF SAMENSTELLEN</span>
          <h2 id="edit-role-title">{role ? "Rol bewerken" : "Nieuwe rol"}</h2>
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
            const response = await saveRole({
              id: role?.id ?? null,
              name,
              description,
              isAdmin,
              allLocations: isAdmin || allLocations,
              permissions: isAdmin
                ? PERMISSIONS.map((p) => p.key)
                : permissions,
              version: role?.version ?? 0,
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
        <div>
          <label htmlFor="role-name">Rolnaam</label>
          <input
            id="role-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={60}
            disabled={busy}
            placeholder="Bijvoorbeeld: Avondverantwoordelijke"
          />
        </div>
        <div>
          <label htmlFor="role-description">Korte beschrijving</label>
          <input
            id="role-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={300}
            disabled={busy}
          />
        </div>
        <fieldset disabled={busy}>
          <legend>Beheertoegang</legend>
          <label className="check-row admin-check">
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(event) => setIsAdmin(event.target.checked)}
            />
            <span>
              Dit is een beheerderrol
              <small>
                Volledige toegang, inclusief gebruikers en rollen beheren.
                Alleen toekennen aan bevoegde beheerders.
              </small>
            </span>
          </label>
          <label className="check-row">
            <input
              type="checkbox"
              checked={isAdmin || allLocations}
              disabled={isAdmin}
              onChange={(event) => setAllLocations(event.target.checked)}
            />
            <span>
              Toegang tot alle vestigingen
              <small>
                Anders gelden de vestigingen die je per gebruiker selecteert.
              </small>
            </span>
          </label>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Onderdelen en handelingen</legend>
          <p className="form-help">
            Rechten met ‘voorbereid’ gelden zodra de bijbehorende kassafunctie
            is gebouwd.
          </p>
          {PERMISSIONS.map((permission) => (
            <label className="check-row" key={permission.key}>
              <input
                type="checkbox"
                checked={isAdmin || permissions.includes(permission.key)}
                disabled={isAdmin}
                onChange={(event) =>
                  togglePermission(permission.key, event.target.checked)
                }
              />
              <span>
                {permission.label}
                {!permission.available ? (
                  <span className="badge prepared">Voorbereid</span>
                ) : null}
                <small>{permission.description}</small>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="change-summary">
          <strong>Dit geldt voor iedereen met deze rol</strong>
          <p>
            {isAdmin
              ? "Alle onderdelen en gebruikersbeheer"
              : `${permissions.length} recht(en) geselecteerd`}{" "}
            ·{" "}
            {isAdmin || allLocations
              ? "Alle vestigingen"
              : "Persoonlijk toegewezen vestigingen"}
          </p>
        </div>
        <div>
          <label htmlFor="role-reason">Reden van de wijziging</label>
          <input
            id="role-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            required
            minLength={3}
            maxLength={500}
            disabled={busy}
            placeholder="Waarom maak of wijzig je deze rol?"
          />
        </div>
        <ResultMessage result={result} />
        <button className="button primary" disabled={busy}>
          {busy ? "Bezig met opslaan…" : role ? "Rol opslaan" : "Rol aanmaken"}
          <span>→</span>
        </button>
      </form>
    </section>
  );
}
