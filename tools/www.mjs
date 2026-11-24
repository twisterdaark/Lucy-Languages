// Copies the web app into www/ for the Capacitor (APK) build.
import fs from 'fs';
if (!fs.existsSync('ai-config.js')) fs.writeFileSync('ai-config.js', 'window.LUCY_GEMINI_KEY = "";');
fs.rmSync('www', { recursive: true, force: true }); fs.mkdirSync('www');
for (const f of ['index.html', 'firebase-config.js', 'ai-config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png']) fs.copyFileSync(f, 'www/' + f);
console.log('www ready');
