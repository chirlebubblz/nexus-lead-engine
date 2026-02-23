export type LeadStatus = 'pending' | 'researching' | 'verified' | 'failed';

export interface Lead {
    id: string; // UUID
    place_id: string; // Unique Google Maps Place ID
    business_name: string;
    address: string;
    latitude: number;
    longitude: number;
    website?: string | null;
    phone?: string | null;
    status: LeadStatus;
    decision_maker_name?: string | null;
    decision_maker_role?: string | null;
    social_profiles?: { [key: string]: string } | null;
    contact_email?: string | null;
    enrichment_summary?: string | null;
    created_at: string; // ISO Date String
    updated_at: string; // ISO Date String
}

export type InsertLead = Omit<Lead, 'id' | 'created_at' | 'updated_at'>;
export type UpdateLead = Partial<Omit<Lead, 'id' | 'place_id' | 'created_at' | 'updated_at'>>;
