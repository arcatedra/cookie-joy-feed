import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Formato debe ser YYYY-MM");

type EarningRow = {
  order_id: string;
  base_amount: number;
  tip_amount: number;
  bonus_amount: number;
  distance_amount: number;
  total_amount: number;
  distance_km: number | null;
  earned_at: string;
};

type MonthlySummary = {
  month: string; // YYYY-MM
  label: string; // e.g. "Enero 2026"
  deliveries: number;
  gross: number;
  tips: number;
  bonuses: number;
  distance_pay: number;
  total: number;
};

const MONTH_LABELS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function labelFor(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_LABELS_ES[m - 1]} ${y}`;
}

export const listDriverInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - 24);
    const { data, error } = await supabase
      .from("driver_order_earnings")
      .select("order_id, base_amount, tip_amount, bonus_amount, distance_amount, total_amount, distance_km, earned_at")
      .eq("driver_id", userId)
      .gte("earned_at", since.toISOString())
      .order("earned_at", { ascending: false });
    if (error) throw new Error(error.message);

    const byMonth = new Map<string, MonthlySummary>();
    for (const r of (data ?? []) as EarningRow[]) {
      const key = monthKey(r.earned_at);
      let s = byMonth.get(key);
      if (!s) {
        s = { month: key, label: labelFor(key), deliveries: 0, gross: 0, tips: 0, bonuses: 0, distance_pay: 0, total: 0 };
        byMonth.set(key, s);
      }
      s.deliveries += 1;
      s.gross += Number(r.base_amount) || 0;
      s.tips += Number(r.tip_amount) || 0;
      s.bonuses += Number(r.bonus_amount) || 0;
      s.distance_pay += Number(r.distance_amount) || 0;
      s.total += Number(r.total_amount) || 0;
    }
    const invoices = Array.from(byMonth.values())
      .map((s) => ({
        ...s,
        gross: Number(s.gross.toFixed(2)),
        tips: Number(s.tips.toFixed(2)),
        bonuses: Number(s.bonuses.toFixed(2)),
        distance_pay: Number(s.distance_pay.toFixed(2)),
        total: Number(s.total.toFixed(2)),
        invoice_number: `HZX-${userId.slice(0, 8).toUpperCase()}-${s.month.replace("-", "")}`,
      }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return { invoices };
  });

async function loadMonthEarnings(supabase: any, userId: string, month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const { data, error } = await supabase
    .from("driver_order_earnings")
    .select("order_id, base_amount, tip_amount, bonus_amount, distance_amount, total_amount, distance_km, earned_at")
    .eq("driver_id", userId)
    .gte("earned_at", start.toISOString())
    .lt("earned_at", end.toISOString())
    .order("earned_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as EarningRow[];
}

export const getDriverInvoiceCSV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { month: string }) => ({ month: monthSchema.parse(d.month) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const rows = await loadMonthEarnings(supabase, userId, data.month);
    const header = "fecha,pedido_id,base,propina,bono,distancia_pago,distancia_km,total";
    const body = rows.map((r) => [
      new Date(r.earned_at).toISOString(),
      r.order_id,
      Number(r.base_amount).toFixed(2),
      Number(r.tip_amount).toFixed(2),
      Number(r.bonus_amount).toFixed(2),
      Number(r.distance_amount).toFixed(2),
      r.distance_km == null ? "" : Number(r.distance_km).toFixed(2),
      Number(r.total_amount).toFixed(2),
    ].join(",")).join("\n");
    const csv = header + "\n" + body + "\n";
    return { csv, filename: `hazorex-recibo-${data.month}.csv` };
  });

export const getDriverInvoicePDF = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { month: string }) => ({ month: monthSchema.parse(d.month) }))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

    const [{ data: driver }, rows] = await Promise.all([
      supabase.from("drivers").select("full_name, phone, email").eq("id", userId).maybeSingle(),
      loadMonthEarnings(supabase, userId, data.month),
    ]);

    const totals = rows.reduce(
      (a, r) => {
        a.gross += Number(r.base_amount) || 0;
        a.tips += Number(r.tip_amount) || 0;
        a.bonuses += Number(r.bonus_amount) || 0;
        a.distance_pay += Number(r.distance_amount) || 0;
        a.total += Number(r.total_amount) || 0;
        return a;
      },
      { gross: 0, tips: 0, bonuses: 0, distance_pay: 0, total: 0 },
    );

    const invoiceNumber = `HZX-${userId.slice(0, 8).toUpperCase()}-${data.month.replace("-", "")}`;
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const navy = rgb(0.12, 0.23, 0.37);
    const gold = rgb(0.78, 0.53, 0.18);
    const ink = rgb(0.15, 0.15, 0.15);

    let page = doc.addPage([595, 842]); // A4
    let y = 800;
    const left = 50;

    page.drawText("HAZOREX", { x: left, y, size: 22, font: bold, color: navy });
    page.drawText("Recibo de ingresos - Repartidor", { x: left, y: y - 20, size: 11, font, color: ink });
    page.drawText(`Recibo N°: ${invoiceNumber}`, { x: 350, y, size: 10, font: bold, color: gold });
    page.drawText(`Periodo: ${labelFor(data.month)}`, { x: 350, y: y - 15, size: 10, font, color: ink });
    page.drawText(`Emitido: ${new Date().toISOString().slice(0, 10)}`, { x: 350, y: y - 30, size: 9, font, color: ink });

    y -= 60;
    page.drawLine({ start: { x: left, y }, end: { x: 545, y }, thickness: 1, color: navy });
    y -= 20;

    page.drawText("Repartidor:", { x: left, y, size: 10, font: bold, color: ink });
    page.drawText(driver?.full_name ?? "-", { x: left + 70, y, size: 10, font, color: ink });
    y -= 14;
    page.drawText("Teléfono:", { x: left, y, size: 10, font: bold, color: ink });
    page.drawText(driver?.phone ?? "-", { x: left + 70, y, size: 10, font, color: ink });
    y -= 14;
    page.drawText("Email:", { x: left, y, size: 10, font: bold, color: ink });
    page.drawText(driver?.email ?? "-", { x: left + 70, y, size: 10, font, color: ink });
    y -= 14;
    page.drawText("Driver ID:", { x: left, y, size: 10, font: bold, color: ink });
    page.drawText(userId, { x: left + 70, y, size: 9, font, color: ink });

    y -= 30;
    page.drawText("Detalle de entregas", { x: left, y, size: 12, font: bold, color: navy });
    y -= 18;
    // header row
    page.drawRectangle({ x: left, y: y - 4, width: 495, height: 16, color: rgb(0.95, 0.93, 0.88) });
    page.drawText("Fecha", { x: left + 4, y, size: 9, font: bold, color: ink });
    page.drawText("Pedido", { x: left + 90, y, size: 9, font: bold, color: ink });
    page.drawText("Base", { x: left + 250, y, size: 9, font: bold, color: ink });
    page.drawText("Propina", { x: left + 300, y, size: 9, font: bold, color: ink });
    page.drawText("Bono", { x: left + 355, y, size: 9, font: bold, color: ink });
    page.drawText("Distancia", { x: left + 400, y, size: 9, font: bold, color: ink });
    page.drawText("Total", { x: left + 465, y, size: 9, font: bold, color: ink });
    y -= 14;

    const fmt = (n: number) => `$${n.toFixed(2)}`;

    for (const r of rows) {
      if (y < 100) {
        page = doc.addPage([595, 842]);
        y = 800;
      }
      const date = new Date(r.earned_at).toISOString().slice(0, 10);
      page.drawText(date, { x: left + 4, y, size: 8, font, color: ink });
      page.drawText(r.order_id.slice(0, 8), { x: left + 90, y, size: 8, font, color: ink });
      page.drawText(fmt(Number(r.base_amount)), { x: left + 250, y, size: 8, font, color: ink });
      page.drawText(fmt(Number(r.tip_amount)), { x: left + 300, y, size: 8, font, color: ink });
      page.drawText(fmt(Number(r.bonus_amount)), { x: left + 355, y, size: 8, font, color: ink });
      page.drawText(fmt(Number(r.distance_amount)), { x: left + 400, y, size: 8, font, color: ink });
      page.drawText(fmt(Number(r.total_amount)), { x: left + 465, y, size: 8, font: bold, color: ink });
      y -= 12;
    }

    if (rows.length === 0) {
      page.drawText("Sin entregas en este periodo.", { x: left, y, size: 10, font, color: ink });
      y -= 20;
    }

    y -= 20;
    if (y < 150) { page = doc.addPage([595, 842]); y = 800; }
    page.drawLine({ start: { x: left + 300, y }, end: { x: 545, y }, thickness: 0.5, color: ink });
    y -= 16;
    const row = (label: string, val: number) => {
      page.drawText(label, { x: left + 300, y, size: 10, font, color: ink });
      page.drawText(fmt(val), { x: left + 465, y, size: 10, font, color: ink });
      y -= 14;
    };
    row("Base bruto", totals.gross);
    row("Propinas", totals.tips);
    row("Bonos", totals.bonuses);
    row("Pago por distancia", totals.distance_pay);
    y -= 4;
    page.drawRectangle({ x: left + 295, y: y - 4, width: 250, height: 20, color: navy });
    page.drawText("TOTAL NETO", { x: left + 300, y, size: 11, font: bold, color: rgb(1, 1, 1) });
    page.drawText(fmt(totals.total), { x: left + 465, y, size: 11, font: bold, color: rgb(1, 1, 1) });
    y -= 40;

    page.drawText(
      "Este documento es un recibo interno de ingresos generado por Hazorex.",
      { x: left, y, size: 8, font, color: ink },
    );
    y -= 10;
    page.drawText(
      "No constituye una factura fiscal timbrada. Consulte a su contador para obligaciones tributarias.",
      { x: left, y, size: 8, font, color: ink },
    );

    const bytes = await doc.save();
    // base64 encode
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    const base64 = btoa(binary);
    return {
      base64,
      filename: `hazorex-recibo-${data.month}.pdf`,
      invoice_number: invoiceNumber,
    };
  });
