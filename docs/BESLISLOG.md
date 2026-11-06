# Beslislog OS Werkplek

Dit register onderscheidt keuzes van werkelijke implementatie. Bron voor nieuwe richting: door gebruiker aangeleverde overdracht van 3 november 2026. Externe documentatieclaims daarin zijn nog niet opnieuw gecontroleerd.

| Datum / bron | Besluit of richting | Status / gevolg |
| --- | --- | --- |
| 1–2 november, gesprek en code | Next.js/TypeScript + Supabase; eigen rollen, server/RLS, TOTP, geen openbare registratie; geld in centen en werkdatum apart | Gebouwd; bestaande code als uitgangspunt houden |
| 2 november, gebruiker | Plus/minformulier per vestiging; historie aan oorspronkelijke rekenversie houden | Gebouwd; geen nieuwe kas-/fooienregels aannemen |
| 2 november, gebruiker | Eén lokale herstelkopie, nooit ingediende concepten na 3 dagen opruimen; onzekere indiening/historie beschermen | Gebouwd; geen algemene 3-dagenretentie voor definitieve afsluitingen/dagdocumenten |
| 2 november, gebruiker | Dagoverzicht per vestiging/werkdatum; ‘spil’ = verspilling; feedback binnen Mijn account voor medewerkers | Eerste versie gebouwd; definitieve dagafsluiting en aanlevering nog open |
| 3 november, overdracht | Eén modulaire app en centrale database voor beide vestigingen | Voorkeursarchitectuur; geen microservices introduceren |
| 3 november, overdracht | Render als hostingrichting, GitHub voor versiebeheer/automatische checks | Vervangt eerdere Vercel-richting in planning; geen deployment/migratie uitgevoerd |
| 3 november, overdracht | Tailwind, eventueel shadcn, Zod en Playwright als technische richting | Nog niet aanwezig; alleen doelgericht invoeren, geen blinde rewrite of frameworkmigratie |
| 3 november, overdracht | Eerst PWA op telefoon/tablet/pc; native app eventueel later | Geen aparte desktopapp; backend herbruikbaar houden |
| 3 november, overdracht | Eerst één bestaande handeling automatiseren: voorkeur PAY, dan PAX-mail, kassabron en printservice | Volgende stap nog afspreken; nu uitsluitend documentatie/planning |
| 3 november, overdracht | PAY en PAX apart zichtbaar; bronoverlap controleren; ontbrekend is niet ontvangen; definitieve snapshots niet stil wijzigen | Eisen voor toekomstige adapters; mogelijkheden/toegang nog bevestigen |
| 3 november, overdracht | Printwachtrij → lokale Windows-service → printer; alleen uitgaande verbinding | Toekomstontwerp; hardware/protocol en samenloop bestaande kassa eerst onderzoeken |
| 3 november, overdracht | Eén functie per keer, uitleg voor beginnend developer, testbewijs en reviewmoment | Vaste werkwijze; ideeën eerst in backlog, niet automatisch bouwen |

Als een nieuwe keuze afwijkt van een eerdere keuze: noteer de vervanging met bron en datum. Een leveranciersmogelijkheid wordt pas ‘bevestigd’ na controle van officiële documentatie/accountrechten; een geslaagde lokale test maakt iets nog niet productiegeschikt.
