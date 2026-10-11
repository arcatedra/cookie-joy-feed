import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, Plus, Save, Send } from "lucide-react";
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
  const admin = useQuery({ queryKey:["delivery-blocks","admin"], queryFn:()=>load() });
  const orders = useQuery({ queryKey:["delivery-blocks","orders"], queryFn:()=>loadOrders() });
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
    <section className="space-y-3"><h2 className="text-xl font-bold">Lotes</h2>{(admin.data?.blocks ?? []).map((block:any)=><BlockCard key={block.id} block={block} pending={mutation.isPending} onSave={(increase,enabled,amount)=>mutation.mutate(()=>savePay({data:{blockId:block.id,increase,doorBonusEnabled:enabled,doorBonusAmount:amount}}))} onPublish={()=>mutation.mutate(()=>publish({data:{blockId:block.id}}))} />)}</section>
  </main>;
}

function BlockCard({ block, pending, onSave, onPublish }:{block:any;pending:boolean;onSave:(increase:number,enabled:boolean,amount:number)=>void;onPublish:()=>void}) {
  const [increase,setIncrease]=useState(Number(block.manual_increase ?? 0));
  const [bonus,setBonus]=useState(block.door_bonus_enabled === true);
  const [bonusAmount,setBonusAmount]=useState(Number(block.door_bonus_amount ?? 0));
  return <Card className={block.needsDriverAlert?"border-amber-500":""}><CardContent className="space-y-3 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{block.zone_name} · {block.delivery_block_stops?.length ?? 0} paradas</h3><p className="text-sm text-muted-foreground">{new Date(block.starts_at).toLocaleString()} · {block.estimated_minutes} min · {block.status}</p></div><strong>{money(block.committed_pay)} + {money(block.tips_total)} propinas</strong></div>
    {block.needsDriverAlert && <p className="flex items-center gap-2 text-sm font-semibold text-amber-700"><AlertTriangle className="size-4" />Faltan 12 horas o menos y todavía no tiene repartidor.</p>}
    <div className="flex flex-wrap items-end gap-2"><Button type="button" variant="outline" onClick={()=>setIncrease((v)=>v+5)}>+$5</Button><Button type="button" variant="outline" onClick={()=>setIncrease((v)=>v+10)}>+$10</Button><label className="grid gap-1 text-xs"><span>Aumento manual</span><input type="number" min={0} step="0.01" value={increase} onChange={(e)=>setIncrease(Number(e.target.value))} className="h-10 w-28 rounded-md border px-2" /></label><label className="flex h-10 items-center gap-2 text-sm"><input type="checkbox" checked={bonus} onChange={(e)=>setBonus(e.target.checked)} />Dar bono de puerta</label>{bonus&&<input aria-label="Monto del bono de puerta" type="number" min={0} step="0.01" value={bonusAmount} onChange={(e)=>setBonusAmount(Number(e.target.value))} className="h-10 w-28 rounded-md border px-2" />}<Button disabled={pending} onClick={()=>onSave(increase,bonus,bonusAmount)}><Save className="mr-2 size-4" />Guardar pago</Button>{block.status==="draft"&&<Button disabled={pending} onClick={onPublish}><Send className="mr-2 size-4" />Publicar lote</Button>}</div>
  </CardContent></Card>;
}