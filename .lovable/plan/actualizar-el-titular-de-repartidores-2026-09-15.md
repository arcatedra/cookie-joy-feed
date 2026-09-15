# Actualizar el titular de `/repartidores`

## Resultado
- Cambiar el titular en español a **“Gana desde $22 la hora repartiendo con Hazorex”**.
- Mantener **“desde $22 la hora”** en dorado, con el mismo estilo actual.
- Usar en inglés **“Earn from $22 an hour delivering with Hazorex.”**.
- Mantener intactos los cuatro chips inferiores.

## Traducciones
- Actualizar el titular equivalente en los nueve idiomas existentes: español, inglés, portugués, francés, alemán, italiano, chino, japonés y filipino.
- Mantener `$22` y el nombre `Hazorex` iguales en todos los idiomas.

## Licencias y coherencia
- Conservar los requisitos de Nueva York ya aplicados en las tarjetas Moto y Auto.
- Confirmar que el formulario de postulación y el onboarding usan las mismas clases: M/DM para moto, D/E para auto y rechazo de DJ/MJ.
- Confirmar que el ícono de Moto siga siendo una motocicleta/scooter.

## Verificación
- Revisar `/repartidores` en español e inglés, tanto en computadora como en celular.
- Comprobar que el titular no se corte, que el fragmento dorado sea correcto y que los chips no hayan cambiado.
- Ejecutar la comprobación del código y no publicar a producción.

## Archivos previstos
- `src/routes/repartidores.tsx`, solo si el resaltado dorado necesita ajustar la separación del nuevo texto.
- Los nueve archivos `src/locales/*/translation.json`.

No incluye cambios en pagos, checkout, Stripe, usuarios, clientes ni base de datos.
