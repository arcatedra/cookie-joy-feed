# Acelerar la zona del repartidor

## Qué pasa hoy

Revisé las pantallas del repartidor y encontré cuatro causas concretas de la lentitud:

1. **El mapa se vuelve a dibujar todo el tiempo.** En la pantalla de navegación, la lista de puntos del mapa se vuelve a crear en cada refresco de la pantalla. Como el GPS se actualiza cada segundo, el mapa borra y vuelve a poner los marcadores y reencuadra la vista una y otra vez. Eso es lo que se siente "pesado" y con tirones.
2. **Cada cambio de pantalla revalida la sesión contra el servidor.** Al entrar a cualquier pantalla del repartidor se consulta el usuario y su estado de aprobación antes de mostrar nada, y eso se repite en cada navegación.
3. **Ningún dato se guarda en caché.** Al volver a una pantalla ya vista, todo se pide de nuevo y aparece el círculo de carga en lugar de los datos que ya teníamos.
4. **El GPS avisa al servidor en cada lectura.** Estando en línea, cada movimiento manda un aviso al servidor, sin límite, lo que satura la conexión en el celular.

## Qué voy a cambiar

**Mapa (lo que más se nota)**
- Memorizar la lista de marcadores para que solo cambie cuando cambie de verdad la posición o el destino.
- Mover el marcador existente en vez de borrarlo y crearlo de nuevo.
- Reencuadrar el mapa solo la primera vez y cuando cambie el destino, no en cada lectura del GPS.
- Redondear la posición del GPS a unos pocos metros para no repintar por movimientos mínimos.

**Velocidad al cambiar de pantalla**
- Guardar en memoria el resultado de la comprobación de sesión/aprobación durante la sesión, para que el paso entre pantallas sea inmediato.
- Precargar las pantallas del menú al pasar el dedo o el cursor por encima.

**Datos**
- Poner tiempo de caché a las consultas del repartidor (estado, ganancias, facturas, calificaciones, pedido activo) para que al volver se vean al instante y se actualicen por detrás.
- Mostrar los datos anteriores mientras llega la actualización, en vez del círculo de carga.
- Mantener el refresco automático solo donde importa: pedidos disponibles y pedido en curso.

**GPS y red**
- Limitar el envío de ubicación a una vez cada 10 segundos (o si se movió más de 25 metros), en lugar de cada lectura.

## Alcance

- No toca pagos, Stripe ni el checkout.
- No toca la tabla de usuarios ni de clientes.
- Sin migración de base de datos.
- Nada cambia de aspecto: son cambios de rendimiento, la pantalla se ve igual.

## Detalles técnicos

Archivos previstos:
- `src/components/courier/GoogleMapView.tsx` — marcadores reutilizados por clave, `fitBounds` solo en el primer ajuste y al cambiar destino, comparación de props.
- `src/routes/_authenticated/repartidor.pedido.$id.navegacion.tsx` — `useMemo` para `markers`, posición redondeada a 5 decimales.
- `src/routes/_authenticated/repartidor.tsx` — cachear el resultado de `beforeLoad` (sesión + `application_status`) en memoria del cliente.
- `src/components/DriverLayout.tsx` — `staleTime` en `driver-status` y `preload="intent"` en los enlaces del menú.
- `src/routes/_authenticated/repartidor.index.tsx` — `staleTime`, `placeholderData: keepPreviousData`, envío de ubicación con límite de tiempo/distancia.
- `src/routes/_authenticated/repartidor.wallet.tsx`, `repartidor.ganancias.tsx`, `repartidor.facturas.tsx`, `repartidor.calificaciones.tsx` — `staleTime` y datos previos mientras refresca.

Verificación: `bunx tsgo --noEmit` y una prueba con Playwright navegando entre pantallas del repartidor para medir el tiempo de transición antes y después. No publico nada.
