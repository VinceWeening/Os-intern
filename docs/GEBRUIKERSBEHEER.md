# Gebruikersbeheer — eerste werkende uitbreiding

Bron: gebruiker koos op 1 november 2026 zelf samengestelde rollen en uitsluitend beheerders als gebruikersbeheerders. Uitgebreid op de Supabase-testomgeving; Vince heeft de eerste beheerderrol. De kassa-workflow is nog niet uitgebreid.

## Schermen

- **Account & beveiliging:** je eigen authenticator en sessie. Beschikbaar voor iedere actieve gebruiker met MFA.
- **Gebruikersbeheer:** lijst met naam, rol, toegewezen vestigingen en actief/geblokkeerd. Alleen voor wie gebruikers mag beheren.
- **Gebruiker bewerken:** rol kiezen, vestigingen toewijzen en account deactiveren. Voor opslaan een helder overzicht van de wijziging.
- **Rollen & rechten:** zelf rollen aanmaken, naam/beschrijving en rechten aanpassen. Beheerderrollen zijn duidelijk gemarkeerd en geven alle onderdelen plus gebruikersbeheer.

## Voorgestelde startrollen

| Recht | Medewerker | Manager | Beheerder |
| --- | --- | --- | --- |
| Eigen account/authenticator | Ja | Ja | Ja |
| Kassa-afslag invullen | Eigen vestigingen | Beide vestigingen | Beide vestigingen |
| Afsluitingen bekijken | Eigen, binnen toegewezen vestigingen | Beide vestigingen | Beide vestigingen |
| Controleren/heropenen | Nee | Ja | Ja |
| Gebruikers/rollen/vestigingen beheren | Nee | Nee | Ja |

Invullen, controleren en heropenen zijn toekomstige functies van fase 2/3. Toegang ervoor voorbereiden betekent niet dat die functies al bestaan.

## Rechten concreet benoemen

Voor nu slechts rechten voor de bestaande scope: kassa-afslag openen/invullen, eigen afsluitingen bekijken, alle toegestane afsluitingen bekijken, controleren, heropenen en gebruikers beheren. Geen rechten voor de uitgesloten modules verzinnen.

Vestigingstoegang blijft een afzonderlijke beperking. Een recht om een afslag te bekijken mag niet zelfstandig een extra vestiging ontsluiten. De oorspronkelijke eis dat managers beide vestigingen zien blijft gelden.

## Afdwingen en beschermen

- Iedere serveractie en databasefunctie controleert opnieuw de actuele bevoegdheid van de ingelogde gebruiker, inclusief actief profiel en MFA.
- Menu's weerspiegelen rechten; een verborgen knop is geen toegangsbeveiliging. Directe URL's en API-aanroepen moeten dezelfde weigering geven.
- Rollen en rechten komen uit beheerste tabellen, nooit uit een eigen rolkeuze of bewerkbare Auth-user_metadata.
- Nieuwe beheermogelijkheden lopen via beperkte transactionele functies, geen algemene schrijftoegang tot profielen.
- Voorkom dat de laatste actieve beheerder wordt uitgeschakeld of zijn beheertoegang verliest. Controleer dit ook bij twee gelijktijdige beheeracties.
- Beheerwijzigingen krijgen versies en historie: wie, wanneer, doelgebruiker en oude/nieuwe waarden. Wachtwoorden en MFA-geheimen komen daar nooit in.
- Wachtwoordherstel, verloren authenticators en gebruikers uitnodigen zijn afzonderlijke processen; deze rechtenuitbreiding geeft niet automatisch bevoegdheid tot MFA-reset.

## Implementatie

Migration `20261101193151_configurable_roles.sql` voegt `app_roles`, `access_events`, een rolverwijzing en beheerversie op profielen toe. Het oude `profiles.role` is alleen voor migratiecompatibiliteit behouden; het verleent geen rechten meer. Toegang hangt af van de toegewezen rol, niet van de rolnaam.

`src/lib/auth/permissions.ts` bevat de catalogus en UI-beslissingen. `session.ts` beschermt pagina's; `src/lib/admin/actions.ts` beschermt mutaties. PostgreSQL controleert dezelfde bevoegdheid onafhankelijk opnieuw. De openbare RPC-wrappers gebruiken invokerrechten; de beperkte helpers staan in het niet blootgestelde private-schema.

`src/components/admin/` bevat aparte bestanden voor de gebruikerslijst, gebruikerseditor, rolleneditor, resultaatmelding en CSS. `src/app/(werkplek)/gebruikersbeheer/page.tsx` haalt gegevens uitsluitend na de beheerdercontrole op.

Alle beheerwijzigingen worden in een korte transactie geserialiseerd met een gedeeld advisory lock. Na verkrijgen van de lock wordt de actuele beheerderstatus opnieuw gecontroleerd. Updates vereisen de eerder gelezen versie; een achterhaalde versie geeft een conflict. Een verplichte reden en waarden vóór/na komen in het wijzigingslog. De laatste actieve beheerder kan niet via een gebruikers- of rolwijziging worden verwijderd.

## Testen voor jouw review

