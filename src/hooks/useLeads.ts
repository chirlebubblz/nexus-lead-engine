import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lead } from '@/types';
import { fetchAllLeads } from '@/lib/leads';

export function useLeads() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);

    const loadLeads = async () => {
        setLoading(true);
        const data = await fetchAllLeads();
        setLeads(data);
        setLoading(false);
    };

    useEffect(() => {
        // We no longer loadLeads() on mount so the app starts with an empty cache.
        // It will populate when the user triggers a search.

        // Subscribe to changes
        const subscription = supabase
            .channel('leads-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setLeads((prev) => [payload.new as Lead, ...prev]);
                } else if (payload.eventType === 'UPDATE') {
                    setLeads((prev) =>
                        prev.map((lead) => (lead.id === payload.new.id ? (payload.new as Lead) : lead))
                    );
                } else if (payload.eventType === 'DELETE') {
                    setLeads((prev) => prev.filter((lead) => lead.id !== payload.old.id));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    return { leads, loading, refetch: loadLeads };
}
