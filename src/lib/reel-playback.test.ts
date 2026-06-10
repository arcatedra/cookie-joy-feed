import { describe, it, expect, vi, beforeEach } from "vitest";
import { syncReelPlayback, HAVE_CURRENT_DATA, type VideoLike } from "./reel-playback";

/**
 * Build a fake video element that records play()/pause() calls and exposes
 * an `emitLoadedData()` to simulate the browser firing `loadeddata`.
 */
function makeVideo(overrides: Partial<VideoLike> = {}) {
  const listeners = new Map<string, Set<() => void>>();
  let playResolver: ((value: void) => void) | null = null;
  let playRejecter: ((reason?: unknown) => void) | null = null;

  const v = {
    readyState: HAVE_CURRENT_DATA,
    muted: true,
    currentTime: 999, // deliberately non-zero so we can assert reset
    paused: true,
    playCalls: 0,
    pauseCalls: 0,
    loadCalls: 0,
    play: vi.fn(function play() {
      v.playCalls += 1;
      v.paused = false;
      return new Promise<void>((resolve, reject) => {
        playResolver = resolve;
        playRejecter = reject;
      });
    }),
    pause: vi.fn(function pause() {
      v.pauseCalls += 1;
      v.paused = true;
    }),
    load: vi.fn(function load() {
      v.loadCalls += 1;
    }),
    addEventListener: (type: string, listener: () => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(listener);
    },
    removeEventListener: (type: string, listener: () => void) => {
      listeners.get(type)?.delete(listener);
    },
    emit(type: string) {
      listeners.get(type)?.forEach((l) => l());
    },
    resolvePlay() {
      playResolver?.();
      playResolver = null;
      playRejecter = null;
    },
    rejectPlay(reason: unknown = new Error("NotAllowedError")) {
      playRejecter?.(reason);
      playResolver = null;
      playRejecter = null;
    },
    ...overrides,
  };
  return v;
}

type FakeVideo = ReturnType<typeof makeVideo>;

function flush() {
  // Resolve microtasks queued by the play() promise chain.
  return new Promise((r) => setTimeout(r, 0));
}

describe("syncReelPlayback", () => {
  let videos: FakeVideo[];

  beforeEach(() => {
    videos = [makeVideo(), makeVideo(), makeVideo()];
  });

  it("plays only the active video and pauses + mutes the rest (initial activation)", () => {
    syncReelPlayback(videos, 0);

    expect(videos[0].playCalls).toBe(1);
    expect(videos[0].muted).toBe(false);
    expect(videos[0].currentTime).toBe(0);

    for (const i of [1, 2]) {
      expect(videos[i].pauseCalls).toBe(1);
      expect(videos[i].playCalls).toBe(0);
      expect(videos[i].muted).toBe(true);
    }
  });

  it("when user swipes forward (1 → 2), pauses video 1 and plays video 2", () => {
    // Simulate initial mount on index 1.
    syncReelPlayback(videos, 1);
    expect(videos[1].playCalls).toBe(1);

    // Swipe to next reel.
    syncReelPlayback(videos, 2);

    expect(videos[1].pauseCalls).toBe(1);
    expect(videos[1].muted).toBe(true);
    expect(videos[2].playCalls).toBe(1);
    expect(videos[2].muted).toBe(false);
    expect(videos[0].pauseCalls).toBe(2); // paused on both syncs
  });

  it("mouse-wheel navigation that lands on the same index as before still produces single playing video", () => {
    syncReelPlayback(videos, 0);
    // Wheel down → index 1
    syncReelPlayback(videos, 1);
    // Wheel up → back to index 0
    syncReelPlayback(videos, 0);

    expect(videos[0].muted).toBe(false);
    expect(videos[1].muted).toBe(true);
    expect(videos[1].paused).toBe(true);
    expect(videos[2].paused).toBe(true);
  });

  it("keyboard ArrowDown sequence keeps exactly one unmuted video at the end", () => {
    syncReelPlayback(videos, 0); // initial
    syncReelPlayback(videos, 1); // ArrowDown
    syncReelPlayback(videos, 2); // ArrowDown

    const unmuted = videos.filter((v) => !v.muted);
    const playing = videos.filter((v) => v.paused === false);
    expect(unmuted).toHaveLength(1);
    expect(unmuted[0]).toBe(videos[2]);
    expect(playing).toHaveLength(1);
    expect(playing[0]).toBe(videos[2]);
  });

  it("defers playback when the active video is not ready, then plays on loadeddata", () => {
    const lateVideo = makeVideo({ readyState: 0 });
    const list: (FakeVideo | null)[] = [makeVideo(), lateVideo];

    syncReelPlayback(list as VideoLike[], 1);

    // No immediate play, but load() nudged and listener attached.
    expect(lateVideo.playCalls).toBe(0);
    expect(lateVideo.loadCalls).toBe(1);

    lateVideo.emit("loadeddata");
    expect(lateVideo.playCalls).toBe(1);
    expect(lateVideo.muted).toBe(false);
  });

  it("falls back to muted playback when autoplay-with-sound is blocked", async () => {
    const active = videos[0];
    syncReelPlayback(videos, 0);
    expect(active.playCalls).toBe(1);
    expect(active.muted).toBe(false);

    // Browser rejects unmuted autoplay (e.g. NotAllowedError).
    active.rejectPlay();
    await flush();

    expect(active.muted).toBe(true);
    expect(active.playCalls).toBe(2); // retried muted
  });

  it("cleanup cancels pending fallback so a stale slide does not unmute later", async () => {
    const active = videos[0];
    const cleanup = syncReelPlayback(videos, 0);
    expect(active.playCalls).toBe(1);

    // User swipes away before the play() promise rejects.
    cleanup();
    syncReelPlayback(videos, 1);

    // Now the original (cancelled) play() rejects.
    active.rejectPlay();
    await flush();

    // The cancelled chain MUST NOT re-call play() on the old video.
    expect(active.playCalls).toBe(1);
    expect(active.muted).toBe(true); // it was muted by the index-1 sync
    expect(videos[1].muted).toBe(false);
    expect(videos[1].playCalls).toBe(1);
  });

  it("ignores null refs (slides not yet mounted) without throwing", () => {
    const list: (FakeVideo | null)[] = [null, videos[1], null];
    expect(() => syncReelPlayback(list as VideoLike[], 1)).not.toThrow();
    expect(videos[1].playCalls).toBe(1);
    expect(videos[1].muted).toBe(false);
  });

  it("is a no-op (returns cleanup) when selectedIndex points to a missing slide", () => {
    const list: (FakeVideo | null)[] = [videos[0], null];
    const cleanup = syncReelPlayback(list as VideoLike[], 1);
    expect(typeof cleanup).toBe("function");
    expect(videos[0].pauseCalls).toBe(1); // index-0 still paused
    expect(videos[0].muted).toBe(true);
  });
});
