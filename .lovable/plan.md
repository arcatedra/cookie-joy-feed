## Contexto

Tenés razón: en la etapa 1 solo agregamos las tablas, el rol y el bucket en la base de datos. **Nada de eso se ve en la app.** Por eso no hay ninguna pantalla ni botón que le diga a una persona "sé repartidor".

Vamos a agregar la **etapa 2**: la puerta de entrada visible del programa de repartidores.

## Qué vas a ver después de este paso

### 1. Landing pública `/repartidores`
Una página pública (no requiere login) con:
- Hero: "Gana dinero repartiendo con Hazorex" + botón grande **"Postularme"**.
- 3 bloques cortos: cómo funciona, requisitos (mayor de 18, documentos), qué ganás.
- FAQ básico (¿necesito vehículo?, ¿cuándo cobro?, etc.).
- Si la persona no está logueada → el botón la manda a `/auth` y vuelve a `/repartidores` después.
- Si ya está logueada y todavía no se postuló → botón "Empezar postulación" (deshabilitado por ahora, va a activarse en etapa 3 con el wizard).
- Si ya se postuló → muestra el estado actual (Pendiente / En revisión / Aprobado / Rechazado con motivo) en vez del botón.
- Si ya está aprobada → botón "Ir a mi panel" (el panel se construye en etapa 4).

### 2. Enlace visible en el sitio
Agrego un link **"Sé repartidor"** en el footer (`SiteFooter.tsx`) para que cualquiera lo encuentre navegando. No toco la navegación principal para no ensuciarla.

### 3. SEO
- `title`: "Sé repartidor · Hazorex"
- `description`, `og:title`, `og:description` propios de la página.
- Sin `og:image` por ahora (lo agregamos cuando tengamos una imagen del programa).

## Qué NO hace esta etapa

- **No** construye el wizard de postulación de 4 pasos (eso es etapa 3).
- **No** construye el panel de admin para revisar postulaciones (etapa 4).
- **No** construye el dashboard del repartidor aprobado (etapa 5).
- **No** toca el backend — todas las tablas y el bucket ya están.

El botón "Empezar postulación" va a estar visible pero deshabilitado con un texto tipo *"Próximamente"* para que se vea el flujo completo aunque el wizard todavía no exista.

## Detalles técnicos

- **Archivo nuevo:** `src/routes/repartidores.tsx` (ruta pública, SSR normal, con `head()`).
- **Lectura de estado:** un `useQuery` que llama a `supabase.from('drivers').select('application_status, rejection_reason').eq('id', user.id).maybeSingle()` — usa RLS existente, no hace falta server function nueva.
- **Edición:** `src/components/SiteFooter.tsx` para agregar el link.
- **Sin migraciones nuevas**, sin cambios en el resto de rutas.

## Después de esta etapa

Cuando la apruebes y la veas funcionando, seguimos con **etapa 3: el wizard de postulación de 4 pasos** que activa ese botón "Empezar postulación".