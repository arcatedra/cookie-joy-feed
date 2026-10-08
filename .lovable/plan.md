# Destino de los retiros manuales

## Cambios
- En **Mi cuenta**, al solicitar un retiro, elegir **Zelle** o **Cash App** e indicar el destino.
- Aceptar correo o teléfono para Zelle; correo, teléfono o $cashtag para Cash App. Nunca pedir ni guardar números de cuenta bancaria.
- Mostrar el método y destino en **/admin/withdrawals**, junto al importe y estado. La persona también lo verá en su historial.
- Mantener el retiro manual: el administrador paga fuera de Hazorex y después registra una referencia no sensible. Marcar como pagado no envía dinero.

## Protección y comprobación
- Validar método, formato y longitud tanto en el formulario como al guardar. Rechazar texto libre y valores que no sean destinos permitidos.
- Guardar el destino asociado a cada solicitud, visible únicamente para su dueño y administradores autorizados, nunca en registros públicos.
- Mantener el apartado del saldo y la protección frente a solicitudes duplicadas, sin cambiar cobros ni transferencias.
- Conservar solicitudes anteriores sin inventar destinos. Comprobar validaciones y permisos sin pagar dinero real.
- No modificar usuarios ni clientes. No publicar.

## Detalles técnicos
- Ampliar las solicitudes de retiro y su operación atómica mediante una migración, conservando los permisos privados existentes.
- Actualizar el formulario de Mi cuenta, la función autenticada de solicitud y la consulta/vista del administrador; añadir pruebas de validación.

La aprobación de este plan autoriza estos cambios y la migración necesaria. Las pruebas completas con una cuenta siguen requiriendo una sesión autorizada.