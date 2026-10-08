import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Wallet, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/repartidor/wallet")({
  head: () => ({ meta: [
    { title: "Cuenta de cobro — Hazorex Repartidor" },
    { name: "description", content: "Consulta tus pagos por pedido y conecta tu cuenta de cobro en Stripe." },
    { property: "og:title", content: "Cuenta de cobro — Hazorex Repartidor" },
    { property: "og:description", content: "Pagos por entrega y conexión segura con Stripe." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: WalletPage,
});

function WalletPage() {
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
    <Wallet className="size-7 text-primary" />
    <h1 className="text-2xl font-bold">Mi cuenta de cobro</h1>
    <p className="text-muted-foreground">Cobras al entregar cada pedido: tu parte del envío, cargo por peso y el 100% de la propina. El plazo del depósito bancario depende de Stripe y de tu banco.</p>
    <p className="text-sm text-muted-foreground">Tus datos fiscales y bancarios se proporcionan únicamente en Stripe.</p>
    <Button asChild><Link to="/repartidor/cobros">Mis cobros <ArrowRight className="ml-2 size-4" /></Link></Button>
  </main>;
}
