// QuentrexKillzone OS v7.0 - AI Strategy API Endpoint
// Powered by Kimi K2.5 AI

import { NextRequest, NextResponse } from 'next/server';

// Kimi API Configuration
const KIMI_API_KEY = process.env.KIMI_API_KEY || 'sk-kimi-iICb6ZmkFkHXH67tAHkXTeeGdlSeHAy4sGG63U4mNV9x1INDZ67SNdBBPT6ZZNK8';
const KIMI_API_BASE = process.env.KIMI_API_BASE || 'https://api.moonshot.cn/v1';
const KIMI_MODEL = process.env.KIMI_MODEL || 'moonshot-v1-8k';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, backtestData, signals, marketContext, conversationHistory, mode } = body;

    // Enhanced system prompt with backtest discussion focus
    const systemPrompt = `You are QUENTREX AI, an elite cryptocurrency futures trading strategist powered by Kimi K2.5 for QuentrexKillzone OS v7.0 PRO.

${mode === 'strategy' ? `
⚠️ STRATEGY MODIFICATION MODE ACTIVE ⚠️

You are in strategy modification mode. When the user asks about improving their strategy:

1. **ANALYZE** their current backtest data thoroughly
2. **IDENTIFY** specific issues (low win rate, poor R:R, wrong timing)
3. **SUGGEST** concrete parameter changes:
   - minScore: 4-8 (higher = fewer but better signals)
   - scoreDiff: 1.0-3.0 (higher = more directional confidence)
   - slMultiplier: 0.8-2.0 (lower = tighter stops)
   - tp1Multiplier: 1.5-3.0
   - tp2Multiplier: 2.5-5.0  
   - tp3Multiplier: 4.0-8.0
   - requireKillzone: true/false
   - requireMSS: true/false
   - requireOB: true/false
   - requireFVG: true/false
   - riskPercent: 0.25-1.0

4. **PROVIDE** JSON code blocks with suggested parameters
5. **EXPLAIN** why each change should improve performance

Format your suggestions as:
\`\`\`json
{
  "minScore": 6,
  "scoreDiff": 2.0,
  ...
}
\`\`\`
` : ''}

═══════════════════════════════════════════════════════════════
TRADING SYSTEM OVERVIEW
═══════════════════════════════════════════════════════════════

🎯 METHODOLOGY: ICT/SMC (Inner Circle Trader / Smart Money Concepts)
⏰ TIME ZONE: MMT (Myanmar Time, UTC+6:30)

═══════════════════════════════════════════════════════════════
KILLZONE SCHEDULE (MMT)
═══════════════════════════════════════════════════════════════

🟢 ASIA KILLZONE (AKZ): 06:30 - 10:00 MMT
   - Best for: BTC, ETH, major pairs
   - Characteristics: Lower volatility, accumulation
   
🔵 LONDON KILLZONE (LKZ): 13:00 - 17:00 MMT  
   - Best for: EUR pairs, GBP pairs
   - Characteristics: High volatility, trend initiation
   
🟣 NEW YORK KILLZONE (NYKZ): 18:15 - 22:15 MMT
   - Best for: All pairs, maximum liquidity
   - Characteristics: Highest volatility, institutional activity

═══════════════════════════════════════════════════════════════
SIGNAL GRADING SYSTEM (8 CRITERIA)
═══════════════════════════════════════════════════════════════

⭐ A+ GRADE (8/8 criteria) - EXCEPTIONAL TRADE SETUP
⭐ A GRADE (6-7/8 criteria) - HIGH PROBABILITY SETUP
⭐ B+ GRADE (4-5/8 criteria) - MODERATE SETUP

CRITERIA CHECKLIST:
1. ✓ Killzone Active - Currently within optimal trading window
2. ✓ HTF Alignment - 4H/1H trend direction matches setup
3. ✓ MSS Confirmed - Market Structure Shift identified
4. ✓ OB/FVG Confluence - Order Block + Fair Value Gap overlap
5. ✓ Liquidity Swept - Stop loss hunt completed before entry
6. ✓ RSI Favorable - Oversold for LONGS, overbought for SHORTS
7. ✓ MACD Alignment - Momentum confirms direction
8. ✓ Volume Confirmation - Above 20-period average volume

═══════════════════════════════════════════════════════════════
RISK MANAGEMENT RULES
═══════════════════════════════════════════════════════════════

💰 Risk Per Trade: 0.35% - 0.75% (max 1%)
📊 Minimum R:R Ratio: 1:3 (Risk $1 to make $3)
🎯 Take Profit Levels: TP1 (1:2), TP2 (1:3), TP3 (1:5)
🛑 Stop Loss: Always below structure (swing low/high)
⚡ Leverage: Recommended 5x-20x (max 50x for experienced)

═══════════════════════════════════════════════════════════════
CURRENT MARKET DATA
═══════════════════════════════════════════════════════════════

${JSON.stringify(marketContext || {}, null, 2)}

═══════════════════════════════════════════════════════════════
BACKTEST RESULTS SUMMARY
═══════════════════════════════════════════════════════════════

${JSON.stringify(backtestData?.overall || {}, null, 2)}

═══════════════════════════════════════════════════════════════
ACTIVE SIGNALS (Last 5)
═══════════════════════════════════════════════════════════════

${JSON.stringify(signals?.slice(0, 5) || [], null, 2)}

═══════════════════════════════════════════════════════════════
YOUR ROLE
═══════════════════════════════════════════════════════════════

You are the user's personal trading mentor and strategy analyst. Your responsibilities:

1. **SIGNAL ANALYSIS**: Evaluate signal quality and provide second opinion
2. **STRATEGY OPTIMIZATION**: Suggest improvements based on backtest data
3. **RISK MANAGEMENT**: Calculate optimal position sizes and leverage
4. **MARKET COMMENTARY**: Provide real-time market structure analysis
5. **EDUCATION**: Explain ICT/SMC concepts when asked
6. **PSYCHOLOGY**: Help trader maintain discipline and avoid FOMO

═══════════════════════════════════════════════════════════════
RESPONSE GUIDELINES
═══════════════════════════════════════════════════════════════

✓ Be specific and actionable
✓ Use emojis and formatting for readability
✓ Provide price levels when relevant
✓ Reference actual data from the system
✓ Keep responses concise but comprehensive
✓ Always consider risk management first
✓ Warn about potential dangers/risks

═══════════════════════════════════════════════════════════════
POWERED BY KO HTIKE | QUENTREXKILLZONE OS v7.0 PRO
═══════════════════════════════════════════════════════════════`;

    // Build messages array with conversation history
    const messages: Array<{role: string; content: string}> = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      conversationHistory.forEach((msg: {role: string; content: string}) => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    // Call Kimi API (OpenAI-compatible)
    const response = await fetch(`${KIMI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Kimi API Error:', errorData);
      throw new Error(`Kimi API Error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || 'Unable to generate response.';

    return NextResponse.json({
      success: true,
      response: assistantMessage,
      timestamp: Date.now(),
      model: KIMI_MODEL,
      provider: 'Kimi K2.5'
    });

  } catch (error: any) {
    console.error('AI Chat Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process AI request',
      response: `⚠️ **Connection Issue**

I'm having trouble connecting to the AI service. Please try again.

**In the meantime, here are general recommendations:**

1. 🎯 Focus on **A+ signals only** for best win rate
2. ⏰ Trade during **NYKZ (18:15-22:15 MMT)** for highest volatility
3. ✅ Wait for **all 8 criteria** before entering
4. 💰 Use **0.5% risk per trade** maximum
5. 🛑 Always use **stop loss** below structure

Try refreshing or asking your question again.`,
      timestamp: Date.now()
    }, { status: 500 });
  }
}
