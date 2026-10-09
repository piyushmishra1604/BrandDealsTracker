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
  } | null;
  campaign?: {
    id: string;
    title: string;
    brand: string;
    status: string;
  } | null;
};
