import { useEffect, useRef, useState } from "react";
import { Play, Heart, MessageCircle, Pause, Volume2, VolumeX } from "lucide-react";

interface ReelPlayerProps {
  poster: string;
  src: string;
  title: string;
  likes: string;
}

export function ReelPlayer({ poster, src, title, likes }: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onWaiting = () => setLoading(true);
    const onPlaying = () => {
      setLoading(false);
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("pause", onPause);
    return () => {
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  const toggle = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      setLoading(true);
      try {
        v.muted = true; // ensure autoplay policies allow it
        setMuted(true);
        await v.play();
      } catch (err) {
        console.warn("Reel play failed", err);
        setLoading(false);
      }
    } else {
      v.pause();
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <article className="relative h-56 w-36 shrink-0 overflow-hidden rounded-2xl shadow-md bg-black">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        muted
        loop
        preload="auto"
        
        className="h-full w-full object-cover"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${title}` : `Play ${title}`}
        className={`absolute inset-0 grid place-items-center transition ${
          playing ? "bg-transparent" : "bg-gradient-to-t from-black/60 via-black/0 to-black/20"
        }`}
      >
        {!playing && !loading && (
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow-lg backdrop-blur">
            <Play className="h-5 w-5 fill-primary text-primary" />
          </span>
        )}
        {loading && (
          <span className="grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow-lg">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </span>
        )}
        {playing && (
          <span className="opacity-0 group-hover:opacity-100">
            <Pause className="h-5 w-5 fill-white text-white" />
          </span>
        )}
      </button>
      <div className="pointer-events-none absolute top-2 right-2 flex flex-col gap-2">
        <div className="flex flex-col items-center gap-0.5 rounded-full bg-black/30 px-1.5 py-1 backdrop-blur">
          <Heart className="h-3.5 w-3.5 text-white" />
          <span className="text-[9px] font-semibold text-white">{likes}</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 rounded-full bg-black/30 px-1.5 py-1 backdrop-blur">
          <MessageCircle className="h-3.5 w-3.5 text-white" />
          <span className="text-[9px] font-semibold text-white">128</span>
        </div>
      </div>
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white backdrop-blur"
      >
        {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      </button>
      <div className="pointer-events-none absolute bottom-2 left-2 right-10">
        <p className="text-xs font-bold leading-tight text-white drop-shadow">{title}</p>
      </div>
    </article>
  );
}
