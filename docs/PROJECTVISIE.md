# Projectvisie OS Werkplek

Bron: door gebruiker aangeleverde projectoverdracht, 3 november 2026.
Status: toekomstbeeld en voorkeursrichting; geen opdracht om alle onderdelen te implementeren. Leveranciersclaims en links hieronder zijn aangeleverde referenties, niet op deze datum opnieuw geverifieerd. Werkelijke bouwstatus staat in ROADMAP.md; open ideeën in BACKLOG.md en besluiten in BESLISLOG.md.

---

PROJECTOVERDRACHT — OS WERKPLEK

CONTEXT
Ik bouw een interne applicatie voor OS Steakhouse, met vestigingen
in Heiloo en Heerhugowaard.

De basis staat inmiddels. Inspecteer eerst de bestaande code,
database, documentatie en configuratie. Bepaal wat daadwerkelijk
werkt; neem niet aan dat alles hieronder al gebouwd is.

Dit document beschrijft het toekomstbeeld en de gemaakte keuzes.
Het is nadrukkelijk geen opdracht om alles ineens te implementeren.

DOEL
Dagelijkse administratie, keukeninformatie en werkzaamheden
centraliseren, handmatig overtypen verminderen en de eigenaren
Robert en Klaas overzicht geven over beide vestigingen.

WERKWIJZE MET MIJ
- Ik ben een beginnend developer en wil begrijpen wat ik bouw.
- Werk aan één afgebakende functie tegelijk.
- Leg uit welke onderdelen wat doen.
- Vermijd onnodige frameworks en complexe architectuur.
- Onderzoek bestaande functionaliteit voordat je iets toevoegt.
- Maak onderscheid tussen gerealiseerd, voorgesteld en onbevestigd.
- Geef per wijziging aan hoe deze getest is.
- Houd een roadmap, beslislog en korte moduledocumentatie bij.
- Bewaar nieuwe ideeën in een backlog.
- Stop na een afgesproken fase voor mijn review.
- Geen productiegegevens wijzigen of betaalacties uitvoeren tijdens tests.

TECHNISCHE RICHTING
Afgesproken basis:
- Next.js met TypeScript.
- Supabase voor PostgreSQL, authenticatie en private bestandsopslag.
- Render als hostingplatform.
- GitHub voor versiebeheer en automatische controles.
- Tailwind CSS en eventueel shadcn/ui voor consistente componenten.
- Zod voor invoervalidatie.
- Vitest voor logica en Playwright voor belangrijke gebruikersflows.
- Foutregistratie en beschikbaarheidsmonitoring vóór dagelijks gebruik.

Dit is de gekozen richting. Migreer bestaande werkende onderdelen
niet blind; beoordeel eerst de huidige implementatie.

ARCHITECTUUR
- Eén modulaire applicatie, geen microservices bij de start.
- Scheid schermen, bedrijfslogica, databasecode en externe koppelingen.
- Eén centrale database voor beide vestigingen.
- Externe API-sleutels uitsluitend aan de serverkant.
- Gebruikersrechten controleren op de server en met passende RLS.
- Geen openbare registratie; accounts worden beheerd.
- Gescheiden ontwikkel-/test- en productieomgeving.
- Databasewijzigingen vastleggen in migrations.
- Belangrijke wijzigingen en correcties vastleggen in een auditlog.
- Geldbedragen intern als integer centen verwerken.
- Werkdatums volgens Europe/Amsterdam; tijdstempels zorgvuldig opslaan.
- Een bedrijfsdag hoeft niet automatisch gelijk te zijn aan een kalenderdag.
- Bescherm tegen dubbel indienen en gelijktijdig overschrijven.

