import { NextResponse } from 'next/server';
import { 
  calculateAllIndicators, 
  detectOrderBlocks, 
  detectFVGs, 
  detectMSS,
  calculateSupportResistance,
  calculateVolumeProfile
} from '@/lib/indicators';

const BINANCE_FUTURES_API = 'https://fapi.binance.com/fapi/v1';

async function fetchKlines(symbol: string, interval: string = '15m', limit: number = 200) {
  const response = await fetch(
    `${BINANCE_FUTURES_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch klines for ${symbol}`);
  }
  
  const data = await response.json();
  
  return data.map((k: (string | number)[]) => ({
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
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const action = searchParams.get('action') || 'all';
  const interval = searchParams.get('interval') || '15m';

  if (!symbol) {
    return NextResponse.json({ success: false, error: 'Symbol required' }, { status: 400 });
  }

  try {
    const klines = await fetchKlines(symbol, interval);
    
    switch (action) {
      case 'rsi': {
        const indicators = calculateAllIndicators(klines);
        return NextResponse.json({
          success: true,
          data: {
            rsi: indicators.rsi,
            signal: indicators.rsiSignal
          }
        });
      }
      
      case 'macd': {
        const indicators = calculateAllIndicators(klines);
        return NextResponse.json({
          success: true,
          data: indicators.macd
        });
      }
      
      case 'bollinger': {
        const indicators = calculateAllIndicators(klines);
        return NextResponse.json({
          success: true,
          data: indicators.bollingerBands
        });
      }
      
      case 'atr': {
        const indicators = calculateAllIndicators(klines);
        return NextResponse.json({
          success: true,
          data: { atr: indicators.atr }
        });
      }
      
      case 'orderblocks': {
        const orderBlocks = detectOrderBlocks(klines);
        return NextResponse.json({
          success: true,
          data: orderBlocks
        });
      }
      
      case 'fvg': {
        const fvgs = detectFVGs(klines);
        return NextResponse.json({
          success: true,
          data: fvgs
        });
      }
      
      case 'mss': {
        const mss = detectMSS(klines);
        return NextResponse.json({
          success: true,
          data: mss
        });
      }
      
      case 'support-resistance': {
        const levels = calculateSupportResistance(klines);
        return NextResponse.json({
          success: true,
          data: levels
        });
      }
      
      case 'volume-profile': {
        const profile = calculateVolumeProfile(klines);
        return NextResponse.json({
          success: true,
          data: profile
        });
      }
      
      case 'ict': {
        const orderBlocks = detectOrderBlocks(klines);
        const fvgs = detectFVGs(klines);
        const mss = detectMSS(klines);
        
        return NextResponse.json({
          success: true,
          data: {
            orderBlocks,
            fvgs,
            mss,
            count: {
              orderBlocks: orderBlocks.length,
              fvgs: fvgs.length,
              mss: mss.length
            }
          }
        });
      }
      
      default: {
        const indicators = calculateAllIndicators(klines);
        const orderBlocks = detectOrderBlocks(klines);
        const fvgs = detectFVGs(klines);
        const mss = detectMSS(klines);
        const supportResistance = calculateSupportResistance(klines);
        
        return NextResponse.json({
          success: true,
          data: {
            symbol,
            currentPrice: klines[klines.length - 1].close,
            indicators,
            ict: {
              orderBlocks,
              fvgs,
              mss
            },
            supportResistance,
            lastUpdate: Date.now()
          }
        });
      }
    }
  } catch (error) {
    console.error('Indicators API Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
