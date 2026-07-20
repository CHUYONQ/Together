import { useState, useEffect } from 'react';
import { dbCustom } from './lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { HistoryDay, HistoryPoint } from './types';

export function useLocationHistory(targetUid: string | null, date: string | null) {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available dates
  useEffect(() => {
    if (!targetUid) {
      setAvailableDates([]);
      return;
    }

    const fetchDates = async () => {
      try {
        const historyRef = collection(dbCustom, 'users', targetUid, 'history');
        const q = query(historyRef, orderBy('date', 'desc'), limit(30));
        const snapshot = await getDocs(q);
        const dates = snapshot.docs.map(doc => doc.id);
        setAvailableDates(dates);
      } catch (error) {
        console.error("Error fetching history dates:", error);
      }
    };

    fetchDates();
  }, [targetUid]);

  // Listen to specific date's points
  useEffect(() => {
    if (!targetUid || !date) {
      setHistoryPoints([]);
      return;
    }

    setIsLoading(true);
    const historyDocRef = doc(dbCustom, 'users', targetUid, 'history', date);
    
    const unsubscribe = onSnapshot(historyDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as HistoryDay;
        setHistoryPoints(data.points || []);
      } else {
        setHistoryPoints([]);
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to history points:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [targetUid, date]);

  return { availableDates, historyPoints, isLoading };
}
