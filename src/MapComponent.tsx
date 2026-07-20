import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { UserLocation } from './types';
import { useTranslation } from 'react-i18next';

const createUserIcon = (isGhostMode: boolean) => L.divIcon({
  className: 'bg-transparent border-0',
  html: `
    <div class="flex flex-col items-center">
      <div class="p-1 bg-[#0F0F12] rounded-full shadow-2xl relative">
        <div class="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border-2 border-indigo-500">
          <div class="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-400"></div>
        </div>
        <div class="absolute -bottom-1 -right-1 w-4 h-4 ${isGhostMode ? 'bg-amber-500' : 'bg-emerald-500'} border-2 border-[#0F0F12] rounded-full"></div>
      </div>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  popupAnchor: [0, -24],
});

const createPartnerIcon = (isGhostMode: boolean) => L.divIcon({
  className: 'bg-transparent border-0',
  html: `
    <div class="flex flex-col items-center">
      <div class="p-1 bg-[#0F0F12] rounded-full shadow-2xl relative ${!isGhostMode ? 'animate-pulse' : ''}">
        <div class="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border-2 border-zinc-500">
           <div class="w-full h-full bg-gradient-to-tr from-zinc-600 to-zinc-400"></div>
        </div>
        <div class="absolute -bottom-1 -right-1 w-4 h-4 ${isGhostMode ? 'bg-amber-500' : 'bg-emerald-500'} border-2 border-[#0F0F12] rounded-full"></div>
      </div>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  popupAnchor: [0, -24],
});

interface MapProps {
  userLocation: UserLocation | null;
  partnerLocation: UserLocation | null;
}

// Component to recenter map when location changes or on first load
function MapUpdater({ userLocation, partnerLocation }: MapProps) {
  const map = useMap();
  const [hasCentered, setHasCentered] = useState(false);

  useEffect(() => {
    if (!hasCentered && userLocation) {
      map.setView([userLocation.lat, userLocation.lng], 15);
      setHasCentered(true);
    }
  }, [map, userLocation, hasCentered]);

  // If both locations are available, we might want to fit bounds, but for now we just center on user initially
  useEffect(() => {
    if (userLocation && partnerLocation) {
      const bounds = L.latLngBounds(
        [userLocation.lat, userLocation.lng],
        [partnerLocation.lat, partnerLocation.lng]
      );
      // Pad bounds slightly
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, userLocation, partnerLocation]);

  return null;
}

export function MapComponent({ userLocation, partnerLocation }: MapProps) {
  const { t } = useTranslation();

  const formatTime = (ts: number) => {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    }).format(new Date(ts));
  };

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={[0, 0]} 
        zoom={2} 
        style={{ height: '100%', width: '100%', background: '#111114' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon(userLocation.ghostMode)}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-indigo-400">{t('yourLocation')}</p>
                <p className="text-zinc-400 text-xs mt-1 font-mono">
                  {t('lastSeen')}: {formatTime(userLocation.timestamp)}
                </p>
                {userLocation.battery !== null && (
                  <p className="text-zinc-400 text-xs font-mono">
                    {t('battery')}: {userLocation.battery}%
                  </p>
                )}
                {userLocation.ghostMode && (
                  <p className="text-amber-400 text-xs mt-1 font-medium">
                    {t('ghostModeActive')}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {partnerLocation && (
          <Marker position={[partnerLocation.lat, partnerLocation.lng]} icon={createPartnerIcon(partnerLocation.ghostMode)}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-zinc-300">{t('partnerLocation')}</p>
                {partnerLocation.ghostMode ? (
                  <p className="text-amber-400 text-xs mt-1 font-medium">
                    {t('ghostModeActive')}
                  </p>
                ) : (
                  <>
                    <p className="text-zinc-400 text-xs mt-1 font-mono">
                      {t('lastSeen')}: {formatTime(partnerLocation.timestamp)}
                    </p>
                    {partnerLocation.battery !== null && (
                      <p className="text-zinc-400 text-xs font-mono">
                        {t('battery')}: {partnerLocation.battery}%
                      </p>
                    )}
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        <MapUpdater userLocation={userLocation} partnerLocation={partnerLocation} />
      </MapContainer>
    </div>
  );
}
