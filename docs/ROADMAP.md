# Roadmap OS Werkplek

Bijgewerkt: 3 november 2026. Eén afgebakende functie per keer; na iedere afgesproken stap review door de gebruiker. De complete aangeleverde visie staat in [PROJECTVISIE.md](PROJECTVISIE.md). Deze roadmap vervangt het oorspronkelijke fase-1-plan als actueel vertrekpunt.

## Feitelijke uitgangssituatie

Vandaag lokaal gecontroleerd: code, package.json, migrations, configuratiecode en documentatie; `npm test`: **120 tests geslaagd**. Dit is geen nieuwe live productie-/leverancierscontrole. Chrome- en Supabase-proeven van 1–2 november zijn eerdere verificaties, zoals beschreven in de moduledocumentatie.

| Onderdeel | Aangetroffen status | Wat nog openstaat |
| --- | --- | --- |
| Login, TOTP, rollen, vestigingen | Gebouwd; eigen rollen en persoonlijke permanente/tijdelijke rechten; servercontrole en RLS | Account-/MFA-herstelprocedure, productiecontrole |
| Handmatige kassa-afslag | Gebouwd: centen, telling, concept/indienen/controleren/heropenen, historie en configureerbare plus/minformules per vestiging | Echte mobiele praktijkcontrole, bevestigde bedrijfsdag/overige OS-procesvragen |
| Tijdelijke opslag | Eén lokale kassa-herstelkopie per gebruiker/browser; nooit ingediende concepten na 3 dagen opruimen; onzekere indiening en eerder ingediende historie beschermen | Gebruik op gedeelde apparaten en langdurige storing praktisch toetsen |
| Dagoverzicht | Eerste versie: dagnotities, autoritten, mee-eters, verspilling, koppeling met de juiste afslag, afdrukknop | Volledigheidscontrole, definitief dagdocument, ontvangers/aanlevering, PDF-paginering |
| Feedback | Gebouwd, onderaan Mijn account; medewerker eigen meldingen, beheerder statusbeheer | Eventuele verdere opvolging pas bij behoefte |
| PWA | Manifest, OS-iconen, eigen appvenster | Echte iPhone/iPad-installatie, toetsenbord/heropenen, update- en netwerkproeven |
| Externe automatisering | Nog niet aanwezig | PAY, PAX-mail, Foodticket/nieuwe kassa, printer, Nostradamus, Webfleet |
| Dagelijks productiegebruik | Nog niet als gereed geverifieerd | Hosting, gescheiden productie, monitoring, automatische releasechecks, back-up én herstelproef |

Techniek nu: Next.js 16.4.3, TypeScript, React 19, Supabase SSR/Auth/PostgreSQL, eigen CSS, Vitest en PGlite-tests van migrations/RLS. Python-mappen/restanten bewijzen geen actieve Python-backend. Geen Tailwind/shadcn, Zod, Playwright-testpakket, Render-configuratie of GitHub-workflows aangetroffen. Nieuwe richting: Render + GitHub; geen bestaande werkende schermen ombouwen alleen om andere tooling toe te voegen. Private documentopslag is gewenst maar nog geen gerealiseerde module.

## Bouwvolgorde

| Stap | Richting | Aanpak |
| --- | --- | --- |
| 1 | Basis en rechten | Bestaande basis behouden; ontbrekende productievoorwaarden gericht afronden |
| 2 | Handmatige kassa-afslag | Bestaande workflow in de praktijk afronden; geen nieuwe kasregels aannemen |
| 3 | Afslagbronnen automatiseren | Eén voor één: PAY → PAX-mail → beschikbare kassabron; alleen lezen en eerst vergelijken |
| 4 | Dagelijkse operatie | Dagoverzicht uitbreiden naar dagkaart, taken, checklists, temperatuur, eetregistratie, overdracht en volledige dagafsluiting |
| 5 | Keuken en kennis | Centrale bestellijst, MEP, recepten, gecontroleerde allergenen/houdbaarheid, instructies en documenten |
| 6 | HHW-bestellingen en printer | Heiloo↔HHW-aanvragen met status/ontvangst; daarna wachtrij en lokale Windows-printservice |
| 7 | Team en bezorging | Profielen/vaardigheden, beschikbaarheid/vervanging; auto-/bestuurdershistorie, daarna leverancierskoppelingen |
| 8 | Meldingen en management | Klachten, defecten, onderhoud/opvolging en betrouwbare overzichten voor de eigenaren |
| 9 | Verdere analyse en appvorm | Patroononderzoek en eventueel native app/AI, pas met concreet doel en betrouwbare bronnen |

Een ontbrekende koppeling blokkeert geen zelfstandig bruikbare andere module. De negen navigatiegroepen uit de visie zijn een toekomststructuur; ze worden niet ineens als lege menu's toegevoegd. Feedback blijft onder Mijn account tenzij de gebruiker dit wijzigt.

## Voorgestelde eerstvolgende kleine stap — nog niet gestart

**PAY: een alleen-lezen dagproef voor één vestiging en één afgesproken werkdag.** Eerst bron/velden onderzoeken; nog geen bestaande afslag automatisch aanpassen.

Benodigd vóór een echte verbinding:
- Toestemming en alleen-lezen accounttoegang via secret-opslag, nooit sleutels in chat/frontend/Git.
- Officiële actuele documentatie voor de beschikbare PAY-API en autorisatie.
- Welke merchant/service/terminal bij welke vestiging hoort.
- Afspraken over bedrijfsdag, tijdzone, geslaagde betalingen, refundmomenten en overlap met andere betaalbronnen.
- Een geanonimiseerd officieel dagoverzicht om aantallen/bedragen mee te vergelijken.

Acceptatiecriteria voor die afzonderlijk af te spreken proef:
1. Alleen ophalen; geen betaling, refund of wijziging uitvoeren.
2. Eén vestiging/periode afgebakend, alle pagina's verwerkt; bedragen in centen, refunds apart.
3. Ontbrekende/onvolledige bron toont ‘niet ontvangen’/fout, geen stilzwijgende nul.
4. Bedrag, aantallen, periode, ophaaltijd en bronreferenties inzichtelijk; opnieuw ophalen verdubbelt niets.
5. Fictieve tests voor paginering, dubbelen, refunds, tijdzonegrenzen en storing; vergelijking met officieel overzicht. Afwijkingen verklaard vóór automatische voorinvulling.
6. Definitieve en bestaande handmatige afsluitingen blijven tijdens de proef ongemoeid.

Bij ontbrekende PAY-toegang: na review eerst een kleine adapter en fictieve fixtures, of PAX-mail als geanonimiseerd voorbeeld beschikbaar is. Geen van beide wordt in deze planningsstap gebouwd.

## Open keuzes en productiegrens

Bedrijfsdag na middernacht; wie eigen afslag mag controleren; account-/MFA-herstel; aanlevering/afronding dagdocument; back-up-/documentretentie en hersteldoelen; productie-eigenaarschap. PAY-rechten/terminalindeling, PAX-provider/mailformaat/mailbox, Foodticket-/nieuwe-kassa-contract, Nostradamus/Webfleet-rechten en printermodel/protocol moeten per module bevestigd worden.

Render is nu de gekozen hostingrichting. Dit is geen bevestiging dat een deployment of productieomgeving al bestaat. Eerdere Vercel-instructies zijn historisch. Monitoring, releasechecks, echte mobiele controle en een geslaagde herstelproef horen vóór dagelijks productiegebruik.
