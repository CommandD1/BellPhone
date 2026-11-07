# Klingelspiel 🔔

Android-App, die als laute Türklingel funktioniert: Sobald im WLAN das UDP-Paket `ESP32_ALERT` an Port `4444` ankommt (z. B. vom ESP32-Klingelknopf), klingelt das Handy – auch im Standby, bei gesperrtem Bildschirm und im Lautlos-Modus.

## So funktioniert es

- Der native Vordergrunddienst (`modules/doorbell`) lauscht auf UDP-Port 4444, unabhängig von der JS-Laufzeit. Er hält Wake-, WLAN- und Multicast-Lock, damit Broadcast-Pakete auch bei ausgeschaltetem Bildschirm ankommen, und startet nach einem Neustart automatisch wieder.
- Beim Klingeln wird der **Wecker-Audiokanal** auf maximale Lautstärke gestellt (danach wiederhergestellt), ein Ding-Dong in Schleife abgespielt und vibriert. Ein Vollbild „Es klingelt!“ erscheint über dem Sperrbildschirm.
- Ein Klingeln dauert maximal 30 s oder bis „Stopp“ gedrückt wird. Danach werden Signale 10 s lang ignoriert.
- In der App: Klingel einschalten und alle Punkte der Checkliste erlauben (Benachrichtigungen, Akku-Optimierung aus, Vollbild-Benachrichtigungen).

Nur Android – iOS erlaubt keinen dauerhaften UDP-Empfang im Hintergrund. Der Code nutzt ein eigenes natives Modul, darum geht Expo Go nicht; nötig ist ein Development-Build (`npx expo run:android` oder `eas build --profile development`).

Test im selben WLAN: `python3 test/esp32_simulator.py`

---

# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **src/app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **example** directory and create a blank **src/app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
