## Publicar la nueva versión del sorteo

Todo el flujo nuevo está funcionando bien en preview. El siguiente paso natural es publicar para que tus usuarios reales vean:

- **7:55 PM ET** — Registro cerrado con mensaje elegante.
- **7:59:30 PM ET** — Modo suspenso (pulso intenso + badge "¡A punto de girar!").
- **8:00 PM ET exactas** — Ruleta a pantalla completa, gira, confeti dorado, ganador en tarjeta premium.
- Sorteo 100% transparente vía `run_daily_draw()` con `seed_hash` público (regla guardada en memoria: nunca override de admin).

### Qué hago

1. Abrir el panel de publicación para que confirmes y subas la versión.
2. Verificar después de publicar que la URL pública (`origen-com.lovable.app` y tus dominios `origen.management` / `hazorex.com`) refleje los cambios.

### Qué NO toco

- Cero cambios de código nuevos.
- Cero cambios en la base de datos.
- El cron del sorteo y los pagos siguen igual.

Cuando apruebes, abro el publicador.
