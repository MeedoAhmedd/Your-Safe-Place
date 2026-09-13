# Your Safe Place

A calming 3D cozy-room web app built with Three.js. Decorate your room, relax
to ambient sound and music, and unwind in a space that's entirely yours.

## Project structure

```
Your Safe Place/
├── dev/       working source — plain HTML, CSS, and JS, no build step
├── dist/      clean shippable build (identical to dev/, ready for static hosting)
├── android/   Capacitor project that wraps the game into a native Android app
├── LICENSE.md
└── README.md
```

- **`dev/`** — always edit here. Loads Three.js from a CDN, so it needs an
  internet connection while testing.
- **`dist/`** — the same game as `dev/`, kept in sync, for shipping to Steam,
  itch.io, or any static web host.
- **`android/`** — the native Android wrapper (Capacitor 6). Its `www/`
  folder mirrors `dist/` but loads Three.js and fonts from a bundled
  `vendor/` folder so the app works fully offline. See
  [`android/README.md`](android/README.md) for build/publish steps.

## Running it locally

Open `dev/index.html` directly in a browser, or serve it:

```bash
npx serve dev
```

## License

All rights reserved — see [LICENSE.md](LICENSE.md).
