import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, CircleMarker, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { UserLocation, HistoryPoint, Geofence } from './types';
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

const createPartnerIcon = (isGhostMode: boolean, isSpeeding: boolean) => L.divIcon({
  className: 'bg-transparent border-0',
  html: `
    <div class="flex flex-col items-center">
      <div class="p-1 bg-[#0F0F12] rounded-full shadow-2xl relative ${!isGhostMode ? 'animate-pulse' : ''}">
        <div class="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden border-2 ${isSpeeding ? 'border-red-500' : 'border-zinc-500'}">
           <div class="w-full h-full ${isSpeeding ? 'bg-gradient-to-tr from-red-600 to-red-400' : 'bg-gradient-to-tr from-zinc-600 to-zinc-400'}"></div>
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
  userName?: string;
  partnerName?: string;
  historyPoints?: HistoryPoint[];
  historyColor?: string;
  geofences?: Geofence[];
  isMarkingLocation?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  partnerSpeed?: number | null;
}

// Component to handle map clicks
function MapClickHandler({ isMarkingLocation, onMapClick }: { isMarkingLocation?: boolean, onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (isMarkingLocation && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

// Component to recenter map when location changes or on first load
function MapUpdater({ userLocation, partnerLocation, historyPoints }: MapProps) {
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
    const latLngs: L.LatLngExpression[] = [];
    if (userLocation) latLngs.push([userLocation.lat, userLocation.lng]);
    if (partnerLocation) latLngs.push([partnerLocation.lat, partnerLocation.lng]);
    if (historyPoints && historyPoints.length > 0) {
      historyPoints.forEach(p => latLngs.push([p.lat, p.lng]));
    }

    if (latLngs.length > 1) {
      const bounds = L.latLngBounds(latLngs);
      // Pad bounds slightly
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [map, userLocation, partnerLocation, historyPoints]);

  return null;
}

export function MapComponent({ userLocation, partnerLocation, userName, partnerName, historyPoints, historyColor = '#6366f1', geofences, isMarkingLocation, onMapClick, partnerSpeed }: MapProps) {
  const { t } = useTranslation();

  const formatTime = (ts: number) => {
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    }).format(new Date(ts));
  };

  const isPartnerSpeeding = partnerSpeed !== null && partnerSpeed !== undefined && partnerSpeed > 100;

  return (
    <div className={`w-full h-full relative z-0 ${isMarkingLocation ? 'cursor-crosshair' : ''}`}>
      <MapContainer 
        center={[0, 0]} 
        zoom={2} 
        style={{ height: '100%', width: '100%', background: '#111114' }}
        zoomControl={false}
      >
        <MapClickHandler isMarkingLocation={isMarkingLocation} onMapClick={onMapClick} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {geofences?.map(gf => (
          <Circle 
            key={gf.id} 
            center={[gf.lat, gf.lng]} 
            radius={gf.radius} 
            pathOptions={{ color: '#ec4899', fillColor: '#ec4899', fillOpacity: 0.2, weight: 2 }}
          >
            <Popup>
               <div className="text-sm">
                 <p className="font-semibold text-pink-400">{gf.name}</p>
                 <p className="text-zinc-400 text-xs mt-1">Radius: {gf.radius}m</p>
                 <p className="text-zinc-400 text-xs">Trigger: {gf.triggerOn}</p>
               </div>
            </Popup>
          </Circle>
        ))}

        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createUserIcon(userLocation.ghostMode)}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-indigo-400">{userName || t('yourLocation')}</p>
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
          <Marker position={[partnerLocation.lat, partnerLocation.lng]} icon={createPartnerIcon(partnerLocation.ghostMode, isPartnerSpeeding)}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-zinc-300">{partnerName || t('partnerLocation')}</p>
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
                    {partnerSpeed !== null && partnerSpeed !== undefined && (
                      <p className={`text-xs font-mono ${isPartnerSpeeding ? 'text-red-400 font-bold' : 'text-zinc-400'}`}>
                        Speed: {Math.round(partnerSpeed)} km/h
                      </p>
                    )}
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {historyPoints && historyPoints.length > 0 && (
          <>
            <Polyline 
              positions={historyPoints.map(p => [p.lat, p.lng])} 
              color={historyColor} 
              weight={4}
              opacity={0.7}
              dashArray="10, 10"
            />
            {historyPoints.map((p, index) => (
              <CircleMarker
                key={index}
                center={[p.lat, p.lng]}
                radius={4}
                pathOptions={{ color: historyColor, fillColor: '#0F0F12', fillOpacity: 1, weight: 2 }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold text-zinc-300">Point in Path</p>
                    <p className="text-zinc-400 text-xs mt-1 font-mono">
                      {t('time')}: {formatTime(p.timestamp)}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </>
        )}

        <MapUpdater userLocation={userLocation} partnerLocation={partnerLocation} historyPoints={historyPoints} />
      </MapContainer>
    </div>
  );
}
