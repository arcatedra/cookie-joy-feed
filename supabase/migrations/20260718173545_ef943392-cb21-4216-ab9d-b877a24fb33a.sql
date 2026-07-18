-- Desactivar sorteo diario mientras la configuración legal (dirección postal
-- del patrocinador, reglas oficiales finalizadas) no esté completa.
UPDATE public.sweepstakes_config
SET sweepstakes_active = false,
    updated_at = now()
WHERE id = true;