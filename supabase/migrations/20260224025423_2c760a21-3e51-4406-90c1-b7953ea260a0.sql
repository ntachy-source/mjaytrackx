-- Add share_token to devices for shareable tracking links
ALTER TABLE public.devices ADD COLUMN share_token TEXT UNIQUE;

-- Create index for fast token lookups
CREATE INDEX idx_devices_share_token ON public.devices (share_token) WHERE share_token IS NOT NULL;

-- Allow public (anon) to read device_id by share_token (needed by edge function)
-- No direct public access needed - edge function uses service role
