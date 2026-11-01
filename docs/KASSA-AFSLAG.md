# Functieblad — kassa-afslag

1 november 2026: fase 1. Alleen fictieve testgegevens gebruiken.

## Doel en schermen

Kassa-afslag digitaal invullen, berekenen, centraal bewaren en door een manager laten controleren voor Heiloo en Heerhugowaard.

| Scherm | Nu | Later |
| --- | --- | --- |
| Inloggen | Vooraf aangemaakt persoonlijk e-mail/wachtwoordaccount | Herstelproces bepalen |
| Authenticator | QR/instelsleutel en verplichte codebevestiging | Live providerconfiguratie testen |
| Beveiliging | Factoren bekijken, vervanger koppelen, oude met nieuwe code verwijderen, laatste behouden | Eventueel toestelbenaming en beheerherstel |
| Kassa-afslag | Eigen vestigingen/werkdatum; startknop uitgeschakeld | Tellen, concept, opslagstatus en indienen |
| Overzicht/detail | Nog niet gebouwd | Filters, controle, heropenen en historie |

## Berekening, opslag en rechten

Vanaf fase 2: `subtotaal = coupurecenten × aantal`; `geteld = som(subtotalen)`; `kasverschil = geteld − verwacht`. Alleen gehele niet-negatieve aantallen; toelichting verplicht bij verschil. Geen extra kasberekeningen.

Nu geen opslag van afsluitingsinvoer. Schrijfacties volgen via serveracties en transactionele databasefuncties met versies en idempotentie. Bij uitval moet invoer behouden blijven met een melding dat centrale opslag niet bevestigd is.

Actief profiel en authenticator verplicht. Medewerker: toegewezen vestigingen; manager: beide. Geen UI-rolkeuze. RLS geldt ook voor directe API. Account-/rechtenbeheer voorlopig alleen via vertrouwd extern beheer.

## Testwijze fase 1

`npm test`, `npm run typecheck`, `npm run build`. PostgreSQL-tests voeren de echte migration uit met gesimuleerde Auth; MFA-acties gebruiken mocks. Live providertest blijft nodig.

Na koppeling testproject:

1. Fictieve medewerker Heiloo, medewerker Heerhugowaard, manager en inactief account maken. Publieke registratie ook bij Supabase uitzetten.
2. Direct `/kassa-afslag` en `/beveiliging` zonder sessie: login. Wachtwoord zonder MFA geeft geen bedrijfsgegevens.
3. QR scannen, foutieve code proberen, nieuwe juiste code bevestigen. Medewerker ziet eigen vestiging; manager beide. Ontbrekend/inactief profiel krijgt geen data.
4. Uitloggen en opnieuw inloggen: code verplicht. Tweede authenticator koppelen en bevestigen vóór de eerste verwijderen. Verwijderen vereist een nieuwe code; de laatste blijft behouden.
5. Wachtwoord alleen mag bestaande MFA niet kunnen vervangen. Directe API-rolverhoging en writes moeten falen.
6. Echte iPhone/iPad: Safari → beginscherm, app heropenen, toetsenbord bij login/code, portret/landschap, code plakken met voorloopnul, geen horizontale scroll, uitloggen via Beveiliging. Desktop: Edge/Chrome-installatie.
7. Bedrijfsroutes: private/no-store; geen service worker of clientopslag van QR/instelsleutel. Vernieuwen wist zichtbare setup; opnieuw instellen ruimt onafgeronde koppelingen op.

Latere fasen: geldberekeningen, save-fouten, uitval/invoerbehoud, versieconflicten, dubbel indienen, volledige concept→controle en heropenen met invoer. Die functies bestaan nog niet in fase 1.
