# Añadir acceso a la Ruleta ORIGEN en el menú

Ahora mismo `/ruleta` existe pero no hay ningún enlace, por eso no la ves. Voy a añadir un nuevo botón en la barra de navegación **justo al lado de "🛍️ Tienda"**, con el mismo estilo destacado (fondo ámbar translúcido + texto dorado en negrita) para que destaque igual.

## Cambios

**Archivo único:** `src/components/TopNav.tsx`

1. Añadir una nueva entrada en `quickLinkKeys` justo después de `shop`:
   ```ts
   { key: "roulette", to: "/ruleta", label: "🎰 ORIGEN" }
   ```
2. Extender la condición de "destacado" para que tanto `shop` como `roulette` reciban el estilo dorado (`bg-amber-300/20 text-amber-200 font-bold`), igual que Tienda.

## Resultado

En el sub-navbar verás, en este orden:

```
☰ All · Today's Deals · 🛍️ Tienda · 🎰 ORIGEN · Best Sellers · Build a Pack · ...
```

Ambos botones (Tienda y ORIGEN) compartirán el mismo estilo dorado destacado. Al hacer clic en **🎰 ORIGEN** se abre la página de la ruleta con el formulario AMOE, las misiones de video, el saldo de tokens y la ruleta interactiva ya construidos.

## Lo que NO toco

- Diseño de la ruleta (`/ruleta`): se queda como está.
- Resto del TopNav, logo, búsqueda, carrito, etc.
- Ninguna otra página de la tienda.
