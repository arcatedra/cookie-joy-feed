# Corregir requisitos de licencia para repartidores en Nueva York

## Objetivo
Actualizar la información de moto y auto para que use las clases de licencia correctas de Nueva York, eliminar la contradicción visual del ícono de bicicleta y mantener los mismos requisitos en la postulación y el onboarding.

## Cambios propuestos

1. **Sección “Solo aceptamos moto o auto” en `/repartidores`**
   - Cambiar el ícono de la tarjeta Moto de bicicleta a scooter/motocicleta.
   - Mostrar cuatro requisitos en Moto:
     - Licencia Clase M o DM de NY, vigente.
     - Registración e inspección de NY al día.
     - Seguro del vehículo vigente.
     - Casco obligatorio por ley en NY.
   - Mostrar tres requisitos en Auto:
     - Licencia Clase D (o E) de NY, vigente.
     - Registración e inspección de NY al día.
     - Seguro del vehículo vigente.
   - Añadir debajo de ambas tarjetas el aviso en letra pequeña sobre edad mínima de 18 años y rechazo de licencias junior DJ/MJ.

2. **Formulario y requisitos de postulación**
   - Corregir la lista general que hoy dice Clase A para moto y Clase B para auto.
   - Mostrar la clase correcta según el vehículo elegido junto al campo/documento de licencia, para que el formulario no contradiga las tarjetas.
   - Mantener intacto el envío de la postulación y los datos guardados.

3. **Onboarding del repartidor**
   - Ajustar el acuerdo visible para indicar que la licencia debe ser la clase de Nueva York correspondiente al vehículo, y que no se aceptan licencias junior DJ/MJ.
   - No cambiar la aceptación del acuerdo ni su funcionamiento.

4. **Todos los idiomas**
   - Actualizar las mismas claves en los 9 archivos actuales: español, inglés, alemán, filipino, francés, italiano, japonés, portugués y chino.
   - Usar literalmente en inglés las frases indicadas en el pedido.
   - Traducir el mismo significado en los demás idiomas, conservando sin traducir las clases oficiales M, DM, D, E, DJ y MJ.

5. **Verificación**
   - Comprobar `/repartidores` en español e inglés, incluyendo móvil.
   - Comprobar que Moto usa el ícono de scooter y que las listas no se cortan.
   - Comprobar el formulario y el onboarding para confirmar que no queda ninguna referencia a Clase A/B.

## Archivos previstos
- `src/routes/repartidores.tsx`
- `src/routes/_authenticated/repartidor.onboarding.tsx`
- Los 9 archivos `src/locales/*/translation.json`

No habrá cambios de base de datos, usuarios, clientes, checkout, Stripe ni pagos. No se publicará a producción.
