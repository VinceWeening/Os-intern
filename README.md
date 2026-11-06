# OS Werkplek

Interne PWA voor OS Steakhouse Heiloo en Heerhugowaard. Next.js, TypeScript en Supabase. Gebouwd: login/authenticatorbeheer, rollen/rechten, handmatige kassa-afslag met controle/historie, instelbaar kasformulier, dagoverzicht en feedback in Mijn account. Nog geen bevestigde productieoplevering.

Actuele planning: [roadmap](docs/ROADMAP.md), [backlog](docs/BACKLOG.md), [beslislog](docs/BESLISLOG.md) en [volledige projectvisie](docs/PROJECTVISIE.md). Eén afgesproken functie per keer.

## Lokaal bekijken

Node.js 22.16 of nieuwer:

```powershell
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Zonder configuratie toont de login een link naar `/voorbeeld`: een gemarkeerd ontwerp met fictieve gegevens. De echte werkplek blijft beveiligd. Het voorbeeld verdwijnt zodra Supabase is geconfigureerd of de app als productie draait.

## Supabase-testomgeving aansluiten

De lokale testomgeving is gekoppeld aan project `sbwypfyjqftodfmceast` in Os-Steakhouse. Migrations toegepast, openbare registratie uit. Het eerste account heeft het actieve managerprofiel Vince; de gebruiker heeft het wachtwoord zelf ingesteld. Zie `docs/TESTEN-FASE-1.md` voor de korte gebruikerscheck. Onderstaande stappen beschrijven de reproduceerbare inrichting voor een nieuwe omgeving.

1. Maak een **apart testproject**. Gebruik voor ontwikkeling nooit productie.
2. Zet bij Supabase Authentication **Allow new users to sign up uit**. Schakel anonieme login en ongebruikte providers uit. Controleer TOTP-inschrijven en -verifiëren. `supabase/config.toml` stelt dit lokaal in; een gehost project neemt dat niet vanzelf over.
3. Kopieer `.env.example` naar `.env.local`. Vul test-URL, **publishable** key (`sb_publishable_…`) en project-ref in; houd `NEXT_PUBLIC_APP_ENV=test`. Deze openbare sleutel verleent zelf geen datarechten; login en RLS doen dat. Geen secret/service-role key gebruiken.
4. Pas de migration toe op het **testproject**:

```powershell
npx supabase login
npx supabase link --project-ref <test-project-ref>
npx supabase db push
```

5. Maak via Authentication → Users een fictieve gebruiker met e-mail en een sterk uniek wachtwoord. De app heeft geen registratie-/uitnodigingsflow. Deel wachtwoorden niet via Git, screenshots of logs.
6. Maak profiel en vestigingstoewijzing in de vertrouwde SQL Editor; vervang de UUID door de Auth-user-ID:

```sql
insert into public.profiles(id, full_name, access_role_id)
select '<auth-user-uuid>', 'Testmedewerker', id
from public.app_roles where name = 'Medewerker';

