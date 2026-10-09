# Preparar Hazorex para publicar: nueve cambios

## Límites
- No publicar ni hacer cobros o transferencias reales durante las pruebas.
- No borrar tablas, pedidos, saldos ni ningún dato existente. No modificar usuarios ni clientes.
- Las nuevas tarifas se aplicarán a pedidos nuevos; no se recalcularán pedidos ni pagos históricos.
- Mantener separados prueba y real, la protección de referidos y las transferencias sin duplicados.

## Cambios

### 1. Contacto
- Sustituir todos los correos de contacto @hazorex.com por **hazorex0@gmail.com** en páginas, textos legales, traducciones y contenido de correos.
- Mostrar **(347) 744-1806** con enlace para llamar en Soporte y pie; quitar los avisos de contacto en preparación.
- Usar Gmail como dirección de respuesta cuando el servicio de correo lo permita. No cambiar el remitente técnico a Gmail sin un servicio autorizado: podría impedir la entrega. Informar cualquier limitación pendiente.

### 2. Catálogo honesto y nombres consistentes
- Quitar estrellas, porcentajes, conteos, filtros y textos basados en reseñas inventadas de todas las páginas.
- No mostrar calificaciones hasta contar con reseñas reales vinculadas a clientes compradores; si esa verificación no existe, dejarlas ocultas.
- Unificar nombres en español, identificadores y precios desde **productos**, sin renombrar ni escribir filas existentes. Adaptar Tienda, Más Vendidas, Crea tu Pack, Reels, Explorar y búsqueda.
- Corregir enlaces de Reels a productos existentes; si no hay correspondencia comprobable, no ofrecer una compra de un producto inexistente.
- Más Vendidas: ordenar por unidades de pedidos efectivamente cobrados, excluyendo prueba y cancelaciones; si no hay ventas, usar orden fijo sin puestos numerados. Publicar solo agregados, nunca datos de clientes.

### 3. Galletas: mínimo y cobro exacto
- Exigir **$12 de subtotal de productos**, antes de propina y descuento de saldo; no significa 12 galletas.
- Desactivar Pagar por debajo del mínimo y mostrar **“Pedido mínimo $12 — te faltan $X”**.
- Repetir la validación en el servidor con precios comprobados, antes de crear el pedido o iniciar Stripe.
- Quitar Exprés $4.99, sustituciones, diferencia de peso y textos de reserva. Mantener únicamente entrega programada lunes, miércoles y viernes.
- Cobrar automáticamente el total exacto, sin margen adicional ni cargo por peso. Adaptar confirmación, avisos y preparación para que no intenten cobrar de nuevo.
- Mantener propina opcional, saldo de referidos y carrito hasta confirmar pago exitoso; fallo o cancelación conserva el carrito.
- El marketplace mantiene su reserva y ajuste de monto real.

### 4. Tiendas visibles solo cuando haya oferta
- Comprobar que exista al menos una tienda aprobada y activa con productos publicados disponibles.
- Mientras no exista, ocultar sus enlaces en portada, menú, navegación de celular y pie. Mostrar automáticamente al aparecer la primera.
- Dejar un único enlace Tiendas por menú, sin duplicado en la barra.

### 5. Retirar suscripciones
- Eliminar páginas, botones, planes, secciones, correos y funciones de suscripciones, incluidos los módulos de compatibilidad y sus usos.
- Sustituir el FAQ de cancelación por **“¿Cuál es el pedido mínimo?” — $12** y limpiar Soporte, Confianza, perfil, admin y traducciones.
- Conservar tablas, datos y archivos históricos de migraciones. No confundir suscripciones comerciales con la baja de notificaciones por correo.
- Los avisos antiguos de suscripciones que todavía lleguen de Stripe se verificarán y responderán correctamente, sin consultar ni guardar suscripciones; evitar reintentos de errores antiguos.

### 6. Repartidor: pago por parada y lotes

| Peso de pedido | Base por parada |
|---|---:|
| Hasta 15 lb, inclusive | $5.00 |
| Más de 15 hasta 30 lb, inclusive | $5.50 |
| Más de 30 hasta 45 lb, inclusive | $6.00 |
| Más de 45 lb | $6.00 + extra |
| Galletas | $5.00 |

