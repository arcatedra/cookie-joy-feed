# Hazorex: plan de seguridad y aviso de pedidos

## Antes de hacer cambios

**No he cambiado la aplicación, permisos, datos ni pagos. No he publicado.** Solo consulté informes, permisos actuales y el código relacionado.

Es un trabajo mediano, con una parte delicada: corregir la preparación de productos por libra afecta el cálculo del cobro. Propongo separar las correcciones de bajo riesgo de cualquier ajuste relacionado con dinero o permisos compartidos con producción.

**Importante:** los cambios de permisos de la base de datos afectan al sitio publicado inmediatamente, aunque no publiquemos la aplicación. No los aplicaré sin autorización específica. No modificaré ni borraré usuarios o clientes, ni ejecutaré cobros, reembolsos o transferencias reales.

## Qué informes hay realmente

- Supabase sigue mostrando **22 avisos**: 18 sobre funciones accesibles con sesión, 2 sobre funciones accesibles sin sesión, 1 tabla protegida sin reglas de acceso y 1 sobre contraseñas filtradas.
- Son **18 funciones distintas**: los dos contadores de Reels aparecen tanto en el grupo público como en el grupo con sesión. Los 22 avisos no son 22 fallos graves distintos.
- El análisis de seguridad adicional muestra **11 avisos**, incluidos tres marcados como bloqueantes. La contraseña aparece en ambos informes.
- Hay **1 aviso abierto de Project monitoring (QA)** sobre sustituciones de productos vendidos por libra. El problema sigue presente en el código.
- No detecté funciones con permisos especiales sin una ruta de búsqueda definida. No haré cambios generales para solucionar un problema que no aparece.

Los niveles siguientes son mi valoración del riesgo real observado, no una copia del color del informe. Una revisión de permisos no demuestra que toda la aplicación sea segura; algunos análisis anteriores están desactualizados y el análisis de conexiones no se ejecutó por falta de configuración.

## A. Los 22 avisos de Supabase, uno por uno

**Conservar** significa no cambiar una función legítima solo para quitar el aviso. Sigue siendo necesario comprobar que no permite actuar sobre otra persona. Los nombres entre paréntesis sirven para identificar exactamente cada aviso.