APPVORM EN DESIGN
- Eerst een PWA voor iPhone, iPad en desktop.
- Op pc voorlopig dezelfde PWA, geen aparte desktopapp.
- Later eventueel een native app voor de App Store.
- Backend en gegevens moeten later herbruikbaar zijn vanuit een mobiele app.
- Donkere, warme, rustige OS-uitstraling.
- Gebruik osbestellen.nl en indien bereikbaar osheiloo.nl als merkreferentie.
- Grote aanraakvlakken, duidelijke bedragen en weinig invoerstappen.
- Onbedoeld horizontaal scrollen voorkomen.
- Test toetsenbord, veeggedrag, vergrendelen en heropenen op echte apparaten.
- Geen garantie geven dat een PWA alle native systeemgebaren kan uitschakelen.
- Concepten niet verliezen bij appwissel, update of netwerkonderbreking.
- Toon onderscheid tussen lokaal bewaard en centraal opgeslagen.
- Volledig offline synchroniseren is een latere uitbreiding.

HOOFDNAVIGATIE
1. Vandaag
   Dagdashboard, dagkaart, taken, checklists, overdracht en dagafsluiting.

2. Registraties
   Kassa-afslag, temperatuurkaarten, eetregistratie en derving.

3. Keuken & bestellen
   Bestellijst, HHW-bestellingen, MEP, recepten, allergenen en houdbaarheid.

4. Team & rooster
   Medewerkers, vaardigheden, beschikbaarheid, vervangingshulp en inwerken.

5. Auto’s & bezorging
   Autoregistratie, bestuurderstoewijzing, kaart, rijtijden en rittenanalyse.

6. Meldingen
   Klachten, defecten, onderhoud en opvolging.

7. Kennis & nieuws
   Instructies, handboek, OS-krant en overige documenten.

8. Overzichten
   Verkoop, feestdagen, management, grafieken en patroononderzoek.

9. Beheer
   Gebruikers, rechten, koppelingen, imports, printers en back-ups.

Printknoppen horen bij de inhoudelijke schermen.
Printerinstellingen horen onder Beheer.
Verberg onderdelen waarvoor iemand geen toegang heeft of die nog niet beschikbaar zijn.

MODULE: KASSA-AFSLAG
Dit was de eerste prioriteit:
- Munten en biljetten tellen.
- Subtotalen en totaal automatisch berekenen.
- Verwachte en ontvangen bedragen vergelijken.
- Verschillen met toelichting vastleggen.
- Concept opslaan en hervatten.
- Samenvatting vóór indienen.
- Statussen concept, ingediend en gecontroleerd.
- Managercontrole en heropenen met reden.
- Historisch overzicht per datum en vestiging.
- Correcties herleidbaar houden.
- Eventueel kasuitgaven, bonnetjes, wisselgeld en afstorten.

BELANGRIJK:
De exacte kasberekening moet aansluiten op de echte OS-werkwijze.
Verzin geen regels over fooien, kasuitgaven of begin-/eindkas.
Maak onbeantwoorde procesvragen expliciet.

GEWENSTE AUTOMATISERING VAN DE AFSLAG
Doel: uiteindelijk alleen contant handmatig tellen;
andere betaalbronnen automatisch voorinvullen.

PAY en PAX zijn bij OS verschillende betalingenstromen.
Ze moeten dus apart zichtbaar zijn en kunnen worden opgeteld.
Controleer wel of een online bron dezelfde betalingen opnieuw vertegenwoordigt.

Toon per bron:
- Bedrag en aantal transacties waar beschikbaar.
- Werkdatum/periode en vestiging.
- Laatste succesvolle synchronisatie.
- Volledigheid en eventuele fout.
- Onderliggende transacties of bewijs.
- Automatisch of handmatig ingevoerd.
- Reden en auteur van een handmatige correctie.

Ontbrekende gegevens zijn “niet ontvangen”, nooit automatisch €0.
Opnieuw synchroniseren mag bedragen niet verdubbelen.
Definitief ingediende afsluitingen mogen niet stil veranderen door latere synchronisatie.
Bewaar de gebruikte stand; afwijkingen daarna worden expliciet behandeld.

Omzet en betalingen zijn verschillende grootheden:
- Verwacht volgens kassaregistratie.
- Werkelijk ontvangen via betaalbronnen en contant.
Tel omzet niet boven op de betalingen.

