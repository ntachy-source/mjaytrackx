import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.007292fa44c0411db12e86a0faeaa62c',
  appName: 'mjaytrackx',
  webDir: 'dist',
  server: {
    url: 'https://007292fa-44c0-411d-b12e-86a0faeaa62c.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
