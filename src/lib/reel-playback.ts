// Pure, framework-agnostic playback synchronizer for reel carousels.
//
// Guarantees:
//   - Every video EXCEPT the one at `selectedIndex` is paused and muted.
//   - The video at `selectedIndex` plays with audio (falling back to muted
//     if the browser blocks autoplay-with-sound).
//   - If the active video isn't yet ready (readyState < HAVE_CURRENT_DATA),
//     playback is deferred until the `loadeddata` event fires.
//
// All input methods that change the active reel (touch swipe, mouse drag,
// mouse wheel, keyboard arrows) flow through Embla's `select` event into
// `selectedIndex` state, so this single helper is the only thing that
// needs to be correct for "only the active video plays" to hold.

export interface VideoLike {
  readyState: number;
  muted: boolean;
  currentTime: number;
  paused?: boolean;
  pause: () => void;
  play: () => Promise<void> | void;
  load?: () => void;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
}

// HTMLMediaElement.HAVE_CURRENT_DATA
export const HAVE_CURRENT_DATA = 2;

export function syncReelPlayback(
  videos: ReadonlyArray<VideoLike | null>,
  selectedIndex: number,
): () => void {
  // 1. Pause + mute every non-active video synchronously.
  videos.forEach((v, i) => {
    if (!v || i === selectedIndex) return;
    try {
      v.pause();
    } catch {
      /* noop */
    }
    v.muted = true;
  });

  const active = videos[selectedIndex];
  if (!active) return () => {};

  let cancelled = false;

  const tryPlay = () => {
    if (cancelled) return;
    active.muted = false;
    const p = active.play();
    if (p && typeof (p as Promise<void>).catch === "function") {
      (p as Promise<void>).catch(() => {
        if (cancelled) return;
        active.muted = true;
        const p2 = active.play();
        if (p2 && typeof (p2 as Promise<void>).catch === "function") {
          (p2 as Promise<void>).catch(() => {});
        }
      });
    }
  };

  active.currentTime = 0;

  if (active.readyState >= HAVE_CURRENT_DATA) {
    tryPlay();
    return () => {
      cancelled = true;
    };
  }

  const onReady = () => {
    active.removeEventListener("loadeddata", onReady);
    tryPlay();
  };
  active.addEventListener("loadeddata", onReady);
  try {
    active.load?.();
  } catch {
    /* noop */
  }

  return () => {
    cancelled = true;
    active.removeEventListener("loadeddata", onReady);
  };
}
