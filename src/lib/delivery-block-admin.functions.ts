import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(context:{supabase:any;userId:string}) {
  const { data } = await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
  if (!data) throw new Error("Solo administradores.");
}
async function db() { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); return supabaseAdmin as any; }
const uuid=z.string().uuid();

export const submitDeliveryClaim = createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
  .inputValidator((raw:unknown)=>z.object({orderId:uuid,reason:z.string().trim().min(2).max(120),description:z.string().trim().max(1000).optional(),photoPath:z.string().min(3).max(400)}).parse(raw))
  .handler(async({context,data})=>{
    if (!data.photoPath.startsWith(`${context.userId}/`)) throw new Error("La foto del reclamo es obligatoria");
    const admin=await db();
    const [{data:stop},{data:settings}]=await Promise.all([
      admin.from("delivery_block_stops").select("id,status,delivered_at,store_orders!inner(cliente_id)").eq("store_order_id",data.orderId).maybeSingle(),
      admin.from("delivery_block_settings").select("claim_hours").eq("singleton",true).single(),
    ]);
    if(!stop||stop.store_orders.cliente_id!==context.userId||stop.status!=="delivered"||!stop.delivered_at) throw new Error("Este pedido no permite reclamos de entrega");
    const deadline=new Date(stop.delivered_at).getTime()+Number(settings?.claim_hours??24)*3600000;
    if(Date.now()>deadline) throw new Error("El plazo de 24 horas para reclamar ya terminó");
    const {data:claim,error}=await admin.from("delivery_claims").insert({store_order_id:data.orderId,stop_id:stop.id,customer_id:context.userId,reason:data.reason,description:data.description??null,photo_url:data.photoPath,status:"submitted"}).select("id").single();
    if(error) throw new Error(error.message);
    return {claimId:claim.id as string};
  });

export const getDeliveryBlockAdminOperations=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  await requireAdmin(context); const admin=await db();
  const since=new Date(Date.now()-8*86400000).toISOString();
  const [{data:claims},{data:blocks},{data:bonuses},{data:reservations},{data:drivers}]=await Promise.all([
    admin.from("delivery_claims").select("*,store_orders(numero_pedido)").order("created_at",{ascending:false}).limit(100),
    admin.from("delivery_blocks").select("id,zone_name,starts_at,estimated_minutes,actual_minutes,committed_pay,tips_total,door_bonus_amount,door_bonus_enabled,status,payout_status,assigned_driver_id").gte("starts_at",since).order("starts_at",{ascending:false}),
    admin.from("delivery_weekly_bonuses").select("*").order("week_start",{ascending:false}).limit(100),
    admin.from("delivery_block_reservations").select("id,block_id,driver_id,status,present_at,auto_assign_due_at,delivery_blocks(zone_name,starts_at,status,assigned_driver_id)").in("status",["reserved","present"]).order("reserved_at"),
    admin.from("drivers").select("id,full_name,application_status").eq("application_status","aprobado").order("full_name"),
  ]);
  return {claims:claims??[],blocks:blocks??[],bonuses:bonuses??[],reservations:reservations??[],drivers:drivers??[]};
});

export const resolveDeliveryClaim=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .inputValidator((raw:unknown)=>z.object({claimId:uuid,decision:z.enum(["approved","rejected"]),refundAmount:z.number().min(0),resolution:z.string().trim().min(2).max(1000)}).parse(raw))
 .handler(async({context,data})=>{
  await requireAdmin(context); const admin=await db();
  const {data:claim}=await admin.from("delivery_claims").select("*,store_orders!inner(stripe_payment_intent_id,stripe_environment,monto_capturado)").eq("id",data.claimId).maybeSingle();
  if(!claim) throw new Error("Reclamo no encontrado");
  if(["approved","rejected"].includes(claim.status)) return {ok:true as const,alreadyDone:true};
  let refundId:string|null=null;
  let refundedAt:string|null=null;
  if(data.decision==="approved"&&data.refundAmount>0){
    const max=Math.round(Number(claim.store_orders.monto_capturado??0)*100); const cents=Math.round(data.refundAmount*100);
    if(cents>max) throw new Error("El reembolso supera lo cobrado");
    const {stripePost}=await import("./stripe.server");
    const refund=await stripePost<any>("/v1/refunds",{payment_intent:claim.store_orders.stripe_payment_intent_id,amount:cents,metadata:{delivery_claim_id:claim.id,store_order_id:claim.store_order_id}},claim.store_orders.stripe_environment,{"Idempotency-Key":`delivery-claim-refund-${claim.id}-${cents}`});
    refundId=refund?.id??null; refundedAt=new Date().toISOString();
  }
  const {error}=await admin.from("delivery_claims").update({status:data.decision,resolution:data.resolution,refund_amount:data.decision==="approved"?data.refundAmount:0,resolved_by:context.userId,resolved_at:new Date().toISOString(),refund_id:refundId,refunded_at:refundedAt}).eq("id",claim.id);
  if(error) throw new Error(error.message);
  return {ok:true as const,alreadyDone:false};
 });

