# Seguridad de Hazorex: revisión y correcciones

## Alcance y precauciones

Corregir riesgos críticos y altos confirmados, sin modificar ni borrar filas de usuarios o clientes, sin cobros ni publicación. Los cambios de permisos de Supabase afectan también al sitio publicado, porque comparte la misma base de datos.

## Resultado de la revisión inicial

Los 22 avisos actuales de Supabase no equivalen a 22 fallos críticos: son 20 avisos sobre funciones con permisos especiales, uno sobre una tabla sin políticas y uno sobre contraseñas filtradas. El informe anterior de Lovable no está actualizado y señala además lecturas públicas y dos reglas de imágenes.

| Aviso o riesgo | Gravedad revisada | Acción prevista | Qué te toca |
|---|---|---|---|
| Lectura pública de `businesses`: incluye correo, teléfono y datos de conexión de cobro | Alta, confirmada | Limitar las columnas públicas y conservar el catálogo mediante la vista pública existente; mantener datos completos únicamente para propietario y administrador | Aprobar este plan |
| Una postulación puede enviarse ya aprobada: negocios y repartidores | Alta, confirmada | Exigir estado pendiente y campos internos sin configurar al registrarse; impedir autoaprobación | Aprobar este plan |
| Propietario de negocio puede modificar identificador y estado de su cuenta de cobro directamente | Alta, confirmada | Reservar esos campos al sistema; conservar la conexión legítima desde el panel | Aprobar este plan |
| 18 funciones con permisos especiales accesibles a personas registradas | Advertencia, requiere clasificación individual | Conservar las que comprueban propietario o administrador; cerrar o acotar las que permitan leer información ajena. Revisar también nombres públicos de comentaristas | Ninguna salvo aprobación si requiere ajuste |
| 2 funciones públicas que cuentan comentarios y «me gusta» | Advertencia; acceso público potencialmente legítimo | Confirmar que solo devuelven totales de contenido público, no identidades ni datos privados | Ninguna |
| `HAZOREX` tiene protección activa sin políticas | Informativa | Conservar el bloqueo: no añadir lectura pública para silenciar el aviso | Ninguna |
| Funciones sin `search_path` y tablas sin RLS | No detectadas en la revisión actual del esquema público | Verificar nuevamente después de las correcciones; no cambiar funciones innecesariamente | Ninguna |
| Lectura pública de zonas, días, catálogo y precios | Informativa/advertencia | Conservar información necesaria para comprar y cotizar; confirmar que no incluye secretos o datos privados | Ninguna |
| Imágenes de `store-media` y `reels-media` con lectura pública pese a depósitos privados | Informe anterior: alta; pendiente de confirmar uso | Distinguir imágenes comerciales y vídeos públicos de documentos privados; no romper imágenes públicas para silenciar avisos. Los documentos del repartidor y fotos de entrega ya tienen lectura restringida | Ninguna; cualquier cambio adicional se detallará antes de aplicarlo |
| Protección contra contraseñas filtradas desactivada | Advertencia | No puedo activarla con las herramientas disponibles; entregar instrucciones | Activarla en Supabase; requiere Pro o superior |

## Correcciones

1. Aplicar una migración de permisos y validaciones para los riesgos altos confirmados. No cambiar importes, capturas, transferencias ni datos existentes.
2. Ajustar las lecturas del catálogo para utilizar únicamente campos públicos, conservando horarios, dirección comercial, fotos, zonas y separación entre prueba y real.
3. Revisar los 20 avisos de funciones uno por uno y conservar únicamente los accesos necesarios y debidamente restringidos.
4. Volver a comprobar permisos, RLS y `search_path`; ejecutar pruebas pertinentes y revisar catálogo público. No presentar como comprobadas las pruebas autenticadas que no puedan ejecutarse con una sesión autorizada.
5. Entregar tabla final: aviso, gravedad, cambio realmente aplicado y acción pendiente del dueño. No ocultar avisos ni afirmar que toda la aplicación es segura por superar este análisis.

## Activación de contraseñas filtradas

1. Abrir el proyecto de Supabase: https://supabase.com/dashboard/project/oyvbxkluvkrljvewrgue
2. Entrar en **Authentication → Sign In / Providers → Email**.
3. Activar **Leaked password protection** y guardar con **Save**. Si no aparece en esa sección, buscar **Password security** dentro de Authentication.
4. Si está bloqueado por el plan, se necesita **Pro o superior**; no cambiaré tu plan ni contrataré nada.
5. Este control comprueba contraseñas nuevas o cambiadas; no revisa automáticamente las existentes.

## Detalles técnicos

- Preservar `approved_businesses_public` con `security_invoker=true`. No confiar solo en una vista para ocultar datos: restringir también la lectura de columnas de la tabla base para `anon`, manteniendo RLS y permisos completos de propietario/admin autenticados.
- Ampliar la vista por migración con campos comerciales que ya usa el catálogo, sin incluir correo de propietario, cuenta Stripe, datos de aprobación u otros campos internos.
- Endurecer las políticas INSERT y los disparadores de negocios/repartidores para cubrir registro y modificación de campos internos, sin alterar usuarios/clientes ni operaciones legítimas del servidor.
- Las migraciones se aplicarán exclusivamente con la herramienta de Supabase tras aprobar este plan; conservar permisos explícitos de `service_role`.
- Registrar la regla de seguridad en `AGENTS.md` y actualizar la lista de tareas.