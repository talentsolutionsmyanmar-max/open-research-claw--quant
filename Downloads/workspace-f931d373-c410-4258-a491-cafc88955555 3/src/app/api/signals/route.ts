import { NextResponse } from 'next/server';
import { TRADING_PAIRS, type TradingSignal, type SignalGrade } from '@/types/trading';
import { generateSignals } from '@/lib/signals';
import { getActiveKillzone } from '@/lib/killzones';

const BINANCE_FUTURES_API = 'https://fapi.binance.com/fapi/v1';

// Cache for candlestick data
const candleCache = new Map<string, { data: unknown[]; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

async function fetchKlines(symbol: string): Promise<unknown[]> {
  const cached = candleCache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const response = await fetch(
    `${BINANCE_FUTURES_API}/klines?symbol=${symbol}&interval=15m&limit=200`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch klines for ${symbol}`);
  }
  
  const data = await response.json();
  
  const klines = data.map((k: (string | number)[]) => ({
    openTime: k[0] as number,
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
    closeTime: k[6] as number,
    quoteAssetVolume: parseFloat(k[7] as string),
    numberOfTrades: k[8] as number,
    takerBuyBaseAssetVolume: parseFloat(k[9] as string),
    takerBuyQuoteAssetVolume: parseFloat(k[10] as string)
  }));
  
  candleCache.set(symbol, { data: klines, timestamp: Date.now() });
  
  return klines;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'all';
  const pairs = searchParams.get('pairs')?.split(',') || TRADING_PAIRS;
  const grades = searchParams.get('grades')?.split(',') as SignalGrade[] | undefined;

  try {
    const activeKillzone = getActiveKillzone();
    const allSignals: TradingSignal[] = [];

    // Fetch candlesticks for all pairs concurrently
    const fetchPromises = pairs.map(async (symbol) => {
      try {
        const klines = await fetchKlines(symbol);
        const signals = generateSignals(symbol, klines, activeKillzone, 0);
        return signals;
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        return [];
      }
    });

    const signalArrays = await Promise.all(fetchPromises);
    
    for (const signals of signalArrays) {
      allSignals.push(...signals);
    }

    // Sort by grade and confidence
    const gradeOrder: Record<SignalGrade, number> = {
      'A+': 0, 'A': 1, 'B+': 2, 'B': 3, 'C': 4
    };

    allSignals.sort((a, b) => {
      const gradeDiff = gradeOrder[a.grade] - gradeOrder[b.grade];
      if (gradeDiff !== 0) return gradeDiff;
      return b.confidence - a.confidence;
    });

    // Filter by grades if specified
    let filteredSignals = allSignals;
    if (grades && grades.length > 0) {
      filteredSignals = allSignals.filter(s => grades.includes(s.grade));
    }

    switch (action) {
      case 'stats': {
        const stats = {
          total: allSignals.length,
          byGrade: {
            'A+': allSignals.filter(s => s.grade === 'A+').length,
            'A': allSignals.filter(s => s.grade === 'A').length,
            'B+': allSignals.filter(s => s.grade === 'B+').length,
            'B': allSignals.filter(s => s.grade === 'B').length,
            'C': allSignals.filter(s => s.grade === 'C').length
          },
          byDirection: {
            LONG: allSignals.filter(s => s.direction === 'LONG').length,
            SHORT: allSignals.filter(s => s.direction === 'SHORT').length
          },
          avgConfidence: allSignals.length > 0
            ? Math.round(allSignals.reduce((sum, s) => sum + s.confidence, 0) / allSignals.length)
            : 0,
          activeKillzone
        };
        return NextResponse.json({ success: true, data: stats });
      }
      
      case 'top': {
        // Return top signals by grade
        const topSignals = {
          aPlus: filteredSignals.filter(s => s.grade === 'A+').slice(0, 5),
          a: filteredSignals.filter(s => s.grade === 'A').slice(0, 5),
          bPlus: filteredSignals.filter(s => s.grade === 'B+').slice(0, 5)
        };
        return NextResponse.json({ success: true, data: topSignals });
      }
      
      default:
        return NextResponse.json({ 
          success: true, 
          data: {
            signals: filteredSignals,
            activeKillzone,
            count: filteredSignals.length,
            generatedAt: Date.now()
          }
        });
    }
  } catch (error) {
    console.error('Signals API Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
