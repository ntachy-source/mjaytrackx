
-- Allow admins to update any device (for lock/unlock/alarm)
CREATE POLICY "Admins can update all devices"
ON public.devices
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
