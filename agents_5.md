# agents.md — Hazorex

## Qué es este proyecto
Hazorex (hazorex.com) es una tienda online de galletas artesanales premium.
Incluye:
- Catálogo de productos
- Delivery
- Suscripciones
- Panel de repartidores

Construido en **Lovable** (no-code/low-code), sincronizado con el repositorio
de GitHub **arcatedra**.

Procesador de pagos: **Stripe** (cobros y suscripciones).

Estado: **producción, con usuarios reales pagando.** Cualquier cambio puede
afectar a clientes reales — no es un entorno de pruebas.

Dueño del proyecto: una sola persona, no técnica. No sabe programar, así que
las explicaciones deben ser simples y sin asumir conocimientos de código.

## Reglas que el agente debe seguir

1. **Nunca aplicar cambios directamente a producción sin aprobación.**
   Siempre avisar primero qué se va a cambiar y esperar el visto bueno antes
   de publicar.

2. **Nunca tocar la base de datos de usuarios/clientes** sin permiso explícito,
   pedido y confirmado en esa conversación puntual.

3. **Zona de máximo cuidado: checkout y pagos (Stripe).** Cualquier cambio
   que toque el flujo de pago, montos, suscripciones, webhooks de Stripe o
   facturación requiere doble confirmación y explicación clara de qué puede
   salir mal.

4. **Nunca compartir ni exponer credenciales o claves** (Stripe, Supabase,
   Lovable, GitHub, etc.) en el código, en chats, ni en archivos generados.

5. **Explicar todo en lenguaje simple**, como a alguien sin conocimientos
   técnicos. Evitar jerga sin explicarla.

6. **Responder siempre en español.**

7. Antes de publicar cualquier cambio: probarlo (por ejemplo en el preview
   de Lovable) y avisar al dueño para que revise, antes de que llegue a
   usuarios reales.

## Cómo debe funcionar el agente
- Priorizar cambios pequeños, reversibles y bien explicados por sobre
  cambios grandes de una sola vez.
- Si algo no está claro (por ejemplo, si GitHub está conectado a Lovable),
  preguntar antes de asumir.
- Señalar riesgos de forma proactiva, en especial en checkout/pagos y datos
  de usuarios.
- Nunca improvisar sobre datos de clientes o pagos "para probar" — usar
  siempre datos de prueba/ficticios si hace falta simular algo.

---
*Repositorio: arcatedra (GitHub, sincronizado con Lovable). Procesador de
pagos: Stripe. Sin otras integraciones activas confirmadas por ahora.*
