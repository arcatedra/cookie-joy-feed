import { useEffect, useRef, useState } from "react";
import { Play, Heart, MessageCircle, Pause, Volume2, VolumeX, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface ReelPlayerProps {
  reelId: string;
  poster: string;
  src: string;
  title: string;
}

export function ReelPlayer({ reelId, poster, src, title }: ReelPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();

  const likesQ = useQuery({
    queryKey: ["reel-likes", reelId],
    queryFn: async () => {
      const { count } = await supabase
        .from("reel_likes")
        .select("*", { count: "exact", head: true })
        .eq("reel_id", reelId);
      let liked = false;
      if (user) {
        const { data } = await supabase
          .from("reel_likes")
          .select("reel_id")
          .eq("reel_id", reelId)
          .eq("user_id", user.id)
          .maybeSingle();
        liked = !!data;
      }
      return { count: count ?? 0, liked };
    },
  });

  const commentsQ = useQuery({
    queryKey: ["reel-comments-count", reelId],
    queryFn: async () => {
      const { count } = await supabase
        .from("reel_comments")
        .select("*", { count: "exact", head: true })
        .eq("reel_id", reelId);
      return count ?? 0;
    },
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not-auth");
      if (likesQ.data?.liked) {
        const { error } = await supabase
          .from("reel_likes")
          .delete()
          .eq("reel_id", reelId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("reel_likes")
          .insert({ reel_id: reelId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reel-likes", reelId] }),
    onError: (e: Error) => {
      if (e.message === "not-auth") toast.error(t("reels.signInToLike"));
      else { console.error("reel-like error", e); toast.error(t("common.errorOccurred")); }
    },
  });

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onWaiting = () => setLoading(true);
    const onPlaying = () => { setLoading(false); setPlaying(true); };
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
        v.muted = true;
        setMuted(true);
        await v.play();
      } catch {
        setLoading(false);
      }
    } else v.pause();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const onLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { toast.error(t("reels.signInToLike")); return; }
    toggleLike.mutate();
  };

  const openComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCommentsOpen(true);
  };

  const liked = likesQ.data?.liked ?? false;
  const likeCount = likesQ.data?.count ?? 0;
  const commentCount = commentsQ.data ?? 0;

  return (
    <>
      <article className="relative h-56 w-36 shrink-0 overflow-hidden rounded-2xl shadow-md bg-black">
        <video ref={videoRef} src={src} poster={poster} playsInline muted loop preload="auto" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? `Pause ${title}` : `Play ${title}`}
          className={`absolute inset-0 grid place-items-center transition ${playing ? "bg-transparent" : "bg-gradient-to-t from-black/60 via-black/0 to-black/20"}`}
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
            <span className="opacity-0">
              <Pause className="h-5 w-5 fill-white text-white" />
            </span>
          )}
        </button>
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <button
            type="button"
            onClick={onLike}
            disabled={toggleLike.isPending}
            aria-label={liked ? "Unlike" : "Like"}
            className="flex flex-col items-center gap-0.5 rounded-full bg-black/40 px-1.5 py-1 backdrop-blur active:scale-90 transition"
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? "fill-red-500 text-red-500" : "text-white"}`} />
            <span className="text-[9px] font-semibold text-white">{likeCount}</span>
          </button>
          <button
            type="button"
            onClick={openComments}
            aria-label="Comments"
            className="flex flex-col items-center gap-0.5 rounded-full bg-black/40 px-1.5 py-1 backdrop-blur active:scale-90 transition"
          >
            <MessageCircle className="h-3.5 w-3.5 text-white" />
            <span className="text-[9px] font-semibold text-white">{commentCount}</span>
          </button>
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

      <CommentsSheet reelId={reelId} title={title} open={commentsOpen} onOpenChange={setCommentsOpen} />
    </>
  );
}

function CommentsSheet({ reelId, title, open, onOpenChange }: { reelId: string; title: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [body, setBody] = useState("");

  const commentsQ = useQuery({
    queryKey: ["reel-comments", reelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reel_comments")
        .select("id, body, created_at, user_id")
        .eq("reel_id", reelId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const rows = data ?? [];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      const names = new Map<string, string | null>();
      if (ids.length) {
        const { data: profs } = await supabase.rpc("get_public_profiles", { ids });
        profs?.forEach((p: { id: string; display_name: string | null }) => names.set(p.id, p.display_name));
      }
      return rows.map((r) => ({ ...r, display_name: names.get(r.user_id) ?? null }));
    },
    enabled: open,
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("not-auth");
      const trimmed = body.trim();
      if (!trimmed) throw new Error("empty");
      const { error } = await supabase
        .from("reel_comments")
        .insert({ reel_id: reelId, user_id: user.id, body: trimmed });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["reel-comments", reelId] });
      qc.invalidateQueries({ queryKey: ["reel-comments-count", reelId] });
    },
    onError: (e: Error) => {
      if (e.message === "empty") return;
      if (e.message === "not-auth") toast.error(t("reels.signInToComment"));
      else { console.error("reel-comment error", e); toast.error(t("common.errorOccurred")); }
    },
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="text-base">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {commentsQ.isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
          {commentsQ.data?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{t("reels.noComments")}</p>
          )}
          {commentsQ.data?.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-cream grid place-items-center text-xs font-bold text-foreground">
                {(c.display_name?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">{c.display_name ?? t("reels.anonymous")}</p>
                <p className="text-sm text-foreground">{c.body}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(c.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border p-3">
          {user ? (
            <form
              onSubmit={(e) => { e.preventDefault(); addComment.mutate(); }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("reels.writeComment")}
                maxLength={500}
                className="flex-1 rounded-full border border-input bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={addComment.isPending || !body.trim()}
                aria-label={t("reels.send")}
                className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          ) : (
            <Link
              to="/auth"
              className="block w-full rounded-full bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground"
            >
              {t("reels.signInToComment")}
            </Link>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
