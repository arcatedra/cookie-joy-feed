# Hora estimada de llegada (ETA) para el cliente

## Antes de crear nada: la tabla ya existe

`route_stops` **ya está creada** en la base de datos y se usa hoy por el panel del repartidor. Tiene:

- `id`, `route_id`, `order_id`, `sequence_number` (equivale a tu `sequence`)
- `status` con los cuatro valores que pediste: `pendiente`, `en_camino`, `entregado`, `fallido`
- `delivered_at`, más datos de la entrega (dirección, nombre, foto de evidencia)

**Lo único que falta es `eta`.** Propongo no crear ninguna tabla nueva y añadir esa columna a la que ya existe, para no romper el panel del repartidor.

## Qué haría

1. **Añadir la columna `eta`** a `route_stops`.
2. **Minutos por parada configurable**: una tabla mínima de ajustes (`delivery_settings`) con el valor inicial **12**, editable sin tocar código, más una función que lo lee.
3. **Cálculo**: `eta = hora de salida de la ruta + (sequence × minutos por parada)`. La "hora de salida" es el momento en que el repartidor sale del almacén (ya se guarda hoy). Si la ruta aún no salió, se usa la hora prevista de despacho.
4. **Recálculo automático**: cada vez que una parada pasa a `entregado`, se recalculan las ETAs de todas las paradas siguientes de esa ruta, tomando como base la hora real de esa entrega. Esto se hace con un disparador en la base de datos, así que funciona aunque el repartidor marque la entrega desde cualquier pantalla.
5. **Acceso del cliente**: hoy el cliente **no puede leer** `route_stops` (las reglas solo dejan al repartidor y al administrador). Añado una consulta segura que, dado su pedido, le devuelve solo: hora estimada, su número de parada y el total de paradas. Nada de datos de otros clientes.
6. **Pantalla de seguimiento**: arriba, en grande, "**Llega aprox. 6:20 PM**" y debajo "**Eres la parada 4 de 12**". Si todavía no hay ruta asignada, ese bloque simplemente no aparece.
7. **Bilingüe**: textos nuevos en español e inglés en los archivos de traducción existentes (y se copian al resto de idiomas con el texto en inglés como respaldo).

## Migración que aplicaría

```sql
-- 1) Columna ETA
ALTER TABLE public.route_stops
  ADD COLUMN IF NOT EXISTS eta timestamptz;

-- 2) Ajuste configurable: minutos por parada (inicial 12)
CREATE TABLE IF NOT EXISTS public.delivery_settings (
  key        text PRIMARY KEY,
  value_int  int NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_settings TO authenticated;
GRANT ALL    ON public.delivery_settings TO service_role;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_settings_read" ON public.delivery_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "delivery_settings_admin" ON public.delivery_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.delivery_settings (key, value_int)
VALUES ('minutes_per_stop', 12)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.minutes_per_stop()
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT value_int FROM public.delivery_settings
                   WHERE key = 'minutes_per_stop'), 12);
$$;

-- 3) Recalcular ETAs de una ruta
CREATE OR REPLACE FUNCTION public.recalculate_route_etas(p_route_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_min      int := public.minutes_per_stop();
  v_base     timestamptz;
  v_base_seq int := 0;
BEGIN
  -- base: última entrega real de la ruta; si no hay, salida del almacén;
  -- si tampoco, 9:00 AM (hora de NY) del día de despacho
  SELECT rs.delivered_at, rs.sequence_number
    INTO v_base, v_base_seq
    FROM public.route_stops rs
   WHERE rs.route_id = p_route_id AND rs.delivered_at IS NOT NULL
   ORDER BY rs.delivered_at DESC
   LIMIT 1;

  IF v_base IS NULL THEN
    SELECT COALESCE(r.warehouse_checkin_at,
                    (r.dispatch_date::timestamp + time '09:00')
                      AT TIME ZONE 'America/New_York')
      INTO v_base
      FROM public.delivery_routes r
     WHERE r.id = p_route_id;
    v_base_seq := 0;
  END IF;

  UPDATE public.route_stops rs
     SET eta = v_base + ((rs.sequence_number - v_base_seq) * v_min || ' minutes')::interval
   WHERE rs.route_id = p_route_id
     AND rs.status IN ('pendiente', 'en_camino');
END;
$$;

-- 4) Disparador: al entregar, recalcular las siguientes
CREATE OR REPLACE FUNCTION public.trg_route_stop_recalc_etas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'entregado' AND COALESCE(OLD.status::text, '') <> 'entregado' THEN
    PERFORM public.recalculate_route_etas(NEW.route_id);
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS route_stops_recalc_etas ON public.route_stops;
CREATE TRIGGER route_stops_recalc_etas
AFTER UPDATE OF status ON public.route_stops
FOR EACH ROW EXECUTE FUNCTION public.trg_route_stop_recalc_etas();

-- 5) Consulta segura para el cliente
CREATE OR REPLACE FUNCTION public.get_my_stop_eta(p_order_id uuid)
RETURNS TABLE(eta timestamptz, sequence_number int, total_stops int, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT rs.eta, rs.sequence_number, r.total_stops, rs.status::text
    FROM public.route_stops rs
    JOIN public.delivery_routes r ON r.id = rs.route_id
    JOIN public.subscription_orders so ON so.id = rs.order_id
   WHERE rs.order_id = p_order_id
     AND so.user_id = auth.uid()
   LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_stop_eta(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_my_stop_eta(uuid) TO authenticated;
```

## Archivos de la aplicación

- `src/lib/eta.functions.ts` (nuevo): consulta segura de la ETA del cliente.
- `src/routes/_authenticated/pedido.$id.seguimiento.tsx`: bloque de hora estimada y "parada X de Y".
- `src/locales/es/translation.json` y `src/locales/en/translation.json`: textos nuevos (resto de idiomas con inglés de respaldo).

No toco pagos, ni la tabla de clientes, ni publico nada.

## Nota

Confirma el nombre de la columna del dueño en `subscription_orders` (uso `user_id` en la consulta segura); si es otro, lo ajusto antes de aplicar.
