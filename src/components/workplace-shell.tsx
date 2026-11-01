import Link from "next/link";
import { Brand } from "./brand";
import { SignOut } from "./sign-out";
import { NavLink } from "./workplace-nav";

type Props = {
  children: React.ReactNode;
  name: string;
  role: string;
  // Only for the static preview; inside the werkplek layout the URL decides.
  active?: "cash" | "security" | "users";
  preview?: boolean;
  canManage?: boolean;
  cashAllowed?: boolean;
  canReport?: boolean;
};

// Simple line icons, drawn in the current text colour.
const ICONS = {
  cash: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6M9 16h3",
  report: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  users: "M16 19v-1a4 4 0 0 0-8 0v1M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 19v-1a3 3 0 0 0-2.5-3M17 5.5a3 3 0 0 1 0 5",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
} as const;
function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : ""))
    .toUpperCase();
}

export function WorkplaceShell({
  children,
  name,
  role,
  active,
  preview = false,
  canManage = false,
  cashAllowed = true,
  canReport = false,
}: Props) {
  const current = (section: NonNullable<Props["active"]>) =>
    active === undefined ? undefined : active === section;
  const roleLabel =
    role === "manager" ? "Manager" : role === "employee" ? "Medewerker" : role;
  const today = new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Amsterdam",
  }).format(new Date());
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link
          href={preview ? "/voorbeeld" : "/kassa-afslag"}
          aria-label="OS Werkplek"
        >
          <Brand />
        </Link>
        <nav aria-label="Hoofdnavigatie">
          {cashAllowed ? (
            <NavLink
              href={preview ? "/voorbeeld" : "/kassa-afslag"}
              match="/kassa-afslag"
              current={current("cash")}
            >
              <Icon name="cash" />
              <span className="nav-full">Kassa-afslag</span>
              <span className="nav-short" aria-hidden="true">Afslag</span>
            </NavLink>
          ) : null}
          {canReport ? (
            <NavLink href="/rapportage" match="/rapportage">
              <Icon name="report" />
              <span className="nav-full">Rapportage</span>
              <span className="nav-short" aria-hidden="true">Rapport</span>
            </NavLink>
          ) : null}
          {canManage ? (
            <NavLink
              href="/gebruikersbeheer"
              match="/gebruikersbeheer"
              current={current("users")}
            >
              <Icon name="users" />
              <span className="nav-full">Gebruikersbeheer</span>
              <span className="nav-short" aria-hidden="true">Gebruikers</span>
            </NavLink>
          ) : null}
          <span className="nav-separator" aria-hidden="true" />
          <NavLink
            href={preview ? "/inloggen" : "/beveiliging"}
            match="/beveiliging"
            current={current("security")}
          >
            <Icon name="account" />
              <span className="nav-full">Mijn account</span>
              <span className="nav-short" aria-hidden="true">Account</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          {preview ? (
            <Link href="/inloggen" className="button secondary">
              Terug naar inloggen
            </Link>
          ) : (
            <SignOut />
          )}
        </div>
      </aside>
      <div className="workplace">
        <header className="topbar">
          <span className="topbar-date">
            {preview ? "Ontwerpvoorbeeld" : today}
          </span>
          <Link
            href={preview ? "/inloggen" : "/beveiliging"}
            className="user-chip"
            aria-label={`Mijn account: ${name}, ${roleLabel}`}
          >
            <span className="user-chip-text">
              <strong>{name}</strong>
              <small>{roleLabel}</small>
            </span>
            <span className="avatar" aria-hidden="true">
              {initials(name)}
            </span>
          </Link>
        </header>
        {preview ? (
          <div className="preview-banner">
            ONTWERPVOORBEELD · fictieve medewerker · geen echte gegevens of
            opslag
          </div>
        ) : null}
        <main id="inhoud" className="content">
          {children}
          <footer className="content-footer">
            <span>OS Steakhouse Werkplek</span>
            <span>Heiloo · Heerhugowaard</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
