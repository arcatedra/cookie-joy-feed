# Correcciones de portada y bloques reservables de Hazorex

## Orden y límites
Primero completar y comprobar las cuatro correcciones pequeñas; después implementar los bloques reservables. Este plan requiere tu aprobación porque las correcciones abarcan más de tres archivos y los bloques cambian pagos y añaden información operativa.

- No publicar, borrar tablas ni borrar datos existentes.
- No modificar ni borrar usuarios o clientes.
- No efectuar cobros ni transferencias reales durante las pruebas.
- Conservar pedidos históricos y sus importes; aplicar el nuevo modelo solo a pedidos nuevos después de su activación.
- Mantener separados los ambientes de prueba y real, y conservar las protecciones contra cobros y transferencias duplicados.

## 1. Correcciones pequeñas, antes de los bloques
- **Reels:** corregir la asociación de “Magia de canela y azúcar” a “Canela y azúcar”. Ocultar Cookies & Cream y cualquier reel cuyo sabor no corresponda a un producto disponible. Revisar también las asociaciones de Nutella y chocolate doble: no sustituirlas arbitrariamente por triple chocolate. Ocultar significa dejar de mostrarlos, no borrar registros. Aplicar el mismo filtro al carrusel y a su vista ampliada.
- **Más Vendidas de portada:** usar productos del catálogo común, con sus nombres e imágenes reales. Ordenar por las ventas reales ya disponibles; si no hay ventas, usar un orden fijo. No mostrar Clásica, Red Velvet ni otros sabores inventados.
- **Confianza y textos:** dejar “confirmaciones de pedido y cambios en la cuenta”; revisar los textos visibles y títulos del sitio, en español e inglés y las otras traducciones disponibles, para retirar suscripciones comerciales. Conservar los enlaces de baja de correos, nombrados “darte de baja de los correos”. No alterar las notificaciones ni sus controles.
- **Carrito de galletas:** quitar únicamente la repetición del texto de entrega. No cambiar el cobro, la propina ni la validación del mínimo.
- Comprobar portada, reels ampliados, Confianza, Soporte y carrito en la vista previa; probar que los productos inexistentes se ocultan y los nombres coinciden con la tienda.

## 2. Cargo único del marketplace
Reemplazar envío, servicio del 18% y cargo anterior por peso por **Entrega y servicio**, editable en administración:

| Peso del pedido | Cargo inicial |
|---|---:|
| Hasta 15 lb | $12 |
| Más de 15 y hasta 30 lb | $25 |
| Más de 30 y hasta 45 lb | $35 |
| Más de 45 y hasta 80 lb | $35 + $0.70 por libra adicional sobre 45 |

- Bloquear pedidos superiores a 80 lb y pedir dividirlos; mostrar el aviso antes de pagar.
- Recalcular con el peso real al preparar, sin saltarse la autorización disponible. Si hace falta cobrar más de lo autorizado, solicitar una nueva autorización, nunca un cargo sorpresa.
- Las galletas mantienen su carrito separado, precios fijos, mínimo $12, cobro exacto y ningún cargo por peso.
- Incorporar ventanas de entrega lunes, miércoles y viernes; usar horario de Nueva York, incluidos cambios de horario estacional.

## 3. Lobby y entrega opcional al apartamento
- Entrega por defecto en puerta del edificio o lobby, visible al pedir y en Términos.
- Servicio opcional: $5 con ascensor; $8 por escaleras de más de dos pisos, elegido por el cliente. Importes editables.
- Presentarlo como servicio de Hazorex, nunca como propina ni cargo destinado al repartidor en la pantalla del cliente.
- Internamente sumar el importe completo como bono de puerta del lote y mostrarlo al repartidor antes de aceptar; añadir 5 u 8 minutos a esa parada.
- La propina permanece independiente, opcional y 100% para el repartidor.

## 4. Lotes, reservas y asignación
- Agrupar pedidos pagados por zona la noche anterior a cada día de entrega. Los pedidos solo autorizados no cuentan como pagados; mostrar en administración los que no estén listos para entrar al lote.
- Separar **reserva de horario** de **lote asignado**, con duración de 1 a 4 horas; nunca más de 4.
- Capacidad orientativa: 5 pedidos livianos por hora y 4 medianos o pesados. Mezclar cargas, considerar traslados, recogida, ventanas y bonos de puerta; no asignar todos los pesados a la misma persona si existen alternativas compatibles.
- Marcar productos individuales de más de 8 lb y productos fríos. El encargado podrá indicar también artículos que requieren retorno seguro si el cliente está ausente.
- Pantalla del repartidor: día, hora, zona, paradas, tamaño, artículos pesados, fríos, entregas al apartamento y pago; **sin libras**. Pesos visibles solo en administración.
- Registro de presencia en recogida; botón administrativo “Asignar lote” con repartidores presentes y vehículos. Si no recibe asignación en 15 minutos, asignar automáticamente un lote compatible. Si no hay uno, avisar en lugar de asignar algo incompatible.
- Lotes abiertos activables por administración. Reservas y asignaciones exclusivas: un lote, una persona, incluso si dos personas lo solicitan a la vez.
- Permitir varios viajes, conservando un único lote. Ordenar paradas respetando ventanas, estimar el recorrido y ofrecer Google Maps por parada.

## 5. Vehículos y conservación
Añadir bici de carga y declaración de bolsa térmica en la postulación. Límites editables por viaje: bici/e-bike 50 lb, bici de carga con vagón 200 lb, moto 60 lb, carro 400 lb, van 1,000 lb.

La compatibilidad comprobará cada viaje, no solo el peso total del lote: varios viajes pueden permitir un lote mayor, pero una parada indivisible que supere el límite no se asignará a ese vehículo. Los productos fríos requieren bolsa térmica.

## 6. Pago fijo, protección mínima y aumentos
- Sugerir $40 por 4 paradas, aproximadamente $10 por parada. El dueño cambia el precio de cada lote antes de publicarlo.
- Mostrar en administración paradas, peso, zona, tiempo estimado, viajes y bonos de puerta. Repartidor: precio fijo + bonos de puerta + 100% de propinas.
- Bloquear publicación si **el precio base, sin propinas ni bonos**, es inferior a $23 por hora estimada. Así los bonos no se usan para reducir la protección solicitada.
- Conservar $23 como mínimo interno editable; comprobar la normativa vigente de NYC y su alcance antes de afirmar cumplimiento legal. Registrar fecha de revisión de la tarifa legal y avisar para revisar cada 1 de abril. El cálculo estimado no sustituye las obligaciones sobre tiempo real.
- Lote sin repartidor: +$5 a 12 horas y otros +$5 a 4 horas antes, con avisos y sin repetir aumentos. No reducir un precio ya aceptado.
- Registrar y liquidar pagos con controles de autorización y duplicados; sustituir el modelo anterior por parada solo para el nuevo modelo.

## 7. Bono semanal y prioridad
- Bono opcional inicialmente $25; todos los importes, umbrales y plazos editables en administración y publicados en /repartidores.
- Requisitos: 5 lotes completados, 95% de puntualidad, cero cancelaciones con menos de 12 horas, promedio real de 4.7 y cero reclamos confirmados.
- Calcular candidatos con registros reales y aprobar cada bono antes de pagarlo. Sin calificaciones suficientes, no inventar un promedio para concederlo.
- Nunca descontar del pago fijo o las propinas. Cancelación tardía: perder prioridad durante 7 días; registrar la causa y fin del periodo.
- Dar prioridad por calificaciones reales con criterios claros; no usar reseñas falsas.

## 8. Comunicación, entrega y reclamos
- Mensajes de un toque: “Voy en camino”, “Llego en 5 minutos”, “Estoy en el lobby”, “Ya subo con tu pedido”, “Te lo dejé en la puerta”.
- Aviso de salida hacia cada dirección con hora estimada; foto obligatoria al entregar y acceso del cliente a su propia foto.
- Tras la entrega: “¡Tu pedido llegó! ¿Quieres agregar o subir la propina?”. El incremento requerirá consentimiento y confirmación de su cobro; no duplicar la propina original.
- Calificación real de 1 a 5 vinculada al pedido entregado.
- Ausencia: contactar desde la app, registrar espera de 5 minutos y dejar en lugar seguro con foto. Para fríos o artículos marcados de retorno, regresar y avisar al administrador.
- Reclamos de rotos o faltantes con foto dentro de 24 horas; el dueño revisa y decide cualquier reembolso desde administración, con confirmación antes de ejecutarlo.

## 9. Tiempo y textos
- Guardar reserva, presencia, recogida, inicio de viaje, espera y cada entrega.
- Si el tiempo real supera al previsto más de 30 minutos, avisar y sugerir ajuste para revisión del dueño, sin alterar pagos automáticamente. No presentar el rechazo discrecional como exención de obligaciones legales.
- Reporte semanal de tiempo previsto frente a real, importes, propinas, bonos y ajustes.
- Actualizar /repartidores, Términos y Cómo funciona con pago fijo, viajes múltiples, criterios del bono, cargos nuevos, máximo 80 lb, lobby y apartamento opcional. Sin promesas de salario por hora.

## Detalles técnicos y automatización
- Ampliar la estructura operativa con configuración versionada, bloques, reservas, viajes, paradas, presencia, eventos de tiempo, bonos y reclamos; reutilizar lo existente donde sea compatible. No migrar importes históricos al nuevo cálculo.
- Nuevas tablas con permisos explícitos y protección por propietario/repartidor asignado/administrador; validar importes, estado y asignaciones en el servidor.
- Agrupación nocturna y vencimientos son tareas temporales completas dentro de PostgreSQL; verificar primero que la programación disponible permite ejecutarlas. No crear Supabase Edge Functions ni llamadas programadas HTTP con secretos incrustados.
- Para la asignación tras 15 minutos, programar comprobaciones solo mientras haya presencias pendientes y detenerlas al vaciarse. Proponer frecuencia de un minuto durante esos periodos: puede realizar hasta 1,440 comprobaciones en un día completo y consumir recursos aun sin cambios; explicarlo antes de activarlo. Reservar los aumentos para sus plazos de 12/4 horas, con protección frente a ejecuciones repetidas.
- Avisos externos por cambios registrados mediante un mecanismo verificado; si la conexión disponible no permite los avisos automáticos, señalar el bloqueo y no fingir que una pantalla abierta equivale a automatización nocturna.
- No activar el nuevo modelo hasta tener todas las comprobaciones esenciales; el dueño publica personalmente.

## Pruebas y entrega
- Pruebas aisladas de pesos límite, cargos, 80 lb, bonos, mínimo por hora, viajes, fríos, ventanas, reserva concurrente, 15 minutos, aumentos únicos, tiempo real y autorización de fotos/reclamos.
- Simular Stripe para cobros, propinas posteriores, ajustes y pagos; verificar que no se duplican ni cruzan ambientes.
- Revisar las pantallas en vista previa. La prueba completa con cuentas requiere sesiones autorizadas; con el Supabase externo actual no inventar acceso ni modificar usuarios para conseguirlo.
- Entregar lista corta de correcciones, pruebas realizadas y bloqueos. No publicar.