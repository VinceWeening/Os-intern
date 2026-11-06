# Dagoverzicht en feedback

Gebouwd 2 november 2026 op de bestaande Next.js/Supabase-app. Eén dagoverzicht per vestiging en werkdatum, zoals bevestigd door de gebruiker. Met ‘spil’ wordt verspilling bedoeld, bijvoorbeeld twee weggegooide porties kipsaté.

## Schermen en rechten

- **Idee of fout melden** (`/feedback`): alle actieve medewerkers met bevestigde authenticator kunnen een idee/verzoek of fout insturen, voor de app of een toegewezen vestiging. Titel en omschrijving zijn verplicht. Een medewerker ziet eigen meldingen; beheerders zien alle meldingen en kunnen de status op Nieuw, In behandeling of Afgerond zetten. Er worden geen mails of externe berichten verzonden.
- **Dagoverzicht** (`/dagoverzicht`): kies vestiging en werkdatum (standaard vandaag in Amsterdam). Opmerkingen, autoritten (auto/bestuurder/meerijders), namen van mee-eters en verspilling (product/hoeveelheid met eenheid/optionele reden). Dit zijn vrije registraties; er worden geen kosten, toeslagen of andere OS-processen verondersteld.
- Nieuwe rolrechten: **Dagoverzicht bekijken** en **Dagoverzicht invullen**. Ook beschikbaar als permanente/tijdelijke persoonlijke uitzondering. Beheerders hebben toegang; andere rollen krijgen de nieuwe dagrechten pas nadat een beheerder ze toekent. Een dagrecht verleent geen kassarecht of extra vestigingstoegang.
- **Opgeslagen dagdocument**: onder het invoerformulier staan de centraal opgeslagen daggegevens en de ingediende/gecontroleerde of heropende kassa-afslag van exact die vestiging/datum. De bestaande kassa-RLS bepaalt of de medewerker die afslag mag zien. Een koppeling omzeilt nooit kassarechten.
- **Dagdocument afdrukken / PDF**: opent de browserafdrukfunctie voor de opgeslagen daggegevens en beschikbare kassa-afslag. Niet-opgeslagen invoer hoort daar niet bij. Automatisch aanleveren, ontvangers, definitieve dagindiening en managercontrole van het volledige dagdocument zijn nog niet ingericht; hiervoor zijn nog procesafspraken nodig.

## Opslag en bestanden

- `src/lib/daily/model.ts`: veldtypen en invoercontrole.
- `src/lib/daily/actions.ts`: gecontroleerde serveracties voor opslaan/versturen/statuswijziging.
- `src/components/daily/daily-editor.tsx`: daginvoer en afdrukknop.
- `src/components/daily/feedback-board.tsx`: meldingsformulier, eigen/beheerdersoverzicht en statuskeuze.
- `supabase/migrations/20261102130000_feedback_daily_summary.sql`: tabellen, rechten, RLS en databasefuncties. De versie is bewust na de bestaande vestigings- en gedeelde-accountmigrations geordend; de live migratieregistratie en lokale bestandsnaam zijn gecontroleerd gelijkgetrokken.
- `daily_summaries`: unieke combinatie vestiging/werkdatum; profielnaam en exact opslagmoment vastgelegd. Versiecontrole voorkomt stil overschrijven vanaf twee apparaten. `daily_events` bewaart wijzigingen met actor, tijdstip en voor/na-waarden.
- `feedback`: medewerker, vestiging, soort, titel, tekst, status en versie. Vaste aanvraag-ID voorkomt dubbele meldingen bij opnieuw proberen na een onzekere verbinding.

Daggegevens worden bewust met **Dagoverzicht opslaan** bewaard. Verlaat het scherm pas na bevestigde opslag. Deze eerste versie bewaart daginvoer niet automatisch lokaal; bij een opslagfout blijft de invoer in het geopende scherm. De opschoning na drie dagen geldt voor nooit ingediende **kassa-concepten**, niet voor dagdocumenten of feedback. Neem alle nieuwe tabellen en auditgegevens mee in back-up/herstel; vóór productie blijven de afspraken uit `PRODUCTIE.md` gelden.

## Zelf testen

1. Als beheerder: open Feedback, stuur een fictief idee of fout in en wijzig de status. Met een medewerkeraccount hoort alleen de eigen melding zichtbaar te zijn. Wachtwoord/authenticatorgegevens horen niet in feedback.
2. Geef een fictieve testrol alleen dagrechten plus een toegewezen vestiging. Controleer dat Dagoverzicht beschikbaar is en kassarechten hierdoor niet worden uitgebreid.
3. Vul op een fictieve datum een dagoverzicht met autorit, mee-eters en verspilling in. Sla op en laad opnieuw. Controleer de opgeslagen gegevens onderaan.
4. Open dezelfde dag in twee tabs. Sla in één tab op; de verouderde tweede tab moet een conflict geven en de eigen invoer behouden.
5. Bekijk een dag met een bestaande kassa-afslag. De juiste datum/vestiging en kassastatus moeten onderaan verschijnen. Controleer dat een medewerker zonder kasleesrecht geen extra kasgegevens krijgt via dit scherm.
6. Test afdrukken/PDF en de paginering met een gevulde dag en afslag. Test op echte iPhone/iPad de toetsenborden, toevoegen/verwijderen van regels, filters en ontbreken van horizontaal scrollen.

## Uitgevoerde verificatie

120 tests, typecheck en productiebuild geslaagd. PostgreSQL-tests controleren privacy van feedback, beheerdersstatuswijzigingen, idempotent versturen, dagrechten/vestigingsgrenzen, unieke dagen, versieconflicten, audit en ongeldige verspilling. Live SQL-proef voor feedback en dagopslag is teruggedraaid. In de ingelogde Chrome-sessie zijn feedback verzenden → status wijzigen en dag invoeren → opslaan → opgeslagen tabellen bekijken gecontroleerd; deze herkenbare fictieve proefgegevens zijn daarna verwijderd. Een bestaande kassa-afslag is zichtbaar gekoppeld aan de juiste dag. Afdrukdialoog/PDF-paginering en echte mobiele praktijkcontrole zijn nog open. Security Advisor meldt geen nieuwe databasewaarschuwingen.

Navigatie-aanpassing 2 november 2026: gebruiker bevestigt feedback **binnen Mijn account**, beschikbaar voor medewerkers. De volledige feedbackbox staat onderaan `/beveiliging`; het losse menu-item is verwijderd. `/feedback` stuurt door naar `/beveiliging#feedback`. Opslag en statuswijzigingen vernieuwen de accountpagina. Rechten blijven hetzelfde. Typecheck/build en Chrome-doorverwijzing/weergave gecontroleerd.
