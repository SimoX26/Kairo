# Kairo

Kairo è un'app mobile per misurare attività di studio e lavoro, gestire cicli Pomodoro e leggere i propri progressi nel calendario e nei report. È disponibile come APK Android e come PWA installabile su iPhone. Tutti i dati restano sul dispositivo: non esistono server, account o sincronizzazione cloud.

## Avvio

Requisiti: Node.js 20.19+, npm, JDK 21 e Android SDK 35. Per la CLI Android configurare `ANDROID_HOME`/`ANDROID_SDK_ROOT` oppure `android/local.properties`; Android Studio può gestire entrambi.

```bash
npm install
npm run dev
```

## Controlli

```bash
npm test
npm run build
```

## Android e APK

Il progetto nativo `android/` è già inizializzato. Dopo ogni modifica web:

```bash
npm run android:sync
npm run android:apk
```

L'APK debug pronto da installare viene prodotto in `artifacts/Kairo.apk`. Per una release firmata si usa Android Studio o una configurazione Gradle con keystore privato (che non va committato).

## Dati locali

Lo stato è serializzato tramite Capacitor Preferences con fallback web a `localStorage`. I timer salvano timestamp e tempo accumulato, quindi un riavvio dell'app non perde il conteggio. La rimozione dell'applicazione dal telefono elimina anche i dati locali.

Al primo Pomodoro Android può richiedere i permessi per notifiche e allarmi esatti: servono esclusivamente a segnalare puntualmente la fine della fase anche a schermo spento.

## iPhone e PWA

La cartella `dist/` prodotta da `npm run build` è una PWA statica e può essere pubblicata gratuitamente su un hosting HTTPS. Su iPhone, aprire l'indirizzo con Safari e scegliere **Condividi > Aggiungi a Home**. Dopo il primo avvio online l'app è disponibile anche senza connessione e continua a salvare i dati localmente.

Le notifiche locali del Pomodoro restano una funzione dell'app Android: nella PWA iOS il timer usa timestamp reali e recupera correttamente il tempo trascorso alla riapertura, ma non può garantire un avviso quando l'app è chiusa.
