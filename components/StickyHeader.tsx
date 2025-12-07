import React from 'react';
import { WeekData } from '../types';
import { ChevronRight, Wallet } from 'lucide-react';

interface StickyHeaderProps {
  data: WeekData;
  totalSavings: number;
  availableFunds: number;
  onOpenHistory: () => void;
  onOpenStats: () => void;
}

export const StickyHeader: React.FC<StickyHeaderProps> = ({ 
  data, totalSavings, availableFunds, onOpenHistory, onOpenStats 
}) => {
  const totalPlanned = data.transactions
    .filter(t => t.type === 'planned' && !t.isConfirmed)
    .reduce((acc, t) => acc + t.amount, 0);

  const isCritical = availableFunds < 0;

  return (
    <div className="pt-2 px-4 pb-4 sticky top-0 z-40">
       {/* Glass background container */}
      <div 
        onClick={onOpenStats}
        className="relative overflow-hidden bg-[#1c1c1e] text-white rounded-[2rem] shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)] border border-white/10 cursor-pointer active:scale-[0.98] transition-transform"
      >
        {/* Abstract Background Blurs */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500 rounded-full blur-[60px] opacity-20"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500 rounded-full blur-[60px] opacity-20"></div>

        <div className="relative p-5">
          {/* Top Row: Label & Savings */}
          <div className="flex justify-between items-start mb-1">
            <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase flex items-center gap-1">
              Dostępne środki <ChevronRight size={12} />
            </span>
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5 bg-white/10 px-2 py-1 rounded-lg backdrop-blur-sm border border-white/5">
                <Wallet size={12} className="text-emerald-400" />
                <span className="text-xs font-medium text-emerald-300">Odłożone</span>
              </div>
              <span className="text-lg font-bold text-white mt-0.5 tracking-tight">
                €{(totalSavings).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Big Number */}
          <div className="flex items-baseline gap-1 mt-1">
            <h1 className={`text-4xl font-extrabold tracking-tighter ${isCritical ? 'text-red-400' : 'text-white'}`}>
              €{availableFunds.toFixed(2)}
            </h1>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-white/10">
            <div 
              onClick={(e) => { e.stopPropagation(); onOpenHistory(); }} 
              className="active:opacity-70 transition-opacity cursor-pointer group"
            >
              <div className="flex items-center gap-1 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <p className="text-[10px] text-gray-400 font-medium uppercase group-hover:text-white transition-colors">Przychód</p>
                <ChevronRight size={10} className="text-gray-500" />
              </div>
              <p className="text-sm font-semibold text-gray-100">€{data.income.toFixed(2)}</p>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end mb-1">
                <p className="text-[10px] text-gray-400 font-medium uppercase">Zaplanowane</p>
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
              </div>
              <p className="text-sm font-semibold text-amber-400">€{totalPlanned.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};