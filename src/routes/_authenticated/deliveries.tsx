import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getMyDeliveryStatus,
  listMyDeliveries,
  scheduleDelivery,
  cancelDelivery,
  rescheduleDelivery,
} from "@/lib/deliveries.functions";

export const Route = createFileRoute("/_authenticated/deliveries")({
  head: () => ({
    meta: [
      { title: "Mis entregas — AMYRAX" },
      { name: "description", content: "Programa tus entregas de lunes o viernes según tu plan." },
    ],
  }),
  component: DeliveriesPage,
});

function fmtKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isMondayOrFriday(d: Date) {
  const day = d.getDay();
  return day === 1 || day === 5;
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function DeliveriesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const getStatus = useServerFn(getMyDeliveryStatus);
  const getList = useServerFn(listMyDeliveries);
  const scheduleFn = useServerFn(scheduleDelivery);
  const cancelFn = useServerFn(cancelDelivery);
  const rescheduleFn = useServerFn(rescheduleDelivery);

  const statusQuery = useQuery({ queryKey: ["delivery-status"], queryFn: () => getStatus() });
  const listQuery = useQuery({ queryKey: ["delivery-list"], queryFn: () => getList() });

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthLabel = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(new Date(viewYear, viewMonth, 1));

  const status = statusQuery.data;
  const upcoming = (listQuery.data ?? []).filter((d) => d.status === "scheduled");
  const scheduledKeys = new Set(upcoming.map((d) => d.scheduled_date));

  const periodStart = status?.periodStart ? new Date(status.periodStart) : null;
  const periodEnd = status?.periodEnd ? new Date(status.periodEnd) : null;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const limitReached = !!status && status.remaining <= 0;

  const scheduleMut = useMutation({
    mutationFn: async () => {
      if (!selectedDate) throw new Error("Elige una fecha");
      return scheduleFn({
        data: {
          date: selectedDate,
          address: address.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      toast.success(t("subscribeGate.scheduled"));
      setSelectedDate(null);
      setAddress("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["delivery-status"] });
      qc.invalidateQueries({ queryKey: ["delivery-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancelFn({ data: { id } }),
    onSuccess: () => {
      toast.success(t("subscribeGate.canceled"));
      qc.invalidateQueries({ queryKey: ["delivery-status"] });
      qc.invalidateQueries({ queryKey: ["delivery-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rescheduleMut = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) =>
      rescheduleFn({ data: { id, date } }),
    onSuccess: () => {
      toast.success("Fecha actualizada");
      qc.invalidateQueries({ queryKey: ["delivery-status"] });
      qc.invalidateQueries({ queryKey: ["delivery-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function changeMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  function dayState(d: Date) {
    const key = fmtKey(d);
    const monFri = isMondayOrFriday(d);
    const past = d < todayStart;
    const outOfPeriod =
      (periodStart && d < new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate())) ||
      (periodEnd && d > periodEnd);
    const already = scheduledKeys.has(key);
    const disabled =
      !monFri || past || !!outOfPeriod || (limitReached && !already) || !status?.hasActiveSubscription;
    return { key, monFri, past, already, disabled };
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link to="/" className="rounded-full p-2 hover:bg-muted">
            <ChevronLeft className="size-5" />
          </Link>
          <h1 className="text-lg font-semibold">Mis entregas</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        {/* Plan summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" /> Tu plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Cargando…
              </div>
            ) : !status?.hasActiveSubscription ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No tienes una suscripción activa. Suscríbete para empezar a programar entregas.
                </p>
                <Button asChild>
                  <Link to="/subscribe">Ver planes</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-baseline gap-3">
                  <Badge variant="secondary" className="text-sm">{status.planName}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {status.deliveriesPerMonth} entregas / mes
                  </span>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-2xl font-semibold tracking-tight">
                    Te quedan {status.remaining} de {status.deliveriesPerMonth} entregas este mes
                  </p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${(status.used / Math.max(1, status.deliveriesPerMonth)) * 100}%`,
                      }}
                    />
                  </div>
                  {periodEnd && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Período actual hasta {periodEnd.toLocaleDateString("es-ES")}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar */}
        {status?.hasActiveSubscription && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="size-4" /> Programar entrega
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Solo disponibles los <strong>lunes</strong> y <strong>viernes</strong>.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => changeMonth(-1)}>
                  ← Mes anterior
                </Button>
                <span className="text-sm font-medium capitalize">{monthLabel}</span>
                <Button variant="ghost" size="sm" onClick={() => changeMonth(1)}>
                  Mes siguiente →
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-muted-foreground">
                {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
                  <div key={i}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.map((d, i) => {
                  if (!d) return <div key={i} className="aspect-square" />;
                  const s = dayState(d);
                  const isSelected = selectedDate === s.key;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={s.disabled}
                      onClick={() => setSelectedDate(s.key)}
                      className={[
                        "relative aspect-square rounded-md text-sm transition",
                        s.disabled
                          ? "cursor-not-allowed bg-muted/30 text-muted-foreground/40"
                          : "hover:bg-primary/10",
                        s.monFri && !s.disabled ? "ring-1 ring-primary/20" : "",
                        isSelected ? "bg-primary text-primary-foreground ring-2 ring-primary" : "",
                        s.already ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/40" : "",
                      ].join(" ")}
                      title={
                        !s.monFri ? "Solo lunes o viernes" :
                        s.past ? "Fecha pasada" :
                        s.already ? "Ya programada" :
                        limitReached ? "Límite alcanzado" :
                        ""
                      }
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>

              {limitReached && (
                <p className="rounded-md bg-amber-500/10 p-3 text-sm text-amber-700">
                  Has usado todas tus entregas del mes. El botón se reactiva en tu próximo período.
                </p>
              )}

              <div className="space-y-2">
                <Label htmlFor="addr">Dirección (opcional)</Label>
                <Input
                  id="addr"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Dirección de entrega"
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instrucciones especiales…"
                  maxLength={1000}
                />
              </div>

              <Button
                className="w-full"
                disabled={!selectedDate || limitReached || scheduleMut.isPending}
                onClick={() => scheduleMut.mutate()}
              >
                {scheduleMut.isPending ? (
                  <><Loader2 className="mr-2 size-4 animate-spin" /> Programando…</>
                ) : limitReached ? (
                  "Sin entregas disponibles"
                ) : selectedDate ? (
                  `Programar entrega del ${selectedDate}`
                ) : (
                  "Selecciona una fecha"
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximas entregas</CardTitle>
          </CardHeader>
          <CardContent>
            {listQuery.isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no tienes entregas programadas.</p>
            ) : (
              <ul className="divide-y">
                {upcoming.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {new Date(`${d.scheduled_date}T12:00:00`).toLocaleDateString("es-ES", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                      {d.address && (
                        <p className="truncate text-xs text-muted-foreground">{d.address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={rescheduleMut.isPending}
                            title="Cambiar fecha"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          {(() => {
                            const maxDate = (() => {
                              if (!periodEnd) return null;
                              const m = new Date(periodEnd);
                              m.setHours(0, 0, 0, 0);
                              for (let i = 0; i < 7; i++) {
                                if (isMondayOrFriday(m)) return new Date(m);
                                m.setDate(m.getDate() - 1);
                              }
                              return null;
                            })();
                            return (
                              <>
                                <Calendar
                                  mode="single"
                                  selected={new Date(`${d.scheduled_date}T12:00:00`)}
                                  onSelect={(date) => {
                                    if (!date) return;
                                    const key = fmtKey(date);
                                    if (key === d.scheduled_date) return;
                                    if (scheduledKeys.has(key)) {
                                      toast.error("Ya tienes una entrega ese día");
                                      return;
                                    }
                                    rescheduleMut.mutate({ id: d.id, date: key });
                                  }}
                                  disabled={(date) => {
                                    const past = date < todayStart;
                                    const monFri = isMondayOrFriday(date);
                                    const afterMax = !!maxDate && date > maxDate;
                                    const outOfPeriod =
                                      (periodStart && date < new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate())) ||
                                      (periodEnd && date > periodEnd);
                                    const otherBooked =
                                      scheduledKeys.has(fmtKey(date)) && fmtKey(date) !== d.scheduled_date;
                                    return past || !monFri || !!outOfPeriod || afterMax || otherBooked;
                                  }}
                                  modifiers={maxDate ? { maxAllowed: maxDate } : undefined}
                                  modifiersClassNames={{
                                    maxAllowed:
                                      "ring-2 ring-amber-500 text-amber-700 font-bold rounded-md",
                                  }}
                                  toDate={maxDate ?? undefined}
                                  initialFocus
                                  className="pointer-events-auto p-3"
                                />
                                {maxDate && (
                                  <p className="border-t px-3 py-2 text-[11px] text-muted-foreground">
                                    Fecha máxima de tu plan:{" "}
                                    <span className="font-semibold text-amber-700">
                                      {maxDate.toLocaleDateString("es-ES", {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "long",
                                      })}
                                    </span>
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </PopoverContent>

                      </Popover>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelMut.mutate(d.id)}
                        disabled={cancelMut.isPending}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
