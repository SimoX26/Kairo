# Contesto di progetto: Kairo

## Obiettivo

Kairo è un'app di produttività esclusivamente mobile per Android. Permette di creare attività, cronometrare studio/lavoro, eseguire cicli Pomodoro, consultare sessioni in viste giorno/settimana/mese e confrontare report correnti e precedenti. La UI è in italiano, scura, molto animata e deve restare accessibile.

## Vincoli invarianti

- Nessun backend, account, tracking o dipendenza da rete.
- Persistenza esclusivamente locale tramite Capacitor Preferences.
- Il target installabile è un APK Android generato con Capacitor.
- Un timer in corso deve sopravvivere a refresh, sospensione e riapertura usando timestamp reali.
- Tutte le durate sono memorizzate in secondi e tutte le date come stringhe ISO.
- Settimane con inizio lunedì; formattazione e testi in locale `it-IT`.
- Non rimuovere `prefers-reduced-motion`: le animazioni ricche devono avere un fallback accessibile.

## Architettura

- `src/store/`: stato, reducer, migrazione e comandi applicativi.
- `src/services/`: persistenza/device API.
- `src/lib/`: funzioni pure per date, timer e report.
- `src/screens/`: quattro aree principali (Focus, Pomodoro, Calendario, Report).
- `src/components/`: componenti UI condivisi.
- `tests/`: test delle regole di dominio e delle aggregazioni.

Non introdurre routing o librerie di grafici per semplici viste: la navigazione è locale e i grafici sono SVG/CSS. Aggiungere dipendenze solo se una funzione nativa o complessa lo richiede davvero.

## Comandi di verifica

- `npm test`: regole timer/report.
- `npm run build`: type-check e bundle di produzione.
- `npm run android:sync`: build e sincronizzazione del progetto nativo.
- `npm run android:apk`: genera l'APK debug quando SDK/JDK sono disponibili.

## Regole di modifica

- Ispezionare il codice prima di modificarlo.
- Applicare la modifica minima che soddisfa completamente la richiesta.
- Non fare refactor, redesign o rinominazioni fuori ambito.
- Non aggiungere dipendenze se non strettamente necessario.
- Non modificare file estranei alla richiesta.
- Mantenere il comportamento esistente salvo richiesta esplicita.
- Verificare sempre il lavoro con i controlli disponibili e non dichiarare test non eseguiti.
