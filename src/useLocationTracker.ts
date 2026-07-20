import { useState, useEffect, useRef } from 'react';
import { dbCustom } from './lib/firebase';
import { doc, updateDoc, setDoc, onSnapshot, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { UserLocation, UserDoc, HistoryPoint } from './types';

export function useLocationTracker(uid: string | null, ghostMode: boolean) {
  const [partnerLocation, setPartnerLocation] = useState<UserLocation | null>(null);
  const [partnerUid, setPartnerUid] = useState<string | null>(null);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastHistoryPointRef = useRef<HistoryPoint | null>(null);

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
        setPartnerName(data.displayName || null);
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

      const now = Date.now();
      const userDocRef = doc(dbCustom, 'users', uid);
      try {
        await updateDoc(userDocRef, {
          location: {
            lat,
            lng,
            timestamp: now,
            battery,
            ghostMode: false // We are tracking, so ghost mode is off
          }
        });

        let shouldPushHistory = false;
        const lastPt = lastHistoryPointRef.current;
        if (!lastPt) {
          shouldPushHistory = true;
        } else {
          const timeDiff = now - lastPt.timestamp;
          const R = 6371e3; // metres
          const φ1 = lastPt.lat * Math.PI / 180;
          const φ2 = lat * Math.PI / 180;
          const Δφ = (lat - lastPt.lat) * Math.PI / 180;
          const Δλ = (lng - lastPt.lng) * Math.PI / 180;

          const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

          const d = R * c; // in metres

          // Push if moved more than 15 meters or 1 minute has passed
          if (d > 15 || timeDiff > 60000) {
            shouldPushHistory = true;
          }
        }

        if (shouldPushHistory) {
          const dateString = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
          const historyDocRef = doc(dbCustom, 'users', uid, 'history', dateString);
          const newPoint = { lat, lng, timestamp: now };
          await setDoc(historyDocRef, {
            date: dateString,
            points: arrayUnion(newPoint)
          }, { merge: true });
          
          lastHistoryPointRef.current = newPoint;
        }

      } catch (error) {
        console.error('Error updating location (user or history doc):', error);
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

  return { partnerLocation, partnerUid, partnerName, locationError };
}
