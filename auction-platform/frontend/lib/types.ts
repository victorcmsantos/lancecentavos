export type Auction = {
  id: string;
  influencer_id: string;
  title: string;
  description: string;
  start_price: number;
  current_price: number;
  start_time?: string;
  end_time?: string;
  status: 'draft' | 'active' | 'finished';
  server_time_unix: number;
};

export type Bid = {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  received_at: string;
};

export type Tenant = {
  id: string;
  user_id: string;
  display_name: string;
  subdomain: string;
  logo_url: string;
  primary_color: string;
};
