export interface Geofence {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  triggerOn: 'entry' | 'exit' | 'both';
}

export interface UserLocation {
  lat: number;
  lng: number;
  timestamp: number;
  battery: number | null;
  ghostMode: boolean;
}

export interface HistoryPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

export interface HistoryDay {
  date: string;
  points: HistoryPoint[];
}

export interface UserDoc {
  uid: string;
  displayName?: string;
  pairingCode: string | null;
  location: UserLocation | null;
  partnerUid: string | null;
  geofences?: Geofence[];
}
