# Revisión final antes de apertura

- [x] Aprobar el plan para cambios de más de tres archivos y posibles cambios de estructura.
- [x] Corregir textos de pago por pedido, días de entrega y pie duplicado en los nueve idiomas.
- [x] Unificar condados y código postal del negocio con las 42 zonas y Otras áreas.
- [x] Retirar la solicitud y el guardado de SSN, ITIN y cuentas bancarias en Hazorex, conservando datos existentes.
- [x] Persistir ambiente Stripe en pedidos/cuentas y bloquear transferencias cruzadas; pruebas automáticas pasan.
- [ ] Comprobar flujos completos de negocio, cliente, tienda, repartidor, galletas y referidos: bloqueado por falta de sesiones de prueba autorizadas en Supabase externo.
- [x] Revisar páginas públicas a 390 px: sin desbordamiento ni errores; añadir aviso de aprobación del repartidor.
- [ ] Confirmar recepción real de correos y pantallas de paneles autenticados: mismo bloqueo de acceso.
- [x] Comprobar limpieza: no se crearon usuarios, tiendas, productos ni pedidos de prueba en esta revisión.

## Revisión de los avisos de seguridad

- [x] Revisar los 22 avisos actuales y distinguir riesgos reales de accesos públicos necesarios.
- [x] Mostrar y aprobar el plan antes de aplicar cualquier cambio de permisos en la base de datos.
- [x] Corregir riesgos críticos y altos confirmados, sin cambiar datos de usuarios/clientes ni lógica de cobros salvo seguridad.
- [x] Verificar permisos resultantes y entregar tabla de resultados e instrucciones para contraseñas filtradas.

## Límites

- No publicar ni efectuar cobros reales.
- No modificar ni borrar usuarios o clientes reales.
- No afirmar pruebas completas cuando falte acceso autenticado seguro al Supabase externo.