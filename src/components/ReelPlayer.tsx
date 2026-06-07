import { useRef, useState } from "react";
import { Play, Heart, MessageCircle, Pause } from "lucide-react";

interface ReelPlayerProps {
  poster: string;
  src: string;
  title: string;
  likes: string;
}

export function ReelPlayer({ poster, src, title, likes }: ReelPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (v.paused) {
        await v.play();
        setPlaying(true);
      } else {
        v.pause();
        setPlaying(false);
      }
    } catch {
      // autoplay blocked; ensure muted then retry
      v.muted = true;
      try {
        await v.play();
        setPlaying(true);
      } catch {
        /* swallow */
      }
    }
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
        preload="metadata"
        className="h-full w-full object-cover"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${title}` : `Play ${title}`}
        className="absolute inset-0 grid place-items-center bg-gradient-to-t from-black/60 via-black/0 to-black/20 transition"
      >
        <span
          className={`grid h-11 w-11 place-items-center rounded-full bg-white/90 shadow-lg backdrop-blur transition-opacity ${
            playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
          }`}
        >
          {playing ? (
            <Pause className="h-5 w-5 fill-primary text-primary" />
          ) : (
            <Play className="h-5 w-5 fill-primary text-primary" />
          )}
        </span>
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
      <div className="pointer-events-none absolute bottom-2 left-2 right-2">
        <p className="text-xs font-bold leading-tight text-white drop-shadow">{title}</p>
      </div>
    </article>
  );
}
