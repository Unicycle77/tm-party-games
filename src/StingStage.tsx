/** A task's sting picture, the whole big screen, while its sting plays. Shown whole (letterboxed), never cropped: it's the host's own image, read from the PC's folder. */
export function StingStage({ src }: { src: string }) {
  return (
    <main className="stage sting-stage">
      <img src={src} alt="" />
    </main>
  );
}
