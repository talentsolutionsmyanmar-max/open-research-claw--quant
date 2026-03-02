'use client'

// QuentrexKillzone OS v7.0 - Backtesting Component
// Powered by Ko Htike

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, TrendingUp, TrendingDown, Clock, Target, AlertCircle,
  BarChart3, RefreshCw, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useThemeStore, THEMES } from '@/store/themeStore';
import { runBacktestForPair, runFullBacktest, BACKTEST_PAIRS } from '@/lib/backtest';
import type { BacktestResults, BacktestSummary, BacktestTrade } from '@/lib/backtest';

export function BacktestingPanel() {
  const { theme } = useThemeStore();
  const colors = THEMES[theme];
  
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<BacktestSummary | null>(null);
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [expandedTrades, setExpandedTrades] = useState<Set<string>>(new Set());

  const runBacktest = async () => {
    setIsLoading(true);
    try {
      const data = await runFullBacktest(days);
      setResults(data);
    } catch (error) {
      console.error('Backtest error:', error);
    }
    setIsLoading(false);
  };

  const formatPnl = (pnl: number) => {
    const sign = pnl >= 0 ? '+' : '';
    return `${sign}${pnl.toFixed(2)}%`;
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'A': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'B+': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'WIN': return 'text-green-400';
      case 'LOSS': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className={`${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> STRATEGY BACKTESTING
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Period:</span>
              <select 
                value={days} 
                onChange={(e) => setDays(Number(e.target.value))}
                className={`px-3 py-1.5 rounded text-sm ${
                  theme === 'dark' ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-100 border-gray-300 text-gray-800'
                } border`}
              >
                <option value={7}>7 Days</option>
                <option value={14}>14 Days</option>
                <option value={30}>30 Days</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Pairs: {BACKTEST_PAIRS.length}</span>
              <span className="text-xs text-gray-500">·</span>
              <span className="text-xs text-gray-500">KZ: AKZ, LKZ, NYKZ</span>
            </div>
            
            <Button 
              onClick={runBacktest} 
              disabled={isLoading}
              className="bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Backtest
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {results && (
        <>
          {/* Overall Summary */}
          <Card className={`${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">OVERALL PERFORMANCE</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Total Trades</div>
                  <div className="text-2xl font-bold">{results.overall.totalTrades}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Win Rate</div>
                  <div className={`text-2xl font-bold ${results.overall.winRate >= 50 ? 'text-green-400' : 'text-red-500'}`}>
                    {results.overall.winRate.toFixed(1)}%
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Total PnL</div>
                  <div className={`text-2xl font-bold ${results.overall.totalPnl >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                    {formatPnl(results.overall.totalPnl)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Profit Factor</div>
                  <div className={`text-2xl font-bold ${results.overall.profitFactor >= 1 ? 'text-green-400' : 'text-red-500'}`}>
                    {results.overall.profitFactor.toFixed(2)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Max Drawdown</div>
                  <div className="text-2xl font-bold text-red-500">
                    -{results.overall.maxDrawdown.toFixed(1)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* By Grade */}
          <Card className={`${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">PERFORMANCE BY GRADE</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-3 gap-4">
                {(['A+', 'A', 'B+'] as const).map((grade) => {
                  const data = results.overall.byGrade[grade];
                  if (!data) return null;
                  
                  return (
                    <div key={grade} className={`p-4 rounded-lg border ${
                      theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getGradeColor(grade)}`}>
                          GRADE {grade}
                        </span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Trades</span>
                          <span className="font-bold">{data.trades}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Win Rate</span>
                          <span className={`font-bold ${data.winRate >= 50 ? 'text-green-400' : 'text-red-500'}`}>
                            {data.winRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">PnL</span>
                          <span className={`font-bold ${data.pnl >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                            {formatPnl(data.pnl)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Avg R:R</span>
                          <span className="font-bold text-cyan-400">1:{data.avgRR.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* By Killzone */}
          <Card className={`${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">PERFORMANCE BY KILLZONE</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="grid grid-cols-3 gap-4">
                {(['AKZ', 'LKZ', 'NYKZ'] as const).map((kz) => {
                  const data = results.overall.byKillzone[kz];
                  if (!data) return null;
                  
                  const kzLabel = {
                    'AKZ': 'Asia (06:30-10:00)',
                    'LKZ': 'London (13:00-17:00)',
                    'NYKZ': 'New York (18:15-22:15)'
                  }[kz];
                  
                  return (
                    <div key={kz} className={`p-4 rounded-lg border ${
                      theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="font-bold mb-1">{kz}</div>
                      <div className="text-[10px] text-gray-500 mb-3">{kzLabel}</div>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Trades</span>
                          <span className="font-bold">{data.trades}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Win Rate</span>
                          <span className={`font-bold ${data.winRate >= 50 ? 'text-green-400' : 'text-red-500'}`}>
                            {data.winRate.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">PnL</span>
                          <span className={`font-bold ${data.pnl >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                            {formatPnl(data.pnl)}
                          </span>
                        </div>
                        <Progress 
                          value={data.winRate} 
                          className="h-1.5 mt-2"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* By Pair */}
          <Card className={`${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">PERFORMANCE BY PAIR</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className={`${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <tr>
                      <th className="text-left p-3 font-medium text-gray-500">Pair</th>
                      <th className="text-right p-3 font-medium text-gray-500">Trades</th>
                      <th className="text-right p-3 font-medium text-gray-500">Win Rate</th>
                      <th className="text-right p-3 font-medium text-gray-500">PnL</th>
                      <th className="text-right p-3 font-medium text-gray-500">PF</th>
                      <th className="text-right p-3 font-medium text-gray-500">Max DD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.byPair.map((pair) => (
                      <tr 
                        key={pair.symbol}
                        onClick={() => setSelectedPair(selectedPair === pair.symbol ? null : pair.symbol)}
                        className={`border-t cursor-pointer transition-colors ${
                          theme === 'dark' ? 'hover:bg-white/5 border-white/5' : 'hover:bg-gray-50 border-gray-100'
                        }`}
                      >
                        <td className="p-3 font-bold">{pair.symbol.replace('USDT', '')}</td>
                        <td className="p-3 text-right">{pair.totalTrades}</td>
                        <td className={`p-3 text-right font-bold ${pair.winRate >= 50 ? 'text-green-400' : 'text-red-500'}`}>
                          {pair.winRate.toFixed(1)}%
                        </td>
                        <td className={`p-3 text-right font-bold ${pair.totalPnl >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                          {formatPnl(pair.totalPnl)}
                        </td>
                        <td className={`p-3 text-right font-bold ${pair.profitFactor >= 1 ? 'text-green-400' : 'text-red-500'}`}>
                          {pair.profitFactor.toFixed(2)}
                        </td>
                        <td className="p-3 text-right text-red-500">
                          -{pair.maxDrawdown.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Recent Trades */}
          <Card className={`${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">RECENT TRADES</CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {results.overall.trades.slice(-50).reverse().map((trade) => (
                    <motion.div
                      key={trade.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-lg border ${
                        theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {trade.direction === 'LONG' 
                            ? <TrendingUp className="w-4 h-4 text-green-400" />
                            : <TrendingDown className="w-4 h-4 text-red-500" />
                          }
                          <span className="font-bold">{trade.symbol.replace('USDT', '')}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getGradeColor(trade.grade)}`}>
                            {trade.grade}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={trade.killzone === 'NYKZ' ? 'bg-purple-500/20 text-purple-400' : 
                                          trade.killzone === 'LKZ' ? 'bg-cyan-500/20 text-cyan-400' :
                                          'bg-green-500/20 text-green-400'}>
                            {trade.killzone}
                          </Badge>
                          <span className={`font-bold ${getOutcomeColor(trade.outcome)}`}>
                            {trade.outcome}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2 text-[10px]">
                        <div>
                          <span className="text-gray-500">Entry</span>
                          <div className="font-mono">${trade.entryPrice.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-red-500">SL</span>
                          <div className="font-mono">${trade.stopLoss.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-green-400">Exit</span>
                          <div className="font-mono">${trade.exitPrice.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">PnL</span>
                          <div className={`font-bold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                            {formatPnl(trade.pnl)}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
