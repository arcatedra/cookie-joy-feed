# Comprobante de entrega para el cliente

Cuando el pedido ya está entregado, el cliente verá en su pantalla de seguimiento la foto de la entrega, la hora exacta y la nota del lugar donde se dejó. La foto se toca y se abre en grande. Todo queda guardado y se puede consultar semanas después.

## Qué verá el cliente

Un bloque nuevo, arriba de todo, solo cuando la entrega está completada:

- Título "Entregado" con la hora exacta, por ejemplo "Entregado el 14 de septiembre a las 6:32 PM".
- La foto de la entrega. Al tocarla se abre a pantalla completa.
- La nota del repartidor: "en la puerta", "con el portero", etc.
- Si no hay foto o no hay nota, simplemente no se muestra esa parte.

Todo en español e inglés (y el resto de idiomas con el inglés como respaldo).

## Cambio en la base de datos (necesita tu OK)

La tabla de paradas ya guarda la foto y la hora de entrega. Falta solo la nota del lugar.

```sql
-- 1) Nota del lugar donde se dejó el pedido
ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS delivery_note text;

-- 2) Consulta segura: el cliente solo ve el comprobante de SU pedido
CREATE OR REPLACE FUNCTION public.get_my_delivery_proof(p_order_id uuid)
RETURNS TABLE(
  delivered_at timestamptz,
  delivery_photo_url text,
  delivery_note text,
  recipient_name text,
  status text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rs.delivered_at, rs.delivery_photo_url, rs.delivery_note,
         rs.recipient_name, rs.status::text
    FROM public.route_stops rs
    JOIN public.pedidos p ON p.id = rs.order_id
   WHERE rs.order_id = p_order_id
     AND p.cliente_id = auth.uid()
     AND rs.status = 'entregado'
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_delivery_proof(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_delivery_proof(uuid) TO authenticated;
```

No se toca ninguna tabla de usuarios, clientes ni de pagos. No se borra nada.

## Archivos de la aplicación

- `src/lib/eta.functions.ts`: consulta segura del comprobante y, si la foto está guardada en el almacén privado, generación del enlace temporal para poder verla (se genera cada vez que se abre la pantalla, así sigue funcionando semanas después).
- `src/components/ProofOfDelivery.tsx`: se añade una versión de solo lectura del componente que ya existe, para mostrar foto, hora y nota, con la foto ampliable a pantalla completa.
- `src/routes/_authenticated/pedido.$id.seguimiento.tsx`: se muestra ese bloque cuando el pedido está entregado.
- `src/locales/es/translation.json` y `src/locales/en/translation.json`: textos nuevos (y copia al resto de idiomas con el inglés de respaldo).

No publico nada: lo revisas en la vista previa.
