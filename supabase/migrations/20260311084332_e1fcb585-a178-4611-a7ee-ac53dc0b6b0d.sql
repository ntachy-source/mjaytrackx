
-- Tighten anon insert: require device_id to exist
DROP POLICY "Anon can insert SOS alerts" ON public.sos_alerts;
CREATE POLICY "Anon can insert SOS alerts with valid device"
  ON public.sos_alerts FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.devices d WHERE d.id = sos_alerts.device_id)
  );
