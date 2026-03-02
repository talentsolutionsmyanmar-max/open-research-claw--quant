// QuentrexKillzone OS v7.0 - Trading Types
// Powered by Ko Htike

export interface PriceData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  high24h: number;
  low24h: number;
  volume: number;
  quoteVolume: number;
  openPrice: number;
  lastUpdate: number;
}

export interface CandleData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteVolume: number;
  trades: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  total: number;
}

export interface OrderBook {
  lastUpdateId: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface Signal {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C';
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  riskReward: number;
  confidence: number;
  timestamp: number;
  killzone: KillzoneType;
  
  // ICT/SMC Analysis
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  structure: string;
  orderBlock: boolean;
  fvg: boolean;
  liquiditySweep: boolean;
  mss: boolean;
  smtDivergence: boolean;
  
  // Indicators
  rsi: number;
  macdSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  volumeProfile: 'HIGH' | 'MEDIUM' | 'LOW';
  fundingRate: number;
  openInterest: number;
  openInterestChange: number;
  
  // Criteria scores
  criteriaScores: {
    killzoneActive: boolean;
    htfAlignment: boolean;
    mssConfirmed: boolean;
    obFvgConfluence: boolean;
    liquiditySwept: boolean;
    rsiFavorable: boolean;
    macdAlignment: boolean;
    volumeConfirmation: boolean;
  };
  
  totalScore: number;
  maxScore: number;
}

export type KillzoneType = 'AKZ' | 'LKZ' | 'NYKZ' | 'NONE';

export interface KillzoneConfig {
  name: string;
  type: KillzoneType;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  label: string;
  color: string;
  active: boolean;
}

export interface TechnicalIndicators {
  rsi: number;
  rsiSignal: 'OVERBOUGHT' | 'OVERSOLD' | 'NEUTRAL';
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    position: 'UPPER' | 'MIDDLE' | 'LOWER' | 'OUTSIDE';
  };
  atr: number;
  ema20: number;
  ema50: number;
  ema200: number;
  volumeProfile: { price: number; volume: number }[];
  supportLevels: number[];
  resistanceLevels: number[];
}

export interface TradeJournal {
  id: string;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  leverage: number;
  pnl?: number;
  pnlPercent?: number;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  entryTime: number;
  exitTime?: number;
  notes: string;
  signalGrade: string;
  killzone: KillzoneType;
  screenshot?: string;
}

export interface MarketMetrics {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  fearGreedIndex: number;
  fundingRates: Record<string, number>;
  openInterest: Record<string, number>;
  liquidations24h: {
    long: number;
    short: number;
    total: number;
  };
}

export interface RiskCalculator {
  accountBalance: number;
  riskPercent: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  leverage: number;
}

export interface RiskResult {
  positionSize: number;
  positionValue: number;
  riskAmount: number;
  potentialProfit: number;
  riskRewardRatio: number;
  liquidationPrice: number;
  marginRequired: number;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  signal?: Signal;
}

export interface TradingPair {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  pricePrecision: number;
  quantityPrecision: number;
}

export const TOP_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'DOTUSDT',
  'MATICUSDT', 'LTCUSDT', 'UNIUSDT', 'ATOMUSDT', 'ETCUSDT',
  'FETUSDT', 'NEARUSDT', 'APTUSDT'
] as const;

export const KILLZONES: KillzoneConfig[] = [
  {
    name: 'Asia Killzone',
    type: 'AKZ',
    startHour: 6,
    startMinute: 30,
    endHour: 10,
    endMinute: 0,
    label: '06:30-10:00 MMT',
    color: '#00ff41',
    active: false
  },
  {
    name: 'London Killzone',
    type: 'LKZ',
    startHour: 13,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    label: '13:00-17:00 MMT',
    color: '#00cfff',
    active: false
  },
  {
    name: 'New York Killzone',
    type: 'NYKZ',
    startHour: 18,
    startMinute: 15,
    endHour: 22,
    endMinute: 15,
    label: '18:15-22:15 MMT',
    color: '#bf00ff',
    active: false
  }
];

export const SIGNAL_GRADE_COLORS = {
  'A+': { bg: 'rgba(255, 215, 0, 0.15)', border: 'rgba(255, 215, 0, 0.5)', text: '#ffd700' },
  'A': { bg: 'rgba(0, 255, 65, 0.15)', border: 'rgba(0, 255, 65, 0.5)', text: '#00ff41' },
  'B+': { bg: 'rgba(0, 207, 255, 0.15)', border: 'rgba(0, 207, 255, 0.5)', text: '#00cfff' },
  'B': { bg: 'rgba(138, 43, 226, 0.15)', border: 'rgba(138, 43, 226, 0.5)', text: '#8a2be2' },
  'C': { bg: 'rgba(128, 128, 128, 0.15)', border: 'rgba(128, 128, 128, 0.5)', text: '#808080' }
};

export const QUENTREX_RULES = {
  markets: ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'DOGE', 'ADA', 'AVAX', 'LINK', 'DOT'],
  time: 'Killzones ONLY (AKZ/LKZ/NYKZ MMT)',
  htfBias: '4H → 1H structure cascade required',
  mss: '15M or 5M MSS as entry trigger',
  entry: 'OB + FVG confluence only',
  liquidity: 'Must be swept before entry',
  riskReward: 'Minimum 1:2, Preferred 1:3+',
  risk: '0.35%–0.75% per trade maximum',
  grades: {
    aplus: '8/8 gates passed',
    a: '6-7/8 gates passed',
    bplus: '4-5/8 gates passed'
  },
  smt: 'ETHBTC + SOLBTC divergence = extra confluence',
  safety: 'TEST_MODE default true. Balance < $100 = hard pause'
};
