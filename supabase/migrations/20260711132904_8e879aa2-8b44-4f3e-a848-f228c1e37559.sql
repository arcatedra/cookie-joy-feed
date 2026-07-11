-- Restrict route_stops SELECT to assigned driver or admin (remove 'disponible' broad access)
DROP POLICY IF EXISTS "route_stops_select_own_route" ON public.route_stops;

CREATE POLICY "route_stops_select_own_route"
ON public.route_stops FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.delivery_routes r
    WHERE r.id = route_stops.route_id
      AND r.driver_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Non-PII summary view for available routes (drivers browsing to claim)
CREATE OR REPLACE VIEW public.available_route_stops_summary
WITH (security_invoker = true) AS
SELECT
  rs.route_id,
  rs.id AS stop_id,
  rs.sequence_number,
  rs.delivery_lat,
  rs.delivery_lng,
  rs.status
FROM public.route_stops rs
JOIN public.delivery_routes r ON r.id = rs.route_id
WHERE r.status = 'disponible';

GRANT SELECT ON public.available_route_stops_summary TO authenticated;