# Lucy

A sarcastic cat who teaches you Brazilian Portuguese. Free, no hearts, no limits.

Lucy (a real dilute-calico cat, drawn here as a hand-made vector) is the logo, the coach and the main chat and call partner.
Missions go **hear → chunks → shadow → recall → write → real role-play**, with spaced-repetition review, a pronunciation
gym that scores every word, levels A1–B2 with a time-to-level estimate, milestones, and street slang and cusses
(slurs are taught as *recognise only*).

## Where it runs

| | Voice | Mic | AI partner | Sync |
|---|---|---|---|---|
| **Website** (GitHub Pages) | phone/browser Portuguese voices, female for Lucy and women, male for men | browser speech recognition (Chrome, Android, iPhone Safari) | Gemini, with your own free key in Settings | Google sign-in (Firebase) |
| **Android APK** (Actions → Android APK → artifact) | Android text-to-speech | Android speech recognition | Gemini key | device (Google sign-in in the APK is next) |
| **claude.ai artifact** (`dist/lucy-claude.html`) | Claude voices | Claude dictation | Claude | your Claude account |

## Build

```
node tools/build.mjs        # index.html (web) + dist/lucy-claude.html
node tools/www.mjs          # copies the web app to www/ for Capacitor
```

Sources live in `src/` (`a.js` content and progress model, `b.js` voice, mic, scoring and shell, `c.js` screens,
`standalone.js` Google sync and Gemini, `style.css`, `lucy.svg`).

## Google sign-in setup (once)

1. Create a Firebase project, a Firestore database and a web app (see `setup-lucy-cloud.ps1` in the project files).
2. Paste the web app config into `firebase-config.js` as `window.LUCY_FIREBASE = { ... }`.
3. Deploy `firestore.rules` (each person only reads and writes `users/<their uid>/…`).
4. In the Firebase console: Authentication → Google → Enable, and add `twisterdaark.github.io` to Authorized domains.

## More languages

`COURSES` in `src/a.js` lists the languages. Portuguese is live; a new language adds its own units, scenes, phrases and
levels next to the Portuguese ones.

Icons: game-icons.net (CC BY 3.0, Lorc, Delapouite and others).
