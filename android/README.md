# Your Safe Place — App Build

This folder is the **real app** version of the game. It wraps the game
(`index.html` in `www/`) into a native shell using **Capacitor**, so you can ship
it to the **Google Play Store**, **itch.io**, or run it on a **PC**.

Nothing about the game was changed. The only difference between `www/index.html`
and the `dev/`/`dist/` copies at the project root: Three.js and the fonts are
bundled into `www/vendor/` so the app works with **no internet connection**.

```
android/
├─ www/                  ← the game (index.html + assets/ + vendor/)
├─ android/              ← generated Android Studio project  ← THE EXECUTABLE
├─ capacitor.config.json ← app id, name, colors
├─ package.json
└─ README.md             ← you are here
```

App identity (change these before publishing if you want):
- **App name:** Your Safe Place
- **Package / App ID:** `com.mohamed.yoursafeplace`
  (must be globally unique on Play Store — `com.<you>.<game>` is the convention)

---

## 0. One-time setup on your PC

You already have **Node.js**. You also need, for Android:

1. **Java JDK 17** – https://adoptium.net/  (Temurin 17)
2. **Android Studio** – https://developer.android.com/studio
   - On first launch it installs the Android SDK. Open **More Actions → SDK Manager**
     and make sure "Android SDK Platform 34" + "Android SDK Build-Tools" are checked.

Then, inside this folder:

```bash
npm install          # already done once, safe to re-run
```

---

## 1. Edit the game later

Edit files in **`www/`** (or copy a new `index.html` in), then:

```bash
npx cap sync android
```

That copies `www/` into the Android project. Always run it after changing the game.

---

## 2. Test it on a phone (fastest loop)

- Plug in an Android phone with **USB debugging** on, **or** create an emulator in
  Android Studio (Device Manager → Add a device).

```bash
npx cap run android
```

Picks the device, builds a debug app, installs and launches it.

Or open the project in Android Studio and press the green ▶:

```bash
npx cap open android
```

---

## 3. Build the file for the Play Store  (`.aab`)

Google requires an **Android App Bundle (.aab)**, signed with your own key.

### 3a. Make a signing key (once — keep it forever, back it up!)

```bash
keytool -genkey -v -keystore your-safe-place.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

It asks for a password and your name/org. Save the `.jks` file and passwords
somewhere safe — **if you lose it you can never update the app again.**

### 3b. Tell Gradle about the key

Create `android/keystore.properties` (do NOT commit it):

```properties
storeFile=../../your-safe-place.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=upload
keyPassword=YOUR_KEY_PASSWORD
```

Then open `android/app/build.gradle` and, inside `android { ... }`, add:

```gradle
    def kp = new Properties()
    def kpf = rootProject.file("keystore.properties")
    if (kpf.exists()) kp.load(new FileInputStream(kpf))

    signingConfigs {
        release {
            if (kpf.exists()) {
                storeFile file(kp['storeFile'])
                storePassword kp['storePassword']
                keyAlias kp['keyAlias']
                keyPassword kp['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
```

### 3c. Build

```bash
cd android
./gradlew bundleRelease          # Windows: gradlew.bat bundleRelease
```

Output:

```
android/app/build/outputs/bundle/release/app-release.aab
```

That `.aab` is what you upload to the Play Console.

---

## 4. Build a plain `.apk` (for itch.io / sharing directly / sideloading)

```bash
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`
Anyone can install this by tapping it on their phone (after allowing
"install from unknown sources"). Great for a **free itch.io Android page**
while you decide about the Play Store.

---

## 5. Publish to Google Play — the actual steps

1. Pay the **one-time $25** and open a **Play Console** account
   (https://play.google.com/console). You'll upload a photo ID.
2. **Create app** → name "Your Safe Place", type Game, free.
3. Fill the store listing: short + full description, one feature graphic
   (1024×500), at least 2 phone screenshots, an icon (512×512).
4. Fill the questionnaires: content rating, target audience, data safety,
   privacy policy URL (a free one-page site is fine).
5. **Closed testing:** Google now makes new personal accounts run a **14-day
   closed test with 20 opted-in testers** before you can go public. Add 20
   emails (friends, Discord, etc.), send them the opt-in link, wait 14 days.
6. **Production** → upload `app-release.aab` → submit for review (a few days).

### Updating later
Bump `versionCode` (integer, +1 every upload) and `versionName` in
`android/app/build.gradle`, run `npx cap sync android`, rebuild the `.aab`,
upload a new release.

---

## 6. Getting it onto PCs

The game is a web app, so you have easy options:

| Route | How | Notes |
|---|---|---|
| **itch.io (web)** | Zip the contents of `dist/` (with CDN links) or `www/`, upload as an *HTML* project, tick "This file will be played in the browser". | Free, instant, playable in-browser. **Best place to get noticed** — join game jams. |
| **GitHub Pages** | Push `www/` to a repo, enable Pages. | Free link anyone can open. |
| **Poki / CrazyGames** | Submit the HTML build via their dev portals. | Millions of daily players; they curate. |
| **Real Windows `.exe`** | Add Electron or Tauri as a second wrapper (ask and I'll set it up). | Needed only for Steam. |
| **Steam** | Requires the `.exe` wrapper + the **$100 per-game** Steamworks fee. | Do this after the game has an audience from itch.io / mobile. |

### Quick Windows `.exe` (Electron) — optional
If/when you want it, this folder can also produce a Windows `.exe` with
`electron` + `electron-builder` pointing at the same `www/`. Say the word.

---

## Troubleshooting

- **"SDK location not found"** → open the project once in Android Studio, or
  create `android/local.properties` with `sdk.dir=C:\\Users\\YOU\\AppData\\Local\\Android\\Sdk`
- **Black screen on device** → run `npx cap sync android` again; check the phone
  has WebGL (any phone from the last ~8 years does).
- **Gradle can't find Java** → install JDK 17 and set `JAVA_HOME`.
- **Game looks laggy on an old phone** → it already auto-lowers quality to keep
  the frame-rate up; give it a few seconds after load.