| Nº | Aviso | Riesgo real observado | Qué haría | Qué podría afectar si se cambia |
|---|---|---|---|---|
| 1 | Tabla HAZOREX protegida sin reglas | **Bajo**. Actualmente bloquea el acceso normal; no significa exposición. | Conservar el bloqueo. No abrirla para eliminar el aviso. | Ninguno al conservarla; abrirla sería innecesario. |
| 2 | Contador público de comentarios (reel_comment_counts) | **Bajo**. Devuelve totales por vídeo, no compradores ni comentarios individuales. | Conservar el acceso público; comprobar límites y que solo cuente contenido público. | Contadores de Reels si se retira el acceso; no pagos ni clientes. |
| 3 | Contador público de me gusta (reel_like_counts) | **Bajo**. Solo devuelve totales. | Igual que el anterior; no bloquearlo por ser público. | Contadores de Reels; no pagos ni clientes. |
| 4 | Lista de retiros (admin_list_withdrawals) | **Bajo** con la comprobación actual de administrador. Incluye correo y nombre para el admin, no para cualquier usuario. | Conservar y probar que una persona no administradora recibe rechazo. | Panel de retiros; lee clientes, pero no los modifica. No cambiar sin revisar ese acceso. |
| 5 | Procesar retiro (admin_process_withdrawal) | **Medio**, por manejar saldo y estados, aunque exige administrador y bloquea solicitudes simultáneas. | Conservar controles; probar rechazo y repetición en una base aislada. No ejecutar sobre retiros reales. | Retiros, comisiones y devolución de saldo. **Requiere autorización explícita para cualquier cambio.** |
| 6 | Avanzar entrega de tienda (advance_store_delivery) | **Bajo** para acceso ajeno: exige el repartidor asignado y foto al entregar. | Conservar; probar que otro repartidor no puede avanzar el pedido. | Tiendas, repartidores, estado de entrega y procesos posteriores. No revocar de forma general. |
| 7 | Margen de autorización (auth_buffer_settings) | **Bajo** para privacidad; devuelve dos valores de configuración, no datos personales. | Conservar. No ajustar margen ni permisos sin autorización. | Reserva del pago de tiendas. **Cualquier ajuste requiere autorización de pagos.** |
| 8 | Tomar pedido de tienda (claim_store_order) | **Bajo** para acceso indebido: exige repartidor aprobado y pedido libre. | Conservar; probar doble intento y asignación ajena en aislamiento. | Asignación y capacidad de repartidores; tiendas. |
| 9 | Avisar retraso en ruta (delay_route_stops) | **Bajo**: limita minutos permitidos y ruta del repartidor. | Conservar; probar que no altera rutas ajenas. | Hora estimada y avisos de entrega; lee el identificador del cliente del pedido, no modifica su ficha. |
| 10 | Consultar saldo propio (get_my_credit_balance) | **Medio**: limita al usuario, pero suma saldo sin separar el entorno de prueba del real. El efecto en pantallas depende de sus usos. | Rastrear su uso antes de decidir; si sigue activa para saldo real, proponer separación prueba/real sin alterar movimientos históricos. | Saldo, descuentos y retiros. **No cambiar sin autorización explícita de pagos.** |
| 11 | Comprobante propio (get_my_delivery_proof) | **Bajo**: exige que el pedido pertenezca al cliente. | Conservar y probar rechazo de pedido ajeno. | Seguimiento y foto de entrega; no modifica clientes ni pagos. |
| 12 | Sustituciones pendientes propias (get_my_pending_substitutions) | **Bajo**: exige dueño del pedido y limita resultados. | Conservar y probar rechazo de pedido ajeno. | Pantalla de sustituciones; no modifica clientes. |
| 13 | Perfil de referidos propio (get_my_referral_profile) | **Bajo** para acceso ajeno. Puede crear o completar el código en el perfil propio. | Conservar; no ejecutarla con cuentas reales durante las pruebas ni cambiar perfiles. | Referidos y perfiles. **Cualquier cambio de escritura requiere autorización específica.** |
| 14 | Mis referidos (get_my_referrals) | **Bajo**: solo asociaciones del invitante; muestra el primer nombre, no el correo. | Conservar el alcance actual y probar aislamiento. | Historial de referidos; lee clientes, no modifica su ficha. |
| 15 | Hora estimada propia (get_my_stop_eta) | **Bajo**: exige dueño del pedido. | Conservar y probar rechazo de pedido ajeno. | Seguimiento y posición en ruta; no cobros. |
| 16 | Nombres de comentaristas (get_public_profiles) | **Bajo**, con privacidad limitada: solo primer nombre de quienes comentaron, pero acepta una lista de identificadores. | Confirmar que se desea ese nombre público; no ampliar a correos ni fichas completas. Conservar si es intencional. | Nombres en comentarios; lee clientes, sin cambios en esa tabla. |
| 17 | Comprobar rol (has_role) | **Medio** para privacidad: un usuario con sesión puede consultar si otro identificador tiene un rol. No concede ese rol. | Revisar usos antes de proponer una variante limitada al usuario propio; no reemplazar la función central a ciegas. | Permisos de admin, tiendas, repartidores y accesos a datos. **Cambio delicado de base de datos.** |
| 18 | Contador de comentarios con sesión | **Bajo**. Es la misma función del nº 2. | Conservar; comprobar una sola vez, sin duplicar trabajo. | Reels; no pagos ni clientes. |
| 19 | Contador de me gusta con sesión | **Bajo**. Es la misma función del nº 3. | Conservar; comprobar una sola vez. | Reels; no pagos ni clientes. |
| 20 | Solicitar retiro de afiliado (request_affiliate_withdrawal) | **Medio**, por manejar comisiones; exige usuario y bloquea doble solicitud simultánea. | Conservar protección y probar concurrencia en aislamiento, sin solicitar retiros reales. | Comisiones y retiros. **Cambios solo con autorización explícita de pagos.** |
| 21 | Responder sustitución (respond_substitution) | **Bajo** para acceso ajeno: exige dueño del pedido y respuesta pendiente. | Conservar y probar respuesta ajena y repetida en aislamiento. | Preparación y cálculo posterior del pedido; no modificar ficha del cliente. |
| 22 | Protección contra contraseñas filtradas apagada | **Medio**: permite elegir contraseñas conocidas por atacantes. | Activarla manualmente en Supabase si el plan lo permite. No revisar ni sustituir contraseñas existentes. | Registro y cambio de contraseña: rechazará contraseñas filtradas. No checkout, importes ni datos de clientes. |

