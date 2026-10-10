import { type Deal } from "./deals";

export type CampaignCreatorEntry = {
  id: string;
  campaignId: string;
  creatorId: string;
  created_at?: string;
  creator?: {
    id: string;
    name: string;
    instagramHandle?: string | null;
    category?: string | null;
    status: string;
    linkedUserId?: string | null;
  } | null;
  campaign?: {
    id: string;
    title: string;
    brand: string;
    status: string;
  } | null;
  // Present only when a manager has assigned a deal to this creator for this campaign (M5)
  // — the entry itself always exists once a creator is added, independent of a deal.
  deal?: Deal | null;
};
