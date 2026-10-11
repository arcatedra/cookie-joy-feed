type Photo = {
  foto_credito?: string | null;
  foto_origen_url?: string | null;
  foto_licencia?: string | null;
};

export function ProductPhotoCredit({ product }: { product: Photo }) {
  if (!product.foto_credito || !product.foto_origen_url || product.foto_licencia !== "CC BY-SA") return null;
  if (!/^https:\/\/world\.openfoodfacts\.org\/product\/\d+(?:\/[^\s]*)?$/.test(product.foto_origen_url)) return null;
  return (
    <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
      <a href={product.foto_origen_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Foto: Open Food Facts</a>
      {" ("}<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">CC BY-SA</a>{")"}
    </p>
  );
}