## Objetivo

Dejar el Sorteo Diario en cumplimiento legal mínimo para EE.UU. sin apagarlo. Foco: AMOE real con igual peso, disclaimers visibles, tope de premio, exclusiones, y guardado real de la dirección postal del sponsor.

No se toca la aleatoriedad (Random.org queda para otra fase). No se cambia el flujo de ganador ni la regla core "no admin winner override".

## Cambios

### 1. Dirección postal del sponsor (habilita AMOE real)

Actualmente `sweepstakes_config.sponsor_address` está vacío/placeholder, por lo que `/sweepstakes-rules` muestra el aviso "pre-launch". Cuando confirmes el plan te pediré la dirección exacta en un mensaje aparte (no la incluyas en el chat todavía si es privada — la guardaré con el tool de datos, no en el repo).

Guardar en `sweepstakes_config` vía tool de datos:
- `sponsor_address` = dirección real (calle, ciudad, estado, ZIP)
- `sponsor_name` = "HAZOREX LLC" (confirmar)
- `sponsor_email` = "soporte@hazorex.com" (confirmar)

Esto automáticamente:
- Quita el banner "PRE-LAUNCH" de `/sweepstakes-rules`.
- Muestra la dirección real en las reglas oficiales.
- Habilita legalmente la vía de entrada gratuita por correo.

### 2. AMOE (Alternative Method of Entry) real y con igual peso

Tabla `amoe_entries` ya existe. Falta:

- **Endpoint admin** `/admin/sweepstakes/amoe` (nueva ruta bajo `_authenticated/`) donde un admin registra manualmente las entradas por correo recibidas ese día (nombre, dirección, fecha de matasellos, día del sorteo).
- **Peso igual**: al ejecutar el sorteo diario (`run-daily-draw`), incluir las filas de `amoe_entries` del día como participantes con el mismo peso que un ticket comprado. Auditar en la fila `daily_draws` cuántas entradas fueron AMOE vs pagadas.
- **Instrucciones claras** en `/sweepstakes-rules` (ya están en la sección s4Mail) — verificar que muestren la dirección real después del cambio 1.

### 3. Disclaimer "NO PURCHASE NECESSARY" visible

- Añadir banner permanente en `/ruleta` (encima del panel de compra de estrellas) con texto localizado:
  > "NO SE REQUIERE COMPRA. Nulo donde esté prohibido. Ver [reglas oficiales](/sweepstakes-rules)."
- Añadir el mismo disclaimer corto en el modal/panel de "Comprar Estrellas" antes del botón de pago.
- Añadir en el footer del sitio un enlace permanente a `/sweepstakes-rules`.

### 4. Tope de premio diario visible y aplicado

- `sweepstakes_config.max_daily_prize_usd` ya está en $4999 (bajo el umbral federal de $5000 que dispara registros/bond).
- Verificar que `run-daily-draw` respete el tope: si el pozo del día supera $4999, el exceso rueda al día siguiente (no se paga más de $4999 en un mismo sorteo).
- Mostrar el tope en `/ruleta` cerca del contador de pozo: "Premio máximo diario: $4,999".

### 5. Exclusiones geográficas y edad (ya implementado, solo verificar)

- FL y RI excluidos ✔
- 18+ verificado una sola vez vía `user_eligibility` ✔
- Verificar que `/sweepstakes-rules` refleja "FL, RI" (ya OK tras última corrección).

### 6. Registro público de ganadores

- `/sweepstakes-rules` sección s9 ya menciona lista de ganadores. Verificar/crear ruta pública `/sorteo/ganadores` con la lista de ganadores anteriores (fecha, nombre parcial estilo "Juan P., NY", premio). Datos vienen de `winner_claims` con estado publicable.

## Fuera de alcance (fases siguientes)

- Random.org / aleatoriedad verificable de tercero.
- Bond/registro en estados con umbrales altos.
- W-9 / 1099 automatizado para ganadores >$600.
- Revisión por abogado.

## Verificación

- `/sweepstakes-rules` sin banner amarillo "pre-launch", con dirección real.
- `/ruleta` muestra disclaimer NO PURCHASE NECESSARY y tope $4,999.
- Admin puede añadir una entrada AMOE de prueba y aparece con peso 1 en el próximo sorteo.
- Footer tiene link a reglas oficiales.
- `/sorteo/ganadores` lista al menos los ganadores existentes.

## Lo que necesito de ti después de aprobar

1. Dirección postal real del sponsor (calle, ciudad, estado, ZIP).
2. Confirmar `sponsor_name` = "HAZOREX LLC" y `sponsor_email` = "soporte@hazorex.com" o darme los correctos.
