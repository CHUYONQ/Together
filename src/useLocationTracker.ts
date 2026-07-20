import { useState, useEffect, useRef } from 'react';
import { dbCustom } from './lib/firebase';
import { doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { UserLocation, UserDoc } from './types';

export function useLocationTracker(uid: string | null, ghostMode: boolean) {
  const [partnerLocation, setPartnerLocation] = useState<UserLocation | null>(null);
  const [partnerUid, setPartnerUid] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // 1. Listen to the current user's doc to get the partner's UID
  useEffect(() => {
    if (!uid) return;

    const userDocRef = doc(dbCustom, 'users', uid);
    const unsubscribe = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserDoc;
        setPartnerUid(data.partnerUid);
      }
    });

    return () => unsubscribe();
  }, [uid]);

  // 2. Listen to the partner's document to get their location
  useEffect(() => {
    if (!partnerUid) {
      setPartnerLocation(null);
      return;
    }

    const partnerDocRef = doc(dbCustom, 'users', partnerUid);
    const unsubscribe = onSnapshot(partnerDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserDoc;
        if (data.location) {
          setPartnerLocation(data.location);
        }
      }
    });

    return () => unsubscribe();
  }, [partnerUid]);

  // 3. Track current user's location and battery, and push to Firestore
  useEffect(() => {
    if (!uid) return;

    // Helper to push location update
    const pushLocation = async (lat: number, lng: number, battery: number | null) => {
      // If ghost mode is active, don't update Firebase
      if (ghostMode) return;

      const userDocRef = doc(dbCustom, 'users', uid);
      try {
        await updateDoc(userDocRef, {
          location: {
            lat,
            lng,
            timestamp: Date.now(),
            battery,
            ghostMode: false // We are tracking, so ghost mode is off
          }
        });
      } catch (error) {
        console.error('Error updating location:', error);
      }
    };

    // Geolocation API setup
    if ('geolocation' in navigator) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        async (position) => {
          let batteryLevel: number | null = null;
          
          // Try to get battery status if supported
          if ('getBattery' in navigator) {
            try {
              const battery: any = await (navigator as any).getBattery();
              batteryLevel = Math.round(battery.level * 100);
            } catch (e) {
              console.warn('Battery API error:', e);
            }
          }

          pushLocation(position.coords.latitude, position.coords.longitude, batteryLevel);
          setLocationError(null);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError(error.message);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
    } else {
      setLocationError("Geolocation is not supported by your browser");
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [uid, ghostMode]);

  return { partnerLocation, partnerUid, locationError };
}
