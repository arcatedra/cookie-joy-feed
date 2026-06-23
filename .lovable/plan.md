
# Panel admin de ganadores (aprobar / pagar)

El claim del ganador con subida de W-9/ID **ya está implementado** end-to-end en `/claim/$drawDate` (ver `_authenticated/claim.$drawDate.tsx` + `winner-claim.functions.ts` + bucket `winner-documents`). Lo que falta es el panel admin para revisar y procesar esos reclamos.

## 1. Permisos de BD (migración)

- Añadir policy en `winner_claims`: admins (`has_role(uid,'admin')`) pueden `SELECT` y `UPDATE` cualquier fila.
- Añadir policies en `storage.objects` para bucket `winner-documents`: admins pueden `SELECT` cualquier objeto (hoy solo el dueño).

## 2. Server functions admin (`src/lib/admin-claims.functions.ts`)

Todas con `requireSupabaseAuth` + chequeo `has_role(userId,'admin')`:

- `listWinnerClaims({ status?, limit, offset })` → lista paginada con campos clave (draw_date, email, prize, status, submitted_at, notified_at).
- `getClaimDocumentUrls({ drawDate })` → genera 2 signed URLs (10 min) para `id_document_path` y `w9_document_path` usando `supabaseAdmin.storage.createSignedUrl`.
- `approveClaim({ drawDate, notes? })` → marca `status='verified'`, `verified_at=now()`, `verified_by=userId`, guarda `admin_notes`.
- `rejectClaim({ drawDate, reason })` → marca `status='rejected'`, `rejection_reason`, `rejected_by`, `rejected_at`.
- `markClaimPaid({ drawDate, paymentReference })` → exige `status='verified'`; setea `status='paid'`, `paid_at`, `payment_reference`, `paid_by`.

Cada acción registra una fila opcional en log (saltable; usamos los timestamps de la tabla).

## 3. Nueva ruta `/admin/sweepstakes.winners.tsx`

Tab/sección bajo el admin de sorteos, con:
- Filtro de estado (todos / pending_verification / submitted / verified / paid / rejected / expired).
- Tabla con: fecha sorteo, ganador, email, premio, estado (badge color), enviado el, deadline.
- Click en una fila abre **Sheet** con:
  - Datos KYC (nombre, DOB, dirección, teléfono).
  - Método de pago + destino.
  - Botones "Ver ID" y "Ver W-9" → abre signed URL en pestaña nueva.
  - Si `status='submitted'`: botones **Aprobar** / **Rechazar** (modal con motivo).
  - Si `status='verified'`: input de `payment_reference` + botón **Marcar como pagado**.
  - Si `status='paid'`: muestra referencia y fecha.
- Link visible desde `/admin/sweepstakes` ("Reclamos de ganadores →").

## 4. Pequeño ajuste en `winner-claim.functions.ts` submit

Hoy `submitClaim` deja `status` en `pending_verification`. Cambiar a `status='submitted'` cuando el ganador termina el formulario, para distinguir "ganador notificado, aún no envió docs" vs "ganador envió docs, listo para revisar". El admin filtra `submitted` para procesar.

## 5. Notas

- No tocamos diseño general — reusamos shadcn (`Card`, `Table`, `Sheet`, `Badge`, `Dialog`).
- Toda escritura va por `requireSupabaseAuth` + verificación `has_role`. No se usa `supabaseAdmin` salvo para signed URLs de los documentos.
- Email al admin cuando el ganador envía docs: **lo dejo fuera** de este turno (lo confirmamos después si lo quieres; añade complejidad de plantilla).

## Archivos a crear/editar

- **migración**: policies admin en `winner_claims` y `storage.objects` (bucket `winner-documents`).
- **nuevo**: `src/lib/admin-claims.functions.ts`.
- **nuevo**: `src/routes/admin.sweepstakes.winners.tsx`.
- **editado**: `src/routes/admin.sweepstakes.tsx` → link a la sección de reclamos.
- **editado**: `src/lib/winner-claim.functions.ts` → `submitted_at` + `status='submitted'`.
- **editado**: `src/routes/_authenticated/claim.$drawDate.tsx` → render del estado `submitted` ("en revisión por el equipo").

¿Procedo así?
