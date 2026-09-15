# Sustituciones: resolver faltantes antes de que salga el pedido

## Nota importante antes de empezar

En esta base de datos la tabla no se llama `order_items`: los artículos de un pedido
están en **`pedido_items`**. No creo una tabla nueva; añado los campos a esa.

Segundo punto: la preferencia que el cliente elige en el carrito tiene que guardarse
junto al artículo al crear el pedido. Ese guardado vive en el mismo archivo donde está
el cobro. **No toco nada del cobro**: solo añado los tres campos nuevos a la línea que
ya guarda cada artículo. Si prefieres que ni siquiera abra ese archivo, dímelo y lo dejo
fuera (entonces la preferencia se mostraría en el carrito pero no llegaría al pedido).

## Qué va a pasar

1. **Cada artículo del pedido guarda su preferencia**: cómo sustituirlo, hasta 3
   alternativas elegidas, en qué estado está (pendiente, encontrado, sin stock,
   sustituido), con qué producto se sustituyó, qué respondió el cliente y cuándo.

2. **En el carrito**, debajo de cada producto aparece un selector con tres opciones:
   - "La mejor opción similar" (por defecto)
   - "Estas alternativas, en orden" → abre una lista del catálogo para elegir hasta 3
   - "No sustituir, devuélveme el dinero"
   La elección se guarda en el navegador junto al carrito y viaja al pedido al comprar.

3. **Si el almacén marca un artículo como sin stock y ese artículo no tiene
   preferencia**, el cliente recibe un aviso en el teléfono con tres botones:
   [ Sí, llévalo ] [ Devuélveme el dinero ] [ Ver otras opciones ]. Los dos primeros se
   resuelven desde el propio aviso; el tercero abre la pantalla del pedido.

4. **Reloj de 10 minutos**: si el cliente no responde en 10 minutos, se aplica sola la
   regla por defecto ("la mejor opción similar") y el pedido sigue. La ruta nunca espera.

5. Todo bilingüe (español e inglés) con los textos en los archivos de idioma que ya
   existen; el resto de idiomas queda con el inglés de respaldo.

## Migración de base de datos

```sql
ALTER TABLE public.pedido_items
  ADD COLUMN IF NOT EXISTS substitution_mode text NOT NULL DEFAULT 'best_match',
  ADD COLUMN IF NOT EXISTS substitute_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS substituted_with_id uuid REFERENCES public.productos(id),
  ADD COLUMN IF NOT EXISTS customer_response text,
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

-- validación por disparador (valores permitidos y máximo 3 alternativas)
CREATE OR REPLACE FUNCTION public.validate_pedido_item_substitution() ...
CREATE TRIGGER pedido_items_validate_substitution
  BEFORE INSERT OR UPDATE ON public.pedido_items ...

-- el cliente puede responder solo sobre SUS artículos
CREATE POLICY "Clientes responden sustituciones de sus pedidos"
  ON public.pedido_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.pedidos p
                 WHERE p.id = pedido_items.pedido_id AND p.cliente_id = auth.uid()));

-- respuesta del cliente (solo toca los campos de sustitución)
CREATE FUNCTION public.respond_substitution(p_item_id uuid, p_response text)
  RETURNS void SECURITY DEFINER; -- GRANT solo a authenticated

-- reloj de 10 minutos: aplica la regla por defecto a lo no respondido
CREATE FUNCTION public.apply_substitution_timeouts()
  RETURNS integer SECURITY DEFINER; -- programada cada minuto con pg_cron
```

No se toca la tabla de clientes ni nada de pagos.

## Archivos de la aplicación

- `src/lib/substitutions.ts` (nuevo): las tres opciones, textos y utilidades.
- `src/lib/cart.tsx`: cada artículo del carrito guarda su preferencia y sus alternativas.
- `src/components/SubstitutionPicker.tsx` (nuevo): el selector y el elector de hasta 3
  alternativas del catálogo.
- `src/routes/cart.tsx`: muestra el selector debajo de cada producto.
- `src/lib/substitutions.functions.ts` (nuevo): leer artículos sin stock del pedido y
  registrar la respuesta del cliente.
- `src/lib/cart-checkout.functions.ts`: añade los tres campos al guardar cada artículo
  (sin tocar el cobro).
- `src/routes/_authenticated/pedido.$id.seguimiento.tsx`: tarjeta "Un artículo está
  agotado" con los tres botones, con cuenta atrás de 10 minutos.
- `src/routes/api/public/hooks/substitution-timeouts.ts` (nuevo): el reloj, protegido
  con clave, para que el vencimiento se aplique aunque nadie tenga la app abierta.
- `src/locales/es|en/translation.json` y copia al resto de idiomas.

## Fuera de alcance

Cobros, devoluciones de dinero y ajustes de importe. "Devuélveme el dinero" solo deja
el artículo marcado; el dinero se trata en un paso posterior, como pediste.
