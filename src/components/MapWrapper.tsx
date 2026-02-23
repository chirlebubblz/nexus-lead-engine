'use client';

import dynamic from 'next/dynamic';
import { MapProps } from '@/components/Map';

const DynamicMap = dynamic<MapProps>(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-neutral-200 animate-pulse flex items-center justify-center text-neutral-500">Loading Map...</div>
});

const MapWrapper = ({
    onSearchArea,
    center,
    onBoundsChange
}: {
    onSearchArea: (lat: number, lng: number, radius: number) => void,
    center?: { lat: number, lng: number } | null,
    onBoundsChange?: (lat: number, lng: number, radius: number) => void
}) => {
    return <DynamicMap onSearchArea={onSearchArea} center={center} onBoundsChange={onBoundsChange} />;
};

export default MapWrapper;