**Conclusión de estos 22:** no hay una exposición alta confirmada solo por estos avisos. Hay funciones legítimas protegidas y varios puntos delicados que requieren pruebas, no una revocación masiva de permisos.

## B. Los 11 avisos del análisis adicional

Estos también deben quedar incluidos para no confundir los 22 de Supabase con los tres bloqueantes del otro informe.

| Aviso | Riesgo real | Propuesta | Posible efecto |
|---|---|---|---|
| Configuración de lotes pública (delivery_block_settings), **bloqueante** | **Medio**: expone reglas operativas, pago sugerido y bonos; no contiene fichas de clientes. Solo admin puede escribir. | Separar valores públicos necesarios para cotizar de reglas internas; conservar acceso legítimo del sistema/admin. | Cotización, checkout, lotes y repartidores. **Delicado; autorización específica de permisos y pagos.** |
| Descarga de reels-media, **bloqueante** | **Bajo si todos son vídeos públicos; alto si hay archivos privados**. El permiso de lectura es público aunque el depósito figure privado. Contenido completo aún no clasificado. | Clasificar únicamente los archivos de ese depósito antes de decidir. Conservar vídeos públicos; restringir cualquier archivo privado sin borrarlo. | Vídeos de portada. No cerrar toda la lectura a ciegas. |
| Descarga de store-media, **bloqueante** | **Bajo si solo son fotos comerciales; alto si hay documentos privados**. Igual discrepancia entre depósito privado y lectura pública. | Clasificar uso y archivos; conservar fotos públicas y restringir documentos privados, si existen. | Fotos de tiendas/productos y carga de imágenes. No pagos ni ficha de clientes. |
| pricing_settings pública | **Medio**: mezcla precios del cliente con parámetros internos de reparto. Solo admin escribe. | Exponer únicamente los valores públicos que necesita cada pantalla, sin cambiar ningún importe. | Cotización, checkout y reparto. **Permisos delicados; autorización específica.** |
| Comentarios de Reels legibles con sesión | **Bajo** si son comentarios públicos; expone también identificadores de autores. | Mantener comentarios y nombre público, limitar campos innecesarios tras comprobar sus usos. | Comentarios y nombres; no modificar clientes. |
| Me gusta individuales legibles con sesión | **Medio** de privacidad: revela quién marcó cada vídeo y cuándo. | Conservar totales públicos y lectura del me gusta propio; impedir lectura de filas ajenas. | Me gusta y contador; no checkout ni pagos. Requiere cambio aprobado de permisos. |
| Zonas de entrega públicas | **Bajo**: contiene zonas, ZIP y disponibilidad, no direcciones de compradores. | Conservar lectura comercial; solo limitar datos internos si los hay. | Bloquearlo rompería cobertura/cotización. No cambiar por silenciar el aviso. |
| Días por zona públicos | **Bajo**: información necesaria para comprar. | Conservar. | Fechas de entrega si se bloquea. |
| Catálogo productos público | **Bajo**: los campos actuales son nombre, descripción, precio, categoría, foto y disponibilidad; no compradores. | Conservar lectura comercial. No cambiar precios, productos ni disponibilidad. | Catálogo de galletas si se bloquea. |
| Reels públicos | **Bajo** por ser contenido comercial; revisar si el identificador de autor es necesario. | Conservar vídeos públicos; no ocultar contenido válido por el aviso. | Portada y Reels. |
| Contraseñas filtradas | **Medio**; mismo aviso nº 22. | Una sola activación manual. | Registro/cambio de contraseña, no pagos. |

Comprobé las reglas actuales de esos dos depósitos: **no aparecen las antiguas reglas temporales de escritura libre de Reels**. No corregiré algo que ya no está presente. Tampoco daré por hecho que todos sus archivos son públicos sin comprobarlo.

## C. Aviso de Project monitoring (QA): reemplazo de producto por libra

