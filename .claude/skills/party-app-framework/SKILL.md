---
name: party-app-framework
description: Use when starting a new party or game-night web app with a shared stage screen (TV), a phone per player and a host remote, where players join by a short code or QR. Builds the framework from scratch with Vite, React and Firebase.
---

# Build a party app framework: stage, players, host

This recipe builds the base that any party game, quiz night or game show can sit on: one app with three screens, kept in sync through one live session, which players join with a 4-letter code or a QR. It's drawn from an app that has run real parties. Write the code fresh in the new repo; the snippets below are the shape to follow, not code to paste.

Before you write code, agree with the person on what the night looks like: who's in the room, what's on the TV, what each phone is for. This skill covers only the plumbing, not the games or the look.

## 0. The shape

| Route | Screen | Who uses it |
|---|---|---|
| `/` | **Stage**: the TV or projector. It shows what the session's `display` says, the join QR and the code. | The room |
| `/play` | **Player**: one phone per guest. Join, then whatever the game asks of them. | Guests |
| `/host` | **Host remote**: a phone that drives the stage. | The host |
| `/screen` (optional) | A view-only copy of the stage, for another room. It never writes. | The room |

Rules that hold everywhere:

- **The session is the truth.** Every screen subscribes to `sessions/{code}` and renders from it. A button writes to the database; it never talks to another screen directly. That way a refresh, or a second stage, always shows the right thing.
- **The stage is passive.** It shows `display` and the session's state. Controls live on the host remote. Keep only a small backup control bar on the stage, for when the host is at the TV.
- **Name the shared screen in the players' words** ("the big screen", "the TV"). "Stage" is the builder's word.

## 1. Project setup

- Use Vite, React 18 and TypeScript, with `firebase` (Realtime Database, anonymous Auth, Storage only if there are uploads), `qrcode.react` to draw QRs and `qr-scanner` to read them.
- Put the Firebase config in `.env` as `VITE_FIREBASE_*`, with an `.env.example` beside it. If the config is missing, show a friendly "Firebase not configured" page rather than crashing.
- Add `VITE_PUBLIC_URL` for the address the QR codes point at, so a dev machine on the LAN can print the real site's address.
- Firebase Hosting needs an SPA rewrite (`"source": "**", "destination": "/index.html"`), `no-cache` on HTML, and long-lived caching on `/assets/**`.
- Add `npm run build`, which runs checks then `tsc --noEmit` then `vite build`, and `npm run deploy`, which runs the build then `firebase deploy`. The deploy includes the database rules.
- Add a check that no two files in `src/` differ only in capitals. macOS treats them as one file, and the build breaks there.

## 2. Routes: each screen loads only its own code

```tsx
// main.tsx
const Stage = lazy(() => import("./Stage").then((m) => ({ default: m.Stage })));
const Host = lazy(() => import("./HostPage").then((m) => ({ default: m.HostPage })));
const Play = lazy(() => import("./Play").then((m) => ({ default: m.Play })));
function Root() {
  if (!isFirebaseConfigured) return <NotConfigured />;
  const path = location.pathname;
  if (path.startsWith("/play")) return <Play />;
  if (path.startsWith("/host")) return <Host />;
  if (path.startsWith("/screen")) return <ViewScreen />;
  return <Stage />;
}
createRoot(root).render(<Suspense fallback={null}><Root /></Suspense>);
```

Give `body` the app's backdrop colour or texture, so that showing nothing while a page loads looks intentional. Load heavy libraries (the QR scanner, Storage, media tools) the moment they're needed, not with the page.

## 3. Identity: anonymous auth

```ts
let signIn: Promise<User> | undefined;
export function ensureSignedIn(): Promise<User> {
  const a = auth();
  signIn ??= new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(a, (u) => { if (u) { unsub(); resolve(u); } });
    a.authStateReady().then(() => {
      if (!a.currentUser) signInAnonymously(a).catch((e) => { signIn = undefined; reject(e); });
    });
  });
  return signIn;
}
```

Every device gets a uid that survives refreshes. Nobody types a password. Roles come from which uid sits in which slot of the session (see step 6).

Wrap `localStorage` in try/catch (`store.get` and `store.set`), because private mode can throw.

## 4. The session and its code

```ts
// No 0/O or 1/I/L, so a code read off a TV can't be mistyped.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
async function freeCode() {
  for (let i = 0; i < 25; i++) {
    const code = Array.from({ length: 4 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");
    if (!(await get(ref(db(), `sessions/${code}/hostUid`))).exists()) return code;
  }
  throw new Error("Could not find a free code, please try again.");
}
export async function createSession() {
  const user = await ensureSignedIn();
  const code = await freeCode();
  await set(ref(db(), `sessions/${code}`), { hostUid: user.uid, createdAt: serverTimestamp(), display: { step: "lobby" } });
  return code;
}
export function useSession(code?: string) {      // undefined = loading, null = gone
  const [s, setS] = useState<Session | null>();
  useEffect(() => { setS(undefined); if (!code) return;
    return onValue(ref(db(), `sessions/${code}`), (snap) => setS(snap.exists() ? snap.val() : null)); }, [code]);
  return s;
}
```

A session holds the following:

- `hostUid`: the stage that owns the party.
- `controllerUid`: the host remote.
- `name` and `createdAt`.
- `players/{uid}`: name and `joinedAt`.
- `display`: what the stage shows, such as `{ step, uid? }`.
- `game` and `games/{id}/…`: per-game data.

Keep anything players mustn't read (answers, secrets, a host pin) **outside** `sessions`, because guests can read the whole session.

The stage remembers its code in `localStorage`, so a refresh resumes the party (`resumeSession` takes back `hostUid`). Let the host also create a party from the remote, before any TV exists; the first stage to open it takes it over.

