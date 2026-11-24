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

## Courses and menu languages

Two courses are live, each with its own progress (missions, review deck, stats); XP, streak and settings are shared:
- **Brazilian Portuguese**: `src/pt.js`
- **Egyptian Arabic** (Cairo, ʿāmmiyya): `src/ar.js`. Arabic script with Franco (Arabizi) under every line. The mic
  accepts Arabic or Franco, so you can also type `ezzayak`. `node tools/check-ar.mjs` checks that every Franco line has
  as many words as its Arabic line (the mic scores word by word).

A new course is one more file with the same shape, added to `COURSE_DATA` and `COURSES` in `src/a.js`.

Menus come in English, Arabic (right-to-left) or Portuguese (`src/i18n.js`, tables in `src/i18n/`). The Portuguese
course's meanings are translated into Arabic, and the Arabic course's meanings into Portuguese and Arabic.

## Voices

Every fixed lesson and scene line gets a pre-made neural voice file when the site deploys (`tools/lines.mjs` lists them,
`tools/voices.py` makes them with edge-tts, cached between runs): Francisca and Antonio for Portuguese, Salma and Shakir
for Egyptian Arabic. Live AI chat lines use Gemini's voice (about 10 free lines a day per model), then the phone's own.

Icons: game-icons.net (CC BY 3.0, Lorc, Delapouite and others).
