'use client'

// QuentrexKillzone OS v7.0 - Enhanced AI Strategy Chat
// Powered by Kimi K2.5 AI
// Strategy Discussion & Modification Mode

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Bot, User, Lightbulb, TrendingUp, AlertTriangle, 
  RefreshCw, Zap, Target, Shield, BarChart3, Clock,
  Settings, MessageSquare, ChevronDown, ChevronUp,
  Plus, Trash2, Copy, Check, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useThemeStore, THEMES } from '@/store/themeStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  type?: 'chat' | 'strategy' | 'backtest';
}

interface StrategyParams {
  minScore: number;
  scoreDiff: number;
  slMultiplier: number;
  tp1Multiplier: number;
  tp2Multiplier: number;
  tp3Multiplier: number;
  requireKillzone: boolean;
  requireMSS: boolean;
  requireOB: boolean;
  requireFVG: boolean;
  riskPercent: number;
}

interface AIChatProps {
  backtestData: any;
  signals?: any[];
  marketContext?: any;
  onStrategyUpdate?: (params: StrategyParams) => void;
}

const DEFAULT_STRATEGY: StrategyParams = {
  minScore: 5,
  scoreDiff: 1.5,
  slMultiplier: 1.2,
  tp1Multiplier: 2.0,
  tp2Multiplier: 3.5,
  tp3Multiplier: 5.0,
  requireKillzone: true,
  requireMSS: true,
  requireOB: false,
  requireFVG: false,
  riskPercent: 0.5
};

export function AIChat({ backtestData, signals, marketContext, onStrategyUpdate }: AIChatProps) {
  const { theme } = useThemeStore();
  const colors = THEMES[theme];
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `# 🤖 QUENTREX AI - Kimi K2.5

**Welcome to Your Trading Intelligence Hub!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 🎯 What I Can Do:

**📈 STRATEGY ANALYSIS**
- Analyze backtest results by killzone
- Identify best performing signal grades
- Recommend parameter adjustments

**🔧 STRATEGY MODIFICATION**
- Adjust entry criteria thresholds
- Modify R:R ratios
- Fine-tune signal scoring

**💡 REAL-TIME ADVICE**
- Signal quality evaluation
- Entry timing optimization  
- Risk management guidance

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Quick Start:** Run a backtest, then ask me to analyze results!`,
      timestamp: Date.now(),
      type: 'chat'
    }
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<'chat' | 'strategy'>('chat');
  const [strategy, setStrategy] = useState<StrategyParams>(DEFAULT_STRATEGY);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
      type: activeMode
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Add strategy context if in strategy mode
      const strategyContext = activeMode === 'strategy' 
        ? `\n\nCURRENT STRATEGY PARAMETERS:\n${JSON.stringify(strategy, null, 2)}\n\nPlease analyze and suggest modifications based on the backtest results.` 
        : '';

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.content + strategyContext,
          backtestData,
          signals,
          marketContext,
          conversationHistory,
          mode: activeMode
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.response,
          timestamp: Date.now(),
          type: activeMode
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ **Error:** ${error.message}\n\nPlease try again.`,
        timestamp: Date.now(),
        type: activeMode
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    
    setIsLoading(false);
  };

  const quickActions = [
    { icon: BarChart3, label: "Analyze Backtest", prompt: "Analyze my backtest results in detail. Which killzone has the highest win rate? Which signal grade performs best? What patterns do you see in my winning vs losing trades?" },
    { icon: Target, label: "Best Signals", prompt: "What criteria should I focus on to get more A+ signals? Analyze the difference between my A+ and B+ signal performance." },
    { icon: Shield, label: "Risk Analysis", prompt: "Analyze my risk management. What is my average R:R ratio? How much am I losing on failed trades vs gaining on winners?" },
    { icon: Settings, label: "Strategy Tuning", prompt: "Based on my backtest, what strategy parameters should I modify? Suggest specific changes to improve my win rate.", mode: 'strategy' as const },
  ];

  const applyStrategyPreset = (preset: 'conservative' | 'balanced' | 'aggressive') => {
    const presets = {
      conservative: {
        minScore: 6,
        scoreDiff: 2.0,
        slMultiplier: 1.0,
        tp1Multiplier: 1.5,
        tp2Multiplier: 2.5,
        tp3Multiplier: 4.0,
        requireKillzone: true,
        requireMSS: true,
        requireOB: true,
        requireFVG: true,
        riskPercent: 0.35
      },
      balanced: DEFAULT_STRATEGY,
      aggressive: {
        minScore: 4,
        scoreDiff: 1.0,
        slMultiplier: 1.5,
        tp1Multiplier: 2.5,
        tp2Multiplier: 4.0,
        tp3Multiplier: 6.0,
        requireKillzone: false,
        requireMSS: true,
        requireOB: false,
        requireFVG: false,
        riskPercent: 0.75
      }
    };
    
    setStrategy(presets[preset]);
    onStrategyUpdate?.(presets[preset]);
    
    const presetMessage: Message = {
      id: `preset-${Date.now()}`,
      role: 'assistant',
      content: `✅ **Strategy Updated to ${preset.toUpperCase()} preset**

