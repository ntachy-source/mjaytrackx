# Native Android Client — Backend API Documentation

This backend is a REST service consumed by the native Android tracking client.
The Lovable dashboard is a separate application; the Android app must **not**
depend on or load the web dashboard.

## Base URL

```
https://gklxdtdfbhujsplktyvb.supabase.co/functions/v1/device-api
```

All device-facing endpoints live under this base. Requests and responses use
JSON. All timestamps are ISO-8601 UTC. Coordinates are WGS-84.

## Configuration values to ship in the Android app

| Name | Value | Notes |
|------|-------|-------|
| `SUPABASE_URL` | `https://gklxdtdfbhujsplktyvb.supabase.co` | Public |
| `SUPABASE_ANON_KEY` | Provided out-of-band | Public (safe in app) |
| `DEVICE_API_BASE` | `${SUPABASE_URL}/functions/v1/device-api` | |
| `DEVICE_TOKEN` | Returned by `POST /register` | Store in Android Keystore |

Send `apikey: <SUPABASE_ANON_KEY>` **and** `Authorization: Bearer <SUPABASE_ANON_KEY>`
on every request (Supabase Edge Function gateway requirement). After
registration, also send `x-device-token: <DEVICE_TOKEN>` on authenticated
endpoints. `Authorization` may be swapped for the device token instead of the
anon key on authenticated endpoints; both are accepted.

## Authentication model

1. On first launch, the app generates a stable `device_id` (e.g. hash of
   `Settings.Secure.ANDROID_ID` + install UUID) and calls `POST /register`.
2. The server returns a long-lived `device_token`. Store it securely
   (Android Keystore / EncryptedSharedPreferences).
3. All subsequent requests include `x-device-token: <device_token>`.
4. Only its SHA-256 hash is stored server-side; the raw token cannot be
   recovered. If lost, re-register — the same `device_id` re-issues a token
   and preserves the device row.

## Endpoints

### POST /register  (unauthenticated)

Registers or re-registers a device.

```json
{
  "device_id": "unique-stable-id",
  "device_name": "Pixel 8",
  "manufacturer": "Google",
  "model": "Pixel 8",
  "android_version": "14",
  "app_version": "1.0.0"
}
```

Response:

```json
{ "success": true, "device_id": "unique-stable-id", "device_token": "<token>" }
```

### POST /location  (authenticated)

Single point:

```json
{
  "latitude": -1.28333,
  "longitude": 36.81667,
  "accuracy": 8.4,
  "altitude": 1795.0,
  "speed": 1.4,
  "bearing": 92.1,
  "battery_level": 87,
  "timestamp": "2026-08-31T10:15:00Z"
}
```

Batch upload (recommended when offline queue drains):

```json
{ "locations": [ { ...point1 }, { ...point2 } ] }
```

Limits: max **500 points per request**. Timestamps older than 30 days or more
than 5 minutes in the future are rejected. Rate limit: 120 requests / minute
per device.

### POST /status  (authenticated)

Report device telemetry — call whenever any value changes and at least every
few minutes as a heartbeat.

```json
{
  "battery_level": 62,
  "is_charging": false,
  "location_permission": "always",
  "tracking_enabled": true,
  "app_version": "1.0.0",
  "android_version": "14",
  "network_type": "wifi"
}
```

### GET /config  (authenticated)

Returns the tracking parameters set by an admin. Poll on app start and every
few minutes.

```json
{
  "success": true,
  "tracking_enabled": true,
  "tracking_interval": 60,
  "distance_filter": 20,
  "updated_at": "2026-08-31T10:00:00Z"
}
```

`tracking_interval` is seconds between fixes when stationary; `distance_filter`
is meters of movement that force an out-of-schedule fix.

### GET /commands  (authenticated)

Polls pending admin commands. Fetched commands transition to `sent`.

```json
{
  "success": true,
  "commands": [
    { "id": "uuid", "command": "lock", "payload": { "message": "..." }, "created_at": "..." }
  ]
}
```

Known commands the Android client should implement:

| command | payload | Behavior |
|---------|---------|----------|
| `lock` | `{ "message": "..." }` | Show a full-screen device-admin lock overlay with the message |
| `unlock` | `{}` | Dismiss lock overlay |
| `alarm` | `{ "duration_seconds": 30 }` | Play siren at max volume |
| `locate_now` | `{}` | Force an immediate high-accuracy fix and POST it |
| `update_config` | `{}` | Re-fetch `/config` |
| `wipe_local_data` | `{}` | Clear app cache/queue (never system data) |

### POST /commands/{id}/ack  (authenticated)

```json
{ "status": "completed", "result": "optional string" }
```

`status` must be `completed` or `failed`.

## Error format

All errors return HTTP 4xx/5xx and a JSON body:

```json
{ "success": false, "error": "invalid_token", "message": "Device token is invalid or revoked" }
```

Common codes: `missing_token`, `invalid_token`, `device_deactivated`,
`invalid_request`, `invalid_coordinates`, `invalid_timestamp`,
`rate_limited`, `db_error`, `not_found`.

## Recommended Android implementation notes

- Foreground Service with a persistent notification for background GPS.
- FusedLocationProviderClient with `PRIORITY_HIGH_ACCURACY`.
- WorkManager for retrying failed uploads with exponential backoff.
- Local Room queue for offline points; flush in batches when connectivity
  returns.
- Poll `/commands` every 30-60s or via FCM push (optional future).
- Request `ACCESS_BACKGROUND_LOCATION`, `POST_NOTIFICATIONS`,
  `FOREGROUND_SERVICE_LOCATION`, and Device Admin (for real lock).
- Never bundle or open the web dashboard from inside the app.
