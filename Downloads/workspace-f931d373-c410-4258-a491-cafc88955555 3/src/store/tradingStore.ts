// QuentrexKillzone OS v7.0 - Global Trading Store
// Powered by Ko Htike

import { create } from 'zustand';
import type { 
  PriceData, 
  Signal, 
  KillzoneType, 
  KillzoneConfig, 
  TradeJournal,
  OrderBook,
  CandleData,
  KILLZONES
} from '@/types/trading';

interface TradingState {
  // Prices
  prices: Record<string, PriceData>;
  selectedPair: string;
  priceHistory: Record<string, number[]>;
  
  // Signals
  signals: Signal[];
  filteredSignals: Signal[];
  signalFilter: {
    grades: string[];
    directions: string[];
    pairs: string[];
  };
  
  // Killzones
  currentKillzone: KillzoneType;
  killzones: KillzoneConfig[];
  mmtTime: Date;
  
  // OrderBook
  orderBook: OrderBook | null;
  
  // Candles
  candles: Record<string, CandleData[]>;
  selectedTimeframe: string;
  
  // Journal
  trades: TradeJournal[];
  
  // UI State
  activeTab: string;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  
  // Account
  balance: number;
  testMode: boolean;
  
  // Actions
  setPrices: (prices: Record<string, PriceData>) => void;
  updatePrice: (symbol: string, data: Partial<PriceData>) => void;
  setSelectedPair: (pair: string) => void;
  
  addSignal: (signal: Signal) => void;
  setSignals: (signals: Signal[]) => void;
  setSignalFilter: (filter: Partial<TradingState['signalFilter']>) => void;
  filterSignals: () => void;
  
  setCurrentKillzone: (kz: KillzoneType) => void;
  setMmtTime: (time: Date) => void;
  
  setOrderBook: (ob: OrderBook) => void;
  
  setCandles: (symbol: string, candles: CandleData[]) => void;
  setSelectedTimeframe: (tf: string) => void;
  
  addTrade: (trade: TradeJournal) => void;
  updateTrade: (id: string, updates: Partial<TradeJournal>) => void;
  
  setActiveTab: (tab: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setConnectionStatus: (status: TradingState['connectionStatus']) => void;
  
  setBalance: (balance: number) => void;
  toggleTestMode: () => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  // Initial state
  prices: {},
  selectedPair: 'BTCUSDT',
  priceHistory: {},
  
  signals: [],
  filteredSignals: [],
  signalFilter: {
    grades: ['A+', 'A', 'B+'],
    directions: ['LONG', 'SHORT'],
    pairs: []
  },
  
  currentKillzone: 'NONE',
  killzones: [
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
  ],
  mmtTime: new Date(),
  
  orderBook: null,
  
  candles: {},
  selectedTimeframe: '15m',
  
  trades: [],
  
  activeTab: 'dashboard',
  isLoading: false,
  error: null,
  connectionStatus: 'disconnected',
  
  balance: 1000,
  testMode: true,
  
  // Actions
  setPrices: (prices) => set({ prices }),
  
  updatePrice: (symbol, data) => set((state) => ({
    prices: {
      ...state.prices,
      [symbol]: { ...state.prices[symbol], ...data } as PriceData
    },
    priceHistory: {
      ...state.priceHistory,
      [symbol]: [...(state.priceHistory[symbol] || []).slice(-99), data.price || state.prices[symbol]?.price]
    }
  })),
  
  setSelectedPair: (pair) => set({ selectedPair: pair }),
  
  addSignal: (signal) => set((state) => {
    const exists = state.signals.find(s => s.id === signal.id);
    if (exists) return state;
    
    const newSignals = [signal, ...state.signals].slice(0, 200);
    return { 
      signals: newSignals,
      filteredSignals: applyFilter(newSignals, state.signalFilter)
    };
  }),
  
  setSignals: (signals) => set((state) => ({ 
    signals,
    filteredSignals: applyFilter(signals, state.signalFilter)
  })),
  
  setSignalFilter: (filter) => set((state) => {
    const newFilter = { ...state.signalFilter, ...filter };
    return {
      signalFilter: newFilter,
      filteredSignals: applyFilter(state.signals, newFilter)
    };
  }),
  
  filterSignals: () => {
    const state = get();
    set({ filteredSignals: applyFilter(state.signals, state.signalFilter) });
  },
  
  setCurrentKillzone: (kz) => set((state) => ({
    currentKillzone: kz,
    killzones: state.killzones.map(k => ({
      ...k,
      active: k.type === kz
    }))
  })),
  
  setMmtTime: (time) => set({ mmtTime: time }),
  
  setOrderBook: (ob) => set({ orderBook: ob }),
  
  setCandles: (symbol, candles) => set((state) => ({
    candles: { ...state.candles, [symbol]: candles }
  })),
  
  setSelectedTimeframe: (tf) => set({ selectedTimeframe: tf }),
  
  addTrade: (trade) => set((state) => ({
    trades: [trade, ...state.trades]
  })),
  
  updateTrade: (id, updates) => set((state) => ({
    trades: state.trades.map(t => t.id === id ? { ...t, ...updates } : t)
  })),
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
  setBalance: (balance) => set({ balance }),
  
  toggleTestMode: () => set((state) => ({ testMode: !state.testMode }))
}));

// Helper function to apply signal filter
function applyFilter(signals: Signal[], filter: TradingState['signalFilter']) {
  return signals.filter(signal => {
    if (filter.grades.length > 0 && !filter.grades.includes(signal.grade)) return false;
    if (filter.directions.length > 0 && !filter.directions.includes(signal.direction)) return false;
    if (filter.pairs.length > 0 && !filter.pairs.includes(signal.symbol)) return false;
    return true;
  });
}