PAY / PAY.NL
Doel:
- Losse betalingen ophalen.
- Geslaagde betalingen optellen.
- Refunds apart en correct verwerken.
- Detailoverzicht voor onderzoek van ontbrekende of vreemde betalingen.
- Filteren op vestiging/terminal en juiste periode.

Gevonden officiële documentatie:
https://developer.pay.nl/reference/get_transactions
https://developer.pay.nl/reference/get_transactions-instore

De browse-documentatie noemt paginering en datumfilters.
De datumfilter betreft aanmaakdatum; verifieer hoe we aansluiten
op daadwerkelijke betaal- en refundmomenten.

Gebruik leesrechten waar mogelijk.
Geen betalingen starten of terugbetalen voor deze integratie.
Vergelijk eerst meerdere dagen met het officiële betaaloverzicht.

PAX
PAX is het terminalmerk; achterliggende betaalprovider nog vaststellen.
Er wordt een afslag per e-mail verstuurd.

Gewenste aanpak:
- Nieuwe afslagmail herkennen.
- Vestiging, terminal, afslagnummer/periode en bedragen uitlezen.
- Originele mail/bijlage als bewijs bewaren.
- Dubbele verwerking voorkomen.
- Bij afwijkend formaat: “controle nodig”.
- Geen AI als enige controle voor financiële bedragen.

Nog nodig:
- Geanonimiseerde voorbeeldmail met bijlage.
- Afzender/provider.
- Vaststellen of de mail ook losse transacties bevat.

Een totaalmelding kan geen ontbrekende transactiedetails opleveren.
Als die ontbreken, is een API/export van de provider nodig.

Mailboxaanpak afhankelijk van werkelijke provider.
Microsoft Graph is een mogelijkheid bij Microsoft 365,
maar neem niet aan dat OS dit gebruikt.

FOODTICKET
Gewenste gegevens:
- Omzet per vestiging, datum en betaalwijze.
- iDEAL-betalingen, refunds en referenties.
- Bestellingen en bonnummers.
- Productregels en aantallen.
- Afhaal-/bezorgtijden.
- Bezorgadres en opmerkingen.
- Bestel-/bereidingsstatus.
- Eventueel betaalwijze en betaalstatus aanpassen.

BEVESTIGD:
Er bestaan Foodticket-integraties met Client ID en API-key,
waarmee bestel- en omzetgegevens worden uitgewisseld.

NIET BEVESTIGD:
Welke velden/endpoints ons account krijgt.
Toegang tot iDEAL-details, adressen, statuswijzigingen,
betaalwijze aanpassen en historische bonnen.

Vraag officiële documentatie en rechten aan.
Geen endpoints of mogelijkheden verzinnen.

Referenties:
https://foodticket.nl/partners-and-integrations/
https://support.apicbase.com/help/foodticket
https://mreinstein.nl/koppelingen/foodticket

LET OP DEZE REPOSITORY:
https://github.com/food-ticket/takeaway-pos-api-client

Deze is van Foodticket, maar is een Laravel-client voor de
Takeaway/Thuisbezorgd POS-API, met posapi.takeaway.com als basis.
Geen bewijs voor algemene Foodticket-administratie-API.

De client bevat login/logout, orderwebhooks en bestelstatussen.
Geen aangetroffen functies voor betaalwijze wijzigen,
dagomzet ophalen of iDEAL-transacties uitlezen.
Meld onze app niet zomaar aan als ontvanger op een bestaande
bestelkoppeling; dat kan de bestelroutering beïnvloeden.

NIEUW KASSASYSTEEM
Er komt een eigen/op maat gemaakt kassasysteem.
Wie het bouwt en de technische mogelijkheden moeten nog worden vastgesteld.

Gewenst API-contract:
- Stabiele product-, bestel- en transactiereferenties.
- Vestiging en werkdatum.
- Productregels, aantallen en bedragen.
- Betaalwijzen, betaalstatus en refunds.
- Annuleringen en wijzigingen.
- Afhaal-/bezorgmoment.
- Statussen met een duidelijk afgesproken betekenis.
- Alleen-lezen toegang waar voldoende.
- Webhooks en mogelijkheid om gemiste wijzigingen opnieuw op te halen.

