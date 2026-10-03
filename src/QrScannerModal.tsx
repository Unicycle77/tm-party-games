import type QrScanner from "qr-scanner";
import { useEffect, useRef, useState } from "react";

export function QrScannerModal({ onScan, onClose }: { onScan: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState<string>();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // The scanner library loads when the modal opens, not with the page.
    let scanner: QrScanner | undefined;
    let closed = false;
    import("qr-scanner").then(({ default: Scanner }) => {
      if (closed) return;
      scanner = new Scanner(video, (r) => onScanRef.current(r.data), {
        preferredCamera: "environment", highlightScanRegion: true, highlightCodeOutline: true,
      });
      scanner.start().catch(() => setError("Couldn't access the camera. Check your browser's camera permission."));
    }, () => setError("Couldn't load the scanner. Check your connection and try again."));
    return () => { closed = true; scanner?.stop(); scanner?.destroy(); };
  }, []);

  return (
    <div className="qr-overlay">
      <video ref={videoRef} muted playsInline />
      <p>{error ?? "Point your camera at the QR code on the main screen"}</p>
      <button type="button" onClick={onClose}>Cancel</button>
    </div>
  );
}
