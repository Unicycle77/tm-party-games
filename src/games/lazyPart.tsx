import { type ComponentType, lazy, Suspense } from "react";

/**
 * A game's screen part (Stage, Player, HostLobby…) that loads when it's first shown, so each page only
 * downloads the parts it uses: a phone never gets the stage, the main screen never gets the host setup.
 * It shows nothing while it loads, inside its own boundary, so the rest of the page stays put.
 */
export function lazyPart<P extends object>(load: () => Promise<ComponentType<P>>): ComponentType<P> {
  // React's lazy() types lose the props of a generic component; it renders the same one.
  const Part = lazy(() => load().then((part) => ({ default: part }))) as unknown as ComponentType<P>;
  return (props: P) => <Suspense fallback={null}><Part {...props} /></Suspense>;
}
