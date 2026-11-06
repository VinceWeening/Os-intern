# Instelbaar kasformulier

Status 2 november 2026: gebouwd en toegepast op het gekoppelde Supabase-testproject. Alleen een beheerder kan `/formulierbeheer` openen of publiceren. Gebruik uitsluitend fictieve gegevens bij testen.

## Bediening

1. Open **Kasformulier instellen** en kies een vestiging.
2. Stel het standaard startsaldo in.
3. Wijzig namen, standaardbedragen, minima en verplichte invoer. Een leeg standaardbedrag betekent dat de medewerker zelf een bedrag invult; een optioneel leeg invoerveld telt als nul. Geldinvoer blijft altijd niet-negatief.
4. Voeg een bedrag of tussenuitkomst toe. Verplaats een nieuw veld met de pijlen tot het vóór de berekening staat waarin je het wilt gebruiken.
5. Kies bij een berekende uitkomst per regel een eerder veld en **optellen** of **aftrekken**. Verwijderen van een gebruikt veld vereist ook aanpassen van de verwijzende regels. Ongeldige of circulaire verwijzingen blokkeren publicatie.
6. Controleer het fictieve rekenvoorbeeld, vul een reden in en publiceer. Wisselen van vestiging verwerpt niet-gepubliceerde bewerkingen.

De vier vaste uitkomsten `cash`, `required`, `result` en `register` blijven bestaan voor status, overzicht en controle; hun namen en plus/minberekeningen zijn aanpasbaar. De geldcoupures en de veiligheidsregel dat het getelde geld niet onder het startsaldo mag liggen blijven vast. Het resultaat houdt de OS-betekenis: negatief is fooi, positief is tekort met verplichte toelichting. De bestaande rapportage houdt haar vaste kolommen; extra velden zijn wel volledig zichtbaar in de afslag en worden niet vanzelf extra rapportagekolommen.

## Opslag en versies

- `cash_form_versions`: onveranderlijke gepubliceerde definities per vestiging, met oplopende versie.
- `locations.cash_form_id`: huidige definitie voor een nieuwe telling.
- `cash_closings.form_definition_id`, `form_schema`, `custom_inputs` en `custom_totals`: definitie, invoer en uitkomsten van die specifieke telling.
- Bestaande concepten blijven hun oorspronkelijke formulier gebruiken, ook na heropenen. Historische afsluitingen zonder definitie behouden de oorspronkelijke OS-formule.
- Een nieuw, nog niet centraal opgeslagen formulier dat intussen is vervangen krijgt een versieconflict; invoer blijft lokaal behouden. Start daarna een actuele telling en neem de invoer gecontroleerd over.
- Alle bedragen blijven integer centen. De database voert de berekening en validatie zelf uit; clienttotalen worden niet vertrouwd. Alleen bekende eerdere velden, plus en min; er wordt geen JavaScript of SQL-formule uitgevoerd.
- Publicatie gebruikt versiecontrole en het wijzigingslog. Geen directe tabelwrites vanuit de app. Back-up/herstel moet ook formulierdefinities en audit meenemen; herstel de database als samenhangend geheel en test een oude afsluiting na herstel. Zie `PRODUCTIE.md` voor de resterende productieafspraken.

## Bestanden

- `src/lib/cash/form-definition.ts`: definitie controleren en bedragen voor het scherm berekenen.
- `src/lib/cash/form-actions.ts`: beheerder controleren en publiceren via Supabase.
- `src/components/admin/cash-form-settings.tsx`: formuliereditor en fictief rekenvoorbeeld.
- `src/lib/cash/model.ts`: bestaande geldtelling met optionele versiegebonden formulierinvoer.
- `supabase/migrations/*_configurable_cash_forms.sql`: tabellen, RLS, serverberekening, publicatie en koppeling met de bestaande opslagflow.

## Verificatie

`npm test` (104 tests), `npm run typecheck` en `npm run build` slagen. De PostgreSQL-tests voeren alle migrations uit en controleren nieuwe velden, minima, onbekende/circulaire verwijzingen, behoud van conceptversies, oude definitieve afsluitingen, dubbele indiening en rechten. De gekoppelde testdatabase is gecontroleerd met publiceren → fictief indienen → controleren binnen één teruggedraaide transactie: geen blijvende testafslag of gewijzigde formule.