function weekStart(date=new Date()) { const d=new Date(date); const day=d.getUTCDay(); d.setUTCDate(d.getUTCDate()-((day+6)%7)); return d.toISOString().slice(0,10); }
export const calculateWeeklyBonuses=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 await requireAdmin(context); const admin=await db(); const start=weekStart(); const end=new Date(`${start}T00:00:00Z`); end.setUTCDate(end.getUTCDate()+7);
 const [{data:settings},{data:blocks}]=await Promise.all([admin.from("delivery_block_settings").select("*").eq("singleton",true).single(),admin.from("delivery_blocks").select("id,assigned_driver_id,starts_at,completed_at,status").gte("starts_at",`${start}T00:00:00Z`).lt("starts_at",end.toISOString()).eq("status","completed")]);
 const drivers=[...new Set((blocks??[]).map((b:any)=>b.assigned_driver_id).filter(Boolean))]; let candidates=0;
 for(const driverId of drivers){
   const mine=(blocks??[]).filter((b:any)=>b.assigned_driver_id===driverId); const onTime=mine.filter((b:any)=>b.completed_at&&new Date(b.completed_at).getTime()<=new Date(b.starts_at).getTime()+4*3600000).length; const pct=mine.length?Math.round(onTime/mine.length*10000)/100:0;
   const [{data:ratings},{count:claims},{count:late}]=await Promise.all([admin.from("delivery_block_ratings").select("stars").eq("driver_id",driverId).gte("created_at",`${start}T00:00:00Z`).lt("created_at",end.toISOString()),admin.from("delivery_claims").select("id",{count:"exact",head:true}).eq("status","approved").gte("created_at",`${start}T00:00:00Z`).lt("created_at",end.toISOString()).in("stop_id",(await admin.from("delivery_block_stops").select("id").in("block_id",mine.map((b:any)=>b.id))).data?.map((s:any)=>s.id)??[]),admin.from("delivery_block_reservations").select("id",{count:"exact",head:true}).eq("driver_id",driverId).eq("status","cancelled").gte("cancelled_at",`${start}T00:00:00Z`).lt("cancelled_at",end.toISOString())]);
   const rating=ratings?.length?ratings.reduce((s:number,r:any)=>s+Number(r.stars),0)/ratings.length:null; const eligible=mine.length>=Number(settings.bonus_min_blocks)&&pct>=Number(settings.bonus_on_time_pct)&&(late??0)===0&&(claims??0)===0&&rating!==null&&rating>=Number(settings.bonus_rating);
   await admin.from("delivery_weekly_bonuses").upsert({driver_id:driverId,week_start:start,eligible_blocks:mine.length,on_time_pct:pct,late_cancellations:late??0,rating,confirmed_claims:claims??0,amount:Number(settings.weekly_bonus),status:eligible?"candidate":"ineligible"},{onConflict:"driver_id,week_start"}); if(eligible)candidates++;
 }
 return {drivers:drivers.length,candidates};
});

export const approveWeeklyBonus=createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
 .inputValidator((raw:unknown)=>z.object({bonusId:uuid}).parse(raw)).handler(async({context,data})=>{
  await requireAdmin(context); const admin=await db(); const {data:bonus}=await admin.from("delivery_weekly_bonuses").select("*").eq("id",data.bonusId).maybeSingle();
  if(!bonus||bonus.status!=="candidate") throw new Error("Este bono no está listo para aprobación");
  const {data:payout,error}=await admin.from("driver_payouts").upsert({driver_id:bonus.driver_id,weekly_bonus_id:bonus.id,tier_amount_usd:Number(bonus.amount),weight_amount_usd:0,tip_amount_usd:0,amount_usd:Number(bonus.amount),status:"pendiente"},{onConflict:"weekly_bonus_id",ignoreDuplicates:true}).select("id").maybeSingle();
  if(error) throw new Error(error.message);
  await admin.from("delivery_weekly_bonuses").update({status:"approved",approved_by:context.userId,approved_at:new Date().toISOString()}).eq("id",bonus.id);
  return {ok:true as const,payoutId:payout?.id??null};
 });