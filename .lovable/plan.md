# Continuación: bloques reservables de Hazorex

## Correcciones terminadas
- “Magia de canela y azúcar” añade **Canela y azúcar**, no Snicker, al carrito.
- Cookies & Cream, Nutella y el reel de pistacho con chocolate blanco quedan ocultos porque no tienen una coincidencia exacta de sabor en el catálogo. No se borraron registros.
- Más Vendidas usa los mismos productos y nombres de la tienda, ordenados por ventas reales o por un orden fijo si no hay ventas.
- Confianza y las traducciones ya no anuncian suscripciones comerciales; se conserva la baja de correos.
- El envío del carrito muestra la promesa de entrega una sola vez.
- Comprobaciones de portada, Confianza, carrito y compra local desde el reel de canela sin errores; 19 pruebas aisladas pasaron. No hubo cobros, publicaciones ni cambios en usuarios/clientes.

## Alcance de la aprobación
Continuar el modelo de bloques solicitado. Las reglas de cálculo están preparadas y probadas, pero **no están conectadas a los cobros actuales**. Mantener el modelo nuevo inactivo hasta completar sus controles y pruebas.

No publicar, borrar datos/tablas ni modificar usuarios o clientes. Conservar importes y comportamiento de pedidos históricos. No efectuar cobros ni transferencias reales durante las pruebas.

## 1. Cargo al cliente
Reemplazar los cargos anteriores del marketplace por **Entrega y servicio**, con todos los importes editables en administración:

| Peso | Cargo |
|---|---:|
| Hasta 15 lb | $12 |
| Más de 15–30 lb | $25 |
| Más de 30–45 lb | $35 |
| Más de 45–80 lb | $35 + $0.70 por libra sobre 45 |

- Más de 80 lb: pedir dividir la compra antes de pagar.
- Recalcular al preparar con peso real. Nunca cobrar por encima de lo autorizado sin nuevo consentimiento.
- Galletas separadas: precios fijos, mínimo $12 y sin cargo por peso. No cambiar su cobro actual.
- Ventanas de entrega lunes, miércoles y viernes en horario de Nueva York.

## 2. Puerta y propina
- Lobby/puerta del edificio por defecto.
- Apartamento opcional: ascensor $5; escaleras de más de dos pisos $8. Añadir 5/8 minutos a la parada.
- Mostrarlo al cliente como servicio Hazorex, separado de la propina; es ingreso de Hazorex y no se suma automáticamente al repartidor.
- En cada lote, el admin puede activar “Dar bono de puerta” y escribir el monto; empieza apagado. El repartidor solo ve el bono cuando el admin lo activa.
- Propina opcional, íntegra al repartidor. Aumentos posteriores requieren consentimiento y confirmación del cobro.

## 3. Bloques, horarios y vehículos
- Agrupar la noche anterior por zona solo pedidos efectivamente cobrados; identificar autorizaciones pendientes sin incluirlas como pagadas.
- Nunca crear un lote con uno o dos pedidos. Cada lote debe tener al menos tres; si sobran uno o dos en una zona, sugerir unirlos a la zona más cercana compatible o avisar al admin para decidir.
- Reservas de 1–4 horas y lotes abiertos opcionales. Un lote activo por persona, incluso con solicitudes simultáneas.
- Repartidor ve día/hora/zona/paradas/tamaño/marcas de pesado, frío y puerta/pago; nunca libras.
- Registrar presencia; admin asigna a persona presente y compatible. Tras 15 minutos sin asignación, asignar automáticamente un lote compatible o avisar si no existe.
- Estimar 5 paradas livianas/hora y 4 medianas/pesadas, incluyendo recogidas, trayectos y puerta; máximo 4 horas.
- Varios viajes dentro del mismo lote, ordenados por ventanas; Google Maps por parada.
- Límites por viaje: bici/e-bike 50 lb; bici de carga con vagón 200; moto 60; carro 400; van 1,000. Una parada indivisible no puede exceder la capacidad del vehículo.
- Añadir bici de carga y bolsa térmica a la postulación. Fríos requieren bolsa térmica; marcar productos individuales de más de 8 lb.

## 4. Pago fijo y financiación
- Admin fija el pago antes de publicar: sugerencia $40/4 paradas, ajustada al tiempo estimado.
- Bloquear base inferior a $23/h estimada, sin contar propinas ni bonos. Mantener este mínimo como política interna editable, no como afirmación de cumplimiento legal.
- Sin repartidor a 12 horas: mostrar aviso al admin. Nunca aumentar automáticamente. El admin decide con botones +$5, +$10 o un monto escrito; no reducir pagos ya aceptados.
- Pago fijo + bonos de puerta + propinas completas, sin descuentos por cancelaciones.

