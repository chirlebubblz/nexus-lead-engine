'use client';

import { Lead } from '@/types';
import { Loader2, CheckCircle2, XCircle, Clock, MapPin, Globe, Phone, Mail, Linkedin, X, Building2, Copy, Check, User, Sparkles, Download, Youtube, Facebook, Twitter, Instagram, Video, Store, Search } from 'lucide-react';
import { useState } from 'react';

export default function LeadList({ leads, loading, isSearching, refetch }: { leads: Lead[], loading: boolean, isSearching: boolean, refetch?: () => void }) {
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'overview' | 'insights'>('overview');
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const [batchSize, setBatchSize] = useState<string>('5');
    const [isBatchEnriching, setIsBatchEnriching] = useState(false);

    const handleEnrich = async (leadId: string) => {
        setEnrichingIds(prev => new Set(prev).add(leadId));
        setActiveTab('insights'); // Auto-switch to insights tab when enriching
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

    const handleCopy = (text: string, fieldId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleBatchEnrich = async () => {
        const pendingLeads = leads.filter(l => l.status === 'pending');
        if (pendingLeads.length === 0) return alert('No pending leads to enrich.');

        const limit = batchSize === 'all' ? pendingLeads.length : parseInt(batchSize, 10);
        const leadsToProcess = pendingLeads.slice(0, limit);
        const leadIds = leadsToProcess.map(l => l.id);

        setIsBatchEnriching(true);
        setEnrichingIds(prev => new Set([...prev, ...leadIds]));

        try {
            const res = await fetch('/api/enrich', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ leadIds }),
            });
            if (!res.ok) throw new Error('Batch enrichment failed');
            if (refetch) refetch();
        } catch (error) {
            console.error('Failed to trigger batch enrichment:', error);
            alert('Failed to trigger batch enrichment. Check console.');
        } finally {
            setIsBatchEnriching(false);
            setEnrichingIds(prev => {
                const newSet = new Set(prev);
                leadIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        }
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
                escapeCsv(lead.business_name),
                escapeCsv(lead.address),
                escapeCsv(lead.phone),
                escapeCsv(lead.website),
                escapeCsv(lead.status),
                escapeCsv(lead.decision_maker_name),
                escapeCsv(lead.decision_maker_role),
                escapeCsv(lead.contact_email),
                escapeCsv(getSocial('linkedin')),
                escapeCsv(getSocial('facebook')),
                escapeCsv(getSocial('instagram')),
                escapeCsv(getSocial('twitter') || getSocial('x')),
                escapeCsv(getSocial('youtube')),
                escapeCsv(getSocial('tiktok')),
                escapeCsv(getSocial('google')),
                escapeCsv(getSocial('yelp')),
                escapeCsv(lead.enrichment_summary)
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
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-3 text-neutral-400">
                <Loader2 className="animate-spin text-blue-500" size={24} />
                <p className="text-sm font-medium">Loading database...</p>
            </div>
        );
    }

    if (!loading && leads.length === 0 && !isSearching) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-neutral-400">
                <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
                    <MapPin size={24} className="text-neutral-300" />
                </div>
                <p className="font-medium text-neutral-600 text-sm">No leads in this area.</p>
                <p className="text-xs text-center mt-1">Move the map and click search to populate your list.</p>
            </div>
        );
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'verified': return <CheckCircle2 size={14} />;
            case 'researching': return <Loader2 className="animate-spin" size={14} />;
            case 'failed': return <XCircle size={14} />;
            case 'pending': default: return <Clock size={14} />;
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
                <div className="flex items-center justify-between p-4 bg-white border-b border-neutral-200 shrink-0 relative z-30">
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
                            {isBatchEnriching ? 'Enriching...' : 'Mass Enrich'}
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
            )}

            {/* Left Panel List */}
            <div className="flex flex-col w-full flex-1 overflow-y-auto pb-20 relative z-20">
                {leads.map((lead) => (
                    <div
                        key={lead.id}
                        onClick={() => {
                            setSelectedLead(lead);
                            setActiveTab(lead.status === 'verified' ? 'insights' : 'overview');
                        }}
                        className={`group px-5 py-4 border-b border-neutral-100 cursor-pointer transition-all hover:bg-neutral-50 ${selectedLead?.id === lead.id ? 'bg-blue-50/50 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-neutral-900 truncate group-hover:text-blue-600 transition-colors">
                                    {lead.business_name}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500 truncate">
                                    <MapPin size={12} className="shrink-0" />
                                    <span className="truncate">{lead.address}</span>
                                </div>
                            </div>
                            <div className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusColors[lead.status]}`}>
                                {getStatusIcon(lead.status)}
                                <span className="capitalize tracking-wide">{lead.status}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Slide-Over Drawer Overlay */}
            {selectedLead && (
                <div
                    className="fixed inset-0 top-16 left-[420px] bg-neutral-900/10 backdrop-blur-[2px] z-40 transition-opacity animate-in fade-in"
                    onClick={() => setSelectedLead(null)}
                />
            )}

            {/* Drawer Panel */}
            <div
                className={`fixed top-16 right-0 bottom-0 w-[500px] bg-white border-l border-neutral-200 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${selectedLead ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {selectedLead && (
                    <>
                        {/* Drawer Header */}
                        <div className="px-6 pt-6 pb-0 border-b border-neutral-200 flex flex-col bg-white shrink-0">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex gap-4 items-start">
                                    <div className={`mt-1 p-2.5 rounded-xl border shadow-sm ${statusColors[selectedLead.status]}`}>
                                        <Building2 size={24} />
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-xl text-neutral-900 leading-tight">{selectedLead.business_name}</h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider border ${statusColors[selectedLead.status]}`}>
                                                {getStatusIcon(selectedLead.status)}
                                                {selectedLead.status}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedLead(null)}
                                    className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex gap-6 mt-2">
                                <button
                                    onClick={() => setActiveTab('overview')}
                                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
                                >
                                    Company Overview
                                </button>
                                <button
                                    onClick={() => setActiveTab('insights')}
                                    className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${activeTab === 'insights' ? 'border-blue-600 text-blue-600' : 'border-transparent text-neutral-500 hover:text-neutral-800'}`}
                                >
                                    <Sparkles size={14} /> AI Insights
                                </button>
                            </div>
                        </div>

                        {/* Drawer Body - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/50">

                            {/* TAB 1: OVERVIEW */}
                            {activeTab === 'overview' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 space-y-5">
                                        <h4 className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase">Location & Contact</h4>

                                        <div className="flex items-start gap-3 text-sm">
                                            <MapPin size={16} className="text-neutral-400 mt-0.5" />
                                            <span className="text-neutral-700 font-medium">{selectedLead.address}</span>
                                        </div>

                                        {selectedLead.phone && (
                                            <div className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3 text-sm">
                                                    <Phone size={16} className="text-neutral-400" />
                                                    <span className="text-neutral-700 font-medium">{selectedLead.phone}</span>
                                                </div>
                                                <button onClick={() => handleCopy(selectedLead.phone!, 'phone')} className="text-neutral-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100">
                                                    {copiedField === 'phone' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                        )}

                                        {selectedLead.website && (
                                            <div className="flex items-center gap-3 text-sm">
                                                <Globe size={16} className="text-neutral-400" />
                                                <a href={selectedLead.website} target="_blank" rel="noreferrer" className="text-blue-600 font-medium hover:underline truncate">
                                                    {selectedLead.website}
                                                </a>
                                            </div>
                                        )}

                                        {selectedLead.contact_email && (
                                            <div className="flex items-center justify-between group pt-2 border-t border-neutral-100">
                                                <div className="flex items-center gap-3 text-sm">
                                                    <Mail size={16} className="text-neutral-400" />
                                                    <a href={`mailto:${selectedLead.contact_email}`} className="text-blue-600 font-medium hover:underline truncate">
                                                        {selectedLead.contact_email}
                                                    </a>
                                                </div>
                                                <button onClick={() => handleCopy(selectedLead.contact_email!, 'email_overview')} className="text-neutral-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100">
                                                    {copiedField === 'email_overview' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Social Profiles Grid */}
                                    <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-5 space-y-4">
                                        <h4 className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase">Social Media</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { id: 'yelp', label: 'Yelp', icon: Store, colorClass: 'text-red-500' },
                                                { id: 'google', label: 'Google', icon: Search, colorClass: 'text-blue-500' },
                                                { id: 'tiktok', label: 'Tiktok', icon: Video, colorClass: 'text-black' },
                                                { id: 'twitter', label: 'Twitter', icon: Twitter, colorClass: 'text-sky-500' },
                                                { id: 'youtube', label: 'Youtube', icon: Youtube, colorClass: 'text-red-600' },
                                                { id: 'facebook', label: 'Facebook', icon: Facebook, colorClass: 'text-blue-600' },
                                                { id: 'linkedin', label: 'Linkedin', icon: Linkedin, colorClass: 'text-blue-700' },
                                                { id: 'instagram', label: 'Instagram', icon: Instagram, colorClass: 'text-pink-600' },
                                            ].map(({ id, label, icon: Icon, colorClass }) => {
                                                const url = selectedLead.social_profiles?.[id] || selectedLead.social_profiles?.[id.toLowerCase()];
                                                const hasLink = !!url;

                                                if (hasLink) {
                                                    return (
                                                        <a
                                                            key={id}
                                                            href={url as string}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="px-4 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-xs font-bold rounded-lg flex items-center gap-2 transition-colors"
                                                        >
                                                            <Icon size={14} className={colorClass} />
                                                            {label}
                                                        </a>
                                                    );
                                                }

                                                return (
                                                    <div
                                                        key={id}
                                                        className="px-4 py-2 bg-white border border-neutral-200 text-neutral-400 text-xs font-bold rounded-lg flex items-center gap-2 cursor-not-allowed opacity-60"
                                                    >
                                                        <Icon size={14} className="text-neutral-400" />
                                                        {label}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: AI INSIGHTS */}
                            {activeTab === 'insights' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    {selectedLead.status === 'researching' || enrichingIds.has(selectedLead.id) ? (
                                        <div className="bg-white rounded-xl border border-blue-100 p-8 flex flex-col items-center text-center gap-4 shadow-sm">
                                            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                                                <Loader2 size={24} className="animate-spin text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-base font-semibold text-blue-900">Gemini is searching...</p>
                                                <p className="text-sm text-blue-600/70 mt-1">Cross-referencing the web for decision makers and emails.</p>
                                            </div>
                                        </div>
                                    ) : selectedLead.status === 'pending' ? (
                                        <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-xl border border-blue-100 p-8 flex flex-col items-center text-center gap-4 shadow-sm relative overflow-hidden">
                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md border border-blue-100 z-10">
                                                <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" width="28" alt="Gemini" />
                                            </div>
                                            <div className="z-10">
                                                <h4 className="text-lg font-bold text-neutral-900">Unlock Deep Insights</h4>
                                                <p className="text-sm text-neutral-500 mt-2 max-w-[280px]">Deploy the background worker to find the owner's name, direct contact info, and business summary.</p>
                                            </div>
                                            <button
                                                onClick={() => handleEnrich(selectedLead.id)}
                                                className="mt-2 w-full max-w-[250px] bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl text-sm transition-all shadow-md active:scale-[0.98] z-10"
                                            >
                                                Run AI Enrichment
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Key Contact Card */}
                                            <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-1 relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                                <div className="p-4 space-y-4">
                                                    <h4 className="text-[11px] font-bold text-neutral-400 tracking-wider uppercase ml-2">Primary Decision Maker</h4>

                                                    <div className="flex items-start gap-3 ml-2">
                                                        <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center shrink-0 border border-neutral-200">
                                                            <User size={18} className="text-neutral-500" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-base font-bold text-neutral-900">
                                                                {selectedLead.decision_maker_name || <span className="text-neutral-400 italic font-normal">Not found</span>}
                                                            </div>
                                                            <div className="text-sm text-neutral-500 font-medium mt-0.5">
                                                                {selectedLead.decision_maker_role || 'Role unknown'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="ml-2 pt-3 border-t border-neutral-100 flex items-center justify-between group">
                                                        <div className="flex items-center gap-2">
                                                            <Mail size={16} className="text-neutral-400" />
                                                            {selectedLead.contact_email ? (
                                                                <a href={`mailto:${selectedLead.contact_email}`} className="text-sm font-semibold text-blue-600 hover:underline">
                                                                    {selectedLead.contact_email}
                                                                </a>
                                                            ) : <span className="text-sm text-neutral-400 italic">No email found</span>}
                                                        </div>
                                                        {selectedLead.contact_email && (
                                                            <button onClick={() => handleCopy(selectedLead.contact_email!, 'email')} className="text-neutral-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100">
                                                                {copiedField === 'email' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* AI Summary Brief */}
                                            {selectedLead.enrichment_summary && (
                                                <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/30 rounded-xl border border-blue-100 p-5 shadow-sm">
                                                    <span className="text-xs font-bold text-indigo-600 flex items-center gap-1.5 mb-3 uppercase tracking-wider">
                                                        <img src="https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg" width="14" alt="Gemini" />
                                                        Executive Brief
                                                    </span>
                                                    <p className="text-sm text-neutral-800 leading-relaxed font-medium">
                                                        {selectedLead.enrichment_summary}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
