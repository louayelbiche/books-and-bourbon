export type VisitorType = 'cookie' | 'authenticated' | 'whatsapp' | 'instagram' | 'messenger' | 'phone';

export interface VisitorIdentity {
  visitorKey: string;
  visitorType: VisitorType;
  sourceApp: string;
  tenantId?: string;
}

export type FactCategory = 'preference' | 'interest' | 'behavior' | 'intent' | 'context';

export interface TaggedFact {
  category: FactCategory;
  key: string;
  value: string;
  confidence: number;
}

export interface VisitorProfile {
  id: string;
  visitorKey: string;
  visitorType: VisitorType;
  sourceApp: string;
  tenantId: string | null;
  facts: TaggedFact[];
  lastConversationSummary: string;
  visitCount: number;
  totalMessages: number;
  geoRegion: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

export interface CreateVisitorInput {
  identity: VisitorIdentity;
  geoRegion?: string;
}