Het kassasysteem blijft bron voor bestellingen en kassastatus.
Voorkom dubbel afvinken in twee systemen.

MODULE: VERKOOPIMPORT EN OVERZICHTEN
Tijdelijke route zolang een API ontbreekt:
- Een vaste lokale map met exports bewaken.
- Wachten tot een bestand volledig geschreven is.
- Gegevens valideren en importeren.
- Periode uit de inhoud halen, niet alleen uit bestandsdatum.
- Dubbele bestanden herkennen.
- Overlappende perioden correct vervangen/ontdubbelen.
- Historie bewaren en importlog tonen.
- Vorige goede gegevens behouden bij een fout.

Automatisch verwijderen heeft lage prioriteit:
bestanden zijn klein en het kassasysteem verandert binnenkort.

Overzichten:
- Verkoopaantallen per product/categorie.
- Dag, week, periode en vestiging.
- Geselecteerde gerechten voor feestdagen.
- Tijdvakken zoals 17:00–17:30.
- Printbaar keukenoverzicht.
- Altijd vermelden tot wanneer de gegevens zijn bijgewerkt.

“Besteld / afgerond / nog te maken” alleen tonen als
de bron betrouwbare statussen levert.
Betaald of verkocht betekent niet automatisch bereid.

MODULE: PRINTER
Bestaande thermische bonnenprinter via IP en ethernet.
Merk/model/protocol nog vaststellen.
De bestaande kassa-/bestelapp moet blijven functioneren.

Afgesproken architectuur:
Telefoon/iPad/pc → backend → centrale printwachtrij →
lokale Windows-service in de zaak → netwerkprinter.

De werk-pc wordt dagelijks aan- en uitgezet.
- Service automatisch laten starten met Windows.
- Geen handmatig openen van de app nodig.
- Opnieuw verbinden als internet nog niet beschikbaar is.
- Herstart/herstel bij fouten.
- Alleen uitgaande verbinding naar centrale backend.
- Beperkte credentials per apparaat/vestiging.
- Geen printerpoort publiek openzetten.
- Geen algemene shell- of willekeurige commandouitvoering aanbieden.

Printfuncties:
1. Recepten, eventueel omgerekend naar porties/hoeveelheid.
2. Vrije tekst.
3. Definitief verstuurde HHW-bestellingen.
4. Later MEP, pakbonnen en verkoop-/feestdagenoverzichten.

Printverwerking:
- Opdracht-ID, vestiging, gebruiker en tijd vastleggen.
- Printvoorbeeld.
- Wachtrij en zichtbaar apparaat-/printerstatus.
- Verschil tussen wachtend, verwerkt/verzonden, fout en onzeker.
- Alleen “geprint” claimen als hardware dit betrouwbaar bevestigt.
- Geen blind opnieuw versturen na onzekere verzending.
- Herprint markeren als KOPIE.
- Geldigheidsduur per bonsoort.
- Geen stapel oude recepten automatisch printen na pc-start.
- Belangrijke HHW-bestellingen behouden voor controle.
- Voorkom dubbele verwerking bij meerdere processen.
- Test gelijktijdig gebruik met de bestaande kassa-app.
- Printerwijzigingen mogen de bestaande configuratie niet verstoren.

Een gewone bonnenprinter is niet automatisch geschikt
voor houdbaarheidsetiketten of gebruik in koeling/vocht.

