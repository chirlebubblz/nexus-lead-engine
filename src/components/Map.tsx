'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap } from 'react-leaflet';
import { Search } from 'lucide-react';
import L from 'leaflet';

// Fix for missing marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapEvents({ onMoveEnd }: { onMoveEnd: (map: L.Map) => void }) {
    const map = useMapEvents({
        moveend: () => onMoveEnd(map),
    });
    return null;
}

function MapUpdater({ center }: { center?: { lat: number, lng: number } | null }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo([center.lat, center.lng], 13, { duration: 1.5 });
        }
    }, [center, map]);
    return null;
}

export interface MapProps {
    onSearchArea: (lat: number, lng: number, radius: number) => void;
    onBoundsChange?: (lat: number, lng: number, radius: number) => void;
    center?: { lat: number, lng: number } | null;
}

export default function Map({
    onSearchArea,
    onBoundsChange,
    center
}: MapProps) {
    const [mapRef, setMapRef] = useState<L.Map | null>(null);

    const handleSearch = () => {
        if (!mapRef) return;
        const center = mapRef.getCenter();
        // Rough estimate of radius based on zoom level. 
        // Usually radius = bounds distance / 2
        const bounds = mapRef.getBounds();
        const radiusInMeters = center.distanceTo(bounds.getNorthWest()) * 0.5;

        // Max radius for Places API is typically 50000. Clamp it to 1000 - 50000
        const clampedRadius = Math.max(1000, Math.min(50000, radiusInMeters));

        onSearchArea(center.lat, center.lng, clampedRadius);
    };

    return (
        <div className="relative h-full w-full">
            <MapContainer
                center={[37.7749, -122.4194]} // Default San Francisco
                zoom={13}
                className="h-full w-full z-0"
                ref={setMapRef}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
                <MapEvents onMoveEnd={(map) => {
                    setMapRef(map);
                    if (onBoundsChange) {
                        const center = map.getCenter();
                        const bounds = map.getBounds();
                        const radius = Math.max(1000, Math.min(50000, center.distanceTo(bounds.getNorthWest()) * 0.5));
                        onBoundsChange(center.lat, center.lng, radius);
                    }
                }} />
                <MapUpdater center={center} />
            </MapContainer>

            {/* Floating Search Button */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
                <button
                    onClick={handleSearch}
                    className="bg-black text-white hover:bg-neutral-800 shadow-lg px-6 py-3 rounded-full flex items-center gap-2 font-medium transition-transform active:scale-95"
                >
                    <Search size={18} />
                    <span>Search This Area</span>
                </button>
            </div>
        </div>
    );
}
