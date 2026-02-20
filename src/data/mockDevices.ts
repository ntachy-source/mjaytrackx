export interface Device {
  id: string;
  name: string;
  userId: string;
  lat: number;
  lng: number;
  battery: number;
  status: "online" | "offline" | "idle";
  lastSeen: Date;
  speed: number; // km/h
  history: { lat: number; lng: number; timestamp: Date }[];
}

const now = new Date();
const ago = (mins: number) => new Date(now.getTime() - mins * 60000);

export const mockDevices: Device[] = [
  {
    id: "dev-001",
    name: "iPhone 15 Pro",
    userId: "user-alpha",
    lat: 40.7128,
    lng: -74.006,
    battery: 78,
    status: "online",
    lastSeen: ago(0),
    speed: 12,
    history: [
      { lat: 40.7118, lng: -74.008, timestamp: ago(30) },
      { lat: 40.7122, lng: -74.007, timestamp: ago(20) },
      { lat: 40.7125, lng: -74.0065, timestamp: ago(10) },
      { lat: 40.7128, lng: -74.006, timestamp: ago(0) },
    ],
  },
  {
    id: "dev-002",
    name: "Galaxy S24 Ultra",
    userId: "user-beta",
    lat: 40.7282,
    lng: -73.7949,
    battery: 45,
    status: "online",
    lastSeen: ago(2),
    speed: 0,
    history: [
      { lat: 40.7282, lng: -73.7949, timestamp: ago(60) },
      { lat: 40.7282, lng: -73.7949, timestamp: ago(0) },
    ],
  },
  {
    id: "dev-003",
    name: "Pixel 8",
    userId: "user-gamma",
    lat: 40.758,
    lng: -73.9855,
    battery: 12,
    status: "idle",
    lastSeen: ago(45),
    speed: 0,
    history: [
      { lat: 40.76, lng: -73.984, timestamp: ago(120) },
      { lat: 40.759, lng: -73.985, timestamp: ago(90) },
      { lat: 40.758, lng: -73.9855, timestamp: ago(45) },
    ],
  },
  {
    id: "dev-004",
    name: "OnePlus 12",
    userId: "user-delta",
    lat: 40.6892,
    lng: -74.0445,
    battery: 92,
    status: "offline",
    lastSeen: ago(360),
    speed: 0,
    history: [
      { lat: 40.6892, lng: -74.0445, timestamp: ago(360) },
    ],
  },
];