insert into public.location_memberships(user_id, location_id)
select '<auth-user-uuid>', id from public.locations where slug = 'heiloo';
```

Voor een volledig nieuwe omgeving maak je ook het eerste beheerderprofiel via vertrouwd beheer met de rolverwijzing naar de startrol Beheerder. Daarna kunnen uitsluitend beheerders bestaande accounts in **Gebruikersbeheer** activeren, rollen kiezen en vestigingen toewijzen. Startrol Manager ziet beide vestigingen, maar heeft geen gebruikersbeheer. Andere rollen kun je zelf samenstellen. `profiles.role` is een oud migratieveld; gebruik het niet meer voor rechten.

7. Herstart, log in, kies **Authenticator instellen**, scan QR en bevestig code. Daarna opent de werkplek. Supabase Auth beheert authenticatorgeheimen. De instelsleutel is alleen zichtbaar tijdens koppelen.

## Bestanden

| Pad | Taak |
| --- | --- |
| `src/app/` | Pagina's, CSS, manifest, metadata |
| `src/components/` | Schermonderdelen en interactieve formulieren |
| `src/lib/auth/actions.ts` | Login-/MFA-serveracties |
| `src/lib/auth/session.ts` | Servercontrole gebruiker/MFA/actief profiel |
| `src/lib/supabase/` | Cookieclient en databasecontract |
| `src/proxy.ts` | Sessievernieuwing, no-store en omgevingscontrole |
| `supabase/migrations/` | Schema, RLS en constraints |
| `tests/` | PostgreSQL-rechten, MFA-acties en werkdatum |
| `docs/` | Plan, database, functieblad en productievoorwaarden |

## Testen en deployen

```powershell
npm test
npm run typecheck
npm run build
```

PGlite voert de echte migration/RLS uit met nagebootste Auth-tabellen/JWT-functies. MFA-serveracties gebruiken mocks. Live Supabase-login/MFA moet na koppeling nog getest worden; zie het functieblad.

Hostingrichting sinds 3 november 2026: **Render**. Er is nog geen Render-deploymentconfiguratie ingericht. De eerdere Vercel-instructie is historisch. Development/Preview krijgen uitsluitend test-URL/key/ref met `NEXT_PUBLIC_APP_ENV=test`; Production een apart productieproject met `NEXT_PUBLIC_APP_ENV=production`. Geen service-role key. Voer migrations bewust per database uit, niet tijdens frontendbuilds. Lees `docs/PRODUCTIE.md` vóór publicatie.

PWA: Safari → Delen → Zet op beginscherm; desktop via installatiepictogram Edge/Chrome. Beveiliging toont een installatieknop als de browser dat aanbiedt. HTTPS vereist buiten localhost. Geen service worker of automatische refresh. Kassa-invoer heeft beperkte lokale herstelopslag; uitgebreide offline sync is nog niet gebouwd.

Nieuw: **Gebruikersbeheer** met eigen rollen, vestigingstoewijzing, account blokkeren/activeren, versiecontrole en wijzigingslog. Alleen beheerders kunnen dit gebruiken; Vince is de eerste beheerder. Zie `docs/GEBRUIKERSBEHEER.md` voor bestanden en teststappen.

Nog niet beschikbaar: nieuwe Auth-accounts vanuit de app aanmaken, wachtwoordherstel/MFA-reset, externe bronautomatisering en een geverifieerde productieoplevering. Supabase is lokaal als test gekoppeld; het bestaande OS-logo is verwerkt. De hostingrichting is Render.

## Uitbreiding 2 november 2026

Persoonlijke extra rechten (permanent of met eindmoment) staan in `docs/GEBRUIKERSBEHEER.md`. Via **Kasformulier instellen** kunnen beheerders per vestiging velden, standaardbedragen, minima en plus/minberekeningen aanpassen. Zie `docs/FORMULIERBEHEER.md` voor bediening, versies en teststappen. Bestaande tellingen behouden hun oorspronkelijke formulier.

Het bestaande OS-logo wordt gebruikt voor het tabblad, de Apple-beginschermknop en de PWA-iconen. Een al geïnstalleerde app kan het oude icoon nog cachen; test de nieuwe iconen ook bij opnieuw toevoegen aan het beginscherm.

Ook beschikbaar: **Idee of fout melden** voor actieve medewerkers en **Dagoverzicht** per vestiging/werkdatum met opmerkingen, autoritten, mee-eters, verspilling en bijbehorende kassa-afslag. Dagrechten stel je in via rollen of persoonlijke uitzonderingen. Zie `docs/DAGOVERZICHT-EN-FEEDBACK.md` voor bestanden, rechten en teststappen. Kassa-concepten vervallen na drie dagen zonder wijziging; lokaal blijft maximaal één herstelkopie per gebruiker/browser bewaard.