## 5. Joining: the QR or a typed code

- `joinUrlFor(code)` is `${PUBLIC_URL}/play?code=${code}`. The stage draws it big with `<QRCodeSVG value={joinUrlFor(code)} bgColor="#fff" marginSize={2} />`, black on white, with the code and URL beside it in text.
- On `/play`:
  - The code saved on the phone is the starting point.
  - A different `?code=` in the URL (a new QR) **wins**: forget the saved code and open the join form on the new one. Scanning the same party's QR again changes nothing.
  - The join form shows the QR's code as a fixed "Joining party ABCD" line, with a small "Wrong party? Enter a different code" link. Then there's one field, "Your first name", and one primary Join button.
  - Without a QR, the guest types 4 letters or taps 📷 to scan. Accept a full URL or a bare code:

```ts
export function extractCode(text: string) {
  try { const c = new URL(text).searchParams.get("code"); if (c) return c.toUpperCase().slice(0, 4); } catch {}
  const t = text.trim().toUpperCase();
  return /^[A-Z0-9]{4}$/.test(t) ? t : null;
}
```

- `joinSession(code, name)`:
  - Check that the session exists. Refuse a name that's already taken, compared without case or extra spaces.
  - Write `players/{uid} = { name, joinedAt }`.
  - Save the code on the phone.
  - The confirmation that really lands is the guest's own name appearing on the big screen.
- Watch for loss. If the session becomes `null`, drop back to the form with "That party has ended." and clear `?code=` from the URL. If `players/{uid}` disappears, say "You were removed from the party."
- **The in-app QR scanner needs https and camera permission** (`getUserMedia`). Plain `http://<LAN-IP>` fails, even though `<input type="file" capture>` photo buttons work there. Test on the deployed https site, show the real error (`NotAllowedError`, no `mediaDevices`, `NotFoundError`), and always leave typing the code as the fallback.

## 6. The host remote

- The stage shows a second, smaller QR to `${PUBLIC_URL}/host?code=${code}` until a remote has connected.
- `claimController(code)`: if `controllerUid` is empty, write your uid. If it's already you, carry on. If it's someone else, refuse with a clear "another phone has the remote".
- **Then plan for a lost phone:**
  - Either the old remote approves a hand-over (both phones show the same 3 digits),
  - or an optional host pin, kept outside the session (`pins/{code}` plus `hostTrust/{code}/{uid}`), lets a phone that knows it take over.
  - Releasing the remote clears `controllerUid`, so the stage shows the host QR again.
- The remote's one job is to change `display` and the game state. `setDisplay(code, display)` writes in a single update, so the stage never sees half a change.

## 7. Database rules from day one

```json
"sessions": { "$code": {
  ".read": true,
  ".write": "auth != null && (!data.exists() || data.child('hostUid').val() === auth.uid)",
  "controllerUid": { ".write": "auth != null && ((!data.exists() && newData.val() === auth.uid) || data.val() === auth.uid)" },
  "display": { ".write": "auth != null && (root.child('sessions/'+$code+'/hostUid').val() === auth.uid || root.child('sessions/'+$code+'/controllerUid').val() === auth.uid)" },
  "players": { "$uid": {
    ".write": "auth != null && (auth.uid === $uid || root.child('sessions/'+$code+'/hostUid').val() === auth.uid || root.child('sessions/'+$code+'/controllerUid').val() === auth.uid)",
    "name": { ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 20" } } },
  "$other": { ".validate": false }
}}
```

- Writers come in three kinds: host only, host or controller, or the player themselves. A player writes only under their own uid.
- Give every leaf a `.validate` with a type and a length cap, and end with `$other: false`, so unknown keys are refused.
- **The database refuses writes silently**: the phone shows the change for a moment, then snaps back. Every time you add a path, test the write from each role. Add a script that checks every game id has a rules block, and run it in the build and a pre-commit hook.

## 8. The stage

- **Before a party exists**: a "Start a party" button, plus a box to resume one by its code.
- **During the party**: render by `display.step`. The lobby shows each player's name tile appearing as they join. Keep a corner line on every screen with the code and URL (and the QR, when the host asks for it), for latecomers.
- **Browser rules**: browsers block sound until someone clicks, so open on a single "Start" click. Offer full screen, and keep the screen awake (Wake Lock).
- `/screen` reuses the stage with `viewOnly`: no controls, and never a write.

## 9. Games plug in

Define a `Game` interface once, and have each game in `src/games/<id>/` provide:

- `Stage` (the TV), `Player` (the phone) and `HostLobby` / `HostPlayer` (the remote), each loaded lazily;
- `name`, and a one-line `blurb` for the picker;
- `status(session, uid)`, if players submit something;
- `files(session, uid)`, for a download-everything zip.

A `GAMES` record lists them in picker order. The shared screens render `activeGame(session)?.Stage` and so on. Adding a game then never touches the framework. When a game stores something new, give it a rules block in the same change.

## 10. Test it like a party

- Write a fake in-memory Firebase (`ref`, `get`, `set`, `update`, `onValue`, `push`, `remove`), aliased in a separate Vite config. With it, every screen can be rendered from the real components over one made-up party, and screenshotted with Playwright: a phone at 390x844 at 2x, the TV at 1600x900.
- Keep one sample party for every picture, so the TV, the phones and the remote always agree.
- Before calling the framework done, test these on real devices over https:
  - join by QR, join by typed code, and join by in-app scan;
  - refresh each screen mid-party;
  - scan a second party's QR on a phone that's already in a party;
  - take the remote over from a "dead" phone;
  - check that a guest can't write another guest's data.
