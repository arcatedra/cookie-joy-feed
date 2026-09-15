# Arreglar la página de registro de negocios

## Qué está pasando

La página `/negocios/registro` pregunta a la base de datos si ya tienes un negocio
registrado. Esa consulta falla porque **la tabla de negocios no existe** en la base
de datos conectada (nunca se instaló ahí). Como el código no contempla el fallo, la
pantalla se queda girando para siempre.

## 1. Crear la tabla de negocios (migración)

Los campos salen tal cual del formulario: nombre, tipo, email, teléfono, dirección,
zona; más los de gestión: estado, motivo de rechazo, logo, fechas.

```sql
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN ('supermercado','tienda','panaderia','farmacia','otro')),
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,                         -- zona de NYC elegida en el formulario
  status TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (status IN ('pendiente','aprobado','rechazado','suspendido')),
  rejection_reason TEXT,
  logo_url TEXT,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_businesses_owner  ON public.businesses(owner_user_id);
CREATE INDEX idx_businesses_status ON public.businesses(status);

GRANT SELECT, INSERT, UPDATE ON public.businesses TO authenticated;
GRANT ALL ON public.businesses TO service_role;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- El dueño solo ve y edita lo suyo
CREATE POLICY "Owners view own business"   ON public.businesses FOR SELECT TO authenticated
  USING (owner_user_id = auth.uid());
CREATE POLICY "Users register own business" ON public.businesses FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owners update own business" ON public.businesses FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

-- El admin ve y gestiona todos
CREATE POLICY "Admins view all businesses"   ON public.businesses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update any business"   ON public.businesses FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
```

Además, en la misma migración:

- **Candado antifraude**: un disparador impide que un dueño se apruebe solo o
  cambie el estado, el motivo de rechazo o el propietario; cuando el admin aprueba,
  se guarda solo la fecha y quién aprobó.
- **Fecha de actualización** automática.
- **Vista pública** `approved_businesses_public` (solo nombre, tipo, zona, logo) que
  ya usa el directorio de negocios; la tabla completa (email, teléfono, dirección)
  nunca se expone a visitantes.
- **Catálogo y ofertas** (`business_products`, `business_offers`), que ya están
  programadas en las pantallas `/negocio/productos` y `/negocio/ofertas` y fallarían
  igual. Mismas reglas: el dueño aprobado gestiona lo suyo, el admin todo, el público
  solo ve lo activo de negocios aprobados.

No se toca ninguna tabla de usuarios, clientes ni pagos.

## 2. Arreglar el spinner infinito

- `/negocios/registro`: la consulta se envuelve en manejo de error. Si falla, se ve
  un mensaje claro ("No pudimos cargar tus datos de negocio") con un botón
  **Reintentar** en vez del spinner eterno.
- Misma revisión en `/negocio`, `/negocio/productos` y `/negocio/ofertas`: hoy
  muestran el error en texto plano; les añado el mismo bloque con botón de reintentar.

## 3. Sobre `/~flock.js` y los reportes de CSP

`flock.js` no es código del sitio: no aparece en ninguna parte del proyecto. Es un
script que inyecta una extensión del navegador o una herramienta del entorno de
vista previa. El 503 y los avisos de seguridad que ves vienen de ahí, no de la
página. No hay nada que quitar del código; desaparece al abrir la página en una
ventana de incógnito o sin extensiones.

## Archivos

- migración (tabla de negocios, catálogo, ofertas, reglas de acceso)
- `src/routes/negocios.registro.tsx`
- `src/routes/_authenticated/negocio.index.tsx`
- `src/routes/_authenticated/negocio.productos.tsx`
- `src/routes/_authenticated/negocio.ofertas.tsx`
