'use client';

import { Lead } from '@/types';
import { Loader2, CheckCircle2, XCircle, Clock, MapPin, Globe, Phone, Mail, Linkedin, Sparkles, Download } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function LeadList({ leads, loading, isSearching, refetch }: { leads: Lead[], loading: boolean, isSearching: boolean, refetch?: () => void }) {
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
    const [batchSize, setBatchSize] = useState<string>('5');
    const [isBatchEnriching, setIsBatchEnriching] = useState(false);

    // New Progress State for Enrichment
    const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 });

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
            alert('Failed to trigger enrichment. Check console.');
        } finally {
            setEnrichingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(leadId);
                return newSet;
            });
        }
    };

    // Client-Side Orchestrator for Safe Batch Enrichment
    const handleBatchEnrich = async () => {
        const pendingLeads = leads.filter(l => l.status === 'pending');
        if (pendingLeads.length === 0) return alert('No pending leads to enrich.');

        const limit = batchSize === 'all' ? pendingLeads.length : parseInt(batchSize, 10);
        const leadsToProcess = pendingLeads.slice(0, limit);

        setIsBatchEnriching(true);
        setEnrichProgress({ current: 0, total: leadsToProcess.length });

        // Process in chunks of 5 to prevent Vercel/Next.js timeouts
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

                // Update UI after every chunk finishes
                if (refetch) refetch();

            } catch (error) {
                console.error('Batch chunk failed:', error);
            }

            // Update Progress Bar
            setEnrichProgress({ current: Math.min(i + CHUNK_SIZE, leadsToProcess.length), total: leadsToProcess.length });

            // Clear chunk from loading state
            setEnrichingIds(prev => {
                const newSet = new Set(prev);
                chunkIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        }

        setIsBatchEnriching(false);
    };

    const handleExportCSV = () => {
        if (leads.length === 0) return;

        const headers = [
            'Business Name', 'Address', 'Phone', 'Website', 'Status',
            'Decision Maker Name', 'Decision Maker Role', 'Contact Email',
            'LinkedIn', 'Facebook', 'Instagram', 'Twitter', 'YouTube', 'TikTok', 'Google Maps', 'Yelp', 'Enrichment Summary'
        ];

        const rows = leads.map(lead => {
            const escapeCsv = (str: string | null | undefined) => {
                if (!str) return '""';
                const cleanStr = String(str).replace(/\r?\n|\r/g, ' ');
                return `"${cleanStr.replace(/"/g, '""')}"`;
            };

            const getSocial = (network: string) => {
                if (!lead.social_profiles) return '';
                const profiles = lead.social_profiles as Record<string, string>;
                return profiles[network] || profiles[network.toLowerCase()] || '';
            };

            return [
                escapeCsv(lead.business_name), escapeCsv(lead.address), escapeCsv(lead.phone),
                escapeCsv(lead.website), escapeCsv(lead.status), escapeCsv(lead.decision_maker_name),
                escapeCsv(lead.decision_maker_role), escapeCsv(lead.contact_email), escapeCsv(getSocial('linkedin')),
                escapeCsv(getSocial('facebook')), escapeCsv(getSocial('instagram')), escapeCsv(getSocial('twitter') || getSocial('x')),
                escapeCsv(getSocial('youtube')), escapeCsv(getSocial('tiktok')), escapeCsv(getSocial('google')),
                escapeCsv(getSocial('yelp')), escapeCsv(lead.enrichment_summary)
            ].join(',');
        });

        const csvContent = headers.join(',') + "\n" + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "nexus_leads.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading && leads.length === 0) {
        return <div className="p-8 text-center text-neutral-400 animate-pulse">Loading leads database...</div>;
    }

    if (!loading && leads.length === 0 && !isSearching) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-neutral-400">
                <MapPin size={48} className="mb-4 text-neutral-200" />
                <p className="text-center font-medium text-neutral-500">No leads found yet.</p>
                <p className="text-center text-sm mt-1">Move the map and click "Search This Area" to begin.</p>
            </div>
        );
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'verified': return <CheckCircle2 className="text-emerald-500" size={16} />;
            case 'researching': return <Loader2 className="text-blue-500 animate-spin" size={16} />;
            case 'failed': return <XCircle className="text-red-500" size={16} />;
            case 'pending': default: return <Clock className="text-neutral-400" size={16} />;
        }
    };

    const statusColors = {
        verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        researching: 'bg-blue-50 text-blue-700 border-blue-200',
        failed: 'bg-red-50 text-red-700 border-red-200',
        pending: 'bg-neutral-100 text-neutral-600 border-neutral-200'
    };

    return (
        <div className="relative h-full flex flex-col">
            {/* Top Bar for Batch Actions */}
            {!loading && leads.length > 0 && (
                <div className="flex flex-col bg-white border-b border-neutral-200 shrink-0">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-2">
                            <select
                                value={batchSize}
                                onChange={(e) => setBatchSize(e.target.value)}
                                className="bg-neutral-50 border border-neutral-200 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                disabled={isBatchEnriching}
                            >
                                <option value="5">5 Leads</option>
                                <option value="10">10 Leads</option>
                                <option value="100">100 Leads</option>
                                <option value="all">All Leads</option>
                            </select>
                            <button
                                onClick={handleBatchEnrich}
                                disabled={isBatchEnriching || leads.filter(l => l.status === 'pending').length === 0}
                                className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isBatchEnriching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                {isBatchEnriching ? 'Enriching...' : 'Enrich'}
                            </button>
                        </div>
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Download size={14} />
                            Export CSV
                        </button>
                    </div>

                    {/* NEW: AI Enrichment Progress Bar */}
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
            )}

            <div className="flex-1 overflow-y-auto w-full flex flex-col shadow-inner">
                {leads.map((lead, index) => (
                    <motion.div
                        key={lead.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        onClick={() => setSelectedLead(lead)}
                        className="group px-6 py-4 border-b border-neutral-200/60 bg-white hover:bg-neutral-50 cursor-pointer transition-colors"
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
                    </motion.div>
                ))}
            </div>

            {/* Slide-over Details Panel */}
            {selectedLead && (
                <motion.div
                    initial={{ x: '100%', opacity: 0.5 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: '100%', opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="absolute inset-0 bg-white z-50 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.05)]"
                >
                    <div className="px-6 py-5 border-b border-neutral-100 bg-neutral-50/50 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full bg-white border shadow-sm ${statusColors[selectedLead.status]}`}>
                                {getStatusIcon(selectedLead.status)}
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-neutral-900 tracking-tight">{selectedLead.business_name}</h2>
                                <div className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">{selectedLead.status}</div>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedLead(null)}
                            className="p-2 bg-white hover:bg-neutral-200 rounded-full transition-colors border shadow-sm"
                        >
                            <XCircle size={20} className="text-neutral-500" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-neutral-400 tracking-wider uppercase">Business Info</h4>
                            <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-3 font-medium text-sm">
                                <div className="flex items-start gap-3">
                                    <MapPin size={16} className="text-neutral-400 mt-0.5 shrink-0" />
                                    <span className="text-neutral-700">{selectedLead.address}</span>
                                </div>
                                {selectedLead.phone && (
                                    <div className="flex items-center gap-3">
                                        <Phone size={16} className="text-neutral-400 shrink-0" />
                                        <span className="text-neutral-700">{selectedLead.phone}</span>
                                    </div>
                                )}
                                {selectedLead.website && (
                                    <div className="flex items-center gap-3">
                                        <Globe size={16} className="text-neutral-400 shrink-0" />
                                        <a href={selectedLead.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">
                                            {selectedLead.website}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-neutral-400 tracking-wider uppercase">AI Enrichment Data</h4>
                            <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm space-y-4">
                                {selectedLead.status === 'researching' || enrichingIds.has(selectedLead.id) ? (
                                    <div className="flex bg-blue-50 text-blue-700 p-4 rounded-lg items-center gap-3 text-sm font-medium">
                                        <Loader2 size={18} className="animate-spin shrink-0" />
                                        Gemini is currently finding the decision makers, socials, and contact info...
                                    </div>
                                ) : selectedLead.status === 'pending' ? (
                                    <div className="flex flex-col items-center justify-center p-6 bg-neutral-50 rounded-lg text-center gap-3 border border-neutral-100">
                                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-neutral-200">
                                            <Sparkles size={24} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-neutral-900">Unlock Hidden Details</h4>
                                            <p className="text-sm text-neutral-500 mt-1 max-w-xs mx-auto">Click below to deploy Gemini AI to search for decision makers, emails, and social profiles for this business.</p>
                                        </div>
                                        <button
                                            onClick={() => handleEnrich(selectedLead.id)}
                                            className="mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-2.5 px-6 rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                                        >
                                            <Sparkles size={16} />
                                            Enrich with AI
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <div className="text-xs text-neutral-400 font-medium mb-1">Decision Maker</div>
                                                <div className="font-semibold text-neutral-900 border-b border-neutral-100 pb-2">
                                                    {selectedLead.decision_maker_name || <span className="text-neutral-300 font-normal">Not found</span>}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-neutral-400 font-medium mb-1">Role</div>
                                                <div className="font-semibold text-neutral-900 border-b border-neutral-100 pb-2">
                                                    {selectedLead.decision_maker_role || <span className="text-neutral-300 font-normal">Not found</span>}
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="text-xs text-neutral-400 font-medium mb-1">Direct Contact Email</div>
                                                <div className="font-semibold text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
                                                    <Mail size={14} className="text-neutral-400" />
                                                    {selectedLead.contact_email ? (
                                                        <a href={`mailto:${selectedLead.contact_email}`} className="text-blue-600 hover:underline">{selectedLead.contact_email}</a>
                                                    ) : <span className="text-neutral-300 font-normal">Not found</span>}
                                                </div>
                                            </div>
                                        </div>

                                        {selectedLead.enrichment_summary && (
                                            <div>
                                                <div className="text-xs text-neutral-400 font-medium mb-1.5 flex items-center gap-1.5">
                                                    <Sparkles size={14} className="text-blue-500" />
                                                    AI Summary
                                                </div>
                                                <div className="text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-3 rounded-lg border border-neutral-100">
                                                    {selectedLead.enrichment_summary}
                                                </div>
                                            </div>
                                        )}

                                        {selectedLead.social_profiles && Object.keys(selectedLead.social_profiles).length > 0 && (
                                            <div className="pt-2">
                                                <div className="text-xs text-neutral-400 font-medium mb-2">Social Profiles</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {Object.entries(selectedLead.social_profiles).map(([network, url]) => (
                                                        <a
                                                            key={network}
                                                            href={url as string}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-full capitalize flex items-center gap-1.5 transition-colors border border-neutral-200"
                                                        >
                                                            {network === 'linkedin' ? <Linkedin size={12} /> : <Globe size={12} />}
                                                            {network}
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
