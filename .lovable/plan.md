# Precio justo de Food Bazaar — Supermercado Hazorex

## Cambios
- Aplicar los precios de los **93 productos** que enviaste, únicamente sobre sus registros existentes en Frutas y verduras; no crear productos ni duplicarlos.
- Usar tus precios revisados el **18/10/2026** como referencia. Los demás productos y categorías conservarán sus precios actuales.
- Aplicar venta por libra a todos los productos señalados con `/lb`, conservando el funcionamiento actual de «Precio estimado» y ajuste por peso real. Mantener los demás por unidad o presentación.
- Cambiar la sandía a **$1.29/lb**, con peso aproximado de **12 lb**; conservar los pesos de los demás productos.
- Añadir debajo del título de /supermercado: **«Precios de tienda Food Bazaar, sin sobreprecio»**, con equivalente en inglés.

## Sin sobreprecio
- La revisión del código no encontró un aumento automático del 5 %: el precio escrito por el administrador ya se guarda y se muestra sin recargo.
- Mantener ese comportamiento para todo el catálogo propio y añadir pruebas que comprueben precio por unidad sin aumento y precio por libra según peso.
- Identificar «Guineos/plátanos» con el registro existente «Guineos / plátanos» y «Fresas Driscoll's 16 oz» con «Fresas Driscoll's», comprobando su presentación antes de actualizar.

## Comprobaciones
- Comprobar coincidencias únicas antes de guardar; detener y comunicar cualquier producto faltante o ambiguo, sin inventar sustitutos.
- Actualizar precios y modalidades en las referencias del catálogo y comprobar cada valor solicitado con pruebas concretas.
- Leer de nuevo los productos guardados y verificar que los no incluidos conservaron sus datos.
- Revisar el texto, los precios y «Precio estimado» en celular y computadora, sin abrir pagos.
- Informar cuántos precios cambiaron realmente y qué productos no se encontraron.

## Límites
- **No tocar pagos, Stripe, propinas, cargos de entrega, pedidos históricos ni datos de usuarios/clientes. No publicar.**
- Conservar nombres, fotos, códigos de barras, descripciones y demás información de los productos.
- Los precios del catálogo compartido pueden verse en la web publicada al actualizarse, aunque no se publique el texto nuevo; no es una carga aislada solo para la vista previa.

## Detalle técnico
- Actualizar solo datos existentes del catálogo, por identificadores y con comprobación del valor previo; no requiere cambiar la estructura de la base de datos.
- Sincronizar las referencias de frutas y verduras, la página del supermercado y sus pruebas; el cambio supera tres archivos y espera tu aprobación.