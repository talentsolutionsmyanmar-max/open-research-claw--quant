'use client'

// QuentrexKillzone OS v7.0 - GLOBAL CRYPTO TRADING OS
// Powered by Ko Htike
// Web + Mobile Ready

import { useEffect, useState, useRef, useMemo, useSyncExternalStore, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Zap, Clock, Flame, 
  Activity, Target, Shield, AlertTriangle,
  BarChart3, BookOpen, Moon, Sun,
  X, Check, Eye, Calculator, Info,
  Layers, AlertCircle, ArrowUpRight, ArrowDownRight,
  Volume2, DollarSign, Percent, RefreshCw, Bot, Play,
  Bell, BellRing, Star, ChevronRight, Menu, VolumeX,
  Settings, Wifi, WifiOff, Maximize2
} from 'lucide-react';
import { useTradingStore } from '@/store/tradingStore';
import { useThemeStore, THEMES } from '@/store/themeStore';
import { 
  fetch24hTickers, 
  fetchKlines, 
  fetchOrderBook,
  createTickerWebSocket,
  createDepthWebSocket,
  TRADING_PAIRS 
} from '@/lib/binance';
import { 
  getMMTTime, 
  getCurrentKillzone, 
  getTimeUntilNextKillzone,
  KILLZONE_CONFIGS 
} from '@/lib/killzones';
import { generateSignal, calculateRSI, calculateMACD, calculateEMA, getAllIndicators } from '@/lib/indicators';
import type { PriceData, Signal, KillzoneType, OrderBook, CandleData } from '@/types/trading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { RiskCalculator } from '@/components/RiskCalculator';
import { TradingJournal } from '@/components/TradingJournal';
import { BacktestingPanel } from '@/components/BacktestingPanel';
import { AIChat } from '@/components/AIChat';
import { runFullBacktest, BACKTEST_PAIRS } from '@/lib/backtest';
import type { BacktestSummary } from '@/lib/backtest';

// Hydration-safe mounted check
const emptySubscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

// Register Service Worker for PWA
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// Volume Profile calculation
interface VolumeLevel {
  price: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  percent: number;
}

// CVD data point
interface CVDPoint {
  time: number;
  cvd: number;
  delta: number;
}

// Trade data for CVD
interface TradeData {
  price: number;
  quantity: number;
  isBuyerMaker: boolean;
  time: number;
}

// Alert signal with dismissal tracking
interface AlertSignal extends Signal {
  dismissedAt?: number;
}

export default function QuentrexKillzoneOS() {
  // Hydration-safe mounted check
  const mounted = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);
  
  // Stores
  const {
    prices, setPrices, updatePrice, selectedPair, setSelectedPair,
    signals, addSignal, filteredSignals, signalFilter, setSignalFilter,
    currentKillzone, setCurrentKillzone, mmtTime, setMmtTime,
    orderBook, setOrderBook,
    balance, testMode, connectionStatus, setConnectionStatus,
    isLoading, setLoading
  } = useTradingStore();

  const { theme, toggleTheme } = useThemeStore();
  const colors = THEMES[theme];

  // Local state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0 });
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [volumeProfile, setVolumeProfile] = useState<VolumeLevel[]>([]);
  const [cvdData, setCvdData] = useState<CVDPoint[]>([]);
  const [cvdValue, setCvdValue] = useState(0);
  const [fundingRate, setFundingRate] = useState(0);
  const [openInterest, setOpenInterest] = useState(0);
  // screenerData is now computed via useMemo
  const [screenerSort, setScreenerSort] = useState<'volume' | 'change' | 'price'>('volume');
  const [backtestData, setBacktestData] = useState<BacktestSummary | null>(null);
  
  // Alert state - FIXED
  const [alertSignal, setAlertSignal] = useState<AlertSignal | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertHistory, setAlertHistory] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const depthWsRef = useRef<WebSocket | null>(null);
  const tradesWsRef = useRef<WebSocket | null>(null);
  const initializedRef = useRef(false);
  const cvdRef = useRef(0);
  const tradesRef = useRef<TradeData[]>([]);
  const alertSoundRef = useRef<HTMLAudioElement | null>(null);
  const lastSignalTimeRef = useRef<number>(0);

  // Initialize audio for alerts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Create audio element for alert sound
      alertSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRAI+pO/2MqEKwkApLzZz4ExCQCkudnPkDMJAJO50tCQMA0Ak7nS0I+wEQCTudLQn6wTAJO40tCgrBQAk7jS0J+sFQCTuNLQoqwVAJO40tCgrBUAk7jS0J+sFQCTuNLQn6wTAJO40tCfrBMAk7jS0J+sEwCTuNLQn6wTAJO40tCfrBMAk7jS0J+sEwA==');
      alertSoundRef.current.volume = 0.7;
    }
  }, []);

  // Calculate Volume Profile from candles
  const calculateVolumeProfile = useCallback((candles: CandleData[], levels: number = 20): VolumeLevel[] => {
    if (candles.length === 0) return [];
    
    const prices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const step = (maxPrice - minPrice) / levels;
    
    const profile: VolumeLevel[] = [];
    
    for (let i = 0; i < levels; i++) {
      const levelLow = minPrice + i * step;
      const levelHigh = levelLow + step;
      const levelMid = (levelLow + levelHigh) / 2;
      
      let volume = 0;
      let buyVolume = 0;
      let sellVolume = 0;
      
      candles.forEach(c => {
        if (c.high >= levelLow && c.low <= levelHigh) {
          const overlap = Math.min(c.high, levelHigh) - Math.max(c.low, levelLow);
          const candleRange = c.high - c.low;
          const volumeInLevel = (overlap / candleRange) * c.volume;
          
          volume += volumeInLevel;
          const closePosition = (c.close - c.low) / candleRange;
          buyVolume += volumeInLevel * closePosition;
          sellVolume += volumeInLevel * (1 - closePosition);
        }
      });
      
      profile.push({ price: levelMid, volume, buyVolume, sellVolume, percent: 0 });
    }
    
    const totalVol = profile.reduce((sum, p) => sum + p.volume, 0);
    return profile.map(p => ({ ...p, percent: (p.volume / totalVol) * 100 })).sort((a, b) => b.volume - a.volume);
  }, []);

  // Fetch candle data
  useEffect(() => {
    if (!mounted || !selectedPair) return;
    
    const fetchCandles = async () => {
      try {
        const data = await fetchKlines(selectedPair, '15m', 100);
        setCandles(data);
        const vp = calculateVolumeProfile(data, 24);
        setVolumeProfile(vp);
      } catch (e) {
        console.error('Error fetching candles:', e);
      }
    };
    
    fetchCandles();
    const interval = setInterval(fetchCandles, 30000);
    return () => clearInterval(interval);
  }, [mounted, selectedPair, calculateVolumeProfile]);

  // Fetch funding rate and open interest
  useEffect(() => {
    if (!mounted || !selectedPair) return;
    
    const fetchMetrics = async () => {
      try {
        const fundingRes = await fetch(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${selectedPair}&limit=1`);
        const fundingData = await fundingRes.json();
        if (fundingData[0]) {
          setFundingRate(parseFloat(fundingData[0].fundingRate) * 100);
        }
        
        const oiRes = await fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${selectedPair}`);
        const oiData = await oiRes.json();
        setOpenInterest(parseFloat(oiData.openInterest) || 0);
      } catch (e) {
        console.error('Error fetching metrics:', e);
      }
    };
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [mounted, selectedPair]);

  // Aggregate trades WebSocket for CVD
  useEffect(() => {
    if (!mounted || !selectedPair) return;
    
    const connectTradesWS = () => {
      const ws = new WebSocket(`wss://fstream.binance.com/ws/${selectedPair.toLowerCase()}@aggTrade`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const trade: TradeData = {
          price: parseFloat(data.p),
          quantity: parseFloat(data.q),
          isBuyerMaker: data.m,
          time: data.T
        };
        
        const delta = trade.isBuyerMaker ? -trade.quantity : trade.quantity;
        cvdRef.current += delta;
        setCvdValue(cvdRef.current);
        
        tradesRef.current.push(trade);
        if (tradesRef.current.length > 500) {
          tradesRef.current.shift();
        }
        
        setCvdData(prev => {
          const lastPoint = prev[prev.length - 1];
          const now = Date.now();
          
          if (lastPoint && now - lastPoint.time < 1000) {
            return [...prev.slice(0, -1), {
              time: lastPoint.time,
              cvd: cvdRef.current,
              delta: lastPoint.delta + delta
            }];
          } else {
            return [...prev.slice(-100), { time: now, cvd: cvdRef.current, delta }];
          }
        });
      };
      
      ws.onerror = () => console.error('Trades WS error');
      return ws;
    };
    
    tradesWsRef.current = connectTradesWS();
    return () => { tradesWsRef.current?.close(); };
  }, [mounted, selectedPair]);

  // Memoized screener data from prices
  const screenerDataMemo = useMemo(() => Object.values(prices), [prices]);

  // Initialize data
  useEffect(() => {
    if (!mounted || initializedRef.current) return;
    initializedRef.current = true;
    
    const init = async () => {
      setLoading(true);
      try {
        const tickers = await fetch24hTickers();
        const priceMap: Record<string, PriceData> = {};
        tickers.forEach(t => { priceMap[t.symbol] = t; });
        setPrices(priceMap);
        setConnectionStatus('connected');
        
        // Generate initial signals for ALL pairs
        for (const symbol of TRADING_PAIRS) {
          try {
            const candles = await fetchKlines(symbol, '15m', 100);
            if (candles.length > 50) {
              const signal = generateSignal(symbol, candles);
              if (signal) addSignal(signal);
            }
          } catch (e) {
            console.error(`Error generating signal for ${symbol}:`, e);
          }
        }
      } catch (error) {
        console.error('Init error:', error);
        setConnectionStatus('disconnected');
      }
      setLoading(false);
    };

    init();

    return () => {
      wsRef.current?.close();
      depthWsRef.current?.close();
      tradesWsRef.current?.close();
    };
  }, [mounted]);

  // WebSocket connection
  useEffect(() => {
    if (!mounted || Object.keys(prices).length === 0) return;

    wsRef.current = createTickerWebSocket(
      TRADING_PAIRS,
      (data) => updatePrice(data.symbol, data),
      () => setConnectionStatus('reconnecting')
    );

    return () => { wsRef.current?.close(); };
  }, [mounted, Object.keys(prices).length]);

  // OrderBook WebSocket
  useEffect(() => {
    if (!mounted) return;
    
    depthWsRef.current = createDepthWebSocket(
      selectedPair,
      (data) => setOrderBook(data),
      () => {}
    );

    return () => { depthWsRef.current?.close(); };
  }, [mounted, selectedPair]);

  // Clock and Killzone update
  useEffect(() => {
    if (!mounted) return;
    
    const updateClock = () => {
      const mmt = getMMTTime();
      setMmtTime(mmt);
      setCurrentKillzone(getCurrentKillzone(mmt));
      
      const nextKz = getTimeUntilNextKillzone(mmt);
      if (nextKz) {
        setCountdown({ hours: nextKz.hoursRemaining, minutes: nextKz.minutesRemaining });
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [mounted]);

  // Signal generation during killzones - MORE FREQUENT
  useEffect(() => {
    if (!mounted) return;
    
    const interval = setInterval(async () => {
      const kz = getCurrentKillzone();
      if (kz === 'NONE') return;

      // Generate for more pairs during active killzone
      for (const symbol of TRADING_PAIRS) {
        try {
          const candles = await fetchKlines(symbol, '15m', 100);
          if (candles.length > 50) {
            const signal = generateSignal(symbol, candles);
            if (signal) addSignal(signal);
          }
        } catch (e) {}
      }
    }, 30000); // Every 30 seconds during killzone

    return () => clearInterval(interval);
  }, [mounted]);

  // FIXED: Signal alert detection - using callback pattern
  const checkAndAlertSignals = useCallback(() => {
    if (!mounted || signals.length === 0) return;
    
    // Find new A+ or A signals that haven't been alerted
    const newHighGradeSignals = signals.filter(s => 
      (s.grade === 'A+' || s.grade === 'A') && 
      !alertHistory.has(s.id) &&
      Date.now() - s.timestamp < 60000
    );
    
    if (newHighGradeSignals.length > 0) {
      const latestSignal = newHighGradeSignals[newHighGradeSignals.length - 1];
      
      setAlertHistory(prev => {
        const newHistory = new Set([...prev, ...newHighGradeSignals.map(s => s.id)]);
        
        // Set alert signal
        setAlertSignal(latestSignal as AlertSignal);
        setShowAlert(true);
        
        // Play sound
        if (soundEnabled && alertSoundRef.current) {
          alertSoundRef.current.play().catch(() => {});
        }
        
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`🎯 ${latestSignal.grade} Signal: ${latestSignal.symbol}`, {
            body: `${latestSignal.direction} @ ${latestSignal.entryPrice.toFixed(4)} | R:R 1:${latestSignal.riskReward.toFixed(1)}`,
            icon: '/favicon.ico',
            tag: latestSignal.id
          });
        }
        
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission();
        }
        
        return newHistory;
      });
    }
  }, [mounted, signals, alertHistory, soundEnabled]);

  useEffect(() => {
    checkAndAlertSignals();
  }, [checkAndAlertSignals]);

  // Auto-dismiss alert after 15 seconds, but re-alert if signal still active
  useEffect(() => {
    if (!showAlert || !alertSignal) return;
    
    const timer = setTimeout(() => {
      setShowAlert(false);
    }, 15000);
    
    return () => clearTimeout(timer);
  }, [showAlert, alertSignal]);

  // Format helpers
  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(6);
  };

  const formatVolume = (vol: number) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(2)}K`;
    return vol.toFixed(2);
  };

  // Get sorted pairs
  const sortedPairs = useMemo(() => 
    Object.values(prices).sort((a, b) => b.quoteVolume - a.quoteVolume),
    [prices]
  );
  
  const selectedPrice = prices[selectedPair];

  // Get killzone color
  const getKZColor = (kz: KillzoneType) => {
    if (theme === 'light') {
      switch (kz) {
        case 'AKZ': return 'text-green-600';
        case 'LKZ': return 'text-cyan-600';
        case 'NYKZ': return 'text-purple-600';
        default: return 'text-gray-500';
      }
    }
    switch (kz) {
      case 'AKZ': return 'text-green-400';
      case 'LKZ': return 'text-cyan-400';
      case 'NYKZ': return 'text-purple-400';
      default: return 'text-gray-500';
    }
  };

  // Signal grade badge color - PROMINENT VERSION (RED instead of pink)
  const getGradeColor = (grade: string) => {
    const isLight = theme === 'light';
    switch (grade) {
      case 'A+': return isLight 
        ? 'bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 border-2 border-yellow-500 shadow-lg shadow-yellow-400/30'
        : 'bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 border-2 border-yellow-300 shadow-lg shadow-yellow-400/30';
      case 'A': return isLight
        ? 'bg-gradient-to-r from-green-400 to-emerald-400 text-green-900 border-2 border-green-500 shadow-lg shadow-green-400/30'
        : 'bg-gradient-to-r from-green-400 to-emerald-400 text-green-900 border-2 border-green-300 shadow-lg shadow-green-400/30';
      case 'B+': return isLight
        ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-blue-900 border-2 border-blue-500 shadow-lg shadow-blue-400/30'
        : 'bg-gradient-to-r from-blue-400 to-cyan-400 text-blue-900 border-2 border-blue-300 shadow-lg shadow-blue-400/30';
      default: return isLight
        ? 'bg-gray-200 text-gray-700 border border-gray-300'
        : 'bg-gray-600 text-gray-200 border border-gray-500';
    }
  };

  // Grade border glow
  const getGradeBorderGlow = (grade: string) => {
    switch (grade) {
      case 'A+': return 'border-2 border-yellow-400/50 shadow-[0_0_30px_rgba(234,179,8,0.3)]';
      case 'A': return 'border-2 border-green-400/50 shadow-[0_0_25px_rgba(34,197,94,0.3)]';
      case 'B+': return 'border-2 border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.3)]';
      default: return 'border border-gray-400/30';
    }
  };

  // Direction color (RED for short, not pink)
  const getDirectionColor = (direction: 'LONG' | 'SHORT') => {
    return direction === 'LONG' ? 'text-green-400' : 'text-red-500';
  };

  // Sort screener data
  const sortedScreenerData = useMemo(() => {
    const data = [...screenerDataMemo];
    switch (screenerSort) {
      case 'volume':
        return data.sort((a, b) => b.quoteVolume - a.quoteVolume);
      case 'change':
        return data.sort((a, b) => b.priceChangePercent - a.priceChangePercent);
      case 'price':
        return data.sort((a, b) => b.price - a.price);
      default:
        return data;
    }
  }, [screenerDataMemo, screenerSort]);

  // Don't render until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: colors.background }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" 
               style={{ borderColor: colors.primary, borderTopColor: 'transparent' }} />
          <p style={{ color: colors.muted }}>Loading QuentrexKillzone OS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300 pb-16 md:pb-20" 
         style={{ background: colors.background, color: colors.text }}>
      
      {/* A+ SIGNAL ALERT POPUP - FIXED AND PROMINENT */}
      <AnimatePresence>
        {showAlert && alertSignal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -100 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAlert(false)} />
            
            {/* Alert Card */}
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className={`relative max-w-lg w-full rounded-2xl overflow-hidden ${
                theme === 'dark' ? 'bg-gray-900' : 'bg-white'
              } border-2 ${
                alertSignal.grade === 'A+' 
                  ? 'border-yellow-400 shadow-[0_0_60px_rgba(234,179,8,0.5)]' 
                  : 'border-green-400 shadow-[0_0_60px_rgba(34,197,94,0.5)]'
              }`}
            >
              {/* Pulsing glow animation */}
              <div className={`absolute inset-0 ${
                alertSignal.grade === 'A+' 
                  ? 'animate-pulse bg-yellow-400/10' 
                  : 'animate-pulse bg-green-400/10'
              }`} />
              
              {/* Header */}
              <div className={`relative px-6 py-4 flex items-center justify-between ${
                alertSignal.grade === 'A+'
                  ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500'
              }`}>
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                  >
                    <BellRing className="w-6 h-6 text-white" />
                  </motion.div>
                  <span className="text-white font-bold text-lg">
                    {alertSignal.grade === 'A+' ? '🎯 A+ TRADEABLE SIGNAL!' : '⚡ A GRADE SIGNAL'}
                  </span>
                </div>
                <button 
                  onClick={() => setShowAlert(false)} 
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Content */}
              <div className="relative p-6">
                {/* Main Signal Info */}
                <div className={`p-5 rounded-xl mb-4 ${
                  alertSignal.direction === 'LONG'
                    ? theme === 'dark' ? 'bg-green-500/20 border border-green-500/40' : 'bg-green-50 border border-green-200'
                    : theme === 'dark' ? 'bg-red-500/20 border border-red-500/40' : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {alertSignal.direction === 'LONG' 
                        ? <ArrowUpRight className="w-12 h-12 text-green-400" />
                        : <ArrowDownRight className="w-12 h-12 text-red-500" />
                      }
                      <div>
                        <div className="text-3xl font-black">{alertSignal.symbol.replace('USDT', '')}</div>
                        <div className={`text-2xl font-bold ${getDirectionColor(alertSignal.direction)}`}>
                          {alertSignal.direction}
                        </div>
                      </div>
                    </div>
                    <div className={`px-5 py-2 rounded-xl text-2xl font-black ${getGradeColor(alertSignal.grade)}`}>
                      {alertSignal.grade}
                    </div>
                  </div>
                </div>
                
                {/* Signal Details */}
                <div className="grid grid-cols-3 gap-3 text-center mb-4">
                  <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}>
                    <div className="text-xs text-gray-500 mb-1">ENTRY</div>
                    <div className="text-lg font-bold font-mono">${formatPrice(alertSignal.entryPrice)}</div>
                  </div>
                  <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
                    <div className="text-xs text-red-500 mb-1">STOP LOSS</div>
                    <div className="text-lg font-bold font-mono text-red-500">${formatPrice(alertSignal.stopLoss)}</div>
                  </div>
                  <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50'}`}>
                    <div className="text-xs text-green-400 mb-1">TAKE PROFIT</div>
                    <div className="text-lg font-bold font-mono text-green-400">${formatPrice(alertSignal.takeProfit1)}</div>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="flex items-center justify-between text-sm mb-4">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500">R:R <span className="font-bold text-cyan-400">1:{alertSignal.riskReward.toFixed(1)}</span></span>
                    <span className="text-gray-500">Confidence <span className="font-bold text-cyan-400">{alertSignal.confidence.toFixed(0)}%</span></span>
                  </div>
                  <div className={`font-bold ${getKZColor(alertSignal.killzone)}`}>
                    {alertSignal.killzone}
                  </div>
                </div>
                
                {/* Criteria Checklist */}
                <div className={`p-3 rounded-lg text-xs ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <div className="font-bold mb-2 text-gray-400">SIGNAL CRITERIA:</div>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(alertSignal.criteriaScores || {}).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-1">
                        {value ? <Check className="w-3 h-3 text-green-400" /> : <X className="w-3 h-3 text-gray-500" />}
                        <span className={value ? 'text-green-400' : 'text-gray-500'}>
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setSelectedPair(alertSignal.symbol);
                      setShowAlert(false);
                      setActiveTab('signals');
                    }}
                    className={`flex-1 py-3 rounded-xl font-bold text-white ${
                      alertSignal.direction === 'LONG'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-red-500 hover:bg-red-600'
                    } transition-colors`}
                  >
                    View Signal
                  </button>
                  <button
                    onClick={() => setShowAlert(false)}
                    className={`px-6 py-3 rounded-xl font-bold ${
                      theme === 'dark' ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-200 hover:bg-gray-300'
                    } transition-colors`}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl border-b" 
              style={{ background: theme === 'dark' ? 'rgba(10,10,15,0.95)' : 'rgba(255,255,255,0.98)', borderColor: theme === 'dark' ? colors.border : '#e5e7eb' }}>
        
        {/* Desktop Header */}
        <div className="hidden md:flex max-w-[1920px] mx-auto px-4 py-3 items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={`font-black text-xl tracking-tight ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                QUENTREX
              </span>
              <span className={`font-black text-xl tracking-tight ${theme === 'dark' ? 'text-red-500' : 'text-red-600'}`}>
                KILLZONE
              </span>
              <span className="text-xs text-gray-500 ml-1">v7.0 GLOBAL</span>
            </div>
            <Badge variant="outline" 
                   className={`text-[10px] ${theme === 'dark' ? 'border-green-500/50 text-green-400 bg-green-500/10' : 'border-green-400 text-green-600 bg-green-50'}`}>
              POWERED BY KO HTIKE
            </Badge>
          </div>

          {/* Status */}
          <div className="flex items-center gap-4">
            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-green-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
            </button>

            {/* Theme Toggle */}
            <div className={`flex items-center gap-2 p-1.5 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}>
              <Sun className={`w-4 h-4 ${theme === 'light' ? 'text-yellow-500' : 'text-gray-500'}`} />
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              <Moon className={`w-4 h-4 ${theme === 'dark' ? 'text-blue-400' : 'text-gray-500'}`} />
            </div>

            {/* Connection */}
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-400 animate-pulse' :
                connectionStatus === 'reconnecting' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className={`text-xs font-medium uppercase ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {connectionStatus === 'connected' ? 'LIVE' : connectionStatus.toUpperCase()}
              </span>
            </div>

            {/* Killzone */}
            <div className="flex items-center gap-2">
              {currentKillzone !== 'NONE' ? (
                <Badge className={`${
                  currentKillzone === 'NYKZ' 
                    ? theme === 'dark' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'bg-purple-100 text-purple-600 border-purple-300'
                    : currentKillzone === 'LKZ' 
                      ? theme === 'dark' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'bg-cyan-100 text-cyan-600 border-cyan-300'
                      : theme === 'dark' ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-green-100 text-green-600 border-green-300'
                } border`}>
                  {currentKillzone === 'NYKZ' && <Flame className="w-3 h-3 mr-1" />}
                  {currentKillzone} ACTIVE
                </Badge>
              ) : (
                <span className="text-xs text-gray-500">NO KZ · {countdown.hours}h {countdown.minutes}m</span>
              )}
            </div>

            {/* Clock */}
            <div className="text-right">
              <div className={`font-mono text-lg font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                {mmtTime.toLocaleTimeString('en-US', { hour12: false })}
              </div>
              <div className="text-[10px] text-gray-500">MMT (UTC+6:30)</div>
            </div>

            {/* Balance */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
              <span className="text-xs text-gray-500">BAL:</span>
              <span className={`font-mono text-sm font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>${balance.toLocaleString()}</span>
              {testMode && <Badge variant="outline" className="text-[9px] border-yellow-500/50 text-yellow-500">DEMO</Badge>}
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`font-black text-lg ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>QUENTREX</span>
            <span className={`font-black text-lg ${theme === 'dark' ? 'text-red-500' : 'text-red-600'}`}>KZ</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-green-400" /> : <VolumeX className="w-4 h-4 text-gray-500" />}
            </button>
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}
            >
              {theme === 'dark' ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-yellow-500" />}
            </button>
            
            {/* Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
            >
              <div className={`px-4 py-3 space-y-3 border-t ${theme === 'dark' ? 'border-white/5 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">KILLZONE</span>
                  {currentKillzone !== 'NONE' ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/50">{currentKillzone}</Badge>
                  ) : (
                    <span className="text-xs">None ({countdown.hours}h {countdown.minutes}m)</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">MMT TIME</span>
                  <span className={`font-mono font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    {mmtTime.toLocaleTimeString('en-US', { hour12: false })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">BALANCE</span>
                  <span className={`font-mono font-bold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                    ${balance.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">STATUS</span>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-xs uppercase">{connectionStatus}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pair selector - FIXED WIDTH STABLE */}
        <div className={`border-t overflow-x-auto scrollbar-hide ${theme === 'dark' ? 'border-white/5 bg-black/20' : 'border-gray-200 bg-gray-50'}`}>
          <div className="max-w-[1920px] mx-auto px-2 md:px-4 py-2 flex gap-1 md:gap-1.5">
            {sortedPairs.slice(0, 18).map((pair) => {
              const isSelected = pair.symbol === selectedPair;
              const isPositive = pair.priceChangePercent >= 0;
              const pairSignal = signals.find(s => s.symbol === pair.symbol);
              const hasHighGrade = pairSignal && (pairSignal.grade === 'A+' || pairSignal.grade === 'A');
              
              return (
                <button
                  key={pair.symbol}
                  onClick={() => setSelectedPair(pair.symbol)}
                  className={`flex-shrink-0 w-[80px] md:w-[95px] px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isSelected
                      ? isPositive 
                        ? theme === 'dark' 
                          ? 'bg-green-500/20 border-2 border-green-400 text-green-400 shadow-lg shadow-green-500/20' 
                          : 'bg-green-100 border-2 border-green-500 text-green-700 shadow-md'
                        : theme === 'dark' 
                          ? 'bg-red-500/20 border-2 border-red-400 text-red-400 shadow-lg shadow-red-500/20' 
                          : 'bg-red-100 border-2 border-red-500 text-red-700 shadow-md'
                      : theme === 'dark' 
                        ? 'bg-white/5 text-gray-400 hover:bg-white/10 border-2 border-transparent hover:border-gray-600' 
                        : 'bg-white text-gray-600 hover:bg-gray-100 border-2 border-gray-200 hover:border-gray-300 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="flex items-center gap-1">
                      <span className="font-bold">{pair.symbol.replace('USDT', '')}</span>
                      {hasHighGrade && (
                        <Star className={`w-3 h-3 ${pairSignal?.grade === 'A+' ? 'text-yellow-400' : 'text-green-400'} fill-current animate-pulse`} />
                      )}
                    </div>
                    <span className={`font-mono text-[10px] ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{pair.priceChangePercent.toFixed(2)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto p-2 md:p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Mobile-optimized Tab List */}
          <div className="overflow-x-auto scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">
            <TabsList className={`${theme === 'dark' ? 'bg-black/40 border-white/10' : 'bg-gray-100 border-gray-200'} border p-1 inline-flex md:flex w-max md:w-full`}>
              <TabsTrigger value="dashboard" className="text-xs whitespace-nowrap data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"><Activity className="w-3 h-3 mr-1" />Dashboard</TabsTrigger>
              <TabsTrigger value="signals" className="text-xs whitespace-nowrap data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"><Zap className="w-3 h-3 mr-1" />Signals</TabsTrigger>
              <TabsTrigger value="screener" className="text-xs whitespace-nowrap data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"><Eye className="w-3 h-3 mr-1" />Screener</TabsTrigger>
              <TabsTrigger value="backtest" className="text-xs whitespace-nowrap data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"><BarChart3 className="w-3 h-3 mr-1" />Backtest</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs whitespace-nowrap data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                <Bot className="w-3 h-3 mr-1" />AI
                <span className="ml-1 w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column */}
              <div className="lg:col-span-3 space-y-4">
                {/* Price Card */}
                <Card className={`${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'} overflow-hidden`}>
                  <CardContent className="p-4">
                    <div className="text-xs text-gray-500 uppercase mb-1">{selectedPair} · 15m · BINANCE</div>
                    <div className={`text-3xl font-black font-mono ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                      ${selectedPrice ? formatPrice(selectedPrice.price) : '---'}
                    </div>
                    <div className={`text-sm font-bold mt-1 ${selectedPrice?.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                      {selectedPrice?.priceChangePercent >= 0 ? '+' : ''}{selectedPrice?.priceChangePercent?.toFixed(2) || '0.00'}%
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <div className="text-[10px] text-gray-500">24H HIGH</div>
                        <div className="font-mono text-sm text-green-400">${selectedPrice ? formatPrice(selectedPrice.high24h) : '---'}</div>
                      </div>
                      <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <div className="text-[10px] text-gray-500">24H LOW</div>
                        <div className="font-mono text-sm text-red-500">${selectedPrice ? formatPrice(selectedPrice.low24h) : '---'}</div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                      <div className={`p-2 rounded ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <div className="text-gray-500 text-[10px]">VOLUME</div>
                        <div className="font-mono text-cyan-400">${selectedPrice ? formatVolume(selectedPrice.quoteVolume) : '---'}</div>
                      </div>
                      <div className={`p-2 rounded ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <div className="text-gray-500 text-[10px]">FUNDING</div>
                        <div className={`font-mono ${fundingRate >= 0 ? 'text-green-400' : 'text-red-500'}`}>{(fundingRate || 0).toFixed(4)}%</div>
                      </div>
                      <div className={`p-2 rounded ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                        <div className="text-gray-500 text-[10px]">OI</div>
                        <div className="font-mono text-cyan-400">{openInterest ? formatVolume(openInterest) : '---'}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CVD */}
                <Card className={`${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'}`}>
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-xs text-gray-500 uppercase tracking-wider">CVD (Cumulative Volume Delta)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3">
                    <div className={`text-2xl font-mono font-bold ${cvdValue >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                      {cvdValue >= 0 ? '+' : ''}{cvdValue.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1">
                      {cvdValue >= 0 ? '🔺 Buying Pressure' : '🔻 Selling Pressure'}
                    </div>
                    <div className="mt-3 h-12 flex items-end gap-px">
                      {cvdData.slice(-30).map((point, i) => {
                        const prevPoint = cvdData[i + cvdData.length - 31];
                        const change = prevPoint ? point.cvd - prevPoint.cvd : 0;
                        const height = Math.min(100, Math.abs(change) / 10 + 5);
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-t ${change >= 0 ? 'bg-green-500/50' : 'bg-red-500/50'}`}
                            style={{ height: `${height}%` }}
                          />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Center Column - Signals */}
              <div className="lg:col-span-6 space-y-4">
                {/* Grade Filter Bar */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    LIVE SIGNALS
                    {filteredSignals.length > 0 && (
                      <Badge className="ml-2 bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                        {filteredSignals.length}
                      </Badge>
                    )}
                  </h2>
                  <div className="flex gap-1">
                    {['A+', 'A', 'B+'].map((grade) => (
                      <button
                        key={grade}
                        onClick={() => {
                          const newGrades = signalFilter.grades.includes(grade)
                            ? signalFilter.grades.filter(g => g !== grade)
                            : [...signalFilter.grades, grade];
                          setSignalFilter({ grades: newGrades });
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
                          signalFilter.grades.includes(grade) 
                            ? getGradeColor(grade)
                            : theme === 'dark' 
                              ? 'bg-white/5 text-gray-500 border-gray-700 hover:border-gray-500' 
                              : 'bg-gray-100 text-gray-500 border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>

                <ScrollArea className="h-[calc(100vh-400px)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                    <AnimatePresence mode="popLayout">
                      {filteredSignals.length === 0 ? (
                        <div className="col-span-2 text-center py-12 text-gray-500">
                          <Target className="w-12 h-12 mx-auto mb-3 opacity-20" />
                          <p>Signals appear during killzones</p>
                        </div>
                      ) : (
                        filteredSignals.map((signal) => (
                          <motion.div
                            key={signal.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`rounded-xl overflow-hidden ${
                              theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'
                            } ${getGradeBorderGlow(signal.grade)}`}
                          >
                            {/* Grade Header Bar */}
                            <div className={`px-4 py-2 flex items-center justify-between ${
                              signal.grade === 'A+' 
                                ? theme === 'dark' ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30' : 'bg-gradient-to-r from-yellow-100 to-amber-100'
                                : signal.grade === 'A'
                                  ? theme === 'dark' ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30' : 'bg-gradient-to-r from-green-100 to-emerald-100'
                                  : theme === 'dark' ? 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30' : 'bg-gradient-to-r from-blue-100 to-cyan-100'
                            }`}>
                              <div className="flex items-center gap-2">
                                {signal.grade === 'A+' && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-pulse" />
                                    <span className="text-xs font-bold text-yellow-400 uppercase">Tradeable</span>
                                  </div>
                                )}
                                {signal.grade === 'A' && (
                                  <span className="text-xs font-bold text-green-400 uppercase">High Quality</span>
                                )}
                              </div>
                              <div className={`px-3 py-1 rounded-lg text-lg font-black ${getGradeColor(signal.grade)}`}>
                                {signal.grade}
                              </div>
                            </div>
                            
                            <div className="p-4">
                              {/* Direction Banner */}
                              <div className={`p-3 rounded-lg mb-3 ${
                                signal.direction === 'LONG' 
                                  ? theme === 'dark' ? 'bg-green-500/20 border border-green-500/40' : 'bg-green-50 border border-green-200'
                                  : theme === 'dark' ? 'bg-red-500/20 border border-red-500/40' : 'bg-red-50 border border-red-200'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {signal.direction === 'LONG' 
                                      ? <ArrowUpRight className="w-6 h-6 text-green-400" />
                                      : <ArrowDownRight className="w-6 h-6 text-red-500" />
                                    }
                                    <span className={`text-2xl font-black ${getDirectionColor(signal.direction)}`}>
                                      {signal.direction}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-lg">{signal.symbol.replace('USDT', '')}</div>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-1.5 text-xs font-mono">
                                <div className="flex justify-between"><span className="text-gray-500">Entry</span><span className="font-bold">${formatPrice(signal.entryPrice)}</span></div>
                                <div className="flex justify-between"><span className="text-red-500">Stop Loss</span><span className="text-red-500 font-bold">${formatPrice(signal.stopLoss)}</span></div>
                                <div className="flex justify-between"><span className="text-green-400">Take Profit 1</span><span className="text-green-400 font-bold">${formatPrice(signal.takeProfit1)}</span></div>
                                <div className="flex justify-between"><span className="text-green-400">Take Profit 2</span><span className="text-green-400 font-bold">${formatPrice(signal.takeProfit2)}</span></div>
                              </div>

                              <div className={`mt-3 pt-3 border-t grid grid-cols-4 gap-2 text-[10px] text-center ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
                                <div><div className="text-gray-500">R:R</div><div className="font-bold text-cyan-400">1:{signal.riskReward.toFixed(1)}</div></div>
                                <div><div className="text-gray-500">CONF</div><div className="font-bold text-cyan-400">{signal.confidence.toFixed(0)}%</div></div>
                                <div><div className="text-gray-500">KZ</div><div className={`font-bold ${getKZColor(signal.killzone)}`}>{signal.killzone}</div></div>
                                <div><div className="text-gray-500">RSI</div><div className={`font-bold ${signal.rsi < 30 ? 'text-green-400' : signal.rsi > 70 ? 'text-red-500' : 'text-cyan-400'}`}>{signal.rsi.toFixed(0)}</div></div>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-3 space-y-4">
                {/* Killzones */}
                <Card className={`${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'}`}>
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-3 h-3" /> KILLZONES (MMT)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-2">
                    {KILLZONE_CONFIGS.map((kz) => {
                      const isActive = currentKillzone === kz.type;
                      return (
                        <div key={kz.type} className={`p-3 rounded-lg border transition-all ${
                          isActive ? theme === 'dark' ? 'border-white/20 bg-white/5' : 'border-gray-300 bg-gray-50' : theme === 'dark' ? 'border-white/5 bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {kz.type === 'NYKZ' && isActive && <Flame className="w-4 h-4 text-orange-400 animate-pulse" />}
                              <span className={`font-bold ${isActive ? '' : 'text-gray-500'}`}>{kz.name}</span>
                            </div>
                            {isActive && <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-[10px]">ACTIVE</Badge>}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{kz.label}</div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                {/* Market Metrics */}
                <Card className={`${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'}`}>
                  <CardHeader className="pb-2 pt-3 px-4">
                    <CardTitle className="text-xs text-gray-500 uppercase tracking-wider">MARKET METRICS</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Funding Rate</span>
                      <span className={`font-mono font-bold ${fundingRate >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                        {(fundingRate || 0).toFixed(4)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">Open Interest</span>
                      <span className="font-mono font-bold text-cyan-400">{openInterest ? formatVolume(openInterest) : '---'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">CVD</span>
                      <span className={`font-mono font-bold ${cvdValue >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                        {cvdValue >= 0 ? '+' : ''}{cvdValue.toFixed(0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Signals Tab */}
          <TabsContent value="signals" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSignals.map((signal) => (
                <motion.div key={signal.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl overflow-hidden ${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'} ${getGradeBorderGlow(signal.grade)}`}>
                  <div className={`px-4 py-2 flex items-center justify-between ${
                    signal.grade === 'A+' 
                      ? theme === 'dark' ? 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30' : 'bg-gradient-to-r from-yellow-100 to-amber-100'
                      : signal.grade === 'A'
                        ? theme === 'dark' ? 'bg-gradient-to-r from-green-500/30 to-emerald-500/30' : 'bg-gradient-to-r from-green-100 to-emerald-100'
                        : theme === 'dark' ? 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30' : 'bg-gradient-to-r from-blue-100 to-cyan-100'
                  }`}>
                    {signal.grade === 'A+' && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-pulse" />
                        <span className="text-xs font-bold text-yellow-400 uppercase">Tradeable</span>
                      </div>
                    )}
                    {signal.grade === 'A' && <span className="text-xs font-bold text-green-400 uppercase">High Quality</span>}
                    {signal.grade === 'B+' && <span className="text-xs font-bold text-blue-400 uppercase">Moderate</span>}
                    <div className={`px-3 py-1 rounded-lg text-lg font-black ${getGradeColor(signal.grade)}`}>
                      {signal.grade}
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <div className={`p-4 rounded-lg mb-4 text-center ${
                      signal.direction === 'LONG' 
                        ? theme === 'dark' ? 'bg-green-500/20 border border-green-500/40' : 'bg-green-50 border border-green-200'
                        : theme === 'dark' ? 'bg-red-500/20 border border-red-500/40' : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center justify-center gap-2">
                        {signal.direction === 'LONG' ? <TrendingUp className="w-8 h-8 text-green-400" /> : <TrendingDown className="w-8 h-8 text-red-500" />}
                        <span className={`text-3xl font-black ${getDirectionColor(signal.direction)}`}>{signal.direction}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-xl">{signal.symbol.replace('USDT', '')}</span>
                      <Badge className={`font-bold ${getGradeColor(signal.grade)}`}>{signal.grade}</Badge>
                    </div>
                    <div className="space-y-2 text-sm font-mono mb-4">
                      <div className="flex justify-between p-2 rounded bg-white/5"><span className="text-gray-400">Entry</span><span className="font-bold">${formatPrice(signal.entryPrice)}</span></div>
                      <div className="flex justify-between p-2 rounded bg-red-500/10"><span className="text-red-500">Stop Loss</span><span className="text-red-500 font-bold">${formatPrice(signal.stopLoss)}</span></div>
                      <div className="flex justify-between p-2 rounded bg-green-500/10"><span className="text-green-400">Take Profit 1</span><span className="text-green-400 font-bold">${formatPrice(signal.takeProfit1)}</span></div>
                      <div className="flex justify-between p-2 rounded bg-green-500/10"><span className="text-green-400">Take Profit 2</span><span className="text-green-400 font-bold">${formatPrice(signal.takeProfit2)}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className={`p-2 rounded ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} text-center`}><div className="text-gray-500 text-[10px]">R:R</div><div className="font-bold text-cyan-400">1:{signal.riskReward.toFixed(1)}</div></div>
                      <div className={`p-2 rounded ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'} text-center`}><div className="text-gray-500 text-[10px]">CONFIDENCE</div><div className="font-bold text-cyan-400">{signal.confidence.toFixed(0)}%</div></div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Screener Tab */}
          <TabsContent value="screener" className="mt-4">
            <Card className={`${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">MARKET SCREENER</CardTitle>
                  <div className="flex gap-2">
                    {(['volume', 'change', 'price'] as const).map((sort) => (
                      <Button key={sort} size="sm" variant={screenerSort === sort ? 'default' : 'outline'}
                        onClick={() => setScreenerSort(sort)}
                        className={`text-xs h-7 px-2 ${screenerSort === sort ? 'bg-green-500/20 text-green-400 border-green-500/50' : ''}`}>
                        {sort.charAt(0).toUpperCase() + sort.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className={`${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <tr>
                        <th className="text-left p-3 font-medium text-gray-500">Pair</th>
                        <th className="text-right p-3 font-medium text-gray-500">Price</th>
                        <th className="text-right p-3 font-medium text-gray-500">24h Change</th>
                        <th className="text-right p-3 font-medium text-gray-500">Volume</th>
                        <th className="text-right p-3 font-medium text-gray-500">Signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedScreenerData.slice(0, 50).map((pair) => {
                        const pairSignal = signals.find(s => s.symbol === pair.symbol);
                        return (
                          <tr key={pair.symbol} 
                              onClick={() => setSelectedPair(pair.symbol)}
                              className={`border-t cursor-pointer transition-colors ${
                                selectedPair === pair.symbol 
                                  ? theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50'
                                  : theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                              }`}
                              style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
                            <td className="p-3 font-bold">{pair.symbol.replace('USDT', '')}</td>
                            <td className="p-3 text-right font-mono">${formatPrice(pair.price)}</td>
                            <td className={`p-3 text-right font-mono ${pair.priceChangePercent >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                              {pair.priceChangePercent >= 0 ? '+' : ''}{pair.priceChangePercent.toFixed(2)}%
                            </td>
                            <td className="p-3 text-right font-mono text-cyan-400">${formatVolume(pair.quoteVolume)}</td>
                            <td className="p-3 text-right">
                              {pairSignal && (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getGradeColor(pairSignal.grade)}`}>
                                  {pairSignal.grade}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Backtest Tab */}
          <TabsContent value="backtest" className="mt-4">
            <BacktestingPanel />
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AIChat 
                backtestData={backtestData} 
                signals={signals}
                marketContext={{
                  selectedPair,
                  currentPrice: selectedPrice?.price,
                  currentKillzone,
                  mmtTime: mmtTime.toISOString(),
                  fundingRate,
                  openInterest,
                  cvdValue,
                  volumeProfile: volumeProfile.slice(0, 5)
                }}
              />
              <Card className={`${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="w-4 h-4" /> AI STRATEGY ANALYST
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-3 text-xs">
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-green-500/10' : 'bg-green-50'}`}>
                    <div className="font-bold text-green-400 mb-1">📈 Win Rate Optimization</div>
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      1. Only trade A+ signals during NYKZ<br/>
                      2. Wait for MSS + OB + FVG confluence<br/>
                      3. Confirm with CVD divergence
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-cyan-500/10' : 'bg-cyan-50'}`}>
                    <div className="font-bold text-cyan-400 mb-1">🎯 Entry Timing</div>
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      1. Wait for liquidity sweep first<br/>
                      2. Enter on retest of OB/FVG<br/>
                      3. Scale in after TP1 hit
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-yellow-500/10' : 'bg-yellow-50'}`}>
                    <div className="font-bold text-yellow-400 mb-1">⚠ Risk Rules</div>
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      1. Max 3 trades per killzone<br/>
                      2. Stop after 2 consecutive losses<br/>
                      3. Reduce size after losing streak
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'}`}>
                    <div className="font-bold text-red-500 mb-1">🚫 Avoid</div>
                    <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      1. Trading outside killzones<br/>
                      2. B+ signals with low volume<br/>
                      3. Counter-trend trades
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile Bottom Navigation */}
      <footer className={`fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t z-40 md:hidden`}
              style={{ background: theme === 'dark' ? 'rgba(10,10,15,0.98)' : 'rgba(255,255,255,0.98)', borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e7eb' }}>
        <div className="flex items-center justify-around py-1.5 safe-area-bottom">
          {[
            { id: 'dashboard', icon: Activity, label: 'Home', color: 'text-green-400' },
            { id: 'signals', icon: Zap, label: 'Signals', color: 'text-yellow-400' },
            { id: 'screener', icon: Eye, label: 'Scan', color: 'text-cyan-400' },
            { id: 'backtest', icon: BarChart3, label: 'Test', color: 'text-purple-400' },
            { id: 'ai', icon: Bot, label: 'AI', color: 'text-blue-400', live: true },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
                activeTab === tab.id
                  ? `${tab.color} ${theme === 'dark' ? 'bg-white/10' : 'bg-gray-100'}`
                  : 'text-gray-500'
              }`}
            >
              <div className="relative">
                <tab.icon className="w-5 h-5" />
                {tab.live && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -bottom-0.5 w-6 h-0.5 rounded-full bg-green-400"
                />
              )}
            </button>
          ))}
        </div>
      </footer>

      {/* Desktop Footer */}
      <footer className={`hidden md:block fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t py-2 px-4 z-40`}
              style={{ background: theme === 'dark' ? 'rgba(10,10,15,0.95)' : 'rgba(255,255,255,0.98)', borderColor: theme === 'dark' ? colors.border : '#e5e7eb' }}>
        <div className="max-w-[1920px] mx-auto flex items-center justify-between text-[10px] text-gray-500">
          <div className="flex items-center gap-4">
            <span>QuentrexKillzone OS v7.0 GLOBAL · ICT/SMC · Binance Futures</span>
            <span>·</span>
            <span>{TRADING_PAIRS.length} Pairs · Real-time AI · Mobile Ready</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE</span>
            <span>MMT Killzones · Institutional Grade</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
