CREATE TABLE IF NOT EXISTS public.device_config (
  device_id uuid PRIMARY KEY REFERENCES public.devices(id) ON DELETE CASCADE,
  tracking_enabled boolean NOT NULL DEFAULT true,
  tracking_interval integer NOT NULL DEFAULT 60,
  distance_filter integer NOT NULL DEFAULT 20,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_config TO authenticated;
GRANT ALL ON public.device_config TO service_role;
ALTER TABLE public.device_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage device config" ON public.device_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.is_owner_of_device(device_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.is_owner_of_device(device_id));
CREATE POLICY "Viewers read device config" ON public.device_config
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer'));

CREATE TABLE IF NOT EXISTS public.commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  command text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  acknowledged_at timestamptz,
  result text
);
CREATE INDEX IF NOT EXISTS commands_device_status_idx ON public.commands (device_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commands TO authenticated;
GRANT ALL ON public.commands TO service_role;
ALTER TABLE public.commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage commands" ON public.commands
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.is_owner_of_device(device_id))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.is_owner_of_device(device_id));
CREATE POLICY "Viewers read commands" ON public.commands
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer'));

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  action text NOT NULL,
  device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  "timestamp" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_ts_idx ON public.audit_logs ("timestamp" DESC);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "Admins write audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Viewers can view all devices" ON public.devices
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update all devices" ON public.devices
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete all devices" ON public.devices
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Viewers can view all locations" ON public.locations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer') OR public.has_role(auth.uid(), 'super_admin'));

ALTER TABLE public.devices REPLICA IDENTITY FULL;
ALTER TABLE public.commands REPLICA IDENTITY FULL;
ALTER TABLE public.locations REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.commands;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;