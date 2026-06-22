
## Contexto legal (importante leer)

Me pides "cuidarte las espaldas" en lo legal y a la vez **permitir todos los estados de EE.UU.** sin la dirección real del Sponsor. Eso choca con la ley federal y estatal de sweepstakes. Si lanzamos así, el riesgo no es teórico — es una multa real o cierre del sorteo. Te explico y te propongo un plan que **te deja generar dinero ya** sin exposición legal grave.

### Lo que NO se puede ignorar

1. **Dirección postal del Sponsor en las Reglas Oficiales** — federal (FTC) + cada estado. Sin una dirección real, las reglas son inválidas. Ya está bloqueado el cron diario, pero el usuario puede seguir comprando estrellas y participando, lo cual **acumula obligación de pagar premios sin reglas válidas**. Esto se cierra a continuación.

2. **Florida, Nueva York, Rhode Island** — exigen **registro previo + bond (fianza)** si el premio supera ciertos umbrales (FL/NY: $5,000 ARV agregado; RI: $500 en sweepstakes minorista). Si los dejamos participar sin registrarte, en cuanto un ganador de esos estados reclame y descubra que no estás registrado, puede denunciarte al fiscal general estatal. **No podemos abrir esos 3 estados hasta que registres y pagues bond ahí.** Mantengo la exclusión y te lo explico en pantalla con un toggle de admin para cuando estés listo.

3. **Tope de premio mientras no haya registro** — voy a poner un **cap de seguridad de $4,999** en el pozo diario. Por debajo de $5,000 ARV en CA/FL/NY/RI los requisitos de registro/bond no aplican (CA exige registro si publicidad mencionara "no purchase necessary" + ARV $5,000+). Es la línea segura para operar sin licencias estatales hasta que crezcas.

### Lo que sí podemos lanzar hoy (sin riesgo)

- Venta de Estrellas en **todos los 50 estados** (es un producto digital, no sorteo).
- Ruleta de cupones (descuentos): **no es sweepstakes** — es promoción de descuento, no hay pago por chance de premio en dinero.
- AMOE (entrada gratuita) sigue funcionando.
- Reglas oficiales válidas bilingües.

Lo que se **bloquea hasta tener dirección**: el sorteo diario en dinero.

---

## Plan de implementación

### 1. Modo "Pre-launch" del sorteo diario (cuando falta dirección Sponsor)

- En `LiveDrawSection`, si `sweepstakes_config.address_valid === false`, en vez de mostrar el contador, mostrar un banner: *"🚧 Sorteo diario en preparación. La ruleta de cupones y la compra de Estrellas siguen activas. Pronto anunciaremos el primer sorteo."*
- Ocultar `entryPanel` y `countdown`.
- La compra de estrellas y la ruleta de cupones siguen funcionando — sigues generando ingresos.
- Cuando guardes la dirección en `/admin/sweepstakes`, el banner desaparece automáticamente y el sorteo arranca.

### 2. Cap de seguridad de premio ($4,999) configurable

- Migración: añadir columna `max_daily_prize_usd NUMERIC(12,2) NOT NULL DEFAULT 4999.00` a `sweepstakes_config`.
- Modificar `run_daily_draw()`: si `live_pool > cfg.max_daily_prize_usd`, premiar `max_daily_prize_usd` y el excedente queda en `prize_pool_ledger` como "carry" para próximos días (rollover técnico hacia el siguiente draw).
- En `/admin/sweepstakes` mostrar el cap, advertencia: *"Si subes este cap a $5,000+ debes registrarte en CA/FL/NY/RI antes."*

### 3. Reglas Oficiales bilingües (ES + EN)

- Reescribir `src/routes/sweepstakes-rules.tsx`:
  - Cargar `sponsor_name`, `sponsor_address`, `sponsor_email` dinámicamente desde `sweepstakes_config` (server function pública `getSweepstakesPublicConfig` que solo expone esos 3 campos).
  - Mostrar dos columnas (o secciones apiladas en mobile): **Español** primero, **English Official Rules** debajo.
  - Si la dirección aún no está válida, mostrar un aviso visible: *"Reglas en finalización. El sorteo no está activo todavía."* y deshabilitar entradas.
- Igual para `/terms` traducir secciones críticas (Estrellas, AMOE, premios).

### 4. Mantener exclusión FL/NY/RI con UI admin para cambiarla

- Ya están excluidos en `submit_amoe_entry`. Añadir el mismo bloqueo en `enter_daily_draw` con base en `user_state` (lo tomamos del perfil al inscribirse — si no lo tenemos, pedirlo en el formulario de inscripción con un select de 50 estados).
- En `/admin/sweepstakes` mostrar lista de estados excluidos editable, con warning: *"Quitar un estado de aquí requiere registro previo en ese estado. Consulta a un abogado de sweepstakes antes."*
- **Compra de Estrellas no se restringe geográficamente** — es producto digital, no participación en sorteo.

### 5. Bloqueo end-to-end mientras no haya dirección

- `enter_daily_draw` y `submit_amoe_entry` añaden la misma validación que ya tiene `run_daily_draw`: si `sponsor_address` es placeholder, lanzan `SPONSOR_ADDRESS_NOT_CONFIGURED`. Esto garantiza que **nadie inscribe boletos al sorteo de dinero sin reglas válidas**.
- UI traduce el error a: *"Sorteo en preparación. Inténtalo más tarde."*

### 6. Banner público de "pre-launch"

- En `/ruleta`, arriba del todo, una franja sutil cuando `address_valid === false`: *"El sorteo diario en USD se activará pronto. Mientras tanto, gana cupones con la Ruleta y acumula Estrellas."*

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `supabase/migrations/<new>.sql` | Cap `max_daily_prize_usd`; añadir guards de sponsor a `enter_daily_draw` y `submit_amoe_entry`; ajustar `run_daily_draw` para honrar el cap y hacer rollover del excedente |
| `src/lib/sweepstakes-config.functions.ts` | Nueva fn pública `getSweepstakesPublicConfig` (solo nombre, dirección, email, address_valid); admin: incluir `max_daily_prize_usd`, `excluded_states` en getter/updater |
| `src/routes/admin.sweepstakes.tsx` | Form para cap y lista editable de estados excluidos con warnings |
| `src/routes/sweepstakes-rules.tsx` | Reglas bilingües ES/EN, datos del Sponsor dinámicos, banner si no configurado |
| `src/routes/terms.tsx` | Versión bilingüe |
| `src/components/LiveDrawSection.tsx` | Modo pre-launch cuando `address_valid === false` |
| `src/routes/ruleta.tsx` | Banner pre-launch y verificación visual |
| `src/lib/daily-draw.functions.ts` | Devolver `addressValid` desde `getTodayDraw` |

## Lo que NO toco
- Auth, checkout de Stripe, missions, ruleta de cupones — siguen como están.
- Flujo de claim del ganador — ya cubre KYC + W-9.

---

## Confirmación rápida antes de codear

Voy a **mantener excluidos FL/NY/RI por defecto** (con toggle admin para cuando te registres) y **poner cap de $4,999**. Si insistes en abrir esos 3 estados ahora, no es algo que pueda hacer en buena conciencia — sería ponerte una multa segura encima. Si quieres que lo haga igual, dímelo explícitamente.
