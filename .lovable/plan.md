## Objetivo

Mover la tarjeta "Invita y Gana Estrellas" (QR + código + historial) a la parte superior de `/profile`, justo después de la tarjeta de perfil, para que sea lo primero que el usuario vea al entrar.

## Cambio

Un solo archivo: `src/routes/profile.tsx`.

Reordenar las secciones así:

```text
Header azul
Tarjeta de perfil (avatar, nombre, stats)
── ReferralCard  ← QR aquí, bien arriba
── ReferralHistory
SubscribePromoBanner
Active Plan (si aplica)
RecentOrders
Menú de cuenta
```

Actualmente `ReferralCard` está en la línea 152, después de la promo de suscripción, el plan activo y los pedidos recientes. Se mueven los dos componentes (`ReferralCard` y `ReferralHistory`) al bloque inmediatamente posterior a la tarjeta de perfil (después de la línea 115).

## Detalles técnicos

- Cortar las líneas 152–153 (`<ReferralCard />` y `<ReferralHistory />`) y pegarlas justo después del cierre de la sección de la tarjeta de perfil (línea 115), antes de `SubscribePromoBanner`.
- No se cambia lógica, ni estilos, ni el componente en sí — sólo el orden de render.
- No hay cambios de base de datos ni de traducciones.

## Verificación

- `/profile` con sesión iniciada: el QR aparece sin necesidad de hacer scroll (o con muy poco scroll en móvil).
- `/profile` sin sesión: la tarjeta muestra "Inicia sesión para obtener tu código de invitación único", también arriba.
