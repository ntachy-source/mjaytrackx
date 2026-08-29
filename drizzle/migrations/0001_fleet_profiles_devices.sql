ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name', NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

ALTER TABLE public.devices ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'android',
  ADD COLUMN IF NOT EXISTS android_version text,
  ADD COLUMN IF NOT EXISTS app_version text,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS battery_level integer,
  ADD COLUMN IF NOT EXISTS is_charging boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS location_permission_status text,
  ADD COLUMN IF NOT EXISTS network_type text,
  ADD COLUMN IF NOT EXISTS tracking_status boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_seen timestamptz,
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS devices_device_id_key ON public.devices (device_id) WHERE device_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS devices_token_hash_idx ON public.devices (token_hash);
CREATE INDEX IF NOT EXISTS devices_last_seen_idx ON public.devices (last_seen DESC);

CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS accuracy double precision,
  ADD COLUMN IF NOT EXISTS altitude double precision,
  ADD COLUMN IF NOT EXISTS bearing double precision;

CREATE INDEX IF NOT EXISTS locations_device_ts_idx ON public.locations (device_id, "timestamp" DESC);