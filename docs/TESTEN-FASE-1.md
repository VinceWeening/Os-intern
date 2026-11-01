# Jouw testlijst — fase 1

## Eerst je testaccount

Het Supabase-project in organisatie Os-Steakhouse is als **testomgeving** gekoppeld. Je eerste account is aangemaakt met je eigen e-mailadres en heeft het actieve beheerderprofiel **Vince**. Gebruik het e-mailadres en wachtwoord waarmee je het account in Supabase hebt gemaakt; het eerder voorgestelde fictieve adres is niet gebruikt.

De authenticator moet je bij de eerste login nog koppelen en bevestigen. Stuur geen wachtwoord, instelsleutel, QR of code in de chat. Alleen een Auth-account zonder actief profiel krijgt geen bedrijfsgegevens.

## Daarna: ongeveer vijf minuten testen

Start in de projectmap `npm run dev` en open http://127.0.0.1:3000/inloggen.

| Stap | Doe dit | Verwacht resultaat |
| --- | --- | --- |
| 1 | Log eerst in met een fout wachtwoord | Foutmelding; geen toegang |
| 2 | Log in met het juiste wachtwoord | Verplicht authenticator instellen; nog geen bedrijfsgegevens |
| 3 | Kies Authenticator instellen en scan de QR met Microsoft/Google Authenticator | OS Werkplek verschijnt in de authenticator-app |
| 4 | Vul een onjuiste code in, daarna een nieuwe juiste code | Foutmelding bij fout; daarna toegang tot de werkplek |
| 5 | Bekijk Kassa-afslag | Als testmanager zie je Heiloo en Heerhugowaard; Afslag starten is nog uitgeschakeld |
| 6 | Ga naar Beveiliging | Eén actieve authenticator; de laatste kun je niet verwijderen |
| 7 | Log uit, log opnieuw in | Opnieuw een authenticatorcode vereist |
| 8 | Open de app in een privévenster zonder login | Geen toegang tot Kassa-afslag of Beveiliging |
| 9 | Bekijk de app op smal scherm | Alles leesbaar; geen horizontale scroll; invoervelden bruikbaar |

Optioneel: koppel een **tweede authenticator op een ander toestel/app**, bevestig die en verwijder daarna de eerste met een nieuwe code van de eerste. Bewaar minimaal één werkende authenticator. Gebruik niet tweemaal dezelfde app die de identieke instelsleutel kan overschrijven.

## Wat je nog niet hoeft te testen

Kassatelling, berekeningen, concept opslaan, indienen en managercontrole zijn fase 2/3. De uitgeschakelde startknop is nu bewust.

De toegangsregels voor medewerkers zijn automatisch getest. Een live test met aparte medewerkeraccounts volgt zodra die testaccounts zijn aangemaakt.

Op je iPhone verwijst `localhost` naar de telefoon zelf, niet naar deze pc. Installeren en volledig testen op echte iPhone/iPad doen we via een beveiligde HTTPS-testdeployment; die staat nog niet online.

## Terugkoppelen

Stuur per probleem: stapnummer, toestel/browser, wat je deed en de foutmelding. Geen wachtwoorden, QR-codes of authenticatorcodes delen.
