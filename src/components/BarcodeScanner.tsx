import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flashlight, Keyboard, X } from "lucide-react";
import { normalizeBarcode } from "@/lib/barcode-rules";

interface Props {
  title?: string;
  onDetected: (code: string) => void;
  onClose: () => void;
}

/** Lector con la cámara trasera del teléfono, linterna si existe y opción de escribir el número. */
export function BarcodeScanner({ title, onDetected, onClose }: Props) {
  const { i18n } = useTranslation();
  const en = i18n.language?.startsWith("en");
  const L = (es: string, e: string) => (en ? e : es);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const doneRef = useRef(false);
  const [torchOk, setTorchOk] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [manualErr, setManualErr] = useState(false);

  useEffect(() => {
    let stop = false;
    let stream: MediaStream | null = null;
    let raf = 0;
    let zxingControls: { stop: () => void } | null = null;

    const emit = (raw: string) => {
      const code = normalizeBarcode(raw);
      if (!code || doneRef.current) return;
      doneRef.current = true;
      onDetected(code);
    };

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-camera");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (stop) return;
        const track = stream.getVideoTracks()[0];
        trackRef.current = track ?? null;
        const caps = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
        setTorchOk(Boolean(caps.torch));
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play().catch(() => {});

        const BD = (window as any).BarcodeDetector;
        if (BD) {
          const detector = new BD({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });
          const loop = async () => {
            if (stop || doneRef.current) return;
            try {
              const found = await detector.detect(video);
              if (found?.[0]?.rawValue) emit(found[0].rawValue);
            } catch {
              /* sigue intentando */
            }
            raf = requestAnimationFrame(() => setTimeout(loop, 150));
          };
          loop();
        } else {
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();
          zxingControls = await reader.decodeFromStream(stream, video, (res) => {
            if (res) emit(res.getText());
          });
        }
      } catch {
        setCamError(
          L(
            "No pudimos abrir la cámara. Escribe el número debajo del código de barras.",
            "We couldn't open the camera. Type the number under the barcode.",
          ),
        );
      }
    })();

    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      zxingControls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleTorch() {
    const t = trackRef.current;
    if (!t) return;
    try {
      await t.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
      setTorchOn(!torchOn);
    } catch {
      setTorchOk(false);
    }
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const code = normalizeBarcode(manual);
    if (!code) return setManualErr(true);
    doneRef.current = true;
    onDetected(code);
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between border-b border-border p-3">
        <p className="font-semibold">{title ?? L("Escanear código", "Scan barcode")}</p>
        <button type="button" onClick={onClose} aria-label={L("Cerrar", "Close")} className="rounded-full p-2 hover:bg-muted">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="relative flex-1 overflow-hidden bg-foreground">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-28 -translate-y-1/2 rounded-xl border-4 border-primary" />
        {camError && (
          <p className="absolute inset-x-4 top-4 rounded-lg bg-background p-3 text-sm">{camError}</p>
        )}
        {torchOk && (
          <button
            type="button"
            onClick={toggleTorch}
            className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-background px-4 py-2 text-sm font-semibold"
          >
            <Flashlight className="h-4 w-4" />
            {torchOn ? L("Apagar linterna", "Light off") : L("Linterna", "Flashlight")}
          </button>
        )}
      </div>
      <form onSubmit={submitManual} className="space-y-2 border-t border-border p-3 pb-[max(env(safe-area-inset-bottom),12px)]">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Keyboard className="h-4 w-4" /> {L("¿No lee? Escribe el número", "Not reading? Type the number")}
        </label>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => {
              setManual(e.target.value);
              setManualErr(false);
            }}
            inputMode="numeric"
            placeholder="012345678905"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2"
          />
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            OK
          </button>
        </div>
        {manualErr && (
          <p className="text-xs text-destructive">{L("Escribe de 8 a 14 números.", "Enter 8 to 14 digits.")}</p>
        )}
      </form>
    </div>
  );
}

/** Sonido corto + vibración: agudo para correcto, grave para error. */
export function scanFeedback(ok: boolean) {
  try {
    navigator.vibrate?.(ok ? 120 : [80, 60, 80, 60, 200]);
  } catch {
    /* sin vibración */
  }
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = ok ? 1200 : 220;
    o.type = ok ? "sine" : "square";
    g.gain.value = 0.15;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + (ok ? 0.15 : 0.4));
  } catch {
    /* sin sonido */
  }
}
