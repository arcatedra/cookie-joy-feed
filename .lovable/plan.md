# Migración a Supabase propio (BYO Supabase)

Migrar HAZOREX desde Lovable Cloud a un proyecto Supabase gestionado por ti. Riesgo alto, downtime probable. Antes de tocar nada, necesito confirmaciones tuyas.

## Lo que implica esta migración

- **Reaplicar ~140+ migraciones SQL** al nuevo proyecto (schema, tablas, triggers, funciones, RLS, políticas, GRANTs, extensiones como `pg_cron`).
- **Exportar y reimportar datos** de todas las tablas de producción (usuarios, sorteos, ganadores, órdenes, referidos, entradas AMOE, CSP violations, etc.).
- **Migrar `auth.users`**: los usuarios existentes deben re-crearse en el nuevo Supabase (Supabase Admin API). Sus contraseñas hasheadas se pueden portar si Lovable Cloud las expone; si no, se fuerza reset de contraseña vía email a todos.
- **Reconfigurar Auth**: proveedores (Google OAuth, email templates, Turnstile CAPTCHA, TOTP 2FA, políticas de contraseña, HIBP).
- **Reconfigurar Storage buckets** y re-subir archivos si los hubiera.
- **Redeployar `pg_cron`** para el sorteo diario 20:00 ET.
- **Reconfigurar secretos** (Stripe keys, Resend, etc.) en el nuevo entorno.
- **Actualizar variables de entorno** del código (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PROJECT_ID`).
- **Regenerar `src/integrations/supabase/types.ts`** contra el nuevo proyecto.
- **Reconfigurar dominios** de emails transaccionales y redirect URLs de OAuth.
- **Ventana de downtime**: durante el corte definitivo, checkout/sorteo/auth quedan fuera para evitar inconsistencia de datos.

## Riesgos concretos

- **Pérdida de sesiones activas**: todos los usuarios deben re-iniciar sesión.
- **Posible reset masivo de contraseñas** si los hashes de auth no se pueden portar.
- **Interrupción del sorteo diario** si el corte cae cerca de las 20:00 ET.
- **Pagos Stripe en vuelo**: webhooks en tránsito pueden apuntar al endpoint viejo durante el corte.
- **Referidos y entradas AMOE**: cualquier registro creado entre el snapshot y el corte se pierde si no hay doble escritura.
- Lovable Cloud no expone el service role key ni la contraseña de la BD, así que el export inicial debe hacerse con las herramientas que sí están disponibles (migrations + `read_query`) o pedir asistencia a soporte de Lovable para un dump completo.

## Fases propuestas

### Fase 0 — Pre-requisitos (tú)
1. Crear cuenta en supabase.com y un proyecto nuevo en la región deseada.
2. Anotar: `Project URL`, `anon/publishable key`, `service_role key`, `project ref`, `DB password`.
3. Decidir región y plan (Free vs Pro; `pg_cron` y `pg_net` requieren extensiones que en Free tier tienen límites).
4. Confirmar ventana de mantenimiento (recomiendo domingo 03:00–07:00 ET, lejos del sorteo 20:00 ET).

### Fase 1 — Inventario y export (yo, en build mode)
1. Listar todas las migraciones aplicadas y consolidarlas en un único bundle SQL idempotente.
2. Volcar el schema completo (`pg_dump --schema-only` equivalente vía queries).
3. Exportar datos tabla por tabla a JSON/CSV (`read_query` por lotes).
4. Inventariar: buckets de storage, secretos usados, cron jobs activos, edge functions si las hay.

### Fase 2 — Provisionar el nuevo Supabase (tú + yo)
1. Tú: ejecutar el bundle SQL en el SQL Editor de tu Supabase.
2. Tú: activar extensiones (`pg_cron`, `pg_net`, `pgcrypto`, `uuid-ossp`).
3. Tú: configurar Auth providers (Google OAuth con nuevos redirect URLs), plantillas de email, política de contraseñas, HIBP, MFA/TOTP.
4. Tú: crear buckets de Storage con las mismas políticas.
5. Yo: script de import de datos vía Supabase Admin API + inserts por lotes.
6. Yo: script de re-creación de usuarios de auth (con reset de contraseña forzado si no hay acceso a hashes).

### Fase 3 — Cambio de código (yo)
1. Reemplazar el cliente auto-generado de Lovable Cloud por un cliente Supabase estándar apuntando a las nuevas env vars.
2. Actualizar `.env` con las claves nuevas.
3. Regenerar `types.ts`.
4. Actualizar redirect URLs de OAuth en el código y en el dashboard de Google Cloud Console.
5. Reapuntar webhooks de Stripe al nuevo endpoint `/api/public/*`.
6. Verificar que `attachSupabaseAuth`, `requireSupabaseAuth` y `supabaseAdmin` siguen funcionando con el cliente nuevo.

### Fase 4 — Staging y verificación (yo)
1. Deploy en un branch/preview con las env vars nuevas.
2. Smoke test completo: signup, login, Google OAuth, 2FA, checkout Stripe, compra de estrellas, entrada AMOE, sorteo manual de prueba, referidos, QR, perfil, favoritos, admin panels.
3. Verificar `pg_cron` ejecuta el sorteo de prueba correctamente.
4. Confirmar que las 68 tablas tienen RLS activo y GRANTs correctos.
5. Confirmar CSP, headers y endpoint de CSP report siguen funcionando.

### Fase 5 — Corte de producción (tú + yo, ventana coordinada)
1. Congelar escrituras: activar modo mantenimiento (banner + bloqueo de checkout/AMOE/spin).
2. Delta final: re-exportar filas creadas desde el snapshot inicial hasta ahora.
3. Aplicar delta en el nuevo Supabase.
4. Actualizar DNS/env de producción para apuntar al nuevo backend.
5. Verificar sanity checks en producción.
6. Desactivar modo mantenimiento.

### Fase 6 — Post-migración (yo)
1. Monitorear logs, errores y CSP durante 48h.
2. Rollback plan: mantener Lovable Cloud accesible en solo-lectura durante 7 días por si hace falta re-consultar algo.
3. Después de 7 días estables: cerrar Lovable Cloud desde Connectors.

## Detalles técnicos clave

- **Auth**: Supabase permite importar usuarios con `admin.createUser({ email, password_hash })` solo si tenemos los hashes en formato bcrypt. Si Lovable Cloud no los expone (probable), la única opción es crear los usuarios sin contraseña y enviar reset masivo. Esto afecta UX significativamente — necesito tu OK explícito.
- **RLS**: 68 tablas ya auditadas; todas las políticas y GRANTs se replican tal cual.
- **`pg_cron`**: se recrea el job `run_daily_draw_safe()` en el nuevo Supabase apuntando al mismo horario (20:00 ET vía TZ correcto).
- **Stripe**: webhooks apuntan a `/api/public/*` del dominio de la app, no del backend, así que no cambia el endpoint público — solo el destino interno.
- **Emails**: Resend/dominio de envío no cambian; solo las plantillas de auth de Supabase deben reconfigurarse.
- **CSP nonce**: la lógica vive en el server runtime del app, no en Supabase — no se afecta.

## Preguntas que necesito responder antes de empezar

1. **¿Tienes ya el proyecto Supabase creado, o empiezo con las instrucciones de setup?**
2. **¿Aceptas que TODOS los usuarios existentes pierdan su contraseña y reciban un email de reset?** (probable, salvo que Lovable soporte exportar hashes bcrypt).
3. **¿Qué ventana de downtime toleras?** (recomiendo 2–4 horas domingo madrugada).
4. **¿Quieres migración de datos completa (incluye histórico de sorteos, referidos, CSP violations, etc.) o solo lo esencial (users, subscriptions, ganadores)?**

Cuando me confirmes estas 4 respuestas paso a build mode y arranco por Fase 1.
