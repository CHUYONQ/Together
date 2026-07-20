export interface UserLocation {
  lat: number;
  lng: number;
  timestamp: number;
  battery: number | null;
  ghostMode: boolean;
}

export interface UserDoc {
  uid: string;
  pairingCode: string | null;
  location: UserLocation | null;
  partnerUid: string | null;
}
