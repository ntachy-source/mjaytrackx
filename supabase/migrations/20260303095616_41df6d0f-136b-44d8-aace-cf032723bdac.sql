
-- Add lock columns to devices table
ALTER TABLE public.devices
ADD COLUMN is_locked boolean NOT NULL DEFAULT false,
ADD COLUMN lock_message text DEFAULT 'This device has been locked by the administrator. Please contact the owner.',
ADD COLUMN play_alarm boolean NOT NULL DEFAULT false;
