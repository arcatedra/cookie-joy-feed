# Revisión de antecedentes con Checkr para repartidores

## Lo que verá el repartidor
- Después de enviar su postulación (ID, licencia, selfie) aparece un paso **"Revisión de antecedentes"** con el botón **"Completar revisión de antecedentes"**, que abre Checkr en una pestaña nueva.
- Texto ES: "Checkr, nuestro proveedor de antecedentes, te pedirá tu SSN y tu autorización. Hazorex no ve ni guarda tu SSN. Usa el mismo nombre y correo de tu postulación."
- Texto EN: "Checkr, our background check provider, will ask for your SSN and authorization. Hazorex never sees or stores your SSN. Use the same name and email as your application."
- El mismo bloque se muestra en su página de estado mientras la postulación esté pendiente o en revisión, junto con el estado de antecedentes (Pendiente / Aprobado / Rechazado).

## Lo que verás tú (admin de repartidores)
- En la lista y en el detalle: insignia con el estado de antecedentes.
- Selector para marcarlo a mano: Pendiente, Aprobado, Rechazado.
- El botón "Aprobar" queda bloqueado si antecedentes no está en "Aprobado", con el aviso: "No puedes aprobar a este repartidor: la revisión de antecedentes de Checkr debe estar en Aprobado." El servidor también lo rechaza, aunque alguien intente saltarse la pantalla.

## SSN
- La app nunca pide ni guarda SSN; solo guarda el estado. No se toca la tabla de datos fiscales antigua ni filas existentes.

## Enlace en un solo lugar
- Un archivo de configuración con el enlace de Checkr; cambiarlo ahí lo actualiza en todas las pantallas.

## Detalles técnicos
- Migración: `ALTER TABLE public.drivers ADD COLUMN background_check_status text NOT NULL DEFAULT 'pendiente'` + trigger de validación (solo pendiente/aprobado/rechazado) y proteger el campo en `drivers_protect_admin_fields` para que el repartidor no pueda cambiarlo él mismo (solo admin/service_role). Los repartidores existentes quedan en "pendiente"; no afecta a usuarios ni clientes.
- `src/lib/driver-config.ts`: `CHECKR_APPLY_URL`.
- `src/lib/admin-drivers.functions.ts`: `setBackgroundCheckStatus` (solo admin) y bloqueo en `approveDriver`.
- `src/routes/_authenticated/admin.repartidores.tsx`: insignia, selector y botón bloqueado.
- `src/routes/repartidores.tsx`: paso tras envío y bloque en estado pendiente.
- `src/locales/es` y `en`: textos nuevos.
- No se tocan pagos ni se publica.
