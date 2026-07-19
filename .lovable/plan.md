
## Cómo aplicar el schema a tu Supabase nuevo (paso a paso, sin experiencia técnica)

Vas a copiar y pegar un archivo SQL grande en tu Supabase. Tarda 5 minutos. No puedes "romper" nada porque tu proyecto está vacío.

### Paso 1 — Abre el SQL Editor de tu Supabase
1. Ve a este link (ya tiene tu proyecto): https://supabase.com/dashboard/project/oyvbxkluvkrljvewrgue/sql/new
2. Inicia sesión con la misma cuenta con la que creaste el proyecto.
3. Vas a ver una pantalla con un editor grande de texto (parecido a Word pero para SQL).

### Paso 2 — Descarga el archivo `hazorex-schema-bundle.sql`
En el chat de Lovable, en el mensaje anterior mío te dejé un archivo llamado **`hazorex-schema-bundle.sql`**. Búscalo en el chat (aparece como una tarjeta que puedes descargar) y guárdalo en tu computadora.

Si no lo ves, dime "no encuentro el archivo" y te lo vuelvo a generar.

### Paso 3 — Copia todo el contenido del archivo
1. Abre el archivo `hazorex-schema-bundle.sql` con el Bloc de notas (Windows) o TextEdit (Mac).
2. Selecciona TODO el texto: `Ctrl+A` en Windows, `Cmd+A` en Mac.
3. Cópialo: `Ctrl+C` / `Cmd+C`.

### Paso 4 — Pégalo en el SQL Editor de Supabase
1. Vuelve a la pestaña del navegador con el SQL Editor de Supabase.
2. Haz clic dentro del editor grande.
3. Pega: `Ctrl+V` / `Cmd+V`.
4. Haz clic en el botón verde **"Run"** (abajo a la derecha), o presiona `Ctrl+Enter` / `Cmd+Enter`.

### Paso 5 — Espera y avísame
- Tarda entre 30 segundos y 2 minutos.
- Abajo va a aparecer un mensaje: verde "Success" o rojo con un error.
- **Copia lo que salga y pégalo aquí en el chat** — sea éxito o error.

### Qué sigue después (yo me encargo)
Cuando confirmes que el schema se aplicó:
1. Creo los 5 buckets de storage.
2. Te doy el SQL de los 10 cron jobs (otro copy-paste corto).
3. Actualizo el archivo `.env` de la app para apuntar a tu Supabase nuevo.
4. Verifico que login, carrito y sorteo funcionen.

### Si algo te preocupa
- **No borres nada** en tu Supabase, solo pega y ejecuta.
- Si sale un error largo, no te preocupes — pégalo aquí y lo arreglo.
- La tabla `HAZOREXX` que creaste antes NO se borra; el bundle no la toca.
