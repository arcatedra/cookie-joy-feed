# Bloquear el intercambio de contactos en el chat

## Qué va a pasar

Cuando alguien (cliente o repartidor) intente enviar por el chat un número de teléfono, un correo o una app de contacto/pago, el mensaje **no se guarda** y quien lo escribió ve el aviso:

> "Por seguridad, no se pueden compartir números ni contactos."

Cada intento queda registrado para que tú lo veas en el panel de administración.

## Qué se bloquea

- Cualquier secuencia de 7 o más dígitos, aunque venga con espacios, guiones, puntos o paréntesis.
- Números escritos en palabras, en español o en inglés (por ejemplo "tres cero cinco...").
- Las palabras: whatsapp, wasap, telegram, cashapp, zelle, venmo (con o sin espacios/símbolos entre letras).
- Cualquier dirección de correo electrónico.

La revisión corre en el servidor, no solo en el navegador, así que no se puede saltar.

## Cambio en la base de datos (necesita tu OK)

Se crea una tabla nueva **policy_violations** con: pedido, persona, si era cliente o repartidor, el texto que intentó enviar y la fecha. Solo el administrador puede verla; nadie más. No se toca ninguna tabla existente.

```sql
CREATE TABLE public.policy_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  user_id uuid NOT NULL,
  role text NOT NULL,
  texto_intentado text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.policy_violations TO authenticated;
GRANT ALL ON public.policy_violations TO service_role;
ALTER TABLE public.policy_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins ven las violaciones" ON public.policy_violations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX policy_violations_created_at_idx ON public.policy_violations (created_at DESC);
```

## Archivos

- `src/lib/contact-filter.ts` (nuevo): las reglas de detección (dígitos, números en palabras es/en, palabras prohibidas, correos).
- `src/lib/chat.functions.ts`: antes de guardar, revisa el texto; si no pasa, registra el intento y devuelve el aviso en vez de guardar.
- `src/components/courier/ChatDrawer.tsx`: muestra el aviso a quien escribió y no limpia el campo del mensaje.
- `src/routes/_authenticated/admin.violaciones.tsx` (nuevo): lista de intentos en el panel de admin, con fecha, persona, rol, pedido y el texto.
- `src/locales/es|en/translation.json` (+ resto de idiomas con inglés de respaldo): el texto del aviso.

No se toca el checkout, Stripe, pagos, ni la tabla de usuarios o clientes. No se publica nada.
