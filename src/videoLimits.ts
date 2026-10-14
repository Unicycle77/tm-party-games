/**
 * Limits on the videos guests upload, so a long or 4K clip can't run up the Storage bill.
 *
 * The length is checked on the phone only (Storage can't read a video's length). The size is the hard
 * cap: storage.rules refuses anything bigger, so keep MAX_VIDEO_MB in step with the `video-` rule there.
 * 300 MB fits any 2-minute phone clip at 1080p, even iPhone's "Most Compatible" (about 260 MB).
 */
export const MAX_VIDEO_SECONDS = 120;
export const MAX_VIDEO_MB = 300;

// Phones round a clip's length, so a "0:30" video can be 30.4s.
const LENGTH_GRACE_SECONDS = 0.5;

/** "30 seconds", "1 minute", "1:30". */
function length(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s} seconds`;
  if (s % 60 === 0) return s === 60 ? "1 minute" : `${s / 60} minutes`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** The limits in words, for hints. */
export const videoLimitText = `up to ${length(MAX_VIDEO_SECONDS)}`;

/** Why this video file is too big to upload, or undefined if it's fine. */
export function videoTooBig(file: Blob): string | undefined {
  const mb = file.size / (1024 * 1024);
  if (mb <= MAX_VIDEO_MB) return undefined;
  return `That video is ${Math.round(mb)} MB, and videos can be up to ${MAX_VIDEO_MB} MB. Trim it to ${length(MAX_VIDEO_SECONDS)} or less, or record it again in 1080p instead of 4K.`;
}

/** Why a video this long can't be uploaded, or undefined if it's fine. */
export function videoTooLong(seconds: number): string | undefined {
  if (seconds <= MAX_VIDEO_SECONDS + LENGTH_GRACE_SECONDS) return undefined;
  return `That video is ${length(seconds)} long, and videos can be up to ${length(MAX_VIDEO_SECONDS)}. Trim it in your phone's Photos app, then choose it again.`;
}