- Sobre 45 lb: cliente **$0.70 por libra extra**; repartidor **$0.25 por libra extra**, máximo **$5 extra por pedido**. El resto del cargo de peso queda para Hazorex.
- Propinas: **100% para el repartidor**.
- No cambiar los demás cargos del cliente ni el 100% de productos que recibe la tienda.
- Aplicar la misma fórmula al cálculo, registro y transferencia, tanto en marketplace como en galletas, y al admin. Guardar las condiciones de los pedidos nuevos sin reescribir datos históricos.
- Límites verificados también en el servidor: bici/e-bike/moto **3 pedidos**, auto **6**, van **10**. No permitir sobrepasarlos mediante solicitudes directas o simultáneas.
- Mostrar al repartidor el total del lote sin desglose monetario interno; conservar destinos, pedidos y estados necesarios para entregar.
- Reemplazar el ejemplo público por el texto solicitado: lote de cuatro pedidos **$21.50 más propinas**, extra sobre 45 lb y ninguna promesa de ingreso por hora.

### 7. Identificación y datos sensibles
- Poner exactamente el nuevo texto de preparación de /repartidores, diferenciando Checkr para antecedentes y Stripe para cobros.
- Revisar todos los formularios y sus validaciones: ninguno debe pedir ni guardar SSN, ITIN o número de cuenta bancaria. Conservar datos históricos sin mostrarlos ni volver a solicitarlos.

### 8. Sesión y error de textos de React
- Pie: Iniciar sesión sin sesión; Cerrar sesión con sesión y acción funcional.
- Corregir la diferencia de idioma inicial entre servidor y navegador: el código actual aplica el idioma guardado antes de terminar la carga inicial.
- Revisar también fechas, números, carrito y sesión para evitar diferencias de texto; comprobar la consola sin esconder el error.

### 9. Avisos de Project monitoring
- La consulta actual devuelve **cinco avisos**, no solo dos. Revisar todos contra el código y marcar los antiguos solo tras comprobar que ya no se reproducen.
- Los dos errores de suscripciones se atenderán retirando esa funcionalidad, nunca creando clientes ni restaurando planes.
- Revisar saldo histórico oculto y pedidos antiguos sin ambiente Stripe, preservando los registros. No asumir que un saldo desconocido es real ni elegir el ambiente de un pedido por el dominio actual; verificar procedencia o informar el bloqueo.
- Revisar el aviso de ganadores sin introducir herramientas para elegir o modificar ganadores. Si necesita cambios de permisos o funciones de base de datos, incluirlos con autorización y sin alterar filas.

## Detalles técnicos
- Centralizar contacto, catálogo compartido y reglas monetarias; sustituir los usos dispersos y documentar las reglas de estructura.
- Consultas públicas limitadas a datos comerciales y agregados seguros; lecturas privadas autenticadas y permisos existentes preservados.
- Ajustar funciones o añadir estructura solo cuando sea necesario para totales por lote, restricciones, ventas agregadas y creación de pagos de galletas. Cualquier migración será no destructiva, sin actualizaciones masivas de datos existentes, con permisos explícitos y protección de acceso.
- No editar tipos generados ni archivos históricos de migraciones. Eliminar archivos de aplicación de suscripciones solo después de reemplazar todos sus importadores.

## Pruebas y entrega
- Pruebas automáticas: subtotal $11.99/$12, precios manipulados, cobro exacto, propina y saldo; marketplace conserva reserva; no doble cobro ni transferencia duplicada.
- Peso: 15/30/45 lb y sus valores inmediatamente superiores, extra de 46 lb y tope de $5. Ejemplo de lote = $21.50 sin propinas. Galletas = $5 por parada.
- Vehículos: máximos 3/6/10, intento de exceder y concurrencia.
- Comprobar catálogo, ausencia de reseñas falsas, enlaces Tiendas con y sin oferta, contacto y ausencia de suscripciones.
- Revisar pantallas públicas en computadora y celular, consola y errores de carga; pruebas de lógica financiera aisladas, nunca sobre cobros reales.
- Las pruebas completas de paneles y pago con sesión autorizada quedan condicionadas al acceso permitido por el Supabase externo. No inventar un resultado si ese acceso no está disponible.
- Entregar lista corta de cambios y cualquier limitación. **La publicación la haces tú.**