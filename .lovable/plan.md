## Decisión: sorteo 100% transparente, sin override de admin

No se va a construir ninguna función para que el admin (ni nadie) pueda elegir, forzar o reemplazar al ganador del sorteo diario. El sorteo seguirá corriendo solo por `run_daily_draw()` con su semilla aleatoria verificable (`seed_hash` público).

### Único cambio en este plan

Guardar esta decisión como **regla permanente del proyecto** para que en el futuro, aunque tú o yo lo olvidemos, ningún agente (ni yo en otra sesión) construya por accidente algo que rompa la transparencia.

Se crean dos archivos de memoria:

1. **`mem://constraints/no-admin-winner-override.md`** — la regla detallada: qué está prohibido construir (endpoints de override, UI de "elegir ganador", flags en entries, modificaciones a `run_daily_draw`) y qué sí está permitido (el random actual + futura transmisión en vivo por cámara).
2. **`mem://index.md`** — índice del proyecto con la regla en la sección "Core" para que siempre esté activa.

### Lo que NO cambia

- Cero cambios de código.
- Cero cambios en la base de datos.
- El sorteo sigue funcionando exactamente igual que ahora.

### Si en el futuro cambias de opinión

Solo tienes que decírmelo explícitamente y confirmaré antes de construir nada — la regla queda como un "freno" intencional, no como una prohibición eterna.
