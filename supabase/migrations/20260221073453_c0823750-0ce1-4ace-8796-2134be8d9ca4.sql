
-- Add IMEI and phone_number columns to devices table
ALTER TABLE public.devices ADD COLUMN imei TEXT;
ALTER TABLE public.devices ADD COLUMN phone_number TEXT;
