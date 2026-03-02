'use client'

// QuentrexKillzone OS v7.0 - Risk Calculator Component
// Powered by Ko Htike

import { useState, useMemo } from 'react';
import { Calculator, AlertCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface RiskResult {
  positionSize: number;
  positionValue: number;
  riskAmount: number;
  potentialProfit: number;
  riskRewardRatio: number;
  liquidationPrice: number;
  marginRequired: number;
  isValid: boolean;
  warnings: string[];
}

export function RiskCalculator() {
  const [accountBalance, setAccountBalance] = useState(1000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [entryPrice, setEntryPrice] = useState(0);
  const [stopLoss, setStopLoss] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);
  const [leverage, setLeverage] = useState(10);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');

  const result = useMemo<RiskResult>(() => {
    const warnings: string[] = [];
    let isValid = true;

    // Validate inputs
    if (entryPrice <= 0 || stopLoss <= 0 || takeProfit <= 0) {
      return {
        positionSize: 0,
        positionValue: 0,
        riskAmount: 0,
        potentialProfit: 0,
        riskRewardRatio: 0,
        liquidationPrice: 0,
        marginRequired: 0,
        isValid: false,
        warnings: ['Please enter valid prices']
      };
    }

    // Calculate risk amount
    const riskAmount = accountBalance * (riskPercent / 100);

    // Calculate stop loss distance
    const slDistance = Math.abs(entryPrice - stopLoss);
    const slPercent = (slDistance / entryPrice) * 100;

    // Calculate position size
    const positionSize = riskAmount / slDistance;
    const positionValue = positionSize * entryPrice;

    // Calculate margin required
    const marginRequired = positionValue / leverage;

    // Calculate TP distance and profit
    const tpDistance = Math.abs(takeProfit - entryPrice);
    const potentialProfit = positionSize * tpDistance;

    // Calculate R:R ratio
    const riskRewardRatio = tpDistance / slDistance;

    // Calculate liquidation price
    let liquidationPrice: number;
    if (direction === 'LONG') {
      liquidationPrice = entryPrice * (1 - (1 / leverage) + 0.005); // 0.5% buffer
    } else {
      liquidationPrice = entryPrice * (1 + (1 / leverage) - 0.005);
    }

    // Validate
    if (marginRequired > accountBalance) {
      warnings.push('Insufficient margin for this position');
      isValid = false;
    }

    if (riskPercent > 2) {
      warnings.push('Risk exceeds 2% - consider reducing position');
    }

    if (slPercent > 5) {
      warnings.push('Stop loss is wide (>5% of entry)');
    }

    if (riskRewardRatio < 2) {
      warnings.push('R:R ratio below 2:1 - not recommended');
    }

    if (direction === 'LONG' && stopLoss > entryPrice) {
      warnings.push('Invalid: SL above entry for LONG');
      isValid = false;
    }

    if (direction === 'SHORT' && stopLoss < entryPrice) {
      warnings.push('Invalid: SL below entry for SHORT');
      isValid = false;
    }

    return {
      positionSize,
      positionValue,
      riskAmount,
      potentialProfit,
      riskRewardRatio,
      liquidationPrice,
      marginRequired,
      isValid,
      warnings
    };
  }, [accountBalance, riskPercent, entryPrice, stopLoss, takeProfit, leverage, direction]);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <Calculator className="w-3 h-3" /> RISK CALCULATOR
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-gray-500">Account Balance ($)</Label>
            <Input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Number(e.target.value))}
              className="h-8 text-sm bg-white/5 border-white/10"
            />
          </div>
          <div>
            <Label className="text-[10px] text-gray-500">Risk %</Label>
            <Input
              type="number"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Number(e.target.value))}
              step="0.1"
              min="0.1"
              max="10"
              className="h-8 text-sm bg-white/5 border-white/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-[10px] text-gray-500">Entry</Label>
            <Input
              type="number"
              value={entryPrice || ''}
              onChange={(e) => setEntryPrice(Number(e.target.value))}
              placeholder="0.00"
              className="h-8 text-sm bg-white/5 border-white/10"
            />
          </div>
          <div>
            <Label className="text-[10px] text-gray-500">Stop Loss</Label>
            <Input
              type="number"
              value={stopLoss || ''}
              onChange={(e) => setStopLoss(Number(e.target.value))}
              placeholder="0.00"
              className="h-8 text-sm bg-white/5 border-white/10"
            />
          </div>
          <div>
            <Label className="text-[10px] text-gray-500">Take Profit</Label>
            <Input
              type="number"
              value={takeProfit || ''}
              onChange={(e) => setTakeProfit(Number(e.target.value))}
              placeholder="0.00"
              className="h-8 text-sm bg-white/5 border-white/10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px] text-gray-500">Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as 'LONG' | 'SHORT')}>
              <SelectTrigger className="h-8 text-sm bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LONG">LONG 📈</SelectItem>
                <SelectItem value="SHORT">SHORT 📉</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] text-gray-500">Leverage</Label>
            <Select value={leverage.toString()} onValueChange={(v) => setLeverage(Number(v))}>
              <SelectTrigger className="h-8 text-sm bg-white/5 border-white/10">
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

        {/* Results */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded bg-white/5">
              <div className="text-[10px] text-gray-500">Position Size</div>
              <div className="font-mono font-bold text-green-400">
                {result.positionSize.toFixed(4)}
              </div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="text-[10px] text-gray-500">Position Value</div>
              <div className="font-mono font-bold text-cyan-400">
                ${result.positionValue.toFixed(2)}
              </div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="text-[10px] text-gray-500">Risk Amount</div>
              <div className="font-mono font-bold text-red-500">
                ${result.riskAmount.toFixed(2)}
              </div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="text-[10px] text-gray-500">Potential Profit</div>
              <div className="font-mono font-bold text-green-400">
                ${result.potentialProfit.toFixed(2)}
              </div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="text-[10px] text-gray-500">R:R Ratio</div>
              <div className={`font-mono font-bold ${result.riskRewardRatio >= 2 ? 'text-green-400' : 'text-yellow-400'}`}>
                1:{result.riskRewardRatio.toFixed(1)}
              </div>
            </div>
            <div className="p-2 rounded bg-white/5">
              <div className="text-[10px] text-gray-500">Margin Required</div>
              <div className="font-mono font-bold text-cyan-400">
                ${result.marginRequired.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
            <div className="text-[10px] text-gray-500">Liquidation Price</div>
            <div className="font-mono font-bold text-red-500">
              ${result.liquidationPrice.toFixed(2)}
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-1">
              {result.warnings.map((warning, i) => (
                <div key={i} className="flex items-center gap-1 text-[10px] text-yellow-400">
                  <AlertCircle className="w-3 h-3" />
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
