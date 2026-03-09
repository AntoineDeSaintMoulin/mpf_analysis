export interface Holding {
  id: number;
  portfolio_id: number;
  asset_name: string;
  original_asset_name: string;
  category: string;
  region: string;
  instrument: string;
  weight: number;
  currency: string;
  isin: string;
}

export interface Portfolio {
  id: number;
  name: string;
  type: 'Sicav' | 'Mixed';
  description: string;
  holdings?: Holding[];
}

export interface ModelGridItem {
  id: number;
  category: string;
  region: string;
  target_weight: number;
}

export interface AnalysisResult {
  commentary: string;
  differences: {
    category: string;
    region: string;
    current: number;
    target: number;
    diff: number;
  }[];
}

export interface ManualOverride {
  id: number;
  original_asset_name: string;
  manual_asset_name: string | null;
  manual_isin: string | null;
  manual_region: string | null;
  manual_currency: string | null;
  manual_category: string | null;
  manual_instrument: string | null;
  updated_at: string;
}
