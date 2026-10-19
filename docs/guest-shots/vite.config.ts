// Serves the guest-screen shots (docs/guest-shots/) with Firebase swapped for an in-memory stand-in.
// Usage: npx vite --config docs/guest-shots/vite.config.ts, then node docs/guest-shots/shoot.mjs
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = (f: string) => fileURLToPath(new URL(f, import.meta.url));
const fake = "fake";

export default defineConfig({
  root: here("../.."),
  plugins: [react()],
  resolve: {
    alias: {
      "firebase/app": here(`./${fake}-app.ts`),
      "firebase/auth": here(`./${fake}-auth.ts`),
      "firebase/database": here(`./${fake}-database.ts`),
      "firebase/storage": here(`./${fake}-storage.ts`),
    },
  },
  define: Object.fromEntries(["API_KEY", "AUTH_DOMAIN", "DATABASE_URL", "PROJECT_ID", "STORAGE_BUCKET", "MESSAGING_SENDER_ID", "APP_ID"]
    .map((k) => [`import.meta.env.VITE_FIREBASE_${k}`, JSON.stringify("shots")])
    .concat([["import.meta.env.VITE_PUBLIC_URL", JSON.stringify("https://tm-party-games.web.app")]])),
  server: { port: 5174 },
});
