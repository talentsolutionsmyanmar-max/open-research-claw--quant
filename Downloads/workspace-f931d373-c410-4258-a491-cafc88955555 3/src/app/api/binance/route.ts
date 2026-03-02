// QuentrexKillzone OS v7.0 - Binance API Route
// Powered by Ko Htike

import { NextResponse } from 'next/server';

const BINANCE_FUTURES_API = 'https://fapi.binance.com/fapi/v1';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval') || '15m';
  const limit = searchParams.get('limit') || '100';

  try {
    let endpoint = '';
    
    switch (action) {
      case 'tickers':
        endpoint = `${BINANCE_FUTURES_API}/ticker/24hr`;
        break;
      case 'klines':
        endpoint = `${BINANCE_FUTURES_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        break;
      case 'depth':
        endpoint = `${BINANCE_FUTURES_API}/depth?symbol=${symbol}&limit=20`;
        break;
      case 'funding':
        endpoint = `${BINANCE_FUTURES_API}/fundingRate?symbol=${symbol}&limit=1`;
        break;
      case 'oi':
        endpoint = `${BINANCE_FUTURES_API}/openInterest?symbol=${symbol}`;
        break;
      default:
        endpoint = `${BINANCE_FUTURES_API}/ticker/24hr`;
    }

    const response = await fetch(endpoint);
    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
