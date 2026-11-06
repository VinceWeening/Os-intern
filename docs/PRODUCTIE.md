# Vóór productie

Vereisten, geen reeds ingerichte productieomgeving. Geen echte kassagegevens gebruiken voordat volgende fasen en controles afgerond zijn.

## Configuratie en toegang

- Aparte Supabase-projecten. Development/Preview uitsluitend test; Production uitsluitend productie. Per omgeving eigen URL/key/ref en APP_ENV. Proxy weigert mismatch met VERCEL_ENV.
- URL/ref controleren én handmatig vaststellen dat het testproject werkelijk test is; een label bewijst dat niet.
- Alleen publishable keys in publieke config. Geen service-role keys, wachtwoorden of exports in frontend, Git of logs. Beheer via vertrouwde provideromgeving.
- Publieke registratie bij Supabase uit; sterke wachtwoorden, TOTP, rate-limits, origins en HTTPS controleren. Alleen een registratiepagina weglaten is onvoldoende.
- Migrations eerst op test, daarna bewust op productie. Geen DB-wijzigingen in frontendbuilds en geen productie-reset.
- Live tests van het functieblad uitvoeren, inclusief directe API, MFA-vervanging, inactieve accounts, sessietermijnen en toegang intrekken.
- Accountbeheerder en identiteitscontrole voor herstel vaststellen. Managers hebben hier geen accountbeheerrechten.

## Back-up en herstel

Vóór productie: eigenaar/vervanger, bewaartermijn, maximaal dataverlies (RPO) en hersteltijd (RTO) vaststellen.

1. Controleer in het gekozen Supabase-abonnement automatische back-ups, retentie en eventueel Point-in-Time Recovery tegen het gekozen RPO. Nu niet geconfigureerd of geverifieerd.
2. Leg aanvullende versleutelde exports van bedrijfstabellen vast buiten het primaire project, met passende frequentie/retentie. Geen persoonsgegevens in Git; exports via bevoegd beheer.
3. Migrations herstellen structuur, geen gegevens of authenticatorgeheimen. Een public-export herstelt Supabase Auth niet. Controleer apart back-up-/hersteldekking van Auth/MFA.
4. Herstelproef naar een apart afgeschermd project, nooit over productie. Eerste proef met fictieve data.
5. Controleer aantallen afsluitingen/telregels/audit, bedragen, datumuniciteit, rollen, toewijzingen en RLS. Test werkelijke login/MFA en weigering van onbevoegden.
6. Noteer back-uptijdstip, herstelduur, laatst teruggevonden afslag en afwijkingen. Succes vereist werkende app met correcte gegevens én rechten.
7. Incidentprocedure: verantwoordelijke inschakelen, writes pauzeren, bron kiezen, restore verifiëren, configuratie aanpassen waar nodig, gecontroleerd hervatten.

## PWA en updates

Nog geen service worker/automatische refresh. Kassa-invoer heeft beperkte lokale herstelopslag (maximaal één kopie per gebruiker/browser, drie dagen voor gewone herstelkopieën); toets de afscherming op gedeelde toestellen en netwerkuitval in de praktijk. Een later update-/cachemechanisme mag geen open formulier herladen of gevoelige HTML offline bewaren. Test installeren/heropenen op echte iPhone/iPad met HTTPS.

Schrijfworkflow en managercontrole zijn inmiddels gebouwd. De herstelproef en volledige productie-/mobiele oplevering staan nog open. Zie ROADMAP.md voor de actuele status. Hostingrichting sinds 3 november 2026: Render; nog geen deployment in deze documentatiestap ingericht.

Bronnen: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [TOTP](https://supabase.com/docs/guides/auth/auth-mfa/totp), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [back-ups](https://supabase.com/docs/guides/platform/backups), [Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps). Provideropties bij ingebruikname opnieuw controleren.
