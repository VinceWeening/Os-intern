# Implementatieplan

1 november 2026. Alleen fase 1 bouwen; na elke fase stoppen voor review.

| Fase | Resultaat | Testen |
| --- | --- | --- |
| 1. Fundament | Next.js/TypeScript, donkere shell, schema/RLS, login zonder registratie, authenticator koppelen/bevestigen/vervangen, PWA-manifest | Build/typecheck, PostgreSQL-rechten, MFA-acties; daarna echte login/MFA en mobiel |
| 2. Kassa-afslag | Tellingen in centen, validatie, Amsterdam-werkdatum, concept bewaren/hervatten, opslagstatus, invoer bij uitval behouden, samenvatting en idempotent indienen | Berekeningen, versieconflict op twee apparaten, retries en netwerkuitval |
| 3. Managercontrole | Overzicht, filters, detail, gecontroleerd markeren, heropenen met reden en historie | Rolgrenzen en concept → indiening → controle → heropenen |
| 4. Oplevering | Mobiele ketentest, PWA-updates, deploymentconfiguratie en herstelproef | iPhone/iPad inclusief toetsenbord en heropenen, echt MFA, back-up herstellen |

## Basiskeuzes

Supabase Auth beheert wachtwoorden en TOTP. Login én AAL2 plus een bestaande bevestigde TOTP-factor zijn vereist voor bedrijfsgegevens. Aanvulling op fase 1 op verzoek van de gebruiker: zelf samengestelde rollen en vestigingstoewijzingen via het aparte gebruikersbeheer, uitsluitend door beheerders. Beheermutaties zijn transactioneel met versies en audit; kassa-schrijftransacties volgen in fase 2. Zie GEBRUIKERSBEHEER.md.

Voorlopig zien medewerkers alleen eigen afsluitingen binnen toegewezen vestigingen. Managers zien beide vestigingen. Een ooit ingediende afsluiting houdt vestiging/werkdatum gereserveerd, ook na heropenen.

## Open OS-procesvragen

1. Wie maakt accounts aan, kent vestigingen toe en wijzigt rollen? Heeft iedereen een persoonlijk e-mailadres?
2. Wie herstelt toegang bij een verloren authenticator, en hoe wordt de identiteit gecontroleerd?
3. Mogen medewerkers elkaars concepten zien/overnemen? Wie wijzigt een heropende afslag?
4. Welke werkdatum geldt na middernacht? Tot bevestiging: vandaag in Europe/Amsterdam, vanaf fase 2 handmatig kiesbaar.
5. Mag een manager zijn eigen afsluiting controleren?
6. Welke coupures komen voor, welke invoergrens is zinvol en waar komt het verwachte contante bedrag vandaan?
7. Welke bewaartermijn, back-upfrequentie, maximaal dataverlies en hersteltijd gelden?

Geen extra kasuitgaven-, afstort-, wisselgeld- of fooienlogica of externe koppelingen toevoegen voordat de echte werkwijze is bevestigd.
