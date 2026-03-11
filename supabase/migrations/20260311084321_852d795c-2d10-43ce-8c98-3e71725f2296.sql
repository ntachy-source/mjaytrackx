
CREATE TABLE public.sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  message TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- Allow the edge function (service role) to insert
CREATE POLICY "Service role can insert SOS alerts"
  ON public.sos_alerts FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow device owners to read their SOS alerts
CREATE POLICY "Device owners can read SOS alerts"
  ON public.sos_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.devices d WHERE d.id = sos_alerts.device_id AND d.user_id = auth.uid()
    )
  );

-- Allow anon to insert (from tracking page)
CREATE POLICY "Anon can insert SOS alerts"
  ON public.sos_alerts FOR INSERT
  TO anon
  WITH CHECK (true);

-- Enable realtime for SOS alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.sos_alerts;
