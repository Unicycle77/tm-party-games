import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { isFirebaseConfigured } from "./firebase";
import { MainScreen } from "./MainScreen";
import { HostPage } from "./HostPage";
import { LightPage } from "./light/LightPage";
import { Play } from "./Play";
import { ViewScreen } from "./ViewScreen";
import "./styles.css";

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

createRoot(document.getElementById("root")!).render(<StrictMode><Root /></StrictMode>);