**Decisión incluida en esta aprobación:** si el pago fijo, aumentos o bonos exceden los cargos de entrega disponibles, Hazorex cubre la diferencia con fondos propios. No se toma dinero destinado a la tienda ni se sube el cargo al cliente automáticamente.

Por ejemplo, cuatro pedidos pequeños aportan $48 de entrega. Un bloque estimado de dos horas exige al menos $46 de base; un aumento manual de $10 eleva ese compromiso a $56, antes de bonos opcionales. La diferencia debe financiarla Hazorex.

- Mostrar compromiso, fondos de pedidos y diferencia antes de publicar/aprobar un bono.
- Mantener la parte financiada por pedidos vinculada a sus cobros originales. Registrar por separado cualquier aporte propio de Hazorex, con confirmación del dueño y protección contra duplicados.
- Si faltan fondos, mostrar pendiente y avisar; no presentar un pago como realizado ni descontar el compromiso del repartidor.
- Conservar separación prueba/real, reintentos y protección contra pagos dobles.

## 5. Bonos, prioridad y tiempo
- Bono semanal opcional $25, editable: mínimo 5 lotes, 95% puntualidad, 0 cancelaciones <12h, calificación real ≥4.7 y 0 reclamos confirmados. Admin revisa y aprueba.
- No inventar calificaciones ni descontar pago fijo o propinas. Cancelación tardía: pérdida de prioridad por 7 días, con causa y fecha de finalización.
- Registrar reserva, presencia, recogida, viajes, esperas y entregas. Exceso de más de 30 minutos: aviso y ajuste sugerido para revisión.
- Reporte semanal previsto frente a real, pagos, propinas, bonos y ajustes.
- Verificar normativa NYC vigente y su alcance antes de afirmar legalidad; la estimación no sustituye obligaciones sobre tiempo real.

## 6. Entrega y atención
- Mensajes de un toque, aviso de salida y ETA.
- Foto obligatoria y acceso limitado al cliente correspondiente; calificación real 1–5 por pedido entregado.
- Cliente ausente: contactar y esperar 5 minutos; lugar seguro y foto. Fríos/artículos de retorno vuelven y se avisa al admin.
- Reclamos con foto dentro de 24 horas; reembolso decidido y confirmado por el dueño.
- Actualizar Repartidores, Términos y Cómo funciona con cargos, lobby/puerta, viajes, pago fijo y criterios del bono, en español e inglés.

## Detalles técnicos y automatización
- Ampliar estructuras operativas y configuración versionada sin recalcular históricos; tablas nuevas con permisos explícitos y protección por cliente/repartidor/admin.
- Verificar asignación, dinero y cambios de estado en el servidor; pruebas concurrentes para reserva exclusiva.
- Agrupación nocturna, avisos y revisión de presencias mediante programación interna de PostgreSQL, sin cron externo ni secretos en llamadas programadas. Los aumentos de pago son exclusivamente manuales.
- Revisión cada minuto solo durante periodos con presencias pendientes; detenerla cuando no queden. Hasta 1,440 comprobaciones en un día completo de actividad; no mantenerla ejecutándose permanentemente sin necesidad.
- Avisos automáticos mediante eventos persistidos y entrega verificada. Si la conexión disponible no permite completarlos, informar el bloqueo antes de activar el modelo.
- Transferencias a tiendas y fondos destinados a ellas quedan protegidos. El aporte propio de Hazorex no reemplaza la vinculación de los pagos financiados por pedidos a sus cargos originales.

## Pruebas y entrega
- Pesos límite, 80 lb, puerta, vehículos/viajes/fríos, ventanas y mínimo horario.
- Reserva simultánea, presencia y 15 minutos, aumentos sin duplicados y tiempo real.
- Fotos/reclamos con acceso autorizado, bonos con registros reales y financiación insuficiente.
- Stripe simulado: reintentos, consentimiento, propinas posteriores, aportes propios, históricos y separación de ambientes; sin pagos reales.
- Revisar pantallas en vista previa. La prueba completa de cuentas requiere acceso autorizado; no crear ni elevar usuarios para fabricarla.
- Entregar lista breve de cambios, pruebas y pendientes. **Tú publicas personalmente.**