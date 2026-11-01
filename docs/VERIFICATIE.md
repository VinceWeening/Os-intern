# Verificatie fase 1

Uitgevoerd op 1 november 2026.

- `npm test`: 23 tests geslaagd (3 bestanden).
- `npm run typecheck`: geslaagd.
- `npm run build`: Next.js-productiebuild geslaagd.
- `git diff --check`: geslaagd.
- Installatie meldde 0 bekende kwetsbaarheden; geen permanente veiligheidsgarantie.
- HTTP: login, ontwerpvoorbeeld, manifest en PNG-iconen bereikbaar. Zonder sessie leiden werkplek, beveiliging en authenticator naar login.
- Browser: shell en login visueel bekeken op desktop en een viewport van 390×844. Geen horizontale overflow gemeten (scrollWidth gelijk aan clientWidth).
- Tijdelijk mobiel viewport hersteld. Screenshot van ontwerpvoorbeeld staat buiten de repo in de visualisatiemap van deze chat.

## Bewijsgrenzen

PostgreSQL-tests voeren de echte migration uit in PGlite, met testfixtures voor Supabase Auth. Ze controleren anonieme toegang, AAL1, toewijzingen, managerrechten, rolverhoging/writes, inactieve accounts, ingetrokken toewijzing, verdwenen factoren en verschillende databaseconstraints. Het is geen live Supabase-test.

MFA-acties zijn getest met mocks: authenticatie verplicht, laatste factor behouden, nieuwe code voor verwijderen, factor-eigenaarschap, bestaande MFA niet met wachtwoord alleen vervangen, codes met voorloopnul.

Aanvulling: Supabase-testproject `sbwypfyjqftodfmceast` in organisatie Os-Steakhouse gekoppeld op 1 november 2026. Beide migrations live toegepast; lokale versies gelijkgetrokken met de remote historie. Openbare registratie uit, anonieme login uit, TOTP ingeschakeld, AAL1-duurlimiet aan. Supabase Security Advisor geeft na beperken van de automatisch gegenereerde RLS-helper geen meldingen. `.env.local` bevat uitsluitend openbare testconfiguratie en is genegeerd door Git.

Eerste account door de gebruiker aangemaakt met een eigen wachtwoord. Managerprofiel Vince toegevoegd en via een databasequery geverifieerd als actief. Loginpagina met actieve invoervelden geopend in Chrome. Nog niet geverifieerd: echte wachtwoord/MFA-flow, installatie op echte iPhone/iPad, echt mobiel toetsenbord, herstel na telefoonverlies, Vercel-deployment en back-upherstel.

Live read-only API-check `node scripts/check-supabase.mjs`: Auth bereikbaar, openbare signup uit en alle zes bedrijfstabellen weigeren anonieme toegang. Bij tijdelijke verbindingsproblemen probeert het script maximaal drie keer; er worden geen accounts of gegevens aangemaakt. Na aanpassen van de migrations slaagden opnieuw 23 tests en de typecheck.

Geldberekening, conceptopslag, idempotente indiening en managercontrole zijn nog geen actieve functionaliteit. De constraints-tests zijn geen volledige workflowtest.

De oude, genegeerde `.venv` van de voorlopige Python-opzet kan lokaal nog aanwezig zijn: automatisch opruimen werd door veiligheidsbeleid geblokkeerd. Python-bronbestanden zijn vervangen; de Node-app gebruikt deze omgeving niet.

## Aanvulling: zelf samengestelde rollen

46 tests, typecheck en productiebuild geslaagd. Migrations voor configureerbare rollen en expliciete PT409-conflicten live toegepast op test; lokale migrationversies gelijk aan remote historie. Vince is actief Beheerder, na expliciete gebruikerskeuze. Nieuwe tabellen `app_roles` en `access_events`: RLS aan, geen anonieme leesrechten en geen directe app-updates.

Live in Chrome met bevestigde MFA-sessie: gebruikerslijst en rolkeuze bekeken; fictieve rol gemaakt, rechten gewijzigd en audit met oude/nieuwe waarden gecontroleerd. Versieconflict in twee tabs reproduceerde aanvankelijk een bekende PostgREST-retryfout met 40001. Na wijziging naar PT409 dezelfde proef opnieuw uitgevoerd: direct conflictbericht, nieuwere versie behouden. De fictieve testrol is aan niemand toegewezen. Geen rechten van andere medewerkers gewijzigd.

Chrome-viewportoverride werkte niet aantoonbaar: gemeten breedte bleef desktopbreedte. Nieuwe mobiele praktijktest blijft open; geen claim dat die is geslaagd.

Supabase Security Advisor meldt momenteel geen nieuwe RLS/function-grantproblemen, maar wel dat leaked-password protection uitstaat. Controleer beschikbaarheid en inrichting daarvan vóór productie: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection. Dit is niet automatisch gewijzigd.