1. Log in met je bestaande account en authenticator. Open **Gebruikersbeheer**; je rol hoort **Beheerder** te zijn.
2. Open **Rollen & rechten**, kies **Rol maken**, bijvoorbeeld `Test — alleen account`. Laat alle kassa-opties en beheerdertoegang uit, vul een reden in en sla op. De nieuwe rol verschijnt in de lijst.
3. Bewerk die testrol. Zet **Kassa-afslag openen** aan, geef een reden en sla opnieuw op. Controleer de succesmelding en het wijzigingslog.
4. Open jouw gebruikerseditor: controleer rolkeuze en vestigingen. Probeer je eigen account te blokkeren met een reden. Als enige beheerder hoort dit te worden geweigerd. Je account blijft actief.
5. Open dezelfde testrol op twee apparaten/tabs. Sla een wijziging op in de eerste, probeer daarna vanuit de oude editor in de tweede op te slaan. De tweede moet een versieconflict tonen.
6. Voor een live rechtentest is een tweede, vooraf aangemaakt fictief Auth-account nodig. Geef dat account een gewone rol en alleen Heiloo. Het mag geen gebruikersbeheer openen. Wijzig vervolgens de rol naar alleen eigen account: het kassa-onderdeel hoort te verdwijnen, ook bij openen via directe URL.

Accountregistratie, uitnodigingsmails, wachtwoordherstel en MFA-reset blijven buiten deze kleine uitbreiding. Nieuwe Auth-accounts maak je vooraf in Supabase; bestaande accounts zonder profiel verschijnen hier als ‘Nog geen toegang’ en kunnen door jou worden ingericht. Rollen worden niet verwijderd; pas hun rechten aan of wijs een andere rol toe.

46 tests slagen, inclusief PostgreSQL-toegangsregels, laatste-beheerdercontrole, versies, audit en rechten zonder extra vestigingstoegang. In de echte ingelogde Chrome-sessie zijn rol aanmaken, rechten wijzigen, succesmelding en audit getest. Twee tabs met verschillende versies geven na de onderstaande correctie direct een conflictmelding. De fictieve rol `Test — beperkte kassatoegang` blijft zonder gebruikers als reviewvoorbeeld staan.

### Versieconflicten: expliciete HTTP 409

Migration `20261101194150_explicit_management_conflicts.sql` corrigeert versieconflicten naar SQLSTATE PT409. De aanvankelijk gebruikte 40001 betekent serialization_failure; PostgREST 14 kan dit oneindig opnieuw proberen. De PostgreSQL-test controleert nu expliciet de foutcode PT409 en de browserproef met twee tabs is opnieuw geslaagd. Bron: [Supabase-uitleg over 40001-retries](https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions).

Providerrequests hebben daarnaast een deadline van 12 seconden per verzoek. Schrijfacties worden niet automatisch herhaald; bij een onzekere uitkomst vraagt de UI gegevens te vernieuwen. Een afgebroken verbinding bewijst immers niet dat een write is teruggedraaid.

De nieuwe beheerschermen zijn op desktop gecontroleerd. De Chrome-viewportoverride wijzigde de gemeten viewport niet, dus er is geen geslaagde mobiele browserproef voor deze uitbreiding geclaimd. Test op echte iPhone/iPad blijft onderdeel van de mobiele oplevering.

## Persoonlijke extra rechten (2 november 2026)

Via **Gebruikersbeheer → Bewerken → Extra rechten voor deze gebruiker** kan een beheerder per recht kiezen tussen permanent en een eindmoment. Het invoermoment gebruikt de tijdzone van het apparaat en wordt als absoluut tijdstip opgeslagen; het bestaande eindmoment wordt ook in Amsterdamse tijd getoond.

Dit blok heeft een eigen opslagknop en reden. Sla eventuele wijzigingen aan rol/vestigingen eerst met **Gebruiker opslaan** op. De extra rechten worden toegevoegd aan de opgeslagen rol. Uitvinken trekt alleen de persoonlijke uitzondering in; een recht dat de rol al geeft blijft bestaan. Vestigingstoegang, authenticator en blokkering blijven gelden. Beheerderstatus en gedeelde-kassacomputeridentiteit komen uitsluitend via de rol.

De database controleert verval met de servertijd bij elke aanvraag. Er is geen taak of browserklok nodig die de rechten verwijdert. Een reeds geopend scherm kan zichtbaar blijven, maar een nieuwe gegevensaanvraag of schrijfactie controleert de actuele rechten opnieuw. Verlopen regels blijven zichtbaar tot de beheerder ze verwijdert of verlengt. Wijzigingen gebruiken dezelfde profielversie als het andere gebruikersbeheer en worden met actor, reden, voor- en nawaarden gelogd.

De tabel `user_permission_grants` is alleen leesbaar voor de betreffende ingelogde medewerker of een beheerder, met geldige MFA. Schrijven kan uitsluitend via de beheerders-RPC. Tests omvatten onbevoegde writes, verval, intrekken, rolrechten behouden, vestigingsgrenzen en versieconflicten. Er zijn bij oplevering geen persoonlijke uitzonderingen aan bestaande gebruikers toegekend.
