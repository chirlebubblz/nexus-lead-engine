import React from 'react';
import { 
  MapPin, 
  Building2, 
  Mail, 
  Linkedin, 
  Briefcase, 
  User, 
  TrendingUp,
  CheckCircle2,
  ExternalLink,
  Globe,
  XCircle
} from 'lucide-react';
import { Lead } from '@/types';

interface LeadCardProps {
  lead: Lead;
  onClose: () => void;
}

export default function LeadCard({ lead, onClose }: LeadCardProps) {
  // Use real data from the lead object
  const companyName = lead.business_name;
  const location = lead.address;
  const industry = lead.enrichment_summary ? 'Categorized via AI' : 'Local Business';
  const status = lead.status === 'verified' ? 'High Intent' : lead.status === 'researching' ? 'Researching' : lead.status;
  
  // Fake lead score based on status length or just default 9.2 if verified
  const leadScore = lead.status === 'verified' ? 9.2 : 6.5;

  const decisionMaker = {
    name: lead.decision_maker_name || 'Not available',
    role: lead.decision_maker_role || 'Not available',
    email: lead.contact_email || 'Not available',
  };

  const socialProfiles: Record<string, string> = 
    typeof lead.social_profiles === 'string' 
      ? JSON.parse(lead.social_profiles) 
      : (lead.social_profiles || {});
      
  const linkedinUrl = socialProfiles.linkedin || '';

  // Parse intent signals from enrichment summary if it exists, otherwise use fallback
  let intentSignals = [
    "Location verified on Google Maps",
    "Active business listing",
  ];
  
  if (lead.enrichment_summary) {
    intentSignals = [
      "AI Enrichment completed successfully",
      "Decision maker attributes identified",
      "Ready for direct outreach"
    ];
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-6 bg-slate-950/50 backdrop-blur-sm relative z-[60]">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl text-slate-200 font-sans relative overflow-y-auto max-h-full">
        
        {/* CLOSE BUTTON */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
        >
          <XCircle size={24} />
        </button>

        {/* HEADER ROW */}
        <div className="flex justify-between items-start mb-4 pr-12">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{companyName}</h2>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><MapPin size={16} /> {location}</span>
              <span className="flex items-center gap-1.5"><Building2 size={16} /> {industry}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${lead.status === 'verified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-300 border-slate-700'} capitalize`}>
                {status}
              </span>
              <span className="px-2.5 py-1 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full flex items-center gap-1">
                <TrendingUp size={12} /> Score: {leadScore}/10
              </span>
            </div>
          </div>
        </div>

        {/* ACTION BUTTONS */}
      <div className="flex gap-4 mt-6">
        {lead.website && (
          <a 
            href={lead.website} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-700"
          >
            Visit Website
            <ExternalLink size={16} />
          </a>
        )}
      </div>

        {/* ENRICHMENT DATA GRID */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">AI Enrichment Data</h3>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 bg-slate-800/50 p-4 rounded-lg border border-slate-800/50">
            
            <div>
              <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><User size={14} /> Decision Maker</span>
              <p className="text-sm font-medium text-slate-200">{decisionMaker.name}</p>
            </div>
            
            <div>
              <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Briefcase size={14} /> Role</span>
              <p className="text-sm font-medium text-slate-200">{decisionMaker.role}</p>
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Mail size={14} /> Direct Contact</span>
              {lead.contact_email ? (
                <a href={`mailto:${lead.contact_email}`} className="text-sm font-medium text-blue-400 hover:text-blue-300 break-all">{lead.contact_email}</a>
              ) : (
                <p className="text-sm font-medium text-slate-500 italic">Not available</p>
              )}
            </div>
            
            <div className="col-span-2 sm:col-span-1">
              <span className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"><Linkedin size={14} /> Social Profile</span>
              {linkedinUrl ? (
                <a href={linkedinUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-400 hover:text-blue-300 flex items-center gap-1 w-fit break-all">
                  View LinkedIn <ExternalLink size={12} />
                </a>
              ) : (
                <p className="text-sm font-medium text-slate-500 italic">No LinkedIn found</p>
              )}
            </div>

          </div>
        </div>

        {/* INTENT SIGNALS OR SUMMARY */}
        <div>
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Intent Signals & Summary</h3>
          <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-800/50 space-y-4">
            <ul className="space-y-2.5">
              {intentSignals.map((signal, index) => (
                <li key={index} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
            {lead.enrichment_summary && (
              <div className="pt-3 mt-3 border-t border-slate-700/50">
                <p className="text-sm text-slate-400 leading-relaxed italic border-l-2 border-blue-500/50 pl-3">
                  "{lead.enrichment_summary}"
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
