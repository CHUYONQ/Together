import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { auth, dbCustom } from './lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useLocationTracker } from './useLocationTracker';
import { MapComponent } from './MapComponent';
import { UserLocation, UserDoc } from './types';
import { Ghost, Globe, Link2, Unlink, Copy, Check, ShieldAlert, Activity } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

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

  const toggleBackgroundMode = async () => {
    if (!isBackgroundActive) {
      try {
        if ('wakeLock' in navigator) {
          await (navigator as any).wakeLock.request('screen');
        }
        
        // Play silent audio hack to try to keep process alive in background
        const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
        audio.loop = true;
        await audio.play().catch(e => console.warn('Audio play blocked:', e));
        
        setIsBackgroundActive(true);
        alert(t('backgroundActive') + '\\n\\n' + t('backgroundHelp'));
      } catch (e: any) {
        console.error('Failed to enable background mode', e);
        alert('Could not enable background mode: ' + e.message);
      }
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

  const { partnerLocation, partnerUid, locationError } = useLocationTracker(user?.uid || null, ghostMode);

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
          <span className="text-sm font-medium">{t('updateAvailable')} (v1.0.3)</span>
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
          <span className="text-[10px] font-mono bg-zinc-900 text-indigo-400 px-1.5 py-0.5 rounded border border-zinc-800">v1.0.3</span>
        </h1>
        <div className="flex items-center gap-2">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative">
        <MapComponent userLocation={myLocation} partnerLocation={partnerLocation} />
        {locationError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-900/90 backdrop-blur border border-red-800 px-6 py-2 rounded-full shadow-2xl z-[1000] flex items-center gap-2">
            <span className="text-xs font-medium text-red-200">Location Error: {locationError}</span>
          </div>
        )}
      </main>

      {/* Bottom Control Panel */}
      <div className="bg-[#0F0F12] border-t border-zinc-800/50 p-4 shrink-0 z-10 rounded-t-2xl">
        {!isPaired ? (
          <div className="space-y-4">
            <div className="p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20">
              <p className="text-sm text-indigo-300 font-medium mb-2">Share your code with your partner:</p>
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
