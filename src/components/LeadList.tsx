'use client';

import { Lead } from '@/types';
import { Loader2, CheckCircle2, XCircle, Clock, MapPin, Globe, Phone, Mail, Linkedin, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import LeadCard from '@/components/LeadCard';

export default function LeadList({ leads, loading, isSearching, refetch }: { leads: Lead[], loading: boolean, isSearching: boolean, refetch?: () => void }) {
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
    const [batchSize, setBatchSize] = useState<string>('5');
    const [isBatchEnriching, setIsBatchEnriching] = useState(false);
    const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 });


    // --- PAGINATION STATES ---
    const [currentPage, setCurrentPage] = useState(1);
    const leadsPerPage = 100;

    useEffect(() => {
        setCurrentPage(1);
    }, [leads.length]);

    const indexOfLastLead = currentPage * leadsPerPage;
    const indexOfFirstLead = indexOfLastLead - leadsPerPage;
    const currentLeads = leads.slice(indexOfFirstLead, indexOfLastLead);
    const totalPages = Math.ceil(leads.length / leadsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    const handleEnrich = async (leadId: string) => {
        setEnrichingIds(prev => new Set(prev).add(leadId));
        try {
            const res = await fetch('/api/enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadIds: [leadId] }),
            });
            if (!res.ok) throw new Error('Enrichment failed');
            if (refetch) refetch();
        } catch (error) {
            console.error('Failed to trigger enrichment:', error);
        } finally {
            setEnrichingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(leadId);
                return newSet;
            });
        }
    };

    const handleBatchEnrich = async () => {
        const isRetry = batchSize === 'failed';
        const targetLeads = leads.filter(l => l.status === (isRetry ? 'failed' : 'pending'));

        if (targetLeads.length === 0) return alert(`No ${isRetry ? 'failed' : 'pending'} leads to enrich.`);

        const limit = (batchSize === 'all' || batchSize === 'failed') ? targetLeads.length : parseInt(batchSize, 10);
        const leadsToProcess = targetLeads.slice(0, limit);

        setIsBatchEnriching(true);
        setEnrichProgress({ current: 0, total: leadsToProcess.length });

        const CHUNK_SIZE = 5;

        for (let i = 0; i < leadsToProcess.length; i += CHUNK_SIZE) {
            const chunk = leadsToProcess.slice(i, i + CHUNK_SIZE);
            const chunkIds = chunk.map(l => l.id);

            setEnrichingIds(prev => new Set([...prev, ...chunkIds]));

            try {
                await fetch('/api/enrich', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leadIds: chunkIds }),
                });

                if (refetch) refetch();
            } catch (error) {
                console.error('Batch chunk failed:', error);
            }

            setEnrichProgress({ current: Math.min(i + CHUNK_SIZE, leadsToProcess.length), total: leadsToProcess.length });

            setEnrichingIds(prev => {
                const newSet = new Set(prev);
                chunkIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        }
        setIsBatchEnriching(false);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'verified': return <CheckCircle2 className="text-emerald-500" size={16} />;
            case 'researching': return <Loader2 className="text-blue-500 animate-spin" size={16} />;
            case 'failed': return <XCircle className="text-red-500" size={16} />;
            case 'pending': default: return <Clock className="text-neutral-400" size={16} />;
        }
    };

    const statusColors: Record<string, string> = {
        verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        researching: 'bg-blue-50 text-blue-700 border-blue-200',
        failed: 'bg-red-50 text-red-700 border-red-200',
        pending: 'bg-neutral-100 text-neutral-600 border-neutral-200'
    };

    return (
        <div className="relative h-full flex flex-col w-full">

            {/* ALWAYS VISIBLE: Top Bar for Batch Actions & AI Qualification Rules */}
            <div className="flex flex-col bg-white border-b border-neutral-200 shrink-0 z-10">
                <div className="p-4 flex flex-col gap-3">



                    {/* Batch Controls */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <select
                                value={batchSize}
                                onChange={(e) => setBatchSize(e.target.value)}
                                className="bg-neutral-50 border border-neutral-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                disabled={isBatchEnriching}
                            >
                                <option value="5">Enrich 5 Leads</option>
                                <option value="20">Enrich 20 Leads</option>
                                <option value="100">Enrich 100 Leads</option>
                                <option value="all">Enrich All Leads</option>
                                <option value="failed">Retry All Failed Leads</option>
                            </select>
                            <button
                                onClick={handleBatchEnrich}
                                disabled={isBatchEnriching || leads.filter(l => l.status === (batchSize === 'failed' ? 'failed' : 'pending')).length === 0}
                                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isBatchEnriching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {isBatchEnriching ? 'Running AI...' : 'Run AI'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Enrichment Progress Bar */}
                {isBatchEnriching && (
                    <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-semibold text-blue-600 flex items-center gap-1.5">
                                <Sparkles size={12} /> AI Enrichment in Progress
                            </span>
                            <span className="text-xs font-bold text-neutral-600">
                                {enrichProgress.current} / {enrichProgress.total}
                            </span>
                        </div>
                        <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
                                style={{ width: `${(enrichProgress.current / enrichProgress.total) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>

            {/* List of Leads */}
            <div className="flex-1 overflow-y-auto w-full flex flex-col shadow-inner bg-white">
                {loading && leads.length === 0 ? (
                    <div className="p-8 text-center text-neutral-400 animate-pulse flex-1">Loading leads database...</div>
                ) : !loading && leads.length === 0 && !isSearching ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-neutral-400 flex-1">
                        <MapPin size={48} className="mb-4 text-neutral-200" />
                        <p className="text-center font-medium text-neutral-500">No leads found yet.</p>
                        <p className="text-center text-sm mt-1">Move the map and click "Search This Area" to begin.</p>
                    </div>
                ) : (
                    currentLeads.map((lead) => (
                        <div
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className="group px-6 py-4 border-b border-neutral-200/60 hover:bg-neutral-50 cursor-pointer transition-colors"
                        >
                            <div className="flex items-start justify-between">
                                <div className="w-[80%]">
                                    <h3 className="font-semibold text-neutral-900 group-hover:text-blue-600 transition-colors truncate">
                                        {lead.business_name}
                                    </h3>
                                    <p className="text-xs text-neutral-500 truncate mt-1">{lead.address}</p>
                                </div>
                                <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${enrichingIds.has(lead.id) ? statusColors.researching : statusColors[lead.status]}`}>
                                    {enrichingIds.has(lead.id) ? <Loader2 className="animate-spin text-blue-500" size={16} /> : getStatusIcon(lead.status)}
                                    <span className="capitalize">{enrichingIds.has(lead.id) ? 'researching' : lead.status}</span>
                                </div>
                            </div>

                            {lead.status === 'verified' && (
                                <div className="mt-3 flex items-center gap-4 text-xs font-medium text-neutral-600 bg-neutral-50/50 p-2 rounded-md border border-neutral-100">
                                    {lead.decision_maker_name ? (
                                        <span className="flex items-center gap-1.5 text-neutral-800"><CheckCircle2 size={13} className="text-emerald-500" />{lead.decision_maker_name}</span>
                                    ) : (
                                        <span className="text-neutral-400">No contact found</span>
                                    )}

                                    {lead.contact_email && (
                                        <span className="flex items-center gap-1"><Mail size={12} />{lead.contact_email}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls Bar */}
            {!loading && leads.length > leadsPerPage && (
                <div className="bg-white border-t border-neutral-200 p-3 flex items-center justify-between shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                    <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 1}
                        className="p-1.5 rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-xs font-semibold text-neutral-600">
                        Page {currentPage} of {totalPages} <span className="text-neutral-400 font-normal ml-1">({leads.length} total)</span>
                    </span>
                    <button
                        onClick={handleNextPage}
                        disabled={currentPage === totalPages}
                        className="p-1.5 rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            )}

            {/* Slide-over Details Panel */}
            {selectedLead && (
                <LeadCard lead={selectedLead} onClose={() => setSelectedLead(null)} />
            )}
        </div>
    );
}
