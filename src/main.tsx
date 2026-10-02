import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { isFirebaseConfigured } from "./firebase";
import "./styles.css";

// Each route loads only its own code, so a player's phone doesn't download the stage, host or light.
const MainScreen = lazy(() => import("./MainScreen").then((m) => ({ default: m.MainScreen })));
const HostPage = lazy(() => import("./HostPage").then((m) => ({ default: m.HostPage })));
const LightPage = lazy(() => import("./light/LightPage").then((m) => ({ default: m.LightPage })));
const Play = lazy(() => import("./Play").then((m) => ({ default: m.Play })));
const ViewScreen = lazy(() => import("./ViewScreen").then((m) => ({ default: m.ViewScreen })));

function Root() {
  if (!isFirebaseConfigured) {
    return <main className="center"><h1>Firebase not configured</h1><p>Copy <code>.env.example</code> to <code>.env</code> and fill in your project's values.</p></main>;
  }
  // "/" is the shared main screen; "/play" is for players' phones; "/host" is the host's remote;
  // "/screen" is an extra, view-only copy of the main screen (e.g. in another room);
  // "/light" runs the light (camera + Hue lamp) all evening on a computer with a webcam.
  const path = window.location.pathname;
  if (path.startsWith("/play")) return <Play />;
  if (path.startsWith("/host")) return <HostPage />;
  if (path.startsWith("/screen")) return <ViewScreen />;
  if (path.startsWith("/light")) return <LightPage />;
  return <MainScreen />;
}

// The curtain backdrop is on <body>, so showing nothing while a page loads looks intentional.
createRoot(document.getElementById("root")!).render(<StrictMode><Suspense fallback={null}><Root /></Suspense></StrictMode>);
