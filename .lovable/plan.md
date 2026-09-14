# Mensajes rápidos del repartidor

## Qué verá el repartidor

En la pantalla del pedido, el chat se abre mostrando **cinco botones grandes**, uno por mensaje:

- Voy en camino
- Llego en 10 minutos
- Estoy afuera
- Dejé tu pedido en la puerta
- No pude entregar

Al tocar uno: el mensaje se guarda en la conversación del pedido y el cliente recibe un aviso en su teléfono, **en su idioma**.

Debajo, un botón pequeño y discreto: **"Escribir mensaje"**. Al tocarlo aparece el cuadro de escritura libre de siempre. La conversación completa se sigue viendo arriba.

## Idioma del cliente

Hoy no guardamos en ningún lado el idioma de cada persona, así que el aviso no puede salir en su idioma todavía. Propongo:

- Añadir un campo de idioma al perfil (`profiles.locale`), que se rellena solo con el idioma que la persona está usando en la web.
- Los cinco mensajes quedan traducidos a los 9 idiomas del sitio.
- Si alguien aún no tiene idioma guardado, se usa español.

Esto **no toca** la tabla de clientes ni nada de pagos.

## Cambio en la base de datos

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locale text;
```

Solo eso: una columna nueva, opcional. Nada se borra ni se modifica.

## Archivos que se tocan

- `src/components/courier/ChatDrawer.tsx` — los cinco botones grandes + el botón pequeño "Escribir mensaje".
- `src/lib/chat.functions.ts` — al enviar un mensaje rápido, guardarlo y mandar el aviso al cliente en su idioma.
- `src/lib/profile-locale.ts` (nuevo) — guarda el idioma del perfil cuando la persona navega.
- `src/routes/__root.tsx` — llama a lo anterior una vez por sesión.
- `src/locales/*/translation.json` — los textos de los cinco mensajes en los 9 idiomas.

## Fuera de alcance

No se toca el checkout, Stripe, pagos, ni la tabla de usuarios/clientes. No se publica nada a producción.
