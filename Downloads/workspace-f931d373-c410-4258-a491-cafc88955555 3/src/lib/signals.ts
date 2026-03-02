// Signal Generation for QuentrexKillzone OS v7.0
import type { 
  Candlestick, 
  TradingSignal, 
  SignalGrade, 
  SignalDirection,
  KillzoneType,
  Indicators 
} from '@/types/trading';
import { calculateAllIndicators, detectOrderBlocks, detectFVGs, detectMSS } from './indicators';

interface SignalCriteria {
  rsi: boolean;
  macd: boolean;
  volume: boolean;
  killzone: boolean;
  orderBlock: boolean;
  fvg: boolean;
  mss: boolean;
  liquiditySweep: boolean;
  smtDivergence: boolean;
}

// Generate signals for a trading pair
export function generateSignals(
  symbol: string,
  candles: Candlestick[],
  activeKillzone: KillzoneType | null,
  fundingRate: number = 0
): TradingSignal[] {
  if (candles.length < 50) return [];
  
  const signals: TradingSignal[] = [];
  const indicators = calculateAllIndicators(candles);
  const orderBlocks = detectOrderBlocks(candles);
  const fvgs = detectFVGs(candles);
  const mssArray = detectMSS(candles);
  
  const currentPrice = candles[candles.length - 1].close;
  const atr = indicators.atr;
  
  // Generate LONG signal
  const longCriteria = evaluateLongCriteria(
    indicators, 
    currentPrice, 
    candles, 
    activeKillzone,
    orderBlocks,
    fvgs,
    mssArray
  );
  
  const longScore = Object.values(longCriteria).filter(Boolean).length;
  
  if (longScore >= 4) {
    const signal = createSignal(
      symbol,
      'LONG',
      longScore,
      longCriteria,
      currentPrice,
      atr,
      activeKillzone,
      candles
    );
    if (signal) signals.push(signal);
  }
  
  // Generate SHORT signal
  const shortCriteria = evaluateShortCriteria(
    indicators, 
    currentPrice, 
    candles, 
    activeKillzone,
    orderBlocks,
    fvgs,
    mssArray
  );
  
  const shortScore = Object.values(shortCriteria).filter(Boolean).length;
  
  if (shortScore >= 4) {
    const signal = createSignal(
      symbol,
      'SHORT',
      shortScore,
      shortCriteria,
      currentPrice,
      atr,
      activeKillzone,
      candles
    );
    if (signal) signals.push(signal);
  }
  
  return signals;
}

function evaluateLongCriteria(
  indicators: Indicators,
  currentPrice: number,
  candles: Candlestick[],
  activeKillzone: KillzoneType | null,
  orderBlocks: { type: string; high: number; low: number }[],
  fvgs: { type: string; high: number; low: number }[],
  mssArray: { type: string; price: number }[]
): SignalCriteria {
  const recentCandles = candles.slice(-10);
  const recentLow = Math.min(...recentCandles.map(c => c.low));
  const recentHigh = Math.max(...recentCandles.map(c => c.high));
  
  return {
    rsi: indicators.rsi < 35 || (indicators.rsi > 40 && indicators.rsi < 50 && indicators.macd.histogram > 0),
    macd: indicators.macd.histogram > 0 && indicators.macd.trend === 'bullish',
    volume: indicators.volumeSurge,
    killzone: activeKillzone !== null,
    orderBlock: orderBlocks.some(ob => 
      ob.type === 'bullish' && 
      currentPrice >= ob.low && 
      currentPrice <= ob.high
    ),
    fvg: fvgs.some(fvg => 
      fvg.type === 'bullish' && 
      currentPrice >= fvg.low && 
      currentPrice <= fvg.high
    ),
    mss: mssArray.some(mss => mss.type === 'bullish' && currentPrice > mss.price),
    liquiditySweep: currentPrice <= recentLow * 1.002, // Near recent low
    smtDivergence: false // Would need comparison with another asset
  };
}

function evaluateShortCriteria(
  indicators: Indicators,
  currentPrice: number,
  candles: Candlestick[],
  activeKillzone: KillzoneType | null,
  orderBlocks: { type: string; high: number; low: number }[],
  fvgs: { type: string; high: number; low: number }[],
  mssArray: { type: string; price: number }[]
): SignalCriteria {
  const recentCandles = candles.slice(-10);
  const recentHigh = Math.max(...recentCandles.map(c => c.high));
  
  return {
    rsi: indicators.rsi > 65 || (indicators.rsi > 50 && indicators.rsi < 60 && indicators.macd.histogram < 0),
    macd: indicators.macd.histogram < 0 && indicators.macd.trend === 'bearish',
    volume: indicators.volumeSurge,
    killzone: activeKillzone !== null,
    orderBlock: orderBlocks.some(ob => 
      ob.type === 'bearish' && 
      currentPrice >= ob.low && 
      currentPrice <= ob.high
    ),
    fvg: fvgs.some(fvg => 
      fvg.type === 'bearish' && 
      currentPrice >= fvg.low && 
      currentPrice <= fvg.high
    ),
    mss: mssArray.some(mss => mss.type === 'bearish' && currentPrice < mss.price),
    liquiditySweep: currentPrice >= recentHigh * 0.998, // Near recent high
    smtDivergence: false
  };
}

function createSignal(
  symbol: string,
  direction: SignalDirection,
  score: number,
  criteria: SignalCriteria,
  currentPrice: number,
  atr: number,
  activeKillzone: KillzoneType | null,
  candles: Candlestick[]
): TradingSignal | null {
  if (atr === 0) return null;
  
  const grade = getGrade(score);
  const confidence = calculateConfidence(score, criteria);
  
  // Calculate entry, SL, TP based on direction
  let entry: number;
  let stopLoss: number;
  let takeProfit: number;
  let takeProfit2: number;
  let takeProfit3: number;
  
  if (direction === 'LONG') {
    entry = currentPrice;
    stopLoss = currentPrice - (atr * 1.5);
    takeProfit = currentPrice + (atr * 2);
    takeProfit2 = currentPrice + (atr * 3);
    takeProfit3 = currentPrice + (atr * 4.5);
  } else {
    entry = currentPrice;
    stopLoss = currentPrice + (atr * 1.5);
    takeProfit = currentPrice - (atr * 2);
    takeProfit2 = currentPrice - (atr * 3);
    takeProfit3 = currentPrice - (atr * 4.5);
  }
  
  const riskReward = Math.abs(takeProfit - entry) / Math.abs(entry - stopLoss);
  
  return {
    id: `${symbol}-${direction}-${Date.now()}`,
    symbol,
    direction,
    grade,
    entry,
    stopLoss,
    takeProfit,
    takeProfit2,
    takeProfit3,
    riskReward: parseFloat(riskReward.toFixed(2)),
    confidence,
    indicators: criteria,
    killzone: activeKillzone || undefined,
    timestamp: Date.now(),
    notes: generateNotes(grade, criteria, direction)
  };
}

function getGrade(score: number): SignalGrade {
  if (score >= 8) return 'A+';
  if (score >= 6) return 'A';
  if (score >= 5) return 'B+';
  if (score >= 4) return 'B';
  return 'C';
}

function calculateConfidence(score: number, criteria: SignalCriteria): number {
  // Base confidence from score
  let confidence = (score / 9) * 100;
  
  // Boost for key indicators
  if (criteria.rsi && criteria.macd) confidence += 5;
  if (criteria.killzone) confidence += 10;
  if (criteria.orderBlock && criteria.fvg) confidence += 10;
  if (criteria.mss) confidence += 5;
  
  return Math.min(Math.round(confidence), 100);
}

function generateNotes(grade: SignalGrade, criteria: SignalCriteria, direction: SignalDirection): string {
  const notes: string[] = [];
  
  if (criteria.killzone) notes.push('Killzone Active');
  if (criteria.rsi) notes.push(`RSI ${direction === 'LONG' ? 'Oversold' : 'Overbought'}`);
  if (criteria.macd) notes.push('MACD Aligned');
  if (criteria.volume) notes.push('Volume Surge');
  if (criteria.orderBlock) notes.push('At Order Block');
  if (criteria.fvg) notes.push('At FVG');
  if (criteria.mss) notes.push('MSS Confirmed');
  if (criteria.liquiditySweep) notes.push('Liquidity Sweep');
  
  return notes.join(' | ');
}

// Generate signals for all pairs
export async function generateAllSignals(
  pairs: string[],
  fetchKlines: (symbol: string) => Promise<Candlestick[]>,
  activeKillzone: KillzoneType | null
): Promise<TradingSignal[]> {
  const allSignals: TradingSignal[] = [];
  
  for (const pair of pairs) {
    try {
      const candles = await fetchKlines(pair);
      const signals = generateSignals(pair, candles, activeKillzone);
      allSignals.push(...signals);
    } catch (error) {
      console.error(`Error generating signals for ${pair}:`, error);
    }
  }
  
  // Sort by grade and confidence
  const gradeOrder: Record<SignalGrade, number> = { 'A+': 0, 'A': 1, 'B+': 2, 'B': 3, 'C': 4 };
  
  return allSignals.sort((a, b) => {
    const gradeDiff = gradeOrder[a.grade] - gradeOrder[b.grade];
    if (gradeDiff !== 0) return gradeDiff;
    return b.confidence - a.confidence;
  });
}

// Filter signals by grade
export function filterSignalsByGrade(signals: TradingSignal[], grades: SignalGrade[]): TradingSignal[] {
  return signals.filter(s => grades.includes(s.grade));
}

// Check if signal is still valid
export function isSignalValid(signal: TradingSignal, currentPrice: number): boolean {
  const priceDiff = Math.abs(currentPrice - signal.entry) / signal.entry;
  
  // Signal is valid if price is within 0.5% of entry
  return priceDiff <= 0.005;
}

// Calculate position size based on risk
export function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  entryPrice: number,
  stopLoss: number,
  leverage: number = 1
): { positionSize: number; marginRequired: number; liquidationPrice: number } {
  const riskAmount = accountBalance * (riskPercent / 100);
  const stopDistance = Math.abs(entryPrice - stopLoss);
  
  // Position size in base asset
  const positionSize = (riskAmount / stopDistance) * leverage;
  
  // Margin required
  const marginRequired = (positionSize * entryPrice) / leverage;
  
  // Approximate liquidation price (simplified)
  const liquidationDistance = marginRequired / positionSize;
  const liquidationPrice = stopLoss > entryPrice 
    ? entryPrice - liquidationDistance 
    : entryPrice + liquidationDistance;
  
  return {
    positionSize,
    marginRequired,
    liquidationPrice
  };
}
