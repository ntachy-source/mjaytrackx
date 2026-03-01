
-- Create geofences table
CREATE TABLE public.geofences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  radius_meters integer NOT NULL DEFAULT 200,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own geofences" ON public.geofences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own geofences" ON public.geofences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own geofences" ON public.geofences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own geofences" ON public.geofences
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all geofences" ON public.geofences
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.geofences;
