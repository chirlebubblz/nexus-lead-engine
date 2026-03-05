'use client';

import { useState, useEffect, useRef } from 'react';
import { useLeads } from '@/hooks/useLeads';
import MapWrapper from '@/components/MapWrapper';
import LeadList from '@/components/LeadList';
import { Search, MapPin, Grid3X3, XCircle, Loader2, Map as MapIcon, Layers, Globe } from 'lucide-react';
import { LOCATION_DATA } from '@/data/locations';

export default function Dashboard() {
    const { leads, loading, refetch } = useLeads();
    const [query, setQuery] = useState('cleaning companies');
    const [activeTab, setActiveTab] = useState<'local' | 'hopper'>('local');

    // --- LOCAL SEARCH STATES ---
    const [locationText, setLocationText] = useState('Los Angeles, CA, USA');
    const [predictions, setPredictions] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [gridSize, setGridSize] = useState<number>(3);
    const [sweepProgress, setSweepProgress] = useState({ current: 0, total: 0 });

    // --- HOPPER STATES (Cascading) ---
    const availableCountries = Object.keys(LOCATION_DATA);
    const [selectedCountry, setSelectedCountry] = useState<string>(availableCountries[0]);

    const availableStates = LOCATION_DATA[selectedCountry] ? Object.keys(LOCATION_DATA[selectedCountry]) : [];
    const [selectedState, setSelectedState] = useState<string>(availableStates.includes('California') ? 'California' : availableStates[0]);

    const availableCities = LOCATION_DATA[selectedCountry]?.[selectedState] || [];
    const [selectedCities, setSelectedCities] = useState<string[]>([]);

    const [isHopping, setIsHopping] = useState(false);
    const [hopperProgress, setHopperProgress] = useState({ cityIndex: 0, totalCities: 0, currentCity: '', currentGrid: 0, totalGrid: 0 });

    const isSweepingRef = useRef(false);
    const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number } | null>({ lat: 34.0522, lng: -118.2437 });
    const [mapBounds, setMapBounds] = useState({ lat: 34.0522, lng: -118.2437, radius: 2000 });
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cascading Logic: Update State when Country changes
    useEffect(() => {
        const states = Object.keys(LOCATION_DATA[selectedCountry] || {});
        if (states.length > 0 && !states.includes(selectedState)) {
            setSelectedState(states[0]);
        }
    }, [selectedCountry]);

    // Cascading Logic: Update Cities when State changes
    useEffect(() => {
        const cities = LOCATION_DATA[selectedCountry]?.[selectedState] || [];
        setSelectedCities(cities.map(c => c.name));
    }, [selectedCountry, selectedState]);

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
            } catch (err) { }
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
                if (data.lat && data.lng) setMapCenter({ lat: data.lat, lng: data.lng });
            }
        } catch (err) { }
    };

    const stopSweep = () => {
        isSweepingRef.current = false;
        setIsSearching(false);
        setIsHopping(false);
    };

    const toggleCitySelection = (cityName: string) => {
        setSelectedCities(prev =>
            prev.includes(cityName) ? prev.filter(c => c !== cityName) : [...prev, cityName]
        );
    };

    const handleLocalSearch = async (centerLat: number, centerLng: number, radius: number) => {
        if (!query) return alert('Please enter a search query first');
        setIsSearching(true);
        setShowDropdown(false);
        setPredictions([]);
        isSweepingRef.current = true;

        if (!isBulkMode) {
            try {
                await fetch('/api/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, latitude: centerLat, longitude: centerLng, radius })
                });
                await refetch();
            } finally {
                setIsSearching(false);
                isSweepingRef.current = false;
            }
            return;
        }

        const totalSearches = gridSize * gridSize;
        setSweepProgress({ current: 0, total: totalSearches });
        const offset = Math.floor(gridSize / 2);
        const LAT_STEP = 0.027; const LNG_STEP = 0.034;
        let completed = 0;

        for (let x = -offset; x <= offset; x++) {
            for (let y = -offset; y <= offset; y++) {
                if (!isSweepingRef.current) return;
                const gridLat = centerLat + (x * LAT_STEP);
                const gridLng = centerLng + (y * LNG_STEP);
                completed++;
                setSweepProgress({ current: completed, total: totalSearches });

                try {
                    await fetch('/api/search', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ query, latitude: gridLat, longitude: gridLng, radius: 2500, clearExisting: completed === 1 })
                    });
                    await refetch();
                } catch (error) { }

                if (completed < totalSearches) await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        setIsSearching(false);
        isSweepingRef.current = false;
    };

    const handleCityHopper = async () => {
        if (!query) return alert('Please enter a search query first');
        if (selectedCities.length === 0) return alert('Please select at least one city.');

        setIsHopping(true);
        isSweepingRef.current = true;

        const citiesToScrape = availableCities.filter(c => selectedCities.includes(c.name));
        const LAT_STEP = 0.027; const LNG_STEP = 0.034;
        const gridsPerCity = 3 * 3;
        let isFirst = true;

        for (let i = 0; i < citiesToScrape.length; i++) {
            if (!isSweepingRef.current) return;

            const city = citiesToScrape[i];
            setMapCenter({ lat: city.lat, lng: city.lng });

            let currentGridCount = 0;

            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    if (!isSweepingRef.current) return;

                    const gridLat = city.lat + (x * LAT_STEP);
                    const gridLng = city.lng + (y * LNG_STEP);
                    currentGridCount++;

                    setHopperProgress({
                        cityIndex: i + 1,
                        totalCities: citiesToScrape.length,
                        currentCity: city.name,
                        currentGrid: currentGridCount,
                        totalGrid: gridsPerCity
                    });

                    try {
                        await fetch('/api/search', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ query, latitude: gridLat, longitude: gridLng, radius: 2500, clearExisting: isFirst })
                        });
                        isFirst = false;
                        await refetch();
                    } catch (error) { }

                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            if (i < citiesToScrape.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }

        setIsHopping(false);
        isSweepingRef.current = false;
    };

    return (
        <div className="flex h-screen w-full bg-neutral-100 overflow-hidden relative">

            <div className="w-1/3 min-w-[420px] h-full flex flex-col bg-white border-r border-neutral-200 z-10 shadow-xl">

                <div className="p-6 border-b border-neutral-100 bg-white shrink-0">
                    <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Nexus Lead Engine</h1>

                    <div className="flex bg-neutral-100 p-1 rounded-lg mt-4 mb-4">
                        <button
                            onClick={() => setActiveTab('local')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${activeTab === 'local' ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                        >
                            <MapIcon size={16} /> Local
                        </button>
                        <button
                            onClick={() => setActiveTab('hopper')}
                            className={`flex-1 py-1.5 text-sm font-medium rounded-md flex items-center justify-center gap-2 transition-all ${activeTab === 'hopper' ? 'bg-white text-blue-600 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}
                        >
                            <Globe size={16} /> Macro Sweep
                        </button>
                    </div>

                    <div className="relative flex items-center mb-4">
                        <Search className="absolute left-3 text-neutral-400" size={18} />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Industry (e.g. cleaning companies)"
                            disabled={isSearching || isHopping}
                            className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium disabled:opacity-60"
                        />
                    </div>

                    {/* TAB: LOCAL SEARCH */}
                    {activeTab === 'local' && (
                        <div className="space-y-3 animate-in fade-in">
                            <div className="relative flex items-center" ref={dropdownRef}>
                                <MapPin className="absolute left-3 text-neutral-400" size={18} />
                                <input
                                    type="text"
                                    value={locationText}
                                    onChange={(e) => { setLocationText(e.target.value); setShowDropdown(true); }}
                                    onFocus={() => setShowDropdown(true)}
                                    disabled={isSearching || isHopping}
                                    placeholder="Location (Country, State, City)"
                                    className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium disabled:opacity-60"
                                />
                                {showDropdown && predictions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-xl max-h-60 overflow-y-auto z-[9999]">
                                        {predictions.map((p) => (
                                            <button
                                                key={p.place_id}
                                                onClick={() => handleSelectLocation(p.place_id, p.description)}
                                                className="w-full text-left px-4 py-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-0 focus:outline-none"
                                            >
                                                <div className="text-sm font-medium text-neutral-900">{p.main_text}</div>
                                                {p.secondary_text && <div className="text-xs text-neutral-500 mt-0.5">{p.secondary_text}</div>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-neutral-700">
                                    <input
                                        type="checkbox"
                                        checked={isBulkMode}
                                        onChange={(e) => setIsBulkMode(e.target.checked)}
                                        disabled={isSearching || isHopping}
                                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer disabled:opacity-60"
                                    />
                                    <Grid3X3 size={16} className={isBulkMode ? "text-blue-600" : "text-neutral-400"} />
                                    Bulk Grid Sweep
                                </label>
                                {isBulkMode && (
                                    <select
                                        value={gridSize}
                                        onChange={(e) => setGridSize(Number(e.target.value))}
                                        disabled={isSearching || isHopping}
                                        className="bg-white border border-neutral-200 text-xs rounded px-2 py-1 outline-none disabled:opacity-60"
                                    >
                                        <option value={3}>3x3 Grid (9 searches)</option>
                                        <option value={5}>5x5 Grid (25 searches)</option>
                                        <option value={10}>10x10 Grid (100 searches)</option>
                                    </select>
                                )}
                            </div>

                            {isSearching ? (
                                <button onClick={stopSweep} className="w-full mt-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                    <XCircle size={18} /> Stop Search
                                </button>
                            ) : (
                                <button onClick={() => handleLocalSearch(mapBounds.lat, mapBounds.lng, mapBounds.radius)} disabled={isHopping} className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm">
                                    <Search size={18} /> {isBulkMode ? `Start Bulk Sweep` : 'Search This Area'}
                                </button>
                            )}
                        </div>
                    )}

                    {/* TAB: CITY HOPPER (MACRO) */}
                    {activeTab === 'hopper' && (
                        <div className="space-y-3 animate-in fade-in flex flex-col h-full">

                            {/* Cascading Dropdowns */}
                            <div className="flex gap-2">
                                <select
                                    value={selectedCountry}
                                    onChange={(e) => setSelectedCountry(e.target.value)}
                                    disabled={isHopping || isSearching}
                                    className="w-1/2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium disabled:opacity-60"
                                >
                                    {availableCountries.map(country => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>

                                <select
                                    value={selectedState}
                                    onChange={(e) => setSelectedState(e.target.value)}
                                    disabled={isHopping || isSearching || availableStates.length === 0}
                                    className="w-1/2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium disabled:opacity-60"
                                >
                                    {availableStates.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-white border border-neutral-200 rounded-lg p-3 max-h-40 overflow-y-auto shadow-inner">
                                <div className="text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">
                                    {selectedState} Cities ({selectedCities.length})
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {availableCities.map(city => (
                                        <label key={city.name} className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedCities.includes(city.name)}
                                                onChange={() => toggleCitySelection(city.name)}
                                                disabled={isHopping || isSearching}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            {city.name}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {isHopping ? (
                                <button onClick={stopSweep} className="w-full mt-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                    <XCircle size={18} /> Abort Macro Sweep
                                </button>
                            ) : (
                                <button onClick={handleCityHopper} disabled={isSearching || selectedCities.length === 0} className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm">
                                    <Layers size={18} /> Start Macro Sweep
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-auto bg-neutral-50">
                    <LeadList leads={leads} loading={loading} isSearching={isSearching || isHopping} refetch={refetch} />
                </div>
            </div>

            {/* Map View */}
            <div className="flex-1 h-full relative z-0">
                <MapWrapper
                    onSearchArea={(lat, lng, radius) => handleLocalSearch(lat, lng, radius)}
                    center={mapCenter}
                    onBoundsChange={(lat, lng, radius) => setMapBounds({ lat, lng, radius })}
                />

                {/* Local Search Progress */}
                {isSearching && isBulkMode && activeTab === 'local' && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-96 bg-white/95 backdrop-blur rounded-xl shadow-2xl border border-blue-100 p-5 z-[1000]">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin text-blue-600" /> Sweeping Grid...
                            </h3>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                                {sweepProgress.current} / {sweepProgress.total}
                            </span>
                        </div>
                        <div className="w-full bg-neutral-100 rounded-full h-2 mb-2 overflow-hidden">
                            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(sweepProgress.current / sweepProgress.total) * 100}%` }}></div>
                        </div>
                    </div>
                )}

                {/* Macro Sweep Progress */}
                {isHopping && activeTab === 'hopper' && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-96 bg-white/95 backdrop-blur rounded-xl shadow-2xl border border-indigo-100 p-5 z-[1000]">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-neutral-900 flex items-center gap-2">
                                <Loader2 size={16} className="animate-spin text-indigo-600" /> Macro Sweep Active...
                            </h3>
                            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                                City {hopperProgress.cityIndex} of {hopperProgress.totalCities}
                            </span>
                        </div>
                        <p className="text-sm font-medium text-neutral-700 mb-3 truncate">
                            📍 Sweeping <span className="font-bold text-indigo-600">{hopperProgress.currentCity}</span> ({hopperProgress.currentGrid}/{hopperProgress.totalGrid})
                        </p>
                        <div className="w-full bg-neutral-100 rounded-full h-2 mb-2 overflow-hidden">
                            <div className="bg-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${(hopperProgress.cityIndex / hopperProgress.totalCities) * 100}%` }}></div>
                        </div>
                        <p className="text-xs text-neutral-500 text-center mt-2">
                            Keep this tab open. Map coordinates are shifting automatically.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