\`\`\`json
${JSON.stringify(presets[preset], null, 2)}
\`\`\`

Run a new backtest to see how these changes affect performance.`,
      timestamp: Date.now(),
      type: 'strategy'
    };
    setMessages(prev => [...prev, presetMessage]);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatMessage = (content: string) => {
    return content
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-black/30 p-3 rounded-lg my-2 overflow-x-auto text-xs font-mono"><code>$2</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-cyan-300 text-xs">$1</code>')
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-sm font-bold mt-3 mb-1 text-green-400">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-base font-bold mt-3 mb-2 text-cyan-400">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-lg font-bold mt-3 mb-2 text-green-400">$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Lists
      .replace(/^- (.*$)/gm, '<li class="ml-4 my-0.5 text-xs">• $1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 my-0.5 text-xs">$1. $2</li>')
      // Separator
      .replace(/^━+$/gm, '<hr class="my-3 border-gray-600" />')
      // Line breaks
      .replace(/\n/g, '<br>');
  };

  return (
    <Card className={`${theme === 'dark' ? 'glass-card' : 'bg-white shadow-lg'} h-[700px] flex flex-col`}>
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="relative">
              <Bot className="w-4 h-4 text-green-400" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            </div>
            <span>QUENTREX AI</span>
            <Badge className="text-[9px] bg-green-500/20 text-green-400 border-green-500/50">
              KIMI K2.5
            </Badge>
          </CardTitle>
          
          {/* Mode Toggle */}
          <div className={`flex rounded-lg p-0.5 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'}`}>
            <button
              onClick={() => setActiveMode('chat')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                activeMode === 'chat' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <MessageSquare className="w-3 h-3 inline mr-1" />
              Chat
            </button>
            <button
              onClick={() => setActiveMode('strategy')}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                activeMode === 'strategy' 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <Settings className="w-3 h-3 inline mr-1" />
              Strategy
            </button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-3 overflow-hidden">
        {/* Strategy Mode Panel */}
        {activeMode === 'strategy' && (
          <div className={`mb-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-cyan-50 border border-cyan-200'}`}>
            <div className="text-[10px] text-cyan-400 font-bold mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              STRATEGY PRESETS
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                onClick={() => applyStrategyPreset('conservative')}
                className="flex-1 h-7 text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
              >
                🛡️ Conservative
              </Button>
              <Button
                size="sm"
                onClick={() => applyStrategyPreset('balanced')}
                className="flex-1 h-7 text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30"
              >
                ⚖️ Balanced
              </Button>
              <Button
                size="sm"
                onClick={() => applyStrategyPreset('aggressive')}
                className="flex-1 h-7 text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              >
                ⚡ Aggressive
              </Button>
            </div>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className={`grid grid-cols-2 gap-1.5 mb-3 flex-shrink-0 ${activeMode === 'strategy' ? 'grid-cols-4' : ''}`}>
          {quickActions.filter(a => !a.mode || a.mode === activeMode).slice(0, 4).map((action, i) => (
            <Button
              key={i}
              size="sm"
              variant="outline"
              onClick={() => {
                setInput(action.prompt);
                if (action.mode) setActiveMode(action.mode);
              }}
              className={`text-[10px] h-7 px-2 justify-start ${
                theme === 'dark' 
                  ? 'bg-white/5 border-white/10 hover:bg-white/10' 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <action.icon className="w-3 h-3 mr-1.5 text-cyan-400" />
              {action.label}
            </Button>
          ))}
        </div>
        
        {/* Messages */}
        <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
          <div className="space-y-3">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                    msg.role === 'user' 
                      ? 'bg-cyan-500/20 text-cyan-400' 
                      : msg.type === 'strategy'
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'bg-green-500/20 text-green-400'
                  }`}>
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`flex-1 max-w-[85%] p-3 rounded-xl text-xs relative group ${
                    msg.role === 'user'
                      ? theme === 'dark' ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-cyan-50 border border-cyan-200'
                      : msg.type === 'strategy'
                        ? theme === 'dark' ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'
                        : theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <div 
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                      className="prose prose-sm max-w-none leading-relaxed"
                    />
                    {/* Copy button */}
                    <button
                      onClick={() => copyToClipboard(msg.content, msg.id)}
                      className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded ${
                        theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-200'
                      }`}
                    >
                      {copiedId === msg.id 
                        ? <Check className="w-3 h-3 text-green-400" /> 
                        : <Copy className="w-3 h-3 text-gray-500" />
                      }
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2"
              >
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                  activeMode === 'strategy' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'
                }`}>
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-3 h-3 animate-spin text-green-400" />
                    <span className="text-xs text-gray-400">
                      {activeMode === 'strategy' ? 'Analyzing strategy...' : 'Thinking...'}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
        
        {/* Input */}
        <div className="flex gap-2 mt-3 flex-shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={activeMode === 'strategy' 
              ? "Ask about strategy optimization..." 
              : "Ask about signals, backtest, or risk..."
            }
            className={`flex-1 h-9 text-sm ${
              theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
            }`}
            disabled={isLoading}
          />
          <Button 
            onClick={sendMessage} 
            disabled={isLoading || !input.trim()}
            className={`h-9 px-4 ${
              activeMode === 'strategy'
                ? 'bg-purple-500 hover:bg-purple-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        
        {/* Backtest Status */}
        {backtestData?.overall && (
          <div className={`mt-2 p-2 rounded-lg text-[10px] flex items-center justify-between ${
            theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'
          }`}>
            <span className="text-gray-500">Backtest Loaded:</span>
            <div className="flex items-center gap-3">
              <span className={backtestData.overall.winRate >= 50 ? 'text-green-400' : 'text-red-500'}>
                WR: {backtestData.overall.winRate?.toFixed(1) || 0}%
              </span>
              <span className={backtestData.overall.totalPnl >= 0 ? 'text-green-400' : 'text-red-500'}>
                PnL: {backtestData.overall.totalPnl?.toFixed(1) || 0}%
              </span>
              <span className="text-cyan-400">
                {backtestData.overall.totalTrades || 0} trades
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