In de ingelogde Chrome-sessie zijn toevoegen, verplaatsen, standaardbedrag, een extra plusregel en het rekenvoorbeeld gecontroleerd: € 250,00 + € 12,34 = € 262,34. Deze proefinstelling is niet gepubliceerd. De nieuwe kassatelling is tot de bevestigingspagina gecontroleerd: geteld € 200, startsaldo € 150, benodigd € 100, fooi € 5, kassabedrag € 235. Niet definitief ingediend via de browser.

Nog zelf testen op echte iPhone/iPad: numeriek toetsenbord, datumselectie, alle knoppen, geen horizontale scroll, heropenen en appicoon na toevoegen aan beginscherm. De Chrome-viewportinstelling wijzigde de werkelijke viewport niet; mobiele praktijkcontrole is dus nog open.

Onderaan formulierbeheer staat een tabel met alle invoervelden, plus/minformules en voorbeeldbedragen. De tabel volgt wijzigingen in namen, volgorde, standaardbedragen en rekenregels direct. Minimum en verplichte invoer staan bij het betreffende invoerveld. Deze weergave is in Chrome gecontroleerd door het standaard omzetbedrag tijdelijk te veranderen; benodigd en resultaat rekenden direct mee. De proefwijziging is teruggezet zonder publicatie.

## Tijdelijke opslag — 2 november 2026

Op verzoek van de gebruiker: maximaal één lokale herstelkopie per gebruiker per browser. Nieuwe invoer vervangt de vorige lokale kopie; oude per-afslagkopieën worden bij het openen samengevoegd tot de nieuwste. Na 72 uur vervalt gewone lokale invoer. Een onzekere indiening blijft behouden tot de uitkomst is gecontroleerd en kan niet door een andere telling worden overschreven. Een andere tab kan een nieuwere herstelkopie niet wissen bij het opslaan van een oudere telling.

**Concept opslaan** bewaart bewust centraal. Een concept dat nooit is ingediend vervalt na 72 uur zonder centrale wijziging; de database ruimt elk uur op (minuut 17). Heropende, ingediende en gecontroleerde afsluitingen en hun geschiedenis blijven behouden. De private opruimfunctie is niet aanroepbaar door appaccounts; zij gebruikt dezelfde vergrendeling als het opslaan. Cron-logregels van deze eigen taak vervallen na zeven dagen.

Migration `*_draft_retention.sql` is toegepast en de actieve Supabase Cron-taak gecontroleerd. De opruimfunctie is live met een fictieve afslag getest binnen een teruggedraaide transactie. 110 tests, typecheck en build slagen. Het tabbladicoon is nu een ronde SVG met het bestaande OS-logo.

## Compact invulscherm — 3 november 2026

Gebruiker wil vooral minder scrollen bij het **invullen**, niet in de afsluitingenlijst. Het formulier is daarom compacter gemaakt in `src/components/cash/cash-form.tsx` en `src/app/(werkplek)/kassa-afslag/cash.css`; de koppen van nieuwe/detailafslagen zijn ook compacter.

- Medewerker, vestiging en datum staan op brede schermen in één rij.
- Telling en betaalwijzen staan naast elkaar. Op zeer brede schermen staan biljetten en munten binnen de telling ook naast elkaar; op smalle schermen blijven de velden onder elkaar.
- Bedragen staan naast hun labels en overbodige herhaling van minimum €0 is weggehaald. Positieve minimumwaarden en validatie blijven zichtbaar.
- Berekende velden zijn optioneel via een selectievakje; uitkomsten met een invoerfout komen vanzelf in beeld.
- Opmerkingen en uitgebreide totalen zijn inklapbaar. Verplichte tekorttoelichting en fouten openen de opmerkingen; belangrijke uitkomsten plus opslaan/indienen blijven in de vaste onderbalk.
- Coupures, rekenregels, rechten, opslag, samenvatting en servervalidatie zijn hetzelfde gebleven.

