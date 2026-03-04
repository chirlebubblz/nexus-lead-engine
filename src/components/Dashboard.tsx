'use client';

import { useState, useEffect, useRef } from 'react';
import { useLeads } from '@/hooks/useLeads';
import MapWrapper from '@/components/MapWrapper';
import LeadList from '@/components/LeadList';
import { Search, MapPin, Grid3X3, XCircle, Loader2 } from 'lucide-react';

export default function Dashboard() {
    const { leads, loading, refetch } = useLeads();
    const [query, setQuery] = useState('cleaning companies');
    const [locationText, setLocationText] = useState('Los Angeles, CA, USA');
    const [predictions, setPredictions] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);

    // UI States
    const [isSearching, setIsSearching] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [gridSize, setGridSize] = useState<number>(3); // 3x3 default

    // Sweep States
    const [sweepProgress, setSweepProgress] = useState({ current: 0, total: 0 });
    const isSweepingRef = useRef(false);

    // Default Map Center & Bounds
    const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number } | null>({ lat: 34.0522, lng: -118.2437 });
    const [mapBounds, setMapBounds] = useState({ lat: 34.0522, lng: -118.2437, radius: 2000 });
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch Autocomplete Predictions
    useEffect(() => {
        if (!locationText || locationText.length < 3 || !showDropdown) {
            setPredictions([]);
            return;
        }

        const fetchPredictions = async () => {
            try {
                const res = await fetch(`/api/autocomplete?input=${encodeURIComponent(locationText)}`);
                if (res.ok) {
                    const data = await res.json();
                    setPredictions(data.predictions || []);
                }
            } catch (err) {
                console.error("Autocomplete failed", err);
            }
        };

        const timer = setTimeout(fetchPredictions, 300);
        return () => clearTimeout(timer);
    }, [locationText, showDropdown]);

    const handleSelectLocation = async (placeId: string, description: string) => {
        setLocationText(description);
        setShowDropdown(false);
        setPredictions([]);

        try {
            const res = await fetch(`/api/geocode?placeId=${placeId}`);
            if (res.ok) {
                const data = await res.json();
                if (data.lat && data.lng) {
                    setMapCenter({ lat: data.lat, lng: data.lng });
                }
            }
        } catch (err) {
            console.error("Geocoding failed", err);
        }
    };

    const stopSweep = () => {
        isSweepingRef.current = false;
        setIsSearching(false);
    };

    // The Client-Side Orchestrator
    const handleSearchArea = async (centerLat: number, centerLng: number, radius: number) => {
        if (!query) return alert('Please enter a search query first');

        setIsSearching(true);
        setShowDropdown(false);
        setPredictions([]);
        isSweepingRef.current = true;

        if (!isBulkMode) {
            // SINGLE SEARCH (Standard)
            try {
                await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, latitude: centerLat, longitude: centerLng, radius })
                });
                await refetch();
            } catch (error) {
                console.error(error);
                alert('Search failed. Check console.');
            } finally {
                setIsSearching(false);
                isSweepingRef.current = false;
            }
            return;
        }

        // BULK SWEEP MODE
        const totalSearches = gridSize * gridSize;
        setSweepProgress({ current: 0, total: totalSearches });

        const offset = Math.floor(gridSize / 2);
        // Approx coordinates step to shift ~2.5km per grid block
        const LAT_STEP = 0.027;
        const LNG_STEP = 0.034;

        let completed = 0;

        // Loop through the grid
        for (let x = -offset; x <= offset; x++) {
            for (let y = -offset; y <= offset; y++) {
                if (!isSweepingRef.current) {
                    console.log("Sweep aborted by user.");
                    return; // Break the loop if user cancelled
                }

                const gridLat = centerLat + (x * LAT_STEP);
                const gridLng = centerLng + (y * LNG_STEP);

                completed++;
                setSweepProgress({ current: completed, total: totalSearches });

                try {
                    await fetch('/api/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        // Hardcode radius to ~2500m for grid consistency
                        body: JSON.stringify({ query, latitude: gridLat, longitude: gridLng, radius: 2500 })
                    });

                    // Refresh UI to show incoming leads
                    await refetch();

                } catch (error) {
                    console.error(`Sector failed at ${gridLat}, ${gridLng}:`, error);
                }

                // Wait 2 seconds between Google calls to avoid 429 Rate Limits
                // This delay also keeps the browser happy when minimized
                if (completed < totalSearches) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }

        setIsSearching(false);
        isSweepingRef.current = false;
    };

    return (
        <div className="flex h-screen w-full bg-neutral-100 overflow-hidden relative">
            {/* Sidebar / List View */}
            <div className="w-1/3 min-w-[400px] h-full flex flex-col bg-white border-r border-neutral-200 z-10 shadow-xl">
                <div className="p-6 border-b border-neutral-100 bg-white">
                    <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Nexus Lead Engine</h1>
                    <p className="text-sm text-neutral-500 mt-1 mb-4">Find & enrich local businesses in real-time</p>

                    <div className="space-y-3">
                        {/* Query Input */}
                        <div className="relative flex items-center">
                            <Search className="absolute left-3 text-neutral-400" size={18} />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Industry (e.g. coffee shop, plumbers)"
                                disabled={isSearching}
                                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium disabled:opacity-60"
                            />
                        </div>

                        {/* Location Input */}
                        <div className="relative flex items-center" ref={dropdownRef}>
                            <MapPin className="absolute left-3 text-neutral-400" size={18} />
                            <input
                                type="text"
                                value={locationText}
                                onChange={(e) => {
                                    setLocationText(e.target.value);
                                    setShowDropdown(true);
                                }}
                                onFocus={() => setShowDropdown(true)}
                                disabled={isSearching}
                                placeholder="Location (Country, State, City)"
                                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium disabled:opacity-60"
                            />
                            {showDropdown && predictions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-[9999]">
                                    {predictions.map((p) => (
                                        <button
                                            key={p.place_id}
                                            onClick={() => handleSelectLocation(p.place_id, p.description)}
                                            className="w-full text-left px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-0 focus:outline-none transition-colors"
                                        >
                                            <div className="text-sm font-medium text-neutral-900">{p.main_text}</div>
                                            {p.secondary_text && <div className="text-xs text-neutral-500 mt-0.5">{p.secondary_text}</div>}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Settings Row */}
                        <div className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-neutral-700">
                                <input
                                    type="checkbox"
                                    checked={isBulkMode}
                                    onChange={(e) => setIsBulkMode(e.target.checked)}
                                    disabled={isSearching}
                                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer disabled:opacity-60"
                                />
                                <Grid3X3 size={16} className={isBulkMode ? "text-blue-600" : "text-neutral-400"} />
                                Bulk Grid Sweep
                            </label>

                            {isBulkMode && (
                                <select
                                    value={gridSize}
                                    onChange={(e) => setGridSize(Number(e.target.value))}
                                    disabled={isSearching}
                                    className="bg-white border border-neutral-200 text-xs rounded px-2 py-1 outline-none disabled:opacity-60"
                                >
                                    <option value={3}>3x3 Grid (9 searches)</option>
                                    <option value={5}>5x5 Grid (25 searches)</option>
                                    <option value={10}>10x10 Grid (100 searches)</option>
                                </select>
                            )}
                        </div>

                        {/* Search Action Buttons */}
                        {isSearching && isBulkMode ? (
                            <button
                                onClick={stopSweep}
                                className="w-full mt-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                            >
                                <XCircle size={18} />
                                Stop Bulk Sweep
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSearchArea(mapBounds.lat, mapBounds.lng, mapBounds.radius)}
                                disabled={isSearching}
                                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                            >
                                {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                                {isSearching ? 'Searching...' : isBulkMode ? `Start Bulk Sweep` : 'Search This Area'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-neutral-50">
                    <LeadList leads={leads} loading={loading} isSearching={isSearching} refetch={refetch} />
                </div>
            </div>

            {/* Map View */}
            <div className="flex-1 h-full relative z-0">
                <MapWrapper
                    onSearchArea={handleSearchArea}
                    center={mapCenter}
                    onBoundsChange={(lat, lng, radius) => setMapBounds({ lat, lng, radius })}
                />

                {/* Single Search Overlay */}
                {isSearching && !isBulkMode && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur pb-2 pt-2 px-4 rounded-full shadow-lg text-sm font-medium flex items-center gap-2 z-[1000] border border-neutral-100">
                        <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        Searching Area...
                    </div>
                )}

                {/* Bulk Sweep Progress Overlay */}
                {isSearching && isBulkMode && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-96 bg-white/95 backdrop-blur rounded-xl shadow-2xl border border-blue-100 p-5 z-[1000]">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin text-blue-600" />
                                Sweeping Grid...
                            </h3>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                {sweepProgress.current} / {sweepProgress.total}
                            </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-neutral-100 rounded-full h-2 mb-2 overflow-hidden">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(sweepProgress.current / sweepProgress.total) * 100}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-neutral-500 text-center">
                            Keep this tab open. Map coordinates are shifting automatically.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
