import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Sparkles, TrendingUp, AlertTriangle, Lightbulb, CheckCircle2, RefreshCw, User, Store } from 'lucide-react';
import { getProductsByShop, getCustomersByShop, getSalesByShop } from '../../services/inventoryStorage';
import type { Product, Customer } from '../../types/inventory';
import type { Sale } from '../../types/pos';
import type { Shop } from '../../types/auth';

interface AiBusinessAgentProps {
  shop: Shop;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export const AiBusinessAgent: React.FC<AiBusinessAgentProps> = ({ shop }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      content: `আসসালামু আলাইকুম! আমি **মোসাফা এআই বিজনেস এজেন্ট**।\n\nআপনার দোকান **${shop.name}**-এর বিক্রয় বৃদ্ধি, স্টক নিয়ন্ত্রণ, বকেয়া আদায় এবং লাভজনক সিদ্ধান্ত গ্রহণে সহায়তা করার জন্য আমি প্রস্তুত। আপনি যেকোনো ব্যবসায়িক প্রশ্ন আমাকে করতে পারেন।`,
      timestamp: new Date().toLocaleTimeString('bn-BD')
    }
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    'আমার দোকানের সামগ্রিক লাভ ও খরচের সামারি বিশ্লেষণ করো',
    'কোন পণ্যগুলোর স্টক কম এবং এখনই অর্ডার করা প্রয়োজন?',
    'বাকি খাতার বকেয়া আদায়ের জন্য সেরা টিপস কী?',
    'আজকের সম্ভাব্য ক্যাশ ক্লোজিংয়ের পূর্বপ্রস্তুতি কেমন হওয়া উচিত?'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString('bn-BD')
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Gather live shop metrics for agent context
      const products = getProductsByShop(shop.id);
      const lowStockProducts = products.filter((p: Product) => p.currentStock <= (p.minStockLevel || 5));
      const customers = getCustomersByShop(shop.id);
      const totalDue = customers.reduce((sum: number, c: Customer) => sum + (c.currentDue || 0), 0);
      const sales = getSalesByShop(shop.id);
      const todayTotalSales = sales.reduce((sum: number, s: Sale) => sum + s.grandTotal, 0);

      const shopContext = {
        shopName: shop.name,
        category: shop.category,
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
        lowStockSample: lowStockProducts.slice(0, 5).map((p: Product) => ({ name: p.nameBn, stock: p.currentStock })),
        totalCustomers: customers.length,
        totalCustomerDue: totalDue,
        totalRecordedSales: sales.length,
        lifetimeSalesVolume: todayTotalSales
      };

      const res = await fetch('/api/ai/business-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          shopContext,
          conversationHistory: messages.slice(-4)
        })
      });

      if (!res.ok) {
        throw new Error('AI সার্ভার থেকে কোনো সাড়া পাওয়া যায়নি।');
      }

      const data = await res.json();
      const modelMessage: ChatMessage = {
        id: 'msg_' + Date.now() + '_reply',
        role: 'model',
        content: data.reply || 'দুঃখিত, কোনো উত্তর পাওয়া যায়নি।',
        timestamp: new Date().toLocaleTimeString('bn-BD')
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: 'msg_err_' + Date.now(),
        role: 'model',
        content: `দুঃখিত, এআই পরামর্শ প্রসেস করার সময় একটি সমস্যা হয়েছে: ${err.message}`,
        timestamp: new Date().toLocaleTimeString('bn-BD')
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-gradient-to-r from-blue-700 via-sky-700 to-indigo-800 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-medium tracking-wide flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Gemini 2.5 Flash Engine
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">মোসাফা এআই বিজনেস এজেন্ট</h2>
          <p className="text-sky-100 text-sm mt-1 max-w-xl">
            আপনার দোকানের নিজস্ব কৃত্রিম বুদ্ধিমত্তা চালিত ব্যবসায়িক পরামর্শক। নির্ভুল ডাটা অ্যানালাইসিস, সেলস স্ট্র্যাটেজি ও আর্থিক সিদ্ধান্ত গ্রহণের সহযোগী।
          </p>
        </div>
      </div>

      {/* Main Chat Box */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-[650px] overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white ${
                  msg.role === 'user' ? 'bg-sky-600' : 'bg-gradient-to-br from-indigo-600 to-blue-700'
                }`}
              >
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-sky-600 text-white rounded-tr-none'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700/60'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div
                  className={`text-[10px] mt-2 font-mono ${
                    msg.role === 'user' ? 'text-sky-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 max-w-[85%]">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-600 to-blue-700 text-white">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-700/60 text-xs text-slate-500 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                <span>দোকানের ডাটাবেজ বিশ্লেষণ ও উত্তর তৈরি করা হচ্ছে...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Query Pills */}
        <div className="px-6 py-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex gap-2 overflow-x-auto text-xs no-scrollbar">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 whitespace-nowrap hover:border-sky-500 hover:text-sky-600 transition-colors shrink-0"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2 items-center">
          <input
            type="text"
            placeholder="আপনার ব্যবসার যেকোনো প্রশ্ন লিখুন (যেমন: গত সপ্তাহের শীর্ষ লাভজনক পণ্য কোনটি?)..."
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputPrompt.trim() || isLoading}
            className="p-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