Gecontroleerd in de bestaande Chrome-sessie: bij 2560×1440 ging de standaard formulierhoogte van ongeveer 2884 naar 938 pixels (circa 67% korter); de gehele pagina paste daarna zonder verticale of horizontale scroll. Dat is een meting van dit desktopformaat, geen garantie voor kleinere schermen. Berekende velden tonen/verbergen en Enter van het laatste biljet (€5) naar de eerste munt (€2) werken. Bij samenvatten met een onvolledige telling worden fouten en vereiste toelichting zichtbaar; er is niets centraal opgeslagen of ingediend tijdens deze UI-proef. 120 bestaande tests, typecheck en productiebuild geslaagd. Echte iPhone/iPad-praktijkcontrole blijft open.

### Automatisch passend op desktop — 3 november 2026

Het standaard invulscherm gebruikt bij minimaal 1320×900 CSS-pixels een bredere werkruimte, kleinere omringende marges en een compactere kop/metadata. Overbodige footer en dubbele standaardvestigingmelding worden daar weggelaten. Er is geen overflow verborgen: bij extra geopende inhoud of fouten blijft alles bereikbaar via normale scroll.

Browsercontroles met werkelijke viewportoverride: 1920×1080, 1440×900 en 1320×900 hebben in de standaardweergave geen horizontale of verticale scroll. Bij 390×844 is de indeling één kolom, met verticale maar zonder horizontale scroll. Dit controleert browserresponsiviteit; het is geen praktijkproef van een echt iPhone-toetsenbord. Tijdelijke viewportinstelling na de test hersteld. Productiebuild geslaagd; alleen CSS gewijzigd, geen rekenregels of gegevens.

### Lagere desktopvensters — 3 november 2026

Naar aanleiding van de gebruikersscreenshot is de activeringsgrens van de compacte desktopstijl verlaagd van 900 naar 780 pixels hoogte (bij minimaal 1320 pixels breed). De bovenbalk is 44 pixels hoog; titel, bovenmarge en metadata zijn verder ingekort. Dubbele toelichting bij een ongewijzigd startsaldo is verborgen; bij afwijkend startsaldo blijft de standaardinformatie beschikbaar. Ook smallere desktopvensters krijgen minder bovenruimte. Browserproef: standaardweergave past op 1667×850 en 1320×850 zonder verticale/horizontale scroll. Extra inhoud mag de pagina laten groeien. Build geslaagd; viewport na testen hersteld.


### Papieren kastelling als visueel voorbeeld — 3 november 2026

De standaard invoer volgt nu de eerste papieren foto: coupures in gelijnde kolommen, totaal geteld/startsaldo/contant direct onder de telling, en een betaalwijzentabel met totaal benodigd, resultaat en in te vullen in de kassa tussen de regels. Deze uitkomsten zijn altijd zichtbaar; de eerdere optie om berekende velden te verbergen vervalt. Bedragen zijn rechts uitgelijnd, invoercellen herkenbaar en tussenuitkomsten benadrukt. Aangepaste formulieren behouden hun ingestelde veldvolgorde en labels; tekens/formuletekst volgen de configuratie. Rekenregels, validatie, rechten en opslag zijn behouden. Zonder geldige telling verschijnt nog geen misleidend tekort.

Nieuwe bestanden: `src/lib/cash/presentation.ts` bepaalt presentatievolgorde/formulelabels, `src/components/cash/payment-table.tsx` toont de tabel en `src/components/cash/paper-entry.css` verzorgt de opmaak. `cash-form.tsx` verbindt deze met de bestaande invoer; `nieuw/page.tsx` gebruikt de titel Kastellingformulier. Test lokaal via `/kassa-afslag/nieuw`: vergelijk rijvolgorde met het papier, wissel aantal/bedrag, controleer de uitkomsten en klap opmerkingen open. Extra inhoud blijft via normale scroll bereikbaar.

Validatie: 125 tests, typecheck en productiebuild geslaagd. Standaardweergave in Chrome past zonder scroll op 1667×850 en 1320×850; 390×844 heeft verticale maar geen horizontale scroll. Geen centrale gegevens opgeslagen tijdens deze opmaakcontrole. Praktijktest op echte iPhone/iPad blijft open.
