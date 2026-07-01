
# Recompensa por referidos actualizada

## Regla nueva
- Por cada invitado que se una al sorteo **por primera vez** usando tu código de referido, el referidor recibe **5 estrellas**.
- Ejemplos: 1 invitado que participa = 5 ⭐, 2 invitados = 10 ⭐, 3 = 15 ⭐, y así sucesivamente.
- Las estrellas siguen valiendo lo mismo (10 ⭐ = 1 ticket del sorteo). No se cambia el costo del ticket.
- Se **elimina** la recompensa anterior de 3 ⭐ por suscripción del referido.

## Cambios en la base de datos (migración)

1. **Reemplazar el trigger `grant_referral_reward`** para que ya no dispare al activarse una suscripción.
2. **Nueva función `grant_referral_reward_on_entry()`** (SECURITY DEFINER, search_path=public):
   - Se ejecuta como trigger `AFTER INSERT` en `public.daily_draw_entries`.
   - Busca en `public.referrals` una fila donde `referee_id = NEW.subject_user_id` y `reward_granted = false`.
   - Si existe: suma **5** a `profiles.stars_count` del referidor, marca `reward_granted = true` y `rewarded_at = now()`.
   - Si `subject_user_id` es null (entrada AMOE de invitado no logueado) o no hay referral pendiente, no hace nada.
   - El flag `reward_granted` garantiza que solo se paga **la primera vez** que el referido entra al sorteo (no en cada entrada).

## Cambios en el frontend

- **`src/components/ReferralCard.tsx`**: actualizar el texto de la recompensa a "Gana 5 ⭐ cada vez que un invitado entra al sorteo por primera vez con tu código" (revisar textos en `src/locales/*/translation.json` que mencionen las 3 estrellas de suscripción y ajustarlos).

## Lo que NO cambia
- Costo del ticket (sigue 10 ⭐ = 1 ticket).
- Generación del código de referido, tabla `referrals`, RLS, ni la lógica de `handle_new_user` que crea la relación referrer→referee al registrarse.
- Sorteo, seed, ganador, entregas: nada del flujo del sorteo se toca.

## Notas técnicas
- El trigger reemplaza al que hoy escucha en `subscriptions`; hay que hacer `DROP TRIGGER` del viejo y `CREATE TRIGGER` del nuevo sobre `daily_draw_entries`.
- La suma de estrellas se hace con `SECURITY DEFINER` porque el trigger `profiles_protect_referral_fields` bloquea cambios a `stars_count` fuera de `service_role`; la función debe correr como owner (postgres) para pasar ese guard igual que `grant_referral_reward` hoy.
