"use client";
import { useState } from "react";
import { PERMISSIONS, type AccessRole } from "@/lib/auth/permissions";
import type {
  PermissionGrant,
  AccessEvent,
  Location,
  ManagedUser,
} from "@/lib/supabase/database.types";

import { UserEditor } from "./user-editor";
import { RoleEditor } from "./role-editor";

type Props = {
  grants: PermissionGrant[];
  users: ManagedUser[];
  roles: AccessRole[];
  locations: Location[];
  events: AccessEvent[];
  actors: { id: string; full_name: string }[];
};
export function UserManagement({
  grants,
  users,
  roles,
  locations,
  events,
  actors,
}: Props) {
  const [tab, setTab] = useState<"users" | "roles" | "history">("users");
  const [userId, setUserId] = useState<string | null>(null);
  const [roleId, setRoleId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState(false);
  const [search, setSearch] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const user = users.find((item) => item.id === userId);
  const role = roles.find((item) => item.id === roleId);
  const filtered = users.filter((item) =>
    `${item.full_name} ${item.email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="management-tabs" aria-label="Beheeronderdelen">
        {(
          [
            ["users", "Gebruikers"],
            ["roles", "Rollen & rechten"],
            ["history", "Wijzigingslog"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            className="button"
            aria-pressed={tab === key}
            onClick={() => {
              setTab(key);
              setUserId(null);
              setRoleId(null);
              setNewRole(false);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {savedMessage ? (
        <p className="notice success" role="status">
          {savedMessage}
        </p>
      ) : null}
      {tab === "users" ? (
        <>
          <div className="management-toolbar">
            <div>
              <label htmlFor="user-search">Zoek een gebruiker</label>
              <input
                id="user-search"
                type="search"
                placeholder="Naam of e-mailadres"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <p className="form-help">
              Accounts worden voorlopig vooraf in Supabase aangemaakt. Daarna
              kun je ze hier activeren en een rol geven.
            </p>
          </div>
          <div className="user-list">
            {filtered.map((item) => {
              const itemRole = roles.find((r) => r.id === item.access_role_id);
              return (
                <section key={item.id} className="panel user-row">
                  <div className="user-identity">
                    <span className="avatar">
                      {(item.full_name || item.email).slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <h2>{item.full_name || "Nog in te richten"}</h2>
                      <p>{item.email}</p>
                    </div>
                  </div>
                  <div className="user-access">
                    <span className="badge">
                      {itemRole?.name ?? "Geen rol"}
                    </span>
                    <span
                      className={`user-status ${item.active ? "is-active" : ""}`}
                    >
                      {!item.has_profile
                        ? "Nog geen toegang"
                        : item.active
                          ? "Actief"
                          : "Geblokkeerd"}
                    </span>
                    <small>
                      {itemRole?.is_admin || itemRole?.all_locations
                        ? "Alle vestigingen"
                        : item.location_ids.length
                          ? locations
                              .filter((l) => item.location_ids.includes(l.id))
                              .map((l) => l.name)
                              .join(" · ")
                          : "Geen vestiging"}
                    </small>
                  </div>
                  <button
                    className="button secondary"
                    onClick={() => setUserId(item.id)}
                  >
                    Bewerken →
                  </button>
                </section>
              );
            })}
          </div>
          {filtered.length === 0 ? (
            <div className="notice">Geen gebruikers gevonden.</div>
          ) : null}
          {user ? (
            <UserEditor
              key={`${user.id}-${user.management_version}`}
              grants={grants.filter((g) => g.user_id === user.id)}
              user={user}
              roles={roles}
              locations={locations}
              onClose={() => setUserId(null)}
              onSaved={(message) => {
                setSavedMessage(message);
                setUserId(null);
              }}
            />
          ) : null}
        </>
      ) : null}
      {tab === "roles" ? (
        <>
          <div className="management-toolbar">
            <p className="form-help">
              Rechten gelden voor iedereen met de gekozen rol. Vestigingstoegang
              stel je apart in. Je kunt de startrollen aanpassen of je eigen rol
              toevoegen.
            </p>
            <button
              className="button primary"
              onClick={() => {
                setRoleId(null);
                setNewRole(true);
              }}
            >
              ＋ Rol maken
            </button>
          </div>
          <div className="role-grid">
            {roles.map((item) => (
              <section className="panel role-card" key={item.id}>
                <div className="role-heading">
                  <h2>{item.name}</h2>
                  {item.is_admin ? (
                    <span className="badge">Beheerder</span>
                  ) : null}
                </div>
                <p>{item.description || "Geen beschrijving."}</p>
                <small>
                  {users.filter((u) => u.access_role_id === item.id).length}{" "}
                  gebruiker(s) ·{" "}
                  {item.is_admin || item.all_locations
                    ? "Alle vestigingen"
                    : "Toegewezen vestigingen"}
                </small>
                <ul>
                  {item.is_admin ? (
                    <li>Alle onderdelen en gebruikersbeheer</li>
                  ) : (
                    PERMISSIONS.filter((p) =>
                      item.permissions.includes(p.key),
                    ).map((p) => (
                      <li key={p.key}>
                        {p.label}
                        {!p.available ? " · voorbereid" : ""}
                      </li>
                    ))
                  )}
                </ul>
                {!item.is_admin && item.permissions.length === 0 ? (
                  <p className="form-help">Alleen het eigen account.</p>
                ) : null}
                <button
                  className="button secondary"
                  onClick={() => {
                    setNewRole(false);
                    setRoleId(item.id);
                  }}
                >
                  Rechten aanpassen →
                </button>
              </section>
            ))}
          </div>
          {newRole || role ? (
            <RoleEditor
              key={role ? `${role.id}-${role.version}` : "new"}
              role={role}
              onSaved={(message) => {
                setSavedMessage(message);
                setRoleId(null);
                setNewRole(false);
              }}
              onClose={() => {
                setRoleId(null);
                setNewRole(false);
              }}
            />
          ) : null}
        </>
      ) : null}
      {tab === "history" ? (
        <section className="panel audit-panel">
          <h2>Laatste beheerwijzigingen</h2>
          <p className="form-help">
            Wie heeft wat gewijzigd en waarom? De laatste 30 wijzigingen worden
            getoond.
          </p>
          {events.length === 0 ? (
            <p className="notice">
              Er zijn nog geen wijzigingen via gebruikersbeheer opgeslagen.
            </p>
          ) : (
            events.map((event) => (
              <details className="audit-event" key={event.id}>
                <summary>
                  <span>
                    {new Intl.DateTimeFormat("nl-NL", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/Amsterdam",
                    }).format(new Date(event.occurred_at))}{" "}
                    ·{" "}
                    {actors.find((a) => a.id === event.actor_id)?.full_name ??
                      "Beheerder"}
                  </span>
                  <strong>
                    {event.entity_type === "role"
                      ? "Rol"
                      : event.entity_type === "form"
                        ? "Kasformulier"
                        : "Gebruiker"}{" "}
                    — {event.reason}
                  </strong>
                </summary>
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
      ) : null}
    </>
  );
}
