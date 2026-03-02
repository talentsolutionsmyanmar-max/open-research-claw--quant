// QuentrexKillzone OS v7.0 - Enhanced Signal Generation
// Higher Win Rate Strategy - ICT/SMC Methodology
// Powered by Ko Htike

import type { Signal, CandleData, KillzoneType, TechnicalIndicators } from '@/types/trading';
import { getCurrentKillzone, getMMTTime } from './killzones';

// Calculate RSI with smoothing
export function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate EMA
export function calculateEMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;
  
  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b) / period;
  
  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

// Calculate SMA
export function calculateSMA(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] || 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b) / period;
}

// Calculate MACD with better signal detection
export function calculateMACD(closes: number[]): {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  crossover: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NONE';
} {
  if (closes.length < 26) {
    return { macd: 0, signal: 0, histogram: 0, trend: 'NEUTRAL', crossover: 'NONE' };
  }
  
  const ema12 = calculateEMA(closes, 12);
  const ema26 = calculateEMA(closes, 26);
  const macd = ema12 - ema26;
  
  const macdValues: number[] = [];
  for (let i = 26; i <= closes.length; i++) {
    const slice = closes.slice(0, i);
    const e12 = calculateEMA(slice, 12);
    const e26 = calculateEMA(slice, 26);
    macdValues.push(e12 - e26);
  }
  
  const signal = calculateEMA(macdValues, 9);
  const histogram = macd - signal;
  
  // Detect crossover
  const prevHistogram = macdValues.length > 1 ? macdValues[macdValues.length - 2] - signal : 0;
  const crossover = histogram > 0 && prevHistogram <= 0 ? 'BULLISH_CROSS' :
                    histogram < 0 && prevHistogram >= 0 ? 'BEARISH_CROSS' : 'NONE';
  
  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (histogram > 0 && macd > signal) trend = 'BULLISH';
  else if (histogram < 0 && macd < signal) trend = 'BEARISH';
  
  return { macd, signal, histogram, trend, crossover };
}

// Calculate Bollinger Bands
export function calculateBollingerBands(
  closes: number[], 
  period: number = 20, 
  stdDev: number = 2
): {
  upper: number;
  middle: number;
  lower: number;
  position: 'UPPER' | 'MIDDLE' | 'LOWER' | 'OUTSIDE';
  bandwidth: number;
} {
  const middle = calculateSMA(closes, period);
  const slice = closes.slice(-period);
  
  const squaredDiffs = slice.map(v => Math.pow(v - middle, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b) / period;
  const std = Math.sqrt(avgSquaredDiff);
  
  const upper = middle + stdDev * std;
  const lower = middle - stdDev * std;
  const bandwidth = (upper - lower) / middle * 100;
  
  const currentPrice = closes[closes.length - 1];
  let position: 'UPPER' | 'MIDDLE' | 'LOWER' | 'OUTSIDE' = 'MIDDLE';
  
  if (currentPrice > upper) position = 'OUTSIDE';
  else if (currentPrice < lower) position = 'OUTSIDE';
  else if (currentPrice > middle + (upper - middle) / 2) position = 'UPPER';
  else if (currentPrice < middle - (middle - lower) / 2) position = 'LOWER';
  
  return { upper, middle, lower, position, bandwidth };
}

// Calculate ATR
export function calculateATR(candles: CandleData[], period: number = 14): number {
  if (candles.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  return calculateSMA(trueRanges.slice(-period), period);
}

// Enhanced MSS Detection with confirmation
export function detectMSS(candles: CandleData[]): {
  bullish: boolean;
  bearish: boolean;
  level: number;
  strength: number;
  confirmed: boolean;
} {
  if (candles.length < 15) return { bullish: false, bearish: false, level: 0, strength: 0, confirmed: false };
  
  const recent = candles.slice(-15);
  const lastCandle = recent[recent.length - 1];
  const prevCandle = recent[recent.length - 2];
  
  // Find swing points
  let swingHigh = 0;
  let swingLow = Infinity;
  let swingHighIndex = 0;
  let swingLowIndex = 0;
  
  for (let i = 2; i < recent.length - 2; i++) {
    if (recent[i].high > recent[i-1].high && recent[i].high > recent[i+1].high) {
      if (recent[i].high > swingHigh) {
        swingHigh = recent[i].high;
        swingHighIndex = i;
      }
    }
    if (recent[i].low < recent[i-1].low && recent[i].low < recent[i+1].low) {
      if (recent[i].low < swingLow) {
        swingLow = recent[i].low;
        swingLowIndex = i;
      }
    }
  }
  
  const bullish = lastCandle.close > swingHigh && prevCandle.close <= swingHigh;
  const bearish = lastCandle.close < swingLow && prevCandle.close >= swingLow;
  
  // Calculate strength based on candle size
  const candleSize = Math.abs(lastCandle.close - lastCandle.open);
  const avgSize = recent.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / recent.length;
  const strength = candleSize / avgSize;
  
  // Check if confirmed (close above/below level)
  const confirmed = bullish ? lastCandle.close > swingHigh : bearish ? lastCandle.close < swingLow : false;
  
  return {
    bullish,
    bearish,
    level: bullish ? swingHigh : bearish ? swingLow : 0,
    strength: Math.min(strength, 3),
    confirmed
  };
}

// Enhanced Order Block Detection
export function detectOrderBlock(candles: CandleData[]): {
  bullish: { price: number; strength: number; volume: number } | null;
  bearish: { price: number; strength: number; volume: number } | null;
} {
  if (candles.length < 10) return { bullish: null, bearish: null };
  
  const recent = candles.slice(-30);
  const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length;
  
  let bullishOB: { price: number; strength: number; volume: number } | null = null;
  let bearishOB: { price: number; strength: number; volume: number } | null = null;
  
  for (let i = 1; i < recent.length - 2; i++) {
    const current = recent[i];
    const next = recent[i + 1];
    const nextNext = recent[i + 2];
    
    // Bullish OB: down candle followed by strong up move
    if (current.close < current.open && next.close > next.open) {
      const downMove = current.open - current.close;
      const upMove = next.close - next.open;
      const strength = upMove / (downMove || 1);
      
      // Must have above average volume and follow-through
      if (strength > 1.2 && current.volume > avgVolume * 0.8 && nextNext?.close > next.close) {
        if (!bullishOB || strength > bullishOB.strength) {
          bullishOB = { 
            price: current.high, 
            strength,
            volume: current.volume 
          };
        }
      }
    }
    
    // Bearish OB: up candle followed by strong down move
    if (current.close > current.open && next.close < next.open) {
      const upMove = current.close - current.open;
      const downMove = next.open - next.close;
      const strength = downMove / (upMove || 1);
      
      if (strength > 1.2 && current.volume > avgVolume * 0.8 && nextNext?.close < next.close) {
        if (!bearishOB || strength > bearishOB.strength) {
          bearishOB = { 
            price: current.low, 
            strength,
            volume: current.volume 
          };
        }
      }
    }
  }
  
  return { bullish: bullishOB, bearish: bearishOB };
}

// Enhanced FVG Detection
export function detectFVG(candles: CandleData[]): {
  bullish: { high: number; low: number; mid: number; size: number } | null;
  bearish: { high: number; low: number; mid: number; size: number } | null;
} {
  if (candles.length < 3) return { bullish: null, bearish: null };
  
  const c1 = candles[candles.length - 3];
  const c2 = candles[candles.length - 2];
  const c3 = candles[candles.length - 1];
  const avgRange = (c1.high - c1.low + c2.high - c2.low + c3.high - c3.low) / 3;
  
  // Bullish FVG: gap between c1 high and c3 low
  if (c3.low > c1.high) {
    const size = (c3.low - c1.high) / avgRange;
    return {
      bullish: { high: c3.low, low: c1.high, mid: (c3.low + c1.high) / 2, size },
      bearish: null
    };
  }
  
  // Bearish FVG: gap between c1 low and c3 high
  if (c3.high < c1.low) {
    const size = (c1.low - c3.high) / avgRange;
    return {
      bullish: null,
      bearish: { high: c1.low, low: c3.high, mid: (c1.low + c3.high) / 2, size }
    };
  }
  
  return { bullish: null, bearish: null };
}

// Enhanced Liquidity Sweep Detection
export function detectLiquiditySweep(candles: CandleData[]): {
  bsl: boolean; // Buy-side liquidity
  ssl: boolean; // Sell-side liquidity
  level: number;
  wickSize: number;
} {
  if (candles.length < 25) return { bsl: false, ssl: false, level: 0, wickSize: 0 };
  
  const lookback = candles.slice(-25, -1);
  const current = candles[candles.length - 1];
  
  const swingHigh = Math.max(...lookback.map(c => c.high));
  const swingLow = Math.min(...lookback.map(c => c.low));
  
  // Calculate wick size relative to body
  const bodySize = Math.abs(current.close - current.open);
  const totalRange = current.high - current.low;
  const wickSize = totalRange > 0 ? (totalRange - bodySize) / totalRange : 0;
  
  // BSL: Price took out swing high but closed below (rejection)
  const bsl = current.high > swingHigh && current.close < swingHigh;
  
  // SSL: Price took out swing low but closed above (rejection)
  const ssl = current.low < swingLow && current.close > swingLow;
  
  return {
    bsl,
    ssl,
    level: bsl ? swingHigh : ssl ? swingLow : 0,
    wickSize
  };
}

// Detect SMT Divergence
export function detectSMTDivergence(candles: CandleData[]): {
  bullish: boolean;
  bearish: boolean;
} {
  if (candles.length < 20) return { bullish: false, bearish: false };
  
  const recent = candles.slice(-20);
  const rsi = calculateRSI(recent.map(c => c.close));
  
  // Find price lows and RSI divergence
  const priceLows = recent.slice(-10).filter((c, i, arr) => 
    i > 0 && i < arr.length - 1 && c.low < arr[i-1].low && c.low < arr[i+1].low
  );
  
  const priceHighs = recent.slice(-10).filter((c, i, arr) => 
    i > 0 && i < arr.length - 1 && c.high > arr[i-1].high && c.high > arr[i+1].high
  );
  
  // Bullish SMT: Lower price low but higher RSI
  const bullish = priceLows.length >= 2 && rsi > 40;
  
  // Bearish SMT: Higher price high but lower RSI
  const bearish = priceHighs.length >= 2 && rsi < 60;
  
  return { bullish, bearish };
}

// ENHANCED Signal Generation - Higher Win Rate Strategy
export function generateSignal(
  symbol: string,
  candles: CandleData[],
  fundingRate: number = 0,
  openInterest: number = 0,
  openInterestChange: number = 0
): Signal | null {
  if (candles.length < 50) return null;
  
  const closes = candles.map(c => c.close);
  const currentPrice = closes[closes.length - 1];
  const mmtTime = getMMTTime();
  const killzone = getCurrentKillzone(mmtTime);
  
  // Calculate all indicators
  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const bb = calculateBollingerBands(closes);
  const atr = calculateATR(candles);
  const mss = detectMSS(candles);
  const ob = detectOrderBlock(candles);
  const fvg = detectFVG(candles);
  const liqSweep = detectLiquiditySweep(candles);
  const smt = detectSMTDivergence(candles);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  
  // Volume analysis
  const currentVolume = candles[candles.length - 1].volume;
  const avgVolume = candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20;
  const volumeRatio = currentVolume / avgVolume;
  
  // ENHANCED SCORING SYSTEM
  let bullishScore = 0;
  let bearishScore = 0;
  const bullishFactors: string[] = [];
  const bearishFactors: string[] = [];
  
  // 1. Killzone Active (CRITICAL)
  if (killzone !== 'NONE') {
    bullishScore += 1;
    bearishScore += 1;
  }
  
  // 2. HTF Alignment (CRITICAL)
  const htfBullish = ema20 > ema50 && ema50 > ema200;
  const htfBearish = ema20 < ema50 && ema50 < ema200;
  if (htfBullish) { bullishScore += 2; bullishFactors.push('HTF Bullish'); }
  if (htfBearish) { bearishScore += 2; bearishFactors.push('HTF Bearish'); }
  
  // 3. MSS Confirmed (CRITICAL)
  if (mss.bullish && mss.confirmed) { 
    bullishScore += 2; 
    bullishFactors.push(`MSS @ ${mss.level.toFixed(2)}`); 
  }
  if (mss.bearish && mss.confirmed) { 
    bearishScore += 2; 
    bearishFactors.push(`MSS @ ${mss.level.toFixed(2)}`); 
  }
  
  // 4. OB + FVG Confluence (IMPORTANT)
  const hasBullishOB = ob.bullish && ob.bullish.strength > 1.2;
  const hasBearishOB = ob.bearish && ob.bearish.strength > 1.2;
  const hasBullishFVG = fvg.bullish && fvg.bullish.size > 0.3;
  const hasBearishFVG = fvg.bearish && fvg.bearish.size > 0.3;
  
  if (hasBullishOB) { bullishScore += 1.5; bullishFactors.push('OB'); }
  if (hasBullishFVG) { bullishScore += 1; bullishFactors.push('FVG'); }
  if (hasBullishOB && hasBullishFVG) { bullishScore += 0.5; bullishFactors.push('OB+FVG'); }
  
  if (hasBearishOB) { bearishScore += 1.5; bearishFactors.push('OB'); }
  if (hasBearishFVG) { bearishScore += 1; bearishFactors.push('FVG'); }
  if (hasBearishOB && hasBearishFVG) { bearishScore += 0.5; bearishFactors.push('OB+FVG'); }
  
  // 5. Liquidity Sweep (IMPORTANT)
  if (liqSweep.ssl && liqSweep.wickSize > 0.5) { 
    bullishScore += 1.5; 
    bullishFactors.push('SSL Sweep'); 
  }
  if (liqSweep.bsl && liqSweep.wickSize > 0.5) { 
    bearishScore += 1.5; 
    bearishFactors.push('BSL Sweep'); 
  }
  
  // 6. RSI Conditions
  if (rsi < 35) { bullishScore += 1; bullishFactors.push('RSI Oversold'); }
  if (rsi > 65) { bearishScore += 1; bearishFactors.push('RSI Overbought'); }
  
  // 7. MACD Alignment + Crossover
  if (macd.trend === 'BULLISH') { bullishScore += 1; bullishFactors.push('MACD Bull'); }
  if (macd.trend === 'BEARISH') { bearishScore += 1; bearishFactors.push('MACD Bear'); }
  if (macd.crossover === 'BULLISH_CROSS') { bullishScore += 0.5; }
  if (macd.crossover === 'BEARISH_CROSS') { bearishScore += 0.5; }
  
  // 8. Volume Confirmation
  if (volumeRatio > 1.2) { 
    bullishScore += 1; 
    bearishScore += 1;
    bullishFactors.push('High Vol');
    bearishFactors.push('High Vol');
  }
  
  // 9. SMT Divergence (BONUS)
  if (smt.bullish) { bullishScore += 1; bullishFactors.push('SMT Div'); }
  if (smt.bearish) { bearishScore += 1; bearishFactors.push('SMT Div'); }
  
  // 10. Bollinger Band Position
  if (bb.position === 'LOWER' || bb.position === 'OUTSIDE') { 
    bullishScore += 0.5; 
    bullishFactors.push('BB Lower'); 
  }
  if (bb.position === 'UPPER') { 
    bearishScore += 0.5; 
    bearishFactors.push('BB Upper'); 
  }
  
  // Determine direction - REQUIRE MINIMUM SCORE
  let direction: 'LONG' | 'SHORT' | null = null;
  let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  
  // MUST have significant edge
  const minScore = 5; // Minimum score to generate signal
  const scoreDiff = 1.5; // Minimum difference between bullish and bearish
  
  if (bullishScore >= minScore && bullishScore > bearishScore + scoreDiff) {
    direction = 'LONG';
    bias = 'BULLISH';
  } else if (bearishScore >= minScore && bearishScore > bullishScore + scoreDiff) {
    direction = 'SHORT';
    bias = 'BEARISH';
  }
  
  if (!direction || atr === 0) return null;
  
  // Calculate entry, SL, TP with better R:R
  const slMultiplier = 1.2; // Tighter stops
  const tp1Multiplier = 2.0;
  const tp2Multiplier = 3.5;
  const tp3Multiplier = 5.0;
  
  const slDistance = atr * slMultiplier;
  const entry = currentPrice;
  const stopLoss = direction === 'LONG' ? entry - slDistance : entry + slDistance;
  
  const takeProfit1 = direction === 'LONG' ? entry + slDistance * tp1Multiplier : entry - slDistance * tp1Multiplier;
  const takeProfit2 = direction === 'LONG' ? entry + slDistance * tp2Multiplier : entry - slDistance * tp2Multiplier;
  const takeProfit3 = direction === 'LONG' ? entry + slDistance * tp3Multiplier : entry - slDistance * tp3Multiplier;
  
  // Enhanced grading system
  const criteriaScores = {
    killzoneActive: killzone !== 'NONE',
    htfAlignment: direction === 'LONG' ? htfBullish : htfBearish,
    mssConfirmed: direction === 'LONG' ? (mss.bullish && mss.confirmed) : (mss.bearish && mss.confirmed),
    obFvgConfluence: direction === 'LONG' 
      ? (hasBullishOB && hasBullishFVG)
      : (hasBearishOB && hasBearishFVG),
    liquiditySwept: direction === 'LONG' ? liqSweep.ssl : liqSweep.bsl,
    rsiFavorable: direction === 'LONG' ? rsi < 40 : rsi > 60,
    macdAlignment: macd.trend === bias,
    volumeConfirmation: volumeRatio > 1.1
  };
  
  // Calculate score
  const totalScore = Object.values(criteriaScores).filter(Boolean).length;
  const maxScore = 8;
  
  // STRICTER grading
  let grade: 'A+' | 'A' | 'B+' | 'B' | 'C' = 'C';
  if (totalScore >= 8 && mss.confirmed && (hasBullishOB || hasBearishOB)) grade = 'A+';
  else if (totalScore >= 7) grade = 'A';
  else if (totalScore >= 5) grade = 'B+';
  else if (totalScore >= 4) grade = 'B';
  
  // Skip low quality signals - STRICTER
  if (grade === 'B' || grade === 'C') return null;
  
  // Skip B+ signals outside killzone
  if (grade === 'B+' && killzone === 'NONE') return null;
  
  const confidence = (totalScore / maxScore) * 100;
  const riskReward = tp2Multiplier;
  
  const structure = direction === 'LONG' 
    ? `15M BULLISH MSS @ ${mss.level.toFixed(2)} | ${bullishFactors.join(' + ')}`
    : `15M BEARISH MSS @ ${mss.level.toFixed(2)} | ${bearishFactors.join(' + ')}`;
  
  return {
    id: `${symbol}-${Date.now()}`,
    symbol,
    direction,
    grade,
    entryPrice: entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    takeProfit3,
    riskReward,
    confidence,
    timestamp: Date.now(),
    killzone,
    bias,
    structure,
    orderBlock: direction === 'LONG' ? !!ob.bullish : !!ob.bearish,
    fvg: direction === 'LONG' ? !!fvg.bullish : !!fvg.bearish,
    liquiditySweep: direction === 'LONG' ? liqSweep.ssl : liqSweep.bsl,
    mss: direction === 'LONG' ? mss.bullish : mss.bearish,
    smtDivergence: direction === 'LONG' ? smt.bullish : smt.bearish,
    rsi,
    macdSignal: macd.trend,
    volumeProfile: volumeRatio > 1.3 ? 'HIGH' : volumeRatio > 1 ? 'MEDIUM' : 'LOW',
    fundingRate,
    openInterest,
    openInterestChange,
    criteriaScores,
    totalScore,
    maxScore
  };
}

// Get all technical indicators
export function getAllIndicators(candles: CandleData[]): TechnicalIndicators {
  const closes = candles.map(c => c.close);
  
  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const bb = calculateBollingerBands(closes);
  const atr = calculateATR(candles);
  
  return {
    rsi,
    rsiSignal: rsi > 70 ? 'OVERBOUGHT' : rsi < 30 ? 'OVERSOLD' : 'NEUTRAL',
    macd,
    bollingerBands: bb,
    atr,
    ema20: calculateEMA(closes, 20),
    ema50: calculateEMA(closes, 50),
    ema200: calculateEMA(closes, 200),
    volumeProfile: [],
    supportLevels: [],
    resistanceLevels: []
  };
}