**Riesgo alto operativo:** un pedido con sustitución por libra puede quedar atascado al tocar «Listo / cobrar» porque falta el peso real y ya no aparece dónde introducirlo. Además, la validación usa el producto original, lo que puede clasificar mal una sustitución entre unidad y libra. No ejecutaré este paso sobre un pedido real.

**Cambio propuesto:**

1. Usar la forma de venta del producto sustituto, no la del original.
2. Permitir introducir y corregir su peso real o cantidad real antes de darlo por listo.
3. Guardar esa información en el artículo del pedido y usarla de forma consistente al validar y calcular.
4. Mantener el bloqueo ante peso/cantidad inválidos. Si falta un dato obligatorio del producto, mostrar el problema; nunca usar un peso estimado para forzar el cobro ni modificar el catálogo sin permiso.
5. Conservar las reglas actuales de precio de sustitución, límite autorizado y prevención de doble cobro.

**Impacto:** preparación de tiendas, importe final a capturar y peso del pedido; puede repercutir en entrega y reparto si esos cálculos usan el peso. No necesita modificar fichas de usuarios/clientes. Sí guarda datos del artículo del pedido.

**Requiere tu autorización explícita para tocar este cálculo de cobro.** Aprobar solo la parte de seguridad no autoriza esta parte.

## D. Orden de trabajo propuesto y límites de aprobación

### Parte 1 — Bajo riesgo, sin tocar pagos ni fichas de clientes

- Conservar y documentar accesos comerciales y funciones correctamente restringidas.
- Pruebas pequeñas de aislamiento y rechazo, con datos ficticios en una base aislada, no con clientes reales.
- Entregar pasos para activar protección de contraseñas filtradas; no contratar un plan.
- Clasificar los dos depósitos de imágenes/vídeos antes de proponer cambios de lectura. No borrar ni mover archivos privados sin autorización.
- No ocultar avisos bloqueantes ni marcarlos corregidos si no hubo corrección comprobada. Si un aviso es intencional, explicarlo y pedir aprobación cuando corresponda.

### Parte 2 — Permisos que podrían romper pantallas

- Limitar lectura de me gusta ajenos y, solo si se justifica, campos públicos de comentarios.
- Separar reglas internas de precios/lotes y revisar la consulta de roles.
- Preparar el cambio exacto y las comprobaciones antes de aplicarlo. **Una aprobación general no autoriza cambios de configuración de pagos ni de fichas de clientes.**
- Cualquier cambio de permisos se autoriza sabiendo que afecta inmediatamente a producción. Guardar las reglas anteriores para poder restaurarlas sin borrar datos.

### Parte 3 — Cobros y saldo: autorización separada obligatoria

- Corregir el QA de sustituciones por libra únicamente si autorizas explícitamente los cambios de cálculo y guardado del artículo del pedido.
- Revisar saldo por entorno; no cambiar retiros, descuentos, márgenes o reparto bajo una aprobación de seguridad general.
- Probar unidad→unidad, libra→libra, unidad→libra y libra→unidad; peso faltante/inválido, dato de producto faltante, cantidad real y reintento.
- Comprobar importe esperado y límite de autorización mediante pruebas aisladas. Una prueba completa con Stripe solo en modo prueba y con autorización; nunca cobrar, reembolsar ni transferir dinero real.

## E. Activar protección de contraseñas filtradas

1. Abrir https://supabase.com/dashboard/project/oyvbxkluvkrljvewrgue.
2. Ir a **Authentication → Sign In / Providers → Email**; buscar **Leaked password protection** o **Password security**.
3. Activar y guardar. Supabase la ofrece en **Pro o superior**; si está bloqueada, te indicaré esa limitación sin cambiar tu plan.
4. Afecta contraseñas nuevas o cambiadas; no comprueba automáticamente las existentes.

## Resultado que entregaré tras las aprobaciones correspondientes

Lista de cambios realmente aplicados, pruebas realizadas, avisos intencionales y pendientes con su motivo. No prometeré «cero avisos» a costa de romper compras ni presentaré como verificadas pruebas con Stripe o acceso autenticado que no se hayan podido realizar.

**Ahora solo se presenta el plan. Nada se aplica ni publica.**