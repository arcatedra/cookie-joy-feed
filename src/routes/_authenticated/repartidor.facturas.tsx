import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, Download, FileText, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  listDriverInvoices,
  getDriverInvoicePDF,
  getDriverInvoiceCSV,
} from "@/lib/driver-invoices.functions";

export const Route = createFileRoute("/_authenticated/repartidor/facturas")({
  component: DriverInvoicesPage,
});

function downloadBase64(base64: string, filename: string, mime: string) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadText(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function DriverInvoicesPage() {
  const listFn = useServerFn(listDriverInvoices);
  const pdfFn = useServerFn(getDriverInvoicePDF);
  const csvFn = useServerFn(getDriverInvoiceCSV);
  const [busy, setBusy] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["driver-invoices"],
    queryFn: () => listFn(),
  });

  const handlePDF = async (month: string) => {
    setBusy(`pdf-${month}`);
    try {
      const r = await pdfFn({ data: { month } });
      downloadBase64(r.base64, r.filename, "application/pdf");
      toast.success(`Recibo ${r.invoice_number} descargado`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleCSV = async (month: string) => {
    setBusy(`csv-${month}`);
    try {
      const r = await csvFn({ data: { month } });
      downloadText(r.csv, r.filename, "text/csv");
      toast.success("CSV descargado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] pb-24">
      <header className="sticky top-0 z-10 border-b border-[#c8862e]/20 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link
            to="/repartidor/wallet"
            className="inline-flex size-9 items-center justify-center rounded-full text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-[#c8862e]" />
            <h1 className="font-serif text-lg font-bold text-[#1e3a5f]">Mis recibos</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <p className="mb-4 text-sm text-[#4a3525]">
          Descarga tus recibos mensuales de ingresos. Últimos 24 meses.
        </p>

        {q.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-[#1e3a5f]" />
          </div>
        ) : !q.data || q.data.invoices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="mx-auto mb-3 size-10 text-[#4a3525]/40" />
              <p className="text-sm text-[#4a3525]">
                Aún no tienes recibos. Completa entregas para generar tu primer recibo.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {q.data.invoices.map((inv) => (
              <Card key={inv.month} className="border-[#c8862e]/20">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-serif text-base font-bold text-[#1e3a5f]">{inv.label}</p>
                      <p className="text-[10px] font-mono uppercase text-[#4a3525]/60">
                        HZX-{inv.month.replace("-", "")}
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">
                      ${inv.total.toFixed(2)}
                    </Badge>
                  </div>

                  <div className="mb-3 grid grid-cols-4 gap-2 rounded-lg bg-[#f4f1ea] p-2 text-center text-[11px]">
                    <div>
                      <p className="text-[9px] uppercase text-[#4a3525]/70">Entregas</p>
                      <p className="font-bold text-[#1e3a5f]">{inv.deliveries}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-[#4a3525]/70">Base</p>
                      <p className="font-bold text-[#1e3a5f]">${inv.gross.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-[#4a3525]/70">Propinas</p>
                      <p className="font-bold text-emerald-700">${inv.tips.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-[#4a3525]/70">Bonos</p>
                      <p className="font-bold text-[#c8862e]">${inv.bonuses.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-[#1e3a5f] text-white hover:bg-[#0f2338]"
                      disabled={busy === `pdf-${inv.month}`}
                      onClick={() => handlePDF(inv.month)}
                    >
                      {busy === `pdf-${inv.month}` ? (
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      ) : (
                        <Download className="mr-1.5 size-3.5" />
                      )}
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 border-[#c8862e]/40 text-[#4a3525]"
                      disabled={busy === `csv-${inv.month}`}
                      onClick={() => handleCSV(inv.month)}
                    >
                      {busy === `csv-${inv.month}` ? (
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      ) : (
                        <Download className="mr-1.5 size-3.5" />
                      )}
                      CSV
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <p className="mt-6 text-center text-[10px] text-[#4a3525]/60">
          Los recibos son documentos internos de ingresos. No sustituyen la facturación fiscal oficial.
        </p>
      </main>
    </div>
  );
}