MODULE: KEUKEN EN HHW
- Centrale bestellijst.
- HHW vraagt producten aan bij Heiloo.
- Product, hoeveelheid, eenheid, gewenste datum en opmerkingen.
- Alleen aantallen van hetzelfde product en dezelfde eenheid samenvoegen.
- Herkomst zichtbaar houden.
- Status van aangevraagd tot klaargezet/verzonden/ontvangen.
- Ontvangstcontrole en ontbrekende aantallen.
- Printen bij definitief versturen; niet tijdens iedere wijziging.
- Wijzigingen na verzenden herkenbaar verwerken.
- Geprint betekent niet klaargezet.
- MEP voor vandaag en morgen, verantwoordelijke en deadline.
- Recepten en schaalbare hoeveelheden.
- Allergenen per gerecht met bron en controledatum.
- Houdbaarheid: geopend/bereid/ontdooid en uiterste gebruiksdatum.
- Termijnen uit gecontroleerde productinformatie/werkinstructies.
- Derving en verspilling.
- Later uitverkocht-overzicht en “morgen klaar?”-pagina.

MODULE: DAGELIJKSE OPERATIE
- Centrale dagkaart per vestiging.
- Taken, verantwoordelijken en deadlines.
- Terugkerende checklists.
- Temperatuurregistratie met afwijking en vervolgactie.
- Eetregistratie en totaal voor de keuken.
- Overdracht.
- Dagafsluiting met ontbrekende onderdelen.
- Print/download van dagkaart.
- Klachten, defecten en onderhoud omzetten naar opvolgtaken.

MODULE: TEAM EN ROOSTER
- Medewerkerprofielen.
- Vaardigheden per taak:
  niet geleerd / in opleiding / zelfstandig / kan begeleiden.
- Inzetbaarheid per vestiging.
- Inwerken.
- Beschikbaarheid en bestaande diensten.
- Vervangingsvoorstellen voor een open dienst.
- Uitleg waarom iemand geschikt is.
- Onderscheid direct inzetbaar / begeleiding nodig.
- Manager bevestigt; niet automatisch inroosteren.
- Geen algemene ranglijst van goede/slechte medewerkers.

NOSTRADAMUS
Gewenste toegang:
- Rooster.
- Medewerkers.
- Beschikbaarheid.

Foodticket noemt een Nostradamus-koppeling voor omzetgestuurde planning.
Dat bewijst niet dat wij daarmee het rooster kunnen uitlezen.
Eigen API-toegang, velden, kosten en updatefrequentie nog bevestigen.
Neem bestaande planning niet onnodig over.

MODULE: AUTO’S EN BEZORGING
- Per auto bestuurder met begin- en eindtijd.
- Bestuurderswissels vastleggen.
- Overlap voorkomen.
- Onbekende bestuurder eerlijk tonen.
- Maximaal één bestelling per auto.

WEBFLEET
Officiële WEBFLEET.connect API.
Gewenst:
- Posities, positie-tijdstip en ritgegevens.
- Kaart met autopuntjes en bestuurder.
- Status bij OS / heen / terug / stil / onbekend.
- Rijtijd naar juiste vestiging.
- Terugkerende auto’s sorteren op rijtijd.
- Refreshknop.
- Apart tonen: opgehaald op en positie gemeten op.
- Oude locaties zichtbaar markeren.
- Geen schijnprecisie bij aankomsttijden.
- Richting niet bij iedere kleine beweging laten omslaan.
- Zone rond vestiging voor “bij OS”.

30–60 seconden schermverversing was een ontwerpdoel,
geen bevestigde trackerprestatie.
Meet eerst echte vertraging, uitval en ETA-afwijkingen.

Webfleet beveelt message queues aan voor doorlopende tracking.
De functie attachDriverToVehicle is volgens documentatie
voor uitzonderingen, niet reguliere dagelijkse toewijzing.
Onze eigen toewijzingshistorie kan daarom de basis vormen.

Rijgedrag:
- Rustig overzicht achteraf voor managers.
- Alleen opvallende uitzonderingen.
- Voorbeeld: meerdere afzonderlijke forse snelheidsoverschrijdingen.
- Voorbeeld: opvallend lange rit met context.
- Geen meldingen voor iedere kleine overtreding.
- Eén doorlopende gebeurtenis niet meerdere keren tellen.
- Signaal is geen automatische beschuldiging.
- Medewerkers moeten weten waarvoor gegevens worden gebruikt.

