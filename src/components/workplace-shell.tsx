import Link from "next/link";
import { Brand } from "./brand";
import { SignOut } from "./sign-out";
import { NavLink, SectionTitle } from "./workplace-nav";

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
  const title =
    active === undefined
      ? undefined
      : active === "cash"
        ? "Kassa-afslag"
        : active === "users"
          ? "Gebruikersbeheer"
          : "Account & beveiliging";
  const current = (section: NonNullable<Props["active"]>) =>
    active === undefined ? undefined : active === section;
  const roleLabel =
    role === "manager" ? "Manager" : role === "employee" ? "Medewerker" : role;
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <Link
          href={preview ? "/voorbeeld" : "/kassa-afslag"}
          aria-label="OS Werkplek"
        >
          <Brand />
        </Link>
        <div className="sidebar-caption">DE INTERNE WERKPLEK</div>
        <nav aria-label="Hoofdnavigatie">
          <span className="nav-label">DAGELIJKS WERK</span>
          {cashAllowed ? (
            <NavLink
              href={preview ? "/voorbeeld" : "/kassa-afslag"}
              match="/kassa-afslag"
              current={current("cash")}
            >
              <span aria-hidden="true">▤</span> Kassa-afslag
              <span className="nav-dot" />
            </NavLink>
          ) : null}
          {canReport ? (
            <NavLink href="/rapportage" match="/rapportage">
              <span aria-hidden="true">◫</span> Rapportage
              <span className="nav-dot" />
            </NavLink>
          ) : null}
          {canManage ? (
            <NavLink
              href="/gebruikersbeheer"
              match="/gebruikersbeheer"
              current={current("users")}
            >
              <span aria-hidden="true">♙</span> Gebruikersbeheer
              <span className="nav-dot" />
            </NavLink>
          ) : null}
          <span className="nav-label second">PERSOONLIJK</span>
          <NavLink
            href={preview ? "/inloggen" : "/beveiliging"}
            match="/beveiliging"
            current={current("security")}
          >
            <span aria-hidden="true">◇</span> Mijn account
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="private-label">
            <span /> Besloten teamomgeving
          </div>
          <div className="profile">
            <span className="avatar">{name.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{name}</strong>
              <small>{roleLabel}</small>
            </div>
          </div>
          {preview ? (
            <Link href="/inloggen" className="text-link">
              Terug naar inloggen →
            </Link>
          ) : (
            <SignOut />
          )}
        </div>
      </aside>
      <div className="workplace">
        <header className="topbar">
          <span>
            Werkplek <span className="breadcrumb">/</span>
            <SectionTitle title={title} />
          </span>
          <span className="topbar-right">
            <span className="status-dot" />{" "}
            {preview ? "Ontwerpvoorbeeld" : "Authenticator bevestigd"}
          </span>
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
            <span>
              OS STEAKHOUSE <span>WERKPLEK</span>
            </span>
            <span>Heiloo & Heerhugowaard</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
