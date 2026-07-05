import { useRef, useState } from "react";
import { Camera, X, CheckCircle2, Loader2, Image as ImageIcon } from "lucide-react";

interface Props {
  nombreCliente?: string;
  onSubmit: (args: { fotoFile: File; descripcion: string }) => Promise<void>;
  disabled?: boolean;
}

export function ProofOfDelivery({ nombreCliente = "el cliente", onSubmit, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [foto, setFoto] = useState<{ file: File; previewUrl: string } | null>(null);
  const [descripcion, setDescripcion] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abrirCamara = () => inputRef.current?.click();

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setFoto({ file, previewUrl });
  };

  const quitarFoto = () => {
    if (foto?.previewUrl) URL.revokeObjectURL(foto.previewUrl);
    setFoto(null);
  };

  const puedeConfirmar = !!foto && descripcion.trim().length > 0 && !enviando && !disabled;

  const confirmar = async () => {
    if (!puedeConfirmar || !foto) return;
    setError(null);
    setEnviando(true);
    try {
      await onSubmit({ fotoFile: foto.file, descripcion: descripcion.trim() });
      setEnviado(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo confirmar la entrega");
    } finally {
      setEnviando(false);
    }
  };

  if (enviado) {
    return (
      <div className="flex w-full flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle2 size={28} className="text-emerald-600" />
        <p className="text-sm font-medium text-emerald-800">Entrega confirmada</p>
        <p className="text-xs text-emerald-700">
          Se notificó a {nombreCliente} con la foto y la descripción del lugar.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-neutral-800">Confirmar entrega</p>
      <p className="mt-0.5 text-xs text-neutral-400">
        Tomá una foto de dónde dejaste el pedido y describí el lugar para {nombreCliente}.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFoto}
      />

      {!foto ? (
        <button
          type="button"
          onClick={abrirCamara}
          disabled={disabled}
          className="mt-3 flex h-36 w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-neutral-200 text-neutral-400 transition hover:border-emerald-300 hover:text-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Camera size={22} />
          <span className="text-xs font-medium">Tomar foto</span>
        </button>
      ) : (
        <div className="relative mt-3 h-36 w-full overflow-hidden rounded-lg">
          <img
            src={foto.previewUrl}
            alt="Foto de la entrega"
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={quitarFoto}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label="Quitar foto"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="mt-3">
        <label className="mb-1 flex items-center gap-1 text-xs font-medium text-neutral-600">
          <ImageIcon size={12} />
          ¿Dónde dejaste el pedido?
        </label>
        <textarea
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Ej: Lo dejé en la puerta principal, detrás de la maceta grande."
          rows={3}
          maxLength={1000}
          className="w-full resize-none rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={confirmar}
        disabled={!puedeConfirmar}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition ${
          puedeConfirmar
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "cursor-not-allowed bg-neutral-100 text-neutral-400"
        }`}
      >
        {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
        {enviando ? "Enviando..." : "Confirmar entrega"}
      </button>
    </div>
  );
}

export default ProofOfDelivery;
