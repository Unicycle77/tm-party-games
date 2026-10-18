// firebase/auth for the guest-screen shots: everyone is already signed in as the shot's guest.
const user = () => ({ uid: (window as unknown as { __uid: string }).__uid });
const auth = { get currentUser() { return user(); }, authStateReady: async () => {} };
export type User = ReturnType<typeof user>;
export const getAuth = () => auth;
export const onAuthStateChanged = (_a: unknown, cb: (u: User) => void) => { queueMicrotask(() => cb(user())); return () => {}; };
export const signInAnonymously = async () => ({ user: user() });
