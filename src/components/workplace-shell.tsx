import Link from "next/link";
import { Brand } from "./brand";
import { SignOut } from "./sign-out";

type Props = {
  children: React.ReactNode;
  name: string;
  role: string;
  active: "cash" | "security" | "users";
  preview?: boolean;
  canManage?: boolean;
  cashAllowed?: boolean;
};
export function WorkplaceShell({
  children,
  name,
  role,
  active,
  preview = false,
  canManage = false,
  cashAllowed = true,
}: Props) {
  const title =
    active === "cash"
      ? "Kassa-afslag"
      : active === "users"
        ? "Gebruikersbeheer"
        : "Account & beveiliging";
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
            <Link
              href={preview ? "/voorbeeld" : "/kassa-afslag"}
              aria-current={active === "cash" ? "page" : undefined}
            >
              <span aria-hidden="true">▤</span> Kassa-afslag
              <span className="nav-dot" />
            </Link>
          ) : null}
          {canManage ? (
            <Link
              href="/gebruikersbeheer"
              aria-current={active === "users" ? "page" : undefined}
            >
              <span aria-hidden="true">♙</span> Gebruikersbeheer
              <span className="nav-dot" />
            </Link>
          ) : null}
          <span className="nav-label second">PERSOONLIJK</span>
          <Link
            href={preview ? "/inloggen" : "/beveiliging"}
            aria-current={active === "security" ? "page" : undefined}
          >
            <span aria-hidden="true">◇</span> Mijn account
          </Link>
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
            <strong>{title}</strong>
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