BEZORGSCHERM
Voorstel, afhankelijk van bestelgegevens:
- Bonnummer invoeren of later QR scannen.
- Vestiging en datum meenemen vanwege hergebruik van nummers.
- Adres tonen en controleren.
- Knop naar Google Maps/Apple Kaarten.
- Optioneel afgeleverd / terug naar OS registreren.
- Geen betaalstatus in kassa wijzigen zonder bevestigde API-mogelijkheid.

Navigatie openen met Maps-links is iets anders dan
rijtijden in ons dashboard berekenen.
Google Maps-links vereisen geen API-key:
https://developers.google.com/maps/documentation/urls/get-started

Voor dashboardrijtijden eventueel Google Routes:
https://developers.google.com/maps/documentation/routes/compute_route_matrix

MODULE: KENNIS EN MANAGEMENT
- Werkinstructies, handboek, OS-krant en documenten.
- Zoekfunctie en laatst bijgewerkt.
- Rolafhankelijke toegang.
- Managementdashboard voor Robert en Klaas.
- Filters op vestiging en periode.
- Kasverschillen, registratievolledigheid, taken en klachten.
- Productverkopen en feestdagenoverzichten.
- Later voorbereiding en drukte onderzoeken op historische gegevens.
- AI pas toevoegen bij een concreet doel en betrouwbare data.
- AI geen financiële of voedselveiligheidsbeslissingen laten verzinnen.

BETROUWBAARHEID
- Duidelijke laad-, fout-, lege en successtatussen.
- Back-ups van database EN opgeslagen documenten.
- Herstel daadwerkelijk testen.
- Geen persoonsgegevens/secrets in onnodige logs.
- Automatische checks vóór releases.
- Update mag lopende invoer niet wissen.
- Bij een integratiestoring blijft handmatig werken mogelijk.
- Apparaten en koppelingen tonen hun laatste succesvolle activiteit.
- Eigenaarschap van accounts, code en bedrijfsgegevens documenteren.

ROADMAP
1. Basis en rechten.
2. Handmatige kassa-afslag.
3. PAY, PAX en eventueel kassabronnen automatiseren.
4. Dagelijkse operatie.
5. Keuken en kennis.
6. HHW-bestellingen en printer.
7. Team en bezorging.
8. Meldingen en management.
9. Verdere analyses en eventuele native app.

De basis staat volgens mij al.
Herijk deze roadmap op de werkelijke projectstatus.
Een ontbrekende leverancierskoppeling mag andere modules niet blokkeren.

HUIDIGE GEWENSTE VOLGENDE STAP
Eén bestaande handeling automatiseren.

Voorkeursvolgorde:
1. PAY-transacties ophalen.
2. PAX-afslagmail verwerken.
3. Foodticket/nieuwe kassabron.
4. Lokale printservice.

Als PAY-toegang ontbreekt, kan een beschikbare PAX-voorbeeldmail
een beter eerste onderdeel zijn.

EERSTE OPDRACHT AAN JOU
1. Lees AGENTS.md en inspecteer het bestaande project.
2. Geef een kort overzicht:
   - Wat werkt al?
   - Wat is gedeeltelijk gebouwd?
   - Welke techniek wordt echt gebruikt?
   - Welke toegang/procesinformatie ontbreekt?
3. Werk de roadmap en backlog bij zonder alles te implementeren.
4. Stel één kleine volgende automatiseringsstap voor,
   met benodigde gegevens en concrete acceptatiecriteria.
5. Implementeer alleen wat binnen die afgesproken stap valt.
   Doe bij ontbrekende toegang alvast het veilige voorbereidende werk,
   zoals een adapterinterface en fictieve testfixtures.
6. Documenteer wijzigingen, tests en resterende beperkingen.

Project is geslaagd wanneer:
- De handeling aantoonbaar tijd of fouten bespaart.
- Gegevens betrouwbaar worden opgeslagen.
- Bedragen en statussen naar hun bron herleidbaar zijn.
- Medewerkers ermee kunnen werken.
- Ik de werking zelf kan uitleggen en onderhouden.