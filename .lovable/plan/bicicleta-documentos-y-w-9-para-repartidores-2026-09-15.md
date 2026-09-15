# Bicicleta, documentos y W-9 para repartidores

## Resultado
- Mantener el titular: **“Gana desde $22 la hora repartiendo con Hazorex”**, con **“desde $22 la hora”** en dorado.
- Mantener en inglés: **“Earn from $22 an hour delivering with Hazorex.”**.
- No cambiar los cuatro beneficios bajo el titular.
- Cambiar la sección a **“Elige tu vehículo”** y mostrar Bicicleta/E-bike, Moto y Auto.
- En computadora: tres tarjetas del mismo alto en una fila. En celular: tarjetas apiladas.
- Quitar todas las frases que rechazan bicicletas o limitan el servicio a moto/auto.

## Vehículos y requisitos
### Bicicleta / E-bike
- Ícono de bicicleta.
- “Ideal para zonas densas. Sin licencia ni seguro.”
- 18 años o más.
- Identificación válida.
- Bicicleta o e-bike propia.
- Casco.

### Moto
- Ícono de motocicleta/scooter.
- Licencia Clase M o DM de NY, vigente.
- Registración e inspección al día.
- Seguro vigente.
- Casco.

### Auto
- Ícono de carro.
- Licencia Clase D o E de NY, vigente.
- Registración e inspección al día.
- Seguro vigente.

## Formulario de postulación
- Añadir Bicicleta/E-bike al selector de vehículo.
- Mantener el selector de zona que ya existe y aclarar que es la zona donde desea trabajar.
- Pedir a todos identificación con foto, foto de perfil y SSN o ITIN para el W-9.
- Bicicleta: no pedir licencia, seguro, compañía aseguradora ni placa.
- Moto: pedir licencia M/DM, seguro y casco.
- Auto: pedir licencia D/E y seguro.
- Ajustar validaciones, resumen y errores para cada vehículo.
- Guardar “bicicleta” como tipo de vehículo; el esquema previsto del proyecto ya contempla ese valor.

## Protección del SSN/ITIN
El número completo no se guardará en texto legible ni viajará de vuelta al navegador:
- Validación en pantalla y nuevamente en el servidor: exactamente 9 dígitos, aceptando guiones solo para escribirlo.
- Cifrado AES-GCM en el servidor con una clave privada del proyecto.
- Guardar únicamente el valor cifrado, su vector de cifrado, el tipo SSN/ITIN y los últimos 4 dígitos en una tabla separada de datos fiscales de repartidores.
- El repartidor podrá enviarlo, pero no leerlo después. No se mostrará el número completo en el resumen ni en el panel actual.
- No modificar las tablas de usuarios ni clientes.

## Migración propuesta (no aplicada)
```sql
CREATE TABLE public.driver_tax_profiles (
  driver_id uuid PRIMARY KEY REFERENCES public.drivers(id) ON DELETE CASCADE,
  tax_id_type text NOT NULL,
  tax_id_ciphertext text NOT NULL,
  tax_id_iv text NOT NULL,
  tax_id_last4 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT, UPDATE ON public.driver_tax_profiles TO authenticated;
GRANT ALL ON public.driver_tax_profiles TO service_role;

ALTER TABLE public.driver_tax_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers insert own tax profile"
ON public.driver_tax_profiles FOR INSERT TO authenticated
WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers update own tax profile"
ON public.driver_tax_profiles FOR UPDATE TO authenticated
USING (driver_id = auth.uid())
WITH CHECK (driver_id = auth.uid());
```

Antes de ejecutar se confirmará en la base conectada que `driver_vehicle_type` contiene `bicicleta`. Si faltara, la migración incluirá:
```sql
ALTER TYPE public.driver_vehicle_type ADD VALUE IF NOT EXISTS 'bicicleta';
```

## Onboarding y coherencia
- Corregir el acuerdo para reconocer bicicleta sin licencia ni seguro.
- Mantener M/DM para moto, D/E para auto y el rechazo de licencias junior DJ/MJ donde corresponda.
- Buscar y retirar las referencias restantes a “solo moto o auto”, “no bicicleta” y licencias obligatorias para todos.

## Traducciones
- Actualizar español, inglés, portugués, francés, alemán, italiano, chino, japonés y filipino.
- Respetar literalmente las frases inglesas solicitadas.
- Traducir los textos equivalentes y conservar M, DM, D, E, DJ, MJ, SSN e ITIN sin traducir.

## Archivos previstos
- `src/routes/repartidores.tsx`
- `src/routes/_authenticated/repartidor.onboarding.tsx`
- Un módulo nuevo para enviar y cifrar el SSN/ITIN en el servidor.
- Los 9 archivos `src/locales/*/translation.json`.
- Una migración de base de datos para `driver_tax_profiles` y, solo si hace falta, el valor `bicicleta`.

## Verificación
- Probar las tres opciones y sus documentos obligatorios.
- Confirmar que bicicleta no muestra licencia, seguro ni placa.
- Confirmar zona, SSN/ITIN y resumen sin exponer el número completo.
- Revisar `/repartidores` en español e inglés, computadora y celular.
- Revisar el onboarding y buscar textos antiguos en los nueve idiomas.
- Ejecutar las comprobaciones del código.
- No tocar checkout, Stripe, pagos, usuarios ni clientes. No publicar.
