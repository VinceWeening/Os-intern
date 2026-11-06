# Backlog OS Werkplek

Bijgewerkt 3 november 2026. Dit zijn ideeën en vervolgonderdelen, geen open opdracht om ze tegelijk uit te voeren. Volledige details/bronreferenties: [PROJECTVISIE.md](PROJECTVISIE.md). Planning en actuele status: [ROADMAP.md](ROADMAP.md).

| Groep | Ideeën | Afhankelijkheden / grens |
| --- | --- | --- |
| Afslagbronnen | PAY-transacties, PAX-mail/bijlagen, Foodticket en nieuwe kassa; bronnenstatus, bewijs, handmatige correctie met reden/auteur, vastgelegde stand bij indiening | Alleen-lezen beginnen; leveranciersrechten, bedrijfsdag en overlap bevestigen; ontbrekende gegevens zijn geen €0; omzet en betalingen niet dubbel tellen |
| Verkoopimport | Lokale exportmap, volledig geschreven bestanden, inhoudsperiode, validatie, ontdubbelen/overlap, importlog en vorige goede stand | Echt exportvoorbeeld en bronsemantiek nodig; verwijderen van bronbestanden heeft lage prioriteit |
| Verkoopoverzichten | Product/categorie, periode/vestiging, feestdagen, tijdvakken, keukenprint en bijgewerkt-tot | Besteld/verkocht/betaald betekent niet automatisch bereid; status alleen uit betrouwbare bron |
| Vandaag / dagkaart | Taken, eigenaar/deadline, terugkerende checklists, temperatuur met opvolging, eetregistratie/keukentotaal, overdracht, dagafsluiting met ontbrekende onderdelen | Bestaand dagoverzicht uitbreiden; afspraken over definitief document, ontvangers en controle |
| Keuken | Centrale bestellijst, MEP vandaag/morgen, recepten schalen, allergenen met bron/controledatum, houdbaarheid, derving, uitverkocht, morgen klaar | Geen voedselveiligheidstermijnen verzinnen; gecontroleerde product-/werkinstructies gebruiken |
| HHW ↔ Heiloo | Product/hoeveelheid/eenheid/datum/opmerking, herkomst, statussen, verzending/ontvangstcontrole en wijzigingen na verzenden | Alleen hetzelfde product met dezelfde eenheid samenvoegen; printen bij definitief versturen |
| Printer | IP/ethernet, wachtrij, Windows-service, recepten/vrije tekst/HHW-bonnen; later MEP/pakbonnen/verkoop | Merk/model/protocol eerst vaststellen; uitgaande verbinding, beperkte apparaatcredentials, geen publieke printerpoort of shell; onzeker printresultaat en KOPIE-herprint; oude opdrachten niet blind uitsturen; bestaande kassa intact houden |
| Team / rooster | Profielen, vaardigheden/inwerken, vestigingen, beschikbaarheid/diensten, verklaarbare vervangingsvoorstellen | Manager bevestigt; geen medewerkersranglijst; Nostradamus-toegang nog onbevestigd; bestaande planning behouden |
| Auto's / bezorgen | Bestuurderstoewijzing met tijden/wissels, overlap, onbekende bestuurder, maximaal één bestelling per auto; bon/QR, adrescontrole en Maps-link | Betrouwbare bestelbron nodig; geen betaalstatus wijzigen zonder bevestigde mogelijkheid |
| Webfleet | Posities/ritten, meet- versus ophaaltijd, kaart, status/zone, rijtijd/ETA, refresh en sorteren op terugkomst | Toegang en echte vertraging meten; 30–60 seconden is ontwerpdoel; eigen bestuurderhistorie; uitzonderingsanalyse achteraf, context en informeren medewerkers |
| Meldingen | Klachten, defecten, onderhoud, verantwoordelijke en opvolgtaken | Onderscheiden van de reeds gebouwde app-feedback in Mijn account |
| Kennis / nieuws | Werkinstructies, handboek, OS-krant, documenten, zoeken, laatst bijgewerkt en rolrechten | Private opslag, versie-/publicatiebeheer en verantwoordelijke bron |
| Management | Overzicht voor Robert en Klaas, vestiging/periode, kasverschillen, registratievolledigheid, taken/klachten, product-/feestdagenverkoop | Gebaseerd op gecontroleerde gegevens; geen decoratieve grote dashboards |
| Later | Historische drukte/voorbereiding, AI met concreet doel, native App Store-app, uitgebreidere offline sync | Bestaande backend hergebruiken; geen AI als enige controle voor financiële/voedselveiligheidsbesluiten |
| Betrouwbaarheid | Render-hosting, gescheiden productie/test, GitHub-checks, monitoring, back-up van database én bestanden, herstelproef, eigenaarschap | Vóór dagelijks productiegebruik; geen productiegegevens of betaalacties in tests |

## Gewenste navigatie, stapsgewijs

Vandaag · Registraties · Keuken & bestellen · Team & rooster · Auto's & bezorging · Meldingen · Kennis & nieuws · Overzichten · Beheer. Alleen beschikbare en toegestane onderdelen tonen. Printknoppen bij de inhoud; printerinstellingen onder Beheer. Feedback blijft voorlopig onder Mijn account.
