# Before & After

- UI work follows [docs/style-guide.md](docs/style-guide.md): reuse its materials, tokens, components and copy voice rather than inventing new ones.
- When a change adds or changes something the style guide describes (a token, component, state, icon or screen pattern), update [docs/style-guide.md](docs/style-guide.md) and the style sheet in the same change: edit [docs/style-sheet/sheet.tsx](docs/style-sheet/sheet.tsx) and re-render `docs/screens/style-sheet.jpg` (see [docs/style-sheet/README.md](docs/style-sheet/README.md)).
- The light's triggers (what the camera can detect: all face readings, body points, what's impossible, how to add one) are in [docs/light-signals.md](docs/light-signals.md). Check it before digging into MediaPipe.
- Every new or changed screen gets a screenshot in [docs/screens](docs/screens) (JPEG, rendered from the real components), with a row in its README. Not only in chat or a scratch folder.
- Screens shown together (a showcase section, a README set) come from one party: the sample code is ABCD, and the TV, guest and host screens agree on who's in, who's checked in and what's on. Re-shoot a screen from the same party rather than mixing in an old one (`docs/guest-shots` draws the guest phone and the TV's welcome that way).
- Merge with `git merge --no-ff`, so every merge leaves a merge commit. Never fast-forward.
