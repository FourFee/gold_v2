export interface PawnRecord {
  id: number;
  date: string;
  firstname: string;
  lastname: string;
  idcard: string;
  address: string;
  phone: string;
  weight: number;
  amount: number;
  remark: string;
  status: string | null;
}

export interface BarGoldRecord {
  id: number;
  date: string;
  mode: 'buy' | 'sell';
  firstname: string;
  lastname: string;
  idcard: string;
  address: string;
  phone: string;
  weightBaht: number;
  weightGram: number;
  amount: number;
  remark: string | null;
}

export interface OrnamentGoldRecord {
  id: number;
  date: string;
  mode: 'buy' | 'sell';
  firstname: string;
  lastname: string;
  idcard: string;
  address: string;
  phone: string;
  weight: number;
  amount: number;
  remark: string | null;
}

export interface SummaryData {
  sellOut: number; exchange: number; buyIn: number;
  bar_buy: number; bar_sell: number; plated_gold: number;
  total_gold_flow: number; redeem: number; interest: number;
  pawn: number; total_pawn_flow: number; expenses: number;
  gold_out: number; diamondBuyIn: number; diamondSellOut: number;
  bar_buy_amount: number; bar_sell_amount: number;
  avg_bar_buy_price_per_baht: number; avg_bar_sell_price_per_baht: number;
  avg_bar_buy_price_per_gram: number; avg_bar_sell_price_per_gram: number;
  bar_profit: number;
}

export interface CalcResult {
  rev: number; cost: number; profit: number; margin: number; pawnProfit: number;
}

export interface ChartEntry {
  [key: string]: string | number;
  label: string; date: string;
  redeem: number; interest: number; pawn: number;
  buyIn: number; exchange: number; sellOut: number;
  expenses: number; diamondBuyIn: number; diamondSellOut: number;
  platedGold: number; total_gold_flow: number;
  bar_buy: number; bar_sell: number; total_pawn_flow: number;
  total_revenue: number; total_cost: number; net_profit: number;
  bar_buy_baht: number; bar_sell_baht: number;
}

export interface AllGoldTransactionRecord {
  id: number;
  date: string;
  redeem: number;
  interest: number;
  pawn: number;
  buyIn: number;
  exchange: number;
  sellOut: number;
  expenses: number;
  diamondBuyIn: number;
  diamondSellOut: number;
  platedGold: number;
}
