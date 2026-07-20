import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, dbCustom } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useLocationTracker } from './useLocationTracker';
import { MapComponent } from './MapComponent';
import { UserLocation, UserDoc, Geofence } from './types';
import { Ghost, Globe, Link2, Unlink, Copy, Check, ShieldAlert, Activity, ChevronDown, ChevronUp, UserPen, Save, History, MapPin, X, Trash2, MapPinOff } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useLocationHistory } from './useLocationHistory';

// Helper for distance calculation (in meters)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [pairingCodeInput, setPairingCodeInput] = useState('');
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [ghostMode, setGhostMode] = useState(false);
  const [myLocation, setMyLocation] = useState<UserLocation | null>(null);
  const [copied, setCopied] = useState(false);
  const [isBackgroundActive, setIsBackgroundActive] = useState(false);
  const [showPairingSection, setShowPairingSection] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  
  // Geofence states
  const [isMarkingLocation, setIsMarkingLocation] = useState(false);
  const [newGeofenceDraft, setNewGeofenceDraft] = useState<Partial<Geofence> | null>(null);

  const { partnerLocation, partnerUid, partnerName, locationError, permissionState } = useLocationTracker(user?.uid || null, ghostMode);

  const [partnerSpeed, setPartnerSpeed] = useState<number | null>(null);

  // Keep track of previous partner location to detect crossings
  const prevPartnerLocationRef = useRef<UserLocation | null>(null);
  const notifiedGeofencesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Request notification permission if needed
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (partnerLocation) {
      const currentLoc = partnerLocation;
      const prevLoc = prevPartnerLocationRef.current;
      
      if (prevLoc && currentLoc.timestamp !== prevLoc.timestamp) {
        // Calculate speed
        const dist = getDistance(prevLoc.lat, prevLoc.lng, currentLoc.lat, currentLoc.lng);
        const timeDiffSec = (currentLoc.timestamp - prevLoc.timestamp) / 1000;
        
        if (timeDiffSec > 0) {
            const speedKmh = (dist / timeDiffSec) * 3.6;
            setPartnerSpeed(speedKmh);
        }

        // Geofences logic
        if (userDoc?.geofences) {
          userDoc.geofences.forEach(gf => {
            const wasInside = getDistance(prevLoc.lat, prevLoc.lng, gf.lat, gf.lng) <= gf.radius;
            const isInside = getDistance(currentLoc.lat, currentLoc.lng, gf.lat, gf.lng) <= gf.radius;

            if (gf.triggerOn === 'entry' || gf.triggerOn === 'both') {
              if (!wasInside && isInside) {
                notifyUser(`${partnerName || 'Partner'} entered ${gf.name}`);
              }
            }
            if (gf.triggerOn === 'exit' || gf.triggerOn === 'both') {
              if (wasInside && !isInside) {
                notifyUser(`${partnerName || 'Partner'} left ${gf.name}`);
              }
            }
          });
        }
      }
      prevPartnerLocationRef.current = currentLoc;
    }
  }, [partnerLocation, userDoc?.geofences, partnerName]);

  const notifyUser = (message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(message);
    } else {
      alert(message);
    }
  };


  const [historyViewTarget, setHistoryViewTarget] = useState<'mine' | 'partner'>('mine');
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string | null>(null);
  
  const targetHistoryUid = historyViewTarget === 'mine' ? (user?.uid || null) : (partnerUid || null);
  const { availableDates, historyPoints, isLoading: isHistoryLoading } = useLocationHistory(targetHistoryUid, selectedHistoryDate);

  // Auto-select newest date when changing target if dates are available
  useEffect(() => {
    if (availableDates.length > 0 && !selectedHistoryDate) {
      setSelectedHistoryDate(availableDates[0]);
    } else if (availableDates.length === 0) {
      setSelectedHistoryDate(null);
    }
  }, [availableDates, selectedHistoryDate]);

  // Update display name input when userDoc changes
  useEffect(() => {
    if (userDoc?.displayName) {
      setDisplayNameInput(userDoc.displayName);
    }
  }, [userDoc?.displayName]);

  const toggleBackgroundMode = async () => {
    if (!isBackgroundActive) {
      try {
        if ('wakeLock' in navigator) {
          try {
            await (navigator as any).wakeLock.request('screen');
          } catch (wakeLockError) {
            console.warn('Wake lock failed (often blocked in iframes), continuing with audio fallback:', wakeLockError);
          }
        }
        
        // Play silent audio hack to try to keep process alive in background
        const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
        audio.loop = true;
        await audio.play().catch(e => console.warn('Audio play blocked:', e));
        
        setIsBackgroundActive(true);
        setShowBackgroundModal(true);
      } catch (e: any) {
        console.error('Failed to enable background mode', e);
        alert('Could not enable background mode: ' + e.message);
      }
    } else {
      setShowBackgroundModal(true);
    }
  };

  // PWA Update Hook
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const handleUpdateName = async () => {
    if (!user || !displayNameInput.trim()) return;
    try {
      const userRef = doc(dbCustom, 'users', user.uid);
      await updateDoc(userRef, { displayName: displayNameInput.trim() });
      alert(t('nameUpdated'));
    } catch (e) {
      console.error("Error updating name", e);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (isMarkingLocation) {
      setNewGeofenceDraft({
        id: Date.now().toString(),
        lat,
        lng,
        radius: 100, // default 100m
        triggerOn: 'both',
        name: 'New Location'
      });
      setIsMarkingLocation(false);
    }
  };

  const saveGeofence = async () => {
    if (!user || !newGeofenceDraft) return;
    try {
      const userRef = doc(dbCustom, 'users', user.uid);
      const currentGeofences = userDoc?.geofences || [];
      await updateDoc(userRef, { geofences: [...currentGeofences, newGeofenceDraft as Geofence] });
      setNewGeofenceDraft(null);
    } catch (e) {
      console.error("Error saving geofence", e);
    }
  };

  const deleteGeofence = async (id: string) => {
    if (!user) return;
    try {
      const userRef = doc(dbCustom, 'users', user.uid);
      const currentGeofences = userDoc?.geofences || [];
      await updateDoc(userRef, { geofences: currentGeofences.filter(gf => gf.id !== id) });
    } catch (e) {
      console.error("Error deleting geofence", e);
    }
  };

  // Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAuthLoading(false);
        // Create or get user document
        const userRef = doc(dbCustom, 'users', currentUser.uid);
        const snap = await getDoc(userRef);
        
        if (!snap.exists()) {
          const newDoc: UserDoc = {
            uid: currentUser.uid,
            pairingCode: null,
            location: null,
            partnerUid: null
          };
          await setDoc(userRef, newDoc);
          setUserDoc(newDoc);
        } else {
          setUserDoc(snap.data() as UserDoc);
          setGhostMode(snap.data()?.location?.ghostMode || false);
        }

        // Listen for changes to user document
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserDoc;
            setUserDoc(data);
            if (data.location) {
              setMyLocation(data.location);
            }
          }
        });
      } else {
        // User is signed out
        setUser(null);
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const handlePair = async () => {
    if (!user || !pairingCodeInput.trim()) return;
    
    // Simple pairing logic: we just set our pairing code to what the user typed.
    // In a real app, you might want to check if another user has this code, and link them.
    // For this prototype, if both users enter the exact same string as their pairingCode,
    // we can use a cloud function or client side query to find the partner.
    // Since we don't have cloud functions, let's just do a client-side query (needs index)
    // Actually, simpler: if they enter the code, we save it.
    
    // Wait, the hook uses partnerUid. How do they find each other?
    // Let's change the pairing logic: 
    // User A generates a code (their UID). User B enters User A's UID.
    // Then they are paired.
    
    try {
      const userRef = doc(dbCustom, 'users', user.uid);
      await updateDoc(userRef, {
        partnerUid: pairingCodeInput.trim()
      });
      // Also update the partner to point back to us! (In a real app, use a secure backend)
      const partnerRef = doc(dbCustom, 'users', pairingCodeInput.trim());
      await updateDoc(partnerRef, {
        partnerUid: user.uid
      });
      
      setPairingCodeInput('');
    } catch (e) {
      console.error("Error pairing", e);
      alert("Error pairing. Ensure the code is correct.");
    }
  };

  const handleUnpair = async () => {
    if (!user) return;
    try {
      if (userDoc?.partnerUid) {
        const partnerRef = doc(dbCustom, 'users', userDoc.partnerUid);
        await updateDoc(partnerRef, { partnerUid: null }).catch(() => {});
      }
      
      const userRef = doc(dbCustom, 'users', user.uid);
      await updateDoc(userRef, { partnerUid: null });
    } catch (e) {
      console.error(e);
    }
  };

  const toggleGhostMode = async () => {
    if (!user) return;
    const newGhostMode = !ghostMode;
    setGhostMode(newGhostMode);
    
    const userRef = doc(dbCustom, 'users', user.uid);
    await updateDoc(userRef, {
      'location.ghostMode': newGhostMode
    });
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'th' : 'en';
    i18n.changeLanguage(newLang);
  };

  const copyMyCode = () => {
    if (user) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0A0A0B] text-zinc-200 p-6">
        <h1 className="font-serif italic text-3xl tracking-wide mb-2 text-zinc-100 animate-pulse">Together</h1>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0A0A0B] text-zinc-200 p-6">
        <h1 className="font-serif italic text-3xl tracking-wide mb-2 text-zinc-100">Together</h1>
        <p className="text-zinc-500 mb-8 text-sm">Secure location sharing</p>
        <button 
          onClick={handleSignIn}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/20"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  const isPaired = !!userDoc?.partnerUid;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#0A0A0B] text-zinc-200 font-sans overflow-hidden relative">
      {/* Update Toast */}
      {needRefresh && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3">
          <span className="text-sm font-medium">{t('updateAvailable')} (v1.0.5)</span>
          <button 
            onClick={() => updateServiceWorker(true)}
            className="bg-white text-blue-600 px-3 py-1.5 rounded text-sm font-bold shadow-sm"
          >
            {t('updateNow')}
          </button>
        </div>
      )}

      {/* Header */}
      <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-4 sm:px-8 bg-[#0F0F12] z-10 shrink-0">
        <h1 className="font-serif italic text-xl tracking-wide text-zinc-200 flex items-center gap-2">
          {t('appTitle')}
          <span className="text-[10px] font-mono bg-zinc-900 text-indigo-400 px-1.5 py-0.5 rounded border border-zinc-800">v1.0.5</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMarkingLocation(!isMarkingLocation)}
            className={`p-2 rounded-full transition-colors flex items-center gap-2 text-xs font-medium ${
              isMarkingLocation ? 'bg-pink-900/50 text-pink-400 border border-pink-500/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            title="Mark Location"
          >
            <MapPin size={16} />
            <span className="hidden sm:inline">{isMarkingLocation ? 'Cancel Marking' : 'Mark Area'}</span>
          </button>
          <button
            onClick={toggleBackgroundMode}
            className={`p-2 rounded-full transition-colors flex items-center gap-2 text-xs font-medium ${
              isBackgroundActive ? 'bg-indigo-900/50 text-indigo-400 border border-indigo-500/30' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
            title={t('enableBackground')}
          >
            <Activity size={16} className={isBackgroundActive ? "animate-pulse" : ""} />
            <span className="hidden sm:inline">{isBackgroundActive ? t('backgroundActive') : t('enableBackground')}</span>
          </button>
          <button 
            onClick={toggleLanguage}
            className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            <Globe size={20} />
          </button>
          <button 
            onClick={() => { setShowHistory(!showHistory); setShowSettings(false); }}
            className={`p-2 rounded-full transition-colors ${showHistory ? 'bg-indigo-900/50 text-indigo-400' : 'hover:bg-zinc-800 text-zinc-400'}`}
            title="History"
          >
            <History size={20} />
          </button>
          <button 
            onClick={() => { setShowSettings(!showSettings); setShowHistory(false); }}
            className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-indigo-900/50 text-indigo-400' : 'hover:bg-zinc-800 text-zinc-400'}`}
          >
            <UserPen size={20} />
          </button>
        </div>
      </header>

      {/* History Panel */}
      {showHistory && (
        <div className="bg-[#0F0F12] border-b border-zinc-800/50 p-4 z-10 shrink-0 shadow-lg">
          <div className="max-w-md mx-auto space-y-4">
            <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800">
              <button
                onClick={() => { setHistoryViewTarget('mine'); setSelectedHistoryDate(null); }}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${historyViewTarget === 'mine' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                My History
              </button>
              <button
                onClick={() => { setHistoryViewTarget('partner'); setSelectedHistoryDate(null); }}
                disabled={!isPaired}
                className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${historyViewTarget === 'partner' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'} disabled:opacity-30`}
              >
                Partner's History
              </button>
            </div>
            
            <div>
              {availableDates.length > 0 ? (
                <select
                  value={selectedHistoryDate || ''}
                  onChange={(e) => setSelectedHistoryDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="" disabled>Select Date</option>
                  {availableDates.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              ) : (
                <div className="text-center text-zinc-500 text-sm py-2">No history available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-[#0F0F12] border-b border-zinc-800/50 p-4 z-10 shrink-0 shadow-lg max-h-[50vh] overflow-y-auto custom-scrollbar">
          <div className="max-w-md mx-auto space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Profile</h3>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <UserPen className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    placeholder={t('displayName')}
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    className="w-full border border-zinc-800 bg-zinc-900/50 text-zinc-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-zinc-500"
                  />
                </div>
                <button
                  onClick={handleUpdateName}
                  disabled={!displayNameInput.trim() || displayNameInput === userDoc?.displayName}
                  className="bg-zinc-800 text-zinc-300 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                  title={t('updateName')}
                >
                  <Save size={18} />
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>Marked Areas</span>
                <span className="bg-zinc-800 px-2 py-0.5 rounded-full text-[10px] text-zinc-400">{userDoc?.geofences?.length || 0}</span>
              </h3>
              
              <div className="space-y-2">
                {!userDoc?.geofences || userDoc.geofences.length === 0 ? (
                  <div className="text-center py-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50 border-dashed">
                    <MapPin className="mx-auto text-zinc-600 mb-2" size={20} />
                    <p className="text-xs text-zinc-500">No areas marked yet.</p>
                    <p className="text-[10px] text-zinc-600 mt-1">Click the MapPin icon above to create one.</p>
                  </div>
                ) : (
                  userDoc.geofences.map(gf => (
                    <div key={gf.id} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-pink-300">{gf.name}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {gf.radius}m • Notify on {gf.triggerOn === 'both' ? 'Arrival & Departure' : gf.triggerOn}
                        </p>
                      </div>
                      <button 
                        onClick={() => deleteGeofence(gf.id)}
                        className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="Delete Area"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 relative">
        <MapComponent 
          userLocation={myLocation} 
          partnerLocation={partnerLocation} 
          userName={userDoc?.displayName}
          partnerName={partnerName || undefined}
          historyPoints={showHistory ? historyPoints : undefined}
          historyColor={historyViewTarget === 'mine' ? '#818cf8' : '#a1a1aa'}
          geofences={userDoc?.geofences}
          isMarkingLocation={isMarkingLocation}
          onMapClick={handleMapClick}
          partnerSpeed={partnerSpeed}
        />
        {locationError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/90 backdrop-blur border border-red-800 px-6 py-2 rounded-full shadow-2xl z-[1000] flex items-center gap-2">
            <span className="text-xs font-medium text-red-200">Location Error: {locationError}</span>
          </div>
        )}

        {/* Background Instructions Modal */}
        {showBackgroundModal && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="text-indigo-400" size={24} />
                  {t('backgroundInstructionsTitle')}
                </h3>
                <button onClick={() => setShowBackgroundModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              <div className="space-y-4 text-sm text-zinc-300">
                <p className="bg-indigo-500/10 text-indigo-300 p-3 rounded-xl border border-indigo-500/20">
                  {t('backgroundHelp')}
                </p>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2 shrink-0" />
                    <span>{t('backgroundInstructionsStep1')}</span>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2 shrink-0" />
                    <span>{t('backgroundInstructionsStep2')}</span>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2 shrink-0" />
                    <span>{t('backgroundInstructionsStep3')}</span>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-2 shrink-0" />
                    <span>{t('backgroundInstructionsStep4')}</span>
                  </li>
                </ul>
                <button
                  onClick={() => setShowBackgroundModal(false)}
                  className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-indigo-900/20"
                >
                  {t('close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Location Permission Modal */}
        {permissionState === 'denied' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-red-900/50 p-6 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                  <MapPinOff size={24} />
                  {t('locationPermissionDenied')}
                </h3>
              </div>
              <div className="space-y-4 text-sm text-zinc-300">
                <p className="bg-red-500/10 text-red-300 p-3 rounded-xl border border-red-500/20">
                  {t('locationPermissionInstructions')}
                </p>
                <ul className="space-y-3">
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                    <span>{t('locationPermissionStep1')}</span>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                    <span>{t('locationPermissionStep2')}</span>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                    <span>{t('locationPermissionStep3')}</span>
                  </li>
                  <li className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                    <span>{t('locationPermissionStep4')}</span>
                  </li>
                </ul>
                <button
                  onClick={() => window.location.reload()}
                  className="w-full mt-6 bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-xl transition-colors shadow-lg shadow-red-900/20"
                >
                  {t('locationPermissionStep4')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Geofence Draft Overlay */}
        {newGeofenceDraft && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 p-5 rounded-2xl shadow-2xl z-[2000] w-[90%] max-w-sm">
            <h3 className="text-white font-medium mb-4 flex items-center justify-between">
              Configure Area
              <button onClick={() => setNewGeofenceDraft(null)} className="text-zinc-400 hover:text-white p-1">
                <X size={18} />
              </button>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Name</label>
                <input 
                  type="text" 
                  value={newGeofenceDraft.name} 
                  onChange={e => setNewGeofenceDraft({ ...newGeofenceDraft, name: e.target.value })}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                  placeholder="Home, Work, etc."
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Radius: {newGeofenceDraft.radius}m</label>
                <input 
                  type="range" 
                  min="50" 
                  max="5000" 
                  step="50"
                  value={newGeofenceDraft.radius} 
                  onChange={e => setNewGeofenceDraft({ ...newGeofenceDraft, radius: parseInt(e.target.value) })}
                  className="w-full accent-pink-500"
                />
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                  <span>Small</span>
                  <span>Large</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Notify me when partner...</label>
                <div className="flex gap-2">
                  {(['entry', 'exit', 'both'] as const).map(trigger => (
                    <button
                      key={trigger}
                      onClick={() => setNewGeofenceDraft({ ...newGeofenceDraft, triggerOn: trigger })}
                      className={`flex-1 py-1.5 text-xs rounded-md font-medium capitalize border ${
                        newGeofenceDraft.triggerOn === trigger 
                          ? 'bg-pink-500/20 border-pink-500 text-pink-300' 
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                      }`}
                    >
                      {trigger === 'both' ? 'Arrives/Leaves' : trigger === 'entry' ? 'Arrives' : 'Leaves'}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={saveGeofence}
                className="w-full bg-pink-600 hover:bg-pink-500 text-white font-medium py-2 rounded-lg mt-2 transition-colors shadow-lg shadow-pink-900/20"
              >
                Save Marked Area
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Control Panel */}
      <div className="bg-[#0F0F12] border-t border-zinc-800/50 p-4 shrink-0 z-10 rounded-t-2xl">
        {!isPaired ? (
          <div className="space-y-4">
            <button 
              onClick={() => setShowPairingSection(!showPairingSection)}
              className="w-full flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl text-sm font-medium text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              <span>{showPairingSection ? t('hidePairingSection') : t('showPairingSection')}</span>
              {showPairingSection ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showPairingSection && (
              <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
                <p className="text-sm text-indigo-300 font-medium mb-2">{t('shareCodeWithPartner')}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-zinc-900 px-3 py-2 rounded-lg text-sm font-mono text-zinc-300 border border-zinc-800 truncate">
                    {user.uid}
                  </code>
                  <button 
                    onClick={copyMyCode}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors shrink-0 shadow-lg shadow-indigo-900/20"
                  >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                </div>
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-[#0F0F12] text-zinc-500">OR</span>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('enterCodeToPair')}
                value={pairingCodeInput}
                onChange={(e) => setPairingCodeInput(e.target.value)}
                className="flex-1 border border-zinc-800 bg-zinc-900/50 text-zinc-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-zinc-500"
              />
              <button
                onClick={handlePair}
                disabled={!pairingCodeInput.trim()}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-900/20"
              >
                {t('pair')}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-3 h-3 rounded-full ${partnerLocation && !partnerLocation.ghostMode ? 'bg-emerald-500' : 'bg-zinc-600'}`}></div>
                {partnerLocation && !partnerLocation.ghostMode && (
                  <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-200">
                  {partnerLocation ? (partnerLocation.ghostMode ? 'Partner is hidden' : 'Partner is sharing') : t('waitingForPartner')}
                </p>
                <p className="text-xs font-mono text-zinc-500">
                  {partnerLocation && !partnerLocation.ghostMode 
                    ? `${t('battery')}: ${partnerLocation.battery}%` 
                    : t('offline')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleGhostMode}
                className={`p-3 rounded-xl transition-all ${
                  ghostMode 
                    ? 'bg-zinc-800 text-amber-400 hover:bg-zinc-700 border border-zinc-700' 
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
                }`}
                title={t('ghostMode')}
              >
                <Ghost size={20} className={ghostMode ? 'fill-amber-400/20' : ''} />
              </button>
              
              <button
                onClick={handleUnpair}
                className="p-3 bg-red-900/20 text-red-400 hover:bg-red-900/40 rounded-xl transition-colors border border-red-900/30"
                title={t('unpair')}
              >
                <Unlink size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
