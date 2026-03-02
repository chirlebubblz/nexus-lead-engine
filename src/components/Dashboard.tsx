'use client';

import { useState, useEffect, useRef } from 'react';
import { useLeads } from '@/hooks/useLeads';
import MapWrapper from '@/components/MapWrapper';
import LeadList from '@/components/LeadList';
import { Search, MapPin, LogOut, LogIn } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const ADMIN_EMAIL = 'jerafisabalo@gmail.com';

export default function Dashboard() {
    const { leads, loading, refetch } = useLeads();
    const [query, setQuery] = useState('marketing agency'); // Default search
    const [locationText, setLocationText] = useState('San Francisco, CA, USA');
    const [predictions, setPredictions] = useState<any[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [userEmail, setUserEmail] = useState<string | null>(null);

    const router = useRouter();
    const supabase = createClient();

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email ?? null);
            }
        };
        getUser();
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    // Default Map Center & Bounds
    const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number } | null>(null);
    const [mapBounds, setMapBounds] = useState({ lat: 37.7749, lng: -122.4194, radius: 5000 });
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

    const [nextPageToken, setNextPageToken] = useState<string | null>(null);

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

        const timer = setTimeout(fetchPredictions, 300); // Debounce
        return () => clearTimeout(timer);
    }, [locationText, showDropdown]);

    const handleSelectLocation = async (placeId: string, description: string) => {
        setLocationText(description);
        setShowDropdown(false);
        setPredictions([]);

        // Geocode to get lat/lng for the map
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

    const handleSearchArea = async (lat: number, lng: number, radius: number, isLoadMore = false) => {
        if (!query) return alert('Please enter a search query first');

        setIsSearching(true);
        // Force the UI Dropdown to close and reset old state
        setShowDropdown(false);
        setPredictions([]);

        if (!isLoadMore) {
            setNextPageToken(null);
        }

        try {
            const payload: any = {
                query,
                latitude: lat,
                longitude: lng,
                radius
            };

            if (isLoadMore && nextPageToken) {
                payload.pageToken = nextPageToken;
            }

            const res = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                throw new Error('Search failed');
            }

            const data = await res.json();

            if (data.nextPageToken) {
                setNextPageToken(data.nextPageToken);
            } else {
                setNextPageToken(null); // No more pages
            }

            // Supabase Realtime might be disabled on the leads table,
            // so we manually pull the new list to guarantee the UI updates instantly.
            await refetch();
        } catch (error) {
            console.error(error);
            alert('Search failed. Check console for details.');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-neutral-100 overflow-hidden">
            {/* Sidebar / List View */}
            <div className="w-1/3 min-w-[400px] h-full flex flex-col bg-white border-r border-neutral-200 z-10 shadow-xl">
                <div className="p-6 border-b border-neutral-100 bg-white relative">
                    <div className="absolute top-6 right-6 flex items-center gap-3">
                        {userEmail ? (
                            <>
                                <span className={userEmail === ADMIN_EMAIL ? "text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full" : "text-xs font-medium text-neutral-400"}>
                                    {userEmail === ADMIN_EMAIL ? 'ADMIN' : userEmail}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                                    title="Sign Out"
                                >
                                    <LogOut size={16} />
                                </button>
                            </>
                        ) : (
                            <div className="flex flex-col items-end gap-1">
                                <button
                                    onClick={() => router.push('/login')}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors border border-blue-100"
                                >
                                    <LogIn size={12} /> Admin Login
                                </button>
                                <span className="text-[10px] text-neutral-400 font-medium">Guest Limit: 100/day</span>
                            </div>
                        )}
                    </div>

                    <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Nexus Lead Engine</h1>
                    <p className="text-sm text-neutral-500 mt-1 mb-4">Find & enrich local businesses in real-time</p>

                    <div className="space-y-3">
                        <div className="relative flex items-center">
                            <Search className="absolute left-3 text-neutral-400" size={18} />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Industry (e.g. coffee shop, plumbers)"
                                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            />
                        </div>

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
                                placeholder="Location (Country, State, City)"
                                className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                            />

                            {/* Autocomplete Dropdown */}
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

                        <button
                            onClick={() => handleSearchArea(mapBounds.lat, mapBounds.lng, mapBounds.radius)}
                            disabled={isSearching}
                            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSearching ? (
                                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            ) : (
                                <Search size={18} />
                            )}
                            {isSearching ? 'Searching...' : 'Search Leads'}
                        </button>

                        {nextPageToken && (
                            <button
                                onClick={() => handleSearchArea(mapBounds.lat, mapBounds.lng, mapBounds.radius, true)}
                                disabled={isSearching}
                                className="w-full mt-2 bg-white hover:bg-neutral-50 border border-blue-200 text-blue-600 font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                            >
                                {isSearching ? (
                                    <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                                ) : (
                                    <Search size={16} />
                                )}
                                Load More Leads
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
                {isSearching && (
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur pb-2 pt-2 px-4 rounded-full shadow-lg text-sm font-medium flex items-center gap-2 z-[1000] border border-neutral-100">
                        <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
                        Searching Area...
                    </div>
                )}
            </div>
        </div>
    );
}
