import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Plus, RefreshCw, Save, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createDeliveryBlockDraft,
  getDeliveryBlockAdmin,
  listOrdersForDeliveryBlocks,
  publishDeliveryBlock,
  updateDeliveryBlockPay,
  updateDeliveryBlockSettings,
} from "@/lib/delivery-blocks.functions";
import { adminAssignDeliveryBlock, runDeliveryBlockAutoAssignment } from "@/lib/delivery-block-operations.functions";
import { approveWeeklyBonus, calculateWeeklyBonuses, getDeliveryBlockAdminOperations, resolveDeliveryClaim } from "@/lib/delivery-block-admin.functions";

export const Route = createFileRoute("/_authenticated/admin/bloques")({
  head: () => ({ meta: [
    { title: "Bloques reservables — Admin Hazorex" },
    { name: "description", content: "Configura, prepara y publica los bloques de entrega de Hazorex." },
    { property: "og:title", content: "Bloques reservables — Admin Hazorex" },
    { property: "og:description", content: "Gestión privada de bloques de entrega." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: DeliveryBlocksAdmin,
});

const money = (value: unknown) => `$${Number(value ?? 0).toFixed(2)}`;

function DeliveryBlocksAdmin() {
  const qc = useQueryClient();
  const load = useServerFn(getDeliveryBlockAdmin);
  const loadOrders = useServerFn(listOrdersForDeliveryBlocks);
  const saveSettings = useServerFn(updateDeliveryBlockSettings);
  const createDraft = useServerFn(createDeliveryBlockDraft);
  const savePay = useServerFn(updateDeliveryBlockPay);
  const publish = useServerFn(publishDeliveryBlock);
  const loadOperations = useServerFn(getDeliveryBlockAdminOperations);
  const assign = useServerFn(adminAssignDeliveryBlock);
  const autoAssign = useServerFn(runDeliveryBlockAutoAssignment);
  const resolveClaim = useServerFn(resolveDeliveryClaim);
  const calculateBonuses = useServerFn(calculateWeeklyBonuses);
  const approveBonus = useServerFn(approveWeeklyBonus);
  const admin = useQuery({ queryKey:["delivery-blocks","admin"], queryFn:()=>load() });
  const orders = useQuery({ queryKey:["delivery-blocks","orders"], queryFn:()=>loadOrders() });
  const operations = useQuery({ queryKey:["delivery-blocks","operations"], queryFn:async()=>{ await autoAssign({data:{}}); return loadOperations(); }, refetchInterval:30_000 });
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [zoneName, setZoneName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [minutes, setMinutes] = useState(120);
  const [basePay, setBasePay] = useState(40);
  useEffect(() => { if (admin.data?.settings) setSettings(admin.data.settings as Record<string,unknown>); }, [admin.data?.settings]);
  const refresh = () => { qc.invalidateQueries({ queryKey:["delivery-blocks"] }); };
  const mutation = useMutation({ mutationFn:async (fn:()=>Promise<unknown>)=>fn(), onSuccess:()=>{ refresh(); toast.success("Guardado."); }, onError:(e:Error)=>toast.error(e.message) });
  const numberField = (key:string,label:string,step="1") => <label className="grid gap-1 text-sm"><span className="text-muted-foreground">{label}</span><input type="number" step={step} value={String(settings[key] ?? "")} onChange={(e)=>setSettings((s)=>({...s,[key]:Number(e.target.value)}))} className="h-10 rounded-md border bg-background px-3" /></label>;

  if (admin.isLoading) return <div className="grid min-h-64 place-items-center"><Loader2 className="size-6 animate-spin" /></div>;
  return <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
    <header><h1 className="text-2xl font-bold">Bloques reservables</h1><p className="text-sm text-muted-foreground">El modelo permanece apagado hasta que completes las pruebas.</p></header>
    <Card><CardHeader><CardTitle>Estado y reglas</CardTitle></CardHeader><CardContent className="space-y-4">
      <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={settings.enabled === true} onChange={(e)=>setSettings((s)=>({...s,enabled:e.target.checked}))} />Activar modelo nuevo</label>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {numberField("min_orders","Mínimo de pedidos")}{numberField("suggested_pay","Pago sugerido ($)","0.01")}{numberField("minimum_hourly","Mínimo por hora ($)","0.01")}{numberField("unassigned_alert_hours","Aviso sin repartidor (horas)")}
        {numberField("small_fee","Entrega ≤15 lb ($)","0.01")}{numberField("medium_fee","Entrega >15–30 lb ($)","0.01")}{numberField("large_fee","Entrega >30–45 lb ($)","0.01")}{numberField("extra_lb_fee","Extra por lb >45 ($)","0.01")}
        {numberField("elevator_fee","Apartamento ascensor ($)","0.01")}{numberField("stairs_fee","Apartamento escaleras ($)","0.01")}{numberField("weekly_bonus","Bono semanal sugerido ($)","0.01")}{numberField("bonus_min_blocks","Lotes para bono")}
      </div>
      <Button onClick={()=>mutation.mutate(()=>saveSettings({data:settings as any}))} disabled={mutation.isPending}><Save className="mr-2 size-4" />Guardar reglas</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Crear borrador</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><input value={zoneName} onChange={(e)=>setZoneName(e.target.value)} placeholder="Zona" className="h-10 rounded-md border bg-background px-3" /><input type="datetime-local" value={startsAt} onChange={(e)=>setStartsAt(e.target.value)} className="h-10 rounded-md border bg-background px-3" /><input type="number" value={minutes} min={60} max={240} onChange={(e)=>setMinutes(Number(e.target.value))} className="h-10 rounded-md border bg-background px-3" /><input type="number" value={basePay} min={0} step="0.01" onChange={(e)=>setBasePay(Number(e.target.value))} className="h-10 rounded-md border bg-background px-3" /></div>
      <div className="grid max-h-64 gap-2 overflow-y-auto rounded-md border p-3">{(orders.data ?? []).map((order:any)=><label key={order.id} className="flex items-center justify-between gap-3 text-sm"><span><input className="mr-2" type="checkbox" checked={selected.includes(order.id)} onChange={(e)=>setSelected((ids)=>e.target.checked?[...ids,order.id]:ids.filter((id)=>id!==order.id))} />#{order.numero_pedido} · {order.businesses?.business_name ?? "Tienda"}</span><span className="text-muted-foreground">{order.fecha_entrega ?? "Sin fecha"}</span></label>)}</div>
      {selected.length > 0 && selected.length < Number(settings.min_orders ?? 3) && <p className="flex items-center gap-2 text-sm text-amber-700"><AlertTriangle className="size-4" />Faltan pedidos. Combínalos con la zona más cercana o decide después.</p>}
      <Button disabled={selected.length < Number(settings.min_orders ?? 3) || !zoneName || !startsAt || mutation.isPending} onClick={()=>mutation.mutate(()=>createDraft({data:{zoneId:null,zoneName,startsAt:new Date(startsAt).toISOString(),estimatedMinutes:minutes,basePay,orderIds:selected}}))}><Plus className="mr-2 size-4" />Crear borrador</Button>
    </CardContent></Card>
    <section className="space-y-3"><h2 className="text-xl font-bold">Lotes</h2>{(admin.data?.blocks ?? []).map((block:any)=><BlockCard key={block.id} block={block} drivers={operations.data?.drivers ?? []} pending={mutation.isPending} onAssign={(driverId)=>mutation.mutate(()=>assign({data:{blockId:block.id,driverId}}))} onSave={(increase,enabled,amount)=>mutation.mutate(()=>savePay({data:{blockId:block.id,increase,doorBonusEnabled:enabled,doorBonusAmount:amount}}))} onPublish={()=>mutation.mutate(()=>publish({data:{blockId:block.id}}))} />)}</section>
    <AdminOperations data={operations.data} pending={mutation.isPending} onRefresh={()=>operations.refetch()} onResolve={(claimId,decision,refundAmount,resolution)=>mutation.mutate(()=>resolveClaim({data:{claimId,decision,refundAmount,resolution}}))} onCalculate={()=>mutation.mutate(()=>calculateBonuses())} onApprove={(bonusId)=>mutation.mutate(()=>approveBonus({data:{bonusId}}))} />
  </main>;
}

function BlockCard({ block, drivers, pending, onSave, onPublish, onAssign }:{block:any;drivers:any[];pending:boolean;onSave:(increase:number,enabled:boolean,amount:number)=>void;onPublish:()=>void;onAssign:(driverId:string)=>void}) {
  const [increase,setIncrease]=useState(Number(block.manual_increase ?? 0));
  const [bonus,setBonus]=useState(block.door_bonus_enabled === true);
  const [bonusAmount,setBonusAmount]=useState(Number(block.door_bonus_amount ?? 0));
  return <Card className={block.needsDriverAlert?"border-amber-500":""}><CardContent className="space-y-3 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{block.zone_name} · {block.delivery_block_stops?.length ?? 0} paradas</h3><p className="text-sm text-muted-foreground">{new Date(block.starts_at).toLocaleString()} · {block.estimated_minutes} min · {block.status}</p></div><strong>{money(block.committed_pay)} + {money(block.tips_total)} propinas</strong></div>
    {block.needsDriverAlert && <p className="flex items-center gap-2 text-sm font-semibold text-amber-700"><AlertTriangle className="size-4" />Faltan 12 horas o menos y todavía no tiene repartidor.</p>}
    <div className="flex flex-wrap items-end gap-2"><Button type="button" variant="outline" onClick={()=>setIncrease((v)=>v+5)}>+$5</Button><Button type="button" variant="outline" onClick={()=>setIncrease((v)=>v+10)}>+$10</Button><label className="grid gap-1 text-xs"><span>Aumento manual</span><input type="number" min={0} step="0.01" value={increase} onChange={(e)=>setIncrease(Number(e.target.value))} className="h-10 w-28 rounded-md border px-2" /></label><label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" checked={bonus} onChange={(e)=>setBonus(e.target.checked)} />Dar bono de puerta</label>{bonus&&<input aria-label="Monto del bono de puerta" type="number" min={0} step="0.01" value={bonusAmount} onChange={(e)=>setBonusAmount(Number(e.target.value))} className="h-10 w-28 rounded-md border px-2" />}<Button disabled={pending} onClick={()=>onSave(increase,bonus,bonusAmount)}><Save className="mr-2 size-4" />Guardar pago</Button>{block.status==="draft"&&<Button disabled={pending} onClick={onPublish}><Send className="mr-2 size-4" />Publicar lote</Button>}{["published","reserved"].includes(block.status)&&!block.assigned_driver_id&&<select aria-label="Asignar repartidor" defaultValue="" onChange={(e)=>{if(e.target.value)onAssign(e.target.value)}} className="h-10 rounded-md border bg-background px-3"><option value="">Asignar presente…</option>{drivers.map((driver:any)=><option key={driver.id} value={driver.id}>{driver.full_name}</option>)}</select>}</div>
  </CardContent></Card>;
}

function AdminOperations({data,pending,onRefresh,onResolve,onCalculate,onApprove}:{data:any;pending:boolean;onRefresh:()=>void;onResolve:(id:string,d:"approved"|"rejected",amount:number,note:string)=>void;onCalculate:()=>void;onApprove:(id:string)=>void}) {
 const [refunds,setRefunds]=useState<Record<string,number>>({});
 return <div className="space-y-6"><section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Reporte semanal</h2><Button variant="outline" size="sm" onClick={onRefresh}><RefreshCw className="mr-2 size-4"/>Actualizar</Button></div><div className="overflow-x-auto rounded-md border"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Zona</th><th className="p-3">Planeado</th><th className="p-3">Real</th><th className="p-3">Pago</th><th className="p-3">Propinas</th><th className="p-3">Bonos</th></tr></thead><tbody>{(data?.blocks??[]).map((b:any)=><tr key={b.id} className="border-b"><td className="p-3">{b.zone_name}</td><td className="p-3">{b.estimated_minutes} min</td><td className="p-3">{b.actual_minutes??"—"} min</td><td className="p-3">{money(b.committed_pay)}</td><td className="p-3">{money(b.tips_total)}</td><td className="p-3">{b.door_bonus_enabled?money(b.door_bonus_amount):"$0.00"}</td></tr>)}</tbody></table></div></section><section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Reclamos de entrega</h2></div>{(data?.claims??[]).filter((c:any)=>!["approved","rejected"].includes(c.status)).map((c:any)=><Card key={c.id}><CardContent className="space-y-3 p-4"><p className="font-semibold">Pedido #{c.store_orders?.numero_pedido} · {c.reason}</p><p className="text-sm text-muted-foreground">{c.description||"Sin descripción"}</p>{c.photo_signed_url&&<img src={c.photo_signed_url} alt="Foto del reclamo" className="max-h-64 rounded-md object-cover"/>}<label className="grid max-w-48 gap-1 text-sm">Reembolso decidido por ti<input type="number" min={0} step="0.01" className="h-10 rounded-md border px-3" value={refunds[c.id]??0} onChange={(e)=>setRefunds((v)=>({...v,[c.id]:Number(e.target.value)}))}/></label><div className="flex gap-2"><Button disabled={pending} onClick={()=>onResolve(c.id,"approved",refunds[c.id]??0,"Aprobado por administración")}><Check className="mr-2 size-4"/>Aprobar</Button><Button disabled={pending} variant="outline" onClick={()=>onResolve(c.id,"rejected",0,"Rechazado por administración")}><X className="mr-2 size-4"/>Rechazar</Button></div></CardContent></Card>)}</section><section className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Bono semanal</h2><Button disabled={pending} onClick={onCalculate}>Calcular candidatos</Button></div>{(data?.bonuses??[]).map((b:any)=><Card key={b.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">Semana {b.week_start} · {b.eligible_blocks} lotes</p><p className="text-sm text-muted-foreground">Puntualidad {b.on_time_pct}% · calificación {b.rating??"sin datos"} · reclamos {b.confirmed_claims}</p></div><div className="flex items-center gap-2"><strong>{money(b.amount)}</strong>{b.status==="candidate"&&<Button disabled={pending} onClick={()=>onApprove(b.id)}>Aprobar bono</Button>}<span className="text-xs uppercase">{b.status}</span></div></CardContent></Card>)}</section></div>;
}