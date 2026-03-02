'use client'

// QuentrexKillzone OS v7.0 - Trading Journal Component
// Powered by Ko Htike

import { useState } from 'react';
import { BookOpen, Plus, TrendingUp, TrendingDown, Clock, DollarSign, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TradeJournal } from '@/types/trading';

interface TradeStats {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  bestTrade: number;
  worstTrade: number;
  avgRR: number;
}

export function TradingJournal() {
  const [trades, setTrades] = useState<TradeJournal[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // New trade form
  const [newTrade, setNewTrade] = useState<Partial<TradeJournal>>({
    symbol: 'BTCUSDT',
    direction: 'LONG',
    entryPrice: 0,
    stopLoss: 0,
    takeProfit: 0,
    positionSize: 0,
    leverage: 10,
    notes: '',
    signalGrade: 'A',
    killzone: 'NONE'
  });

  // Calculate stats
  const stats: TradeStats = (() => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED' && t.pnl !== undefined);
    if (closedTrades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        totalPnL: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        bestTrade: 0,
        worstTrade: 0,
        avgRR: 0
      };
    }

    const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losses = closedTrades.filter(t => (t.pnl || 0) < 0);
    const totalPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalWins = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLosses = Math.abs(losses.reduce((sum, t) => sum + (t.pnl || 0), 0));

    return {
      totalTrades: closedTrades.length,
      winRate: (wins.length / closedTrades.length) * 100,
      totalPnL,
      avgWin: wins.length > 0 ? totalWins / wins.length : 0,
      avgLoss: losses.length > 0 ? totalLosses / losses.length : 0,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
      bestTrade: Math.max(...closedTrades.map(t => t.pnl || 0)),
      worstTrade: Math.min(...closedTrades.map(t => t.pnl || 0)),
      avgRR: 0 // Calculate from actual trades
    };
  })();

  // Add trade
  const handleAddTrade = () => {
    const trade: TradeJournal = {
      id: `trade-${Date.now()}`,
      symbol: newTrade.symbol || 'BTCUSDT',
      direction: newTrade.direction as 'LONG' | 'SHORT',
      entryPrice: newTrade.entryPrice || 0,
      stopLoss: newTrade.stopLoss || 0,
      takeProfit: newTrade.takeProfit || 0,
      positionSize: newTrade.positionSize || 0,
      leverage: newTrade.leverage || 10,
      status: 'OPEN',
      entryTime: Date.now(),
      notes: newTrade.notes || '',
      signalGrade: newTrade.signalGrade || 'A',
      killzone: newTrade.killzone as any || 'NONE'
    };

    setTrades([trade, ...trades]);
    setIsAddOpen(false);
    setNewTrade({
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entryPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      positionSize: 0,
      leverage: 10,
      notes: '',
      signalGrade: 'A',
      killzone: 'NONE'
    });
  };

  // Close trade
  const handleCloseTrade = (id: string, exitPrice: number) => {
    setTrades(trades.map(t => {
      if (t.id !== id) return t;
      
      const pnl = t.direction === 'LONG'
        ? (exitPrice - t.entryPrice) * t.positionSize
        : (t.entryPrice - exitPrice) * t.positionSize;
      
      const pnlPercent = (pnl / (t.entryPrice * t.positionSize / t.leverage)) * 100;

      return {
        ...t,
        exitPrice,
        exitTime: Date.now(),
        pnl,
        pnlPercent,
        status: 'CLOSED' as const
      };
    }));
  };

  // Delete trade
  const handleDeleteTrade = (id: string) => {
    setTrades(trades.filter(t => t.id !== id));
  };

  return (
    <Card className="glass-card h-full">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs text-gray-500 uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-3 h-3" /> TRADING JOURNAL
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-6 px-2 text-[10px] bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500/30">
                <Plus className="w-3 h-3 mr-1" /> Add Trade
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0f0f1a] border-white/10 text-white">
              <DialogHeader>
                <DialogTitle className="text-sm">New Trade Entry</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 py-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-500">Symbol</Label>
                    <Input
                      value={newTrade.symbol}
                      onChange={(e) => setNewTrade({ ...newTrade, symbol: e.target.value.toUpperCase() })}
                      placeholder="BTCUSDT"
                      className="h-8 bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">Direction</Label>
                    <Select 
                      value={newTrade.direction} 
                      onValueChange={(v) => setNewTrade({ ...newTrade, direction: v as 'LONG' | 'SHORT' })}
                    >
                      <SelectTrigger className="h-8 bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LONG">LONG</SelectItem>
                        <SelectItem value="SHORT">SHORT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-500">Entry</Label>
                    <Input
                      type="number"
                      onChange={(e) => setNewTrade({ ...newTrade, entryPrice: Number(e.target.value) })}
                      placeholder="0.00"
                      className="h-8 bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">Stop Loss</Label>
                    <Input
                      type="number"
                      onChange={(e) => setNewTrade({ ...newTrade, stopLoss: Number(e.target.value) })}
                      placeholder="0.00"
                      className="h-8 bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">Take Profit</Label>
                    <Input
                      type="number"
                      onChange={(e) => setNewTrade({ ...newTrade, takeProfit: Number(e.target.value) })}
                      placeholder="0.00"
                      className="h-8 bg-white/5 border-white/10"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-500">Position Size</Label>
                    <Input
                      type="number"
                      onChange={(e) => setNewTrade({ ...newTrade, positionSize: Number(e.target.value) })}
                      placeholder="0.00"
                      className="h-8 bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-500">Leverage</Label>
                    <Select 
                      value={newTrade.leverage?.toString()} 
                      onValueChange={(v) => setNewTrade({ ...newTrade, leverage: Number(v) })}
                    >
                      <SelectTrigger className="h-8 bg-white/5 border-white/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 10, 20, 25, 50, 75, 100, 125].map(l => (
                          <SelectItem key={l} value={l.toString()}>{l}x</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500">Notes</Label>
                  <Input
                    value={newTrade.notes}
                    onChange={(e) => setNewTrade({ ...newTrade, notes: e.target.value })}
                    placeholder="Trade notes..."
                    className="h-8 bg-white/5 border-white/10"
                  />
                </div>
                <Button onClick={handleAddTrade} className="w-full bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30">
                  Add Trade
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="p-2 rounded bg-white/5 text-center">
            <div className="text-[10px] text-gray-500">Trades</div>
            <div className="font-bold text-white">{stats.totalTrades}</div>
          </div>
          <div className="p-2 rounded bg-white/5 text-center">
            <div className="text-[10px] text-gray-500">Win Rate</div>
            <div className={`font-bold ${stats.winRate >= 50 ? 'text-green-400' : 'text-red-500'}`}>
              {stats.winRate.toFixed(0)}%
            </div>
          </div>
          <div className="p-2 rounded bg-white/5 text-center">
            <div className="text-[10px] text-gray-500">Total PnL</div>
            <div className={`font-bold ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-500'}`}>
              ${stats.totalPnL.toFixed(2)}
            </div>
          </div>
          <div className="p-2 rounded bg-white/5 text-center">
            <div className="text-[10px] text-gray-500">P. Factor</div>
            <div className={`font-bold ${stats.profitFactor >= 1 ? 'text-green-400' : 'text-red-500'}`}>
              {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
            </div>
          </div>
        </div>

        <Separator className="my-2 bg-white/10" />

        {/* Trade List */}
        <ScrollArea className="h-[250px]">
          {trades.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">No trades recorded</p>
              <p className="text-[10px] text-gray-600">Click "Add Trade" to start journaling</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trades.map((trade) => (
                <div 
                  key={trade.id}
                  className={`p-2 rounded-lg border ${
                    trade.status === 'OPEN' 
                      ? 'bg-cyan-500/5 border-cyan-500/20' 
                      : (trade.pnl || 0) >= 0 
                        ? 'bg-green-500/5 border-green-500/20'
                        : 'bg-red-500/5 border-red-500/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{trade.symbol.replace('USDT', '')}</span>
                      <Badge className={`text-[9px] ${
                        trade.direction === 'LONG' 
                          ? 'bg-green-500/20 text-green-400 border-green-500/50'
                          : 'bg-red-500/20 text-red-500 border-red-500/50'
                      }`}>
                        {trade.direction === 'LONG' ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                        {trade.direction}
                      </Badge>
                      {trade.status === 'OPEN' && (
                        <Badge className="text-[9px] bg-cyan-500/20 text-cyan-400 border-cyan-500/50">
                          OPEN
                        </Badge>
                      )}
                    </div>
                    <Badge className={`text-[9px] ${
                      trade.signalGrade === 'A+' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                      trade.signalGrade === 'A' ? 'bg-green-500/20 text-green-400 border-green-500/50' :
                      'bg-blue-500/20 text-blue-400 border-blue-500/50'
                    }`}>
                      {trade.signalGrade}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                    <div>
                      <span className="text-gray-500">Entry:</span>
                      <span className="ml-1 font-mono">${trade.entryPrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">SL:</span>
                      <span className="ml-1 font-mono text-red-500">${trade.stopLoss.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">TP:</span>
                      <span className="ml-1 font-mono text-green-400">${trade.takeProfit.toFixed(2)}</span>
                    </div>
                  </div>

                  {trade.status === 'CLOSED' && trade.pnl !== undefined && (
                    <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">
                        {new Date(trade.exitTime || 0).toLocaleDateString()}
                      </span>
                      <span className={`font-bold text-sm ${(trade.pnl) >= 0 ? 'text-green-400' : 'text-red-500'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(2)} 
                        <span className="text-[10px] ml-1">({trade.pnlPercent?.toFixed(1)}%)</span>
                      </span>
                    </div>
                  )}

                  {trade.notes && (
                    <div className="mt-1 text-[10px] text-gray-400 truncate">
                      📝 {trade.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
