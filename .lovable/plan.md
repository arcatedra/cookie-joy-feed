# Página de destino para referidos

## Objetivo
Convertir `/join/:code` de una redirección inmediata en una página bilingüe para el amigo invitado, con inglés como idioma inicial y el código de referido conservado durante todo el registro.

## Cambios
- Crear una pantalla móvil y adaptable con identidad visual de HAZOREX, contenido principal, subtítulo y los tres pasos indicados.
- Añadir en la esquina superior derecha un selector minimalista de texto `EN / ES`; esta página siempre iniciará en inglés, independientemente del idioma guardado para el resto del sitio.
- Mostrar las versiones exactas en inglés y español al alternar el selector, incluyendo títulos, explicación y estados del botón.
- Reemplazar la redirección automática actual por un CTA principal para que el amigo continúe al registro del club.
- Mantener el código recibido en la URL, guardarlo en la cookie de referido de 90 días y pasarlo al registro; nunca se sustituirá por otro código.
- Si el código falta o no es válido, mostrar una salida segura hacia el registro normal sin atribuir el referido.
- Añadir metadatos propios en inglés para esta página pública.

## Comportamiento del CTA
- El visitante que escanea es el amigo invitado, así que el CTA continuará al registro con el código ya aplicado.
- La acción de copiar o compartir el código personal seguirá disponible para el usuario que invita desde su perfil, donde el sistema ya obtiene su código autenticado.
- El botón principal tendrá texto contextual de registro en vez de generar un código nuevo para el visitante, evitando atribuciones incorrectas.

## Verificación
- Probar `/join/CODIGO` sin sesión en móvil: abre en inglés, alterna a español y conserva el código al entrar al registro.
- Confirmar que la cookie mantiene el código por 90 días y que el registro recibe el mismo referido.
- Revisar que el diseño no se desborde en teléfono y escritorio, y que la página tenga un solo título principal accesible.

## Detalles técnicos
- La página gestionará EN/ES localmente para no cambiar el idioma global guardado del usuario.
- Se conservará el flujo existente de atribución mediante `hazorex_ref` y el parámetro `ref` de la pantalla de acceso.
