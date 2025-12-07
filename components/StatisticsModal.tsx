
import React, { useState, useMemo } from 'react';
import { WeekData, Category, Transaction } from '../types';
import { X, PieChart as PieChartIcon, ShoppingBag, Briefcase, PartyPopper, ChevronLeft, ChevronRight, FileDown, Calendar, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis } from 'recharts';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WeekData;
  history: WeekData[];
  totalSavings: number;
}

type ViewMode = 'week' | 'month' | 'year';

export const StatisticsModal: React.FC<StatisticsModalProps> = ({ isOpen, onClose, data, history, totalSavings }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [cursorDate, setCursorDate] = useState(new Date());
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper to format Month/Year display
  const formatPeriod = (date: Date, mode: ViewMode) => {
    if (mode === 'year') return date.getFullYear().toString();
    const month = date.toLocaleDateString('pl-PL', { month: 'long' });
    return `${month} ${date.getFullYear()}`; // e.g. "październik 2023"
  };

  const changeDate = (direction: -1 | 1) => {
    const newDate = new Date(cursorDate);
    if (viewMode === 'year') {
      newDate.setFullYear(newDate.getFullYear() + direction);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else {
       // For week mode, we just stick to current data for now as history explorer is separate, 
       // but technically we could implement week nav here too. keeping it simple as per request.
    }
    setCursorDate(newDate);
  };

  // Aggregation Logic
  const aggregatedData = useMemo(() => {
    if (viewMode === 'week') {
      // Just the current week data passed in props
      return data;
    }

    const targetYear = cursorDate.getFullYear();
    const targetMonth = cursorDate.getMonth(); // 0-11

    // Combine current week + history
    const allWeeks = [data, ...history];

    const relevantWeeks = allWeeks.filter(week => {
      const d = new Date(week.startDate);
      if (viewMode === 'year') {
        return d.getFullYear() === targetYear;
      } else {
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      }
    });

    // Merge logic
    const merged: WeekData = {
      id: `agg-${viewMode}-${cursorDate.getTime()}`,
      startDate: relevantWeeks[0]?.startDate || cursorDate.toISOString(),
      endDate: null,
      income: relevantWeeks.reduce((acc, w) => acc + w.income, 0),
      transactions: relevantWeeks.flatMap(w => w.transactions),
      isClosed: false
    };

    return merged;
  }, [viewMode, cursorDate, data, history]);


  // -- Render Stats logic (reused from previous version but using aggregatedData) --

  const totalIncome = aggregatedData.income;
  const spent = aggregatedData.transactions.filter(t => t.type === 'actual' || (t.type === 'planned' && t.isConfirmed)).reduce((a, b) => a + b.amount, 0);
  const planned = aggregatedData.transactions.filter(t => t.type === 'planned' && !t.isConfirmed).reduce((a, b) => a + b.amount, 0);
  const savedInPeriod = aggregatedData.transactions.filter(t => t.type === 'saving').reduce((a, b) => a + b.amount, 0);
  const remaining = totalIncome - spent - planned - savedInPeriod;

  const pieData = [
    { name: 'Wydano', value: spent, color: '#ef4444' },
    { name: 'Zaplanowane', value: planned, color: '#f59e0b' },
    { name: 'Odłożone', value: savedInPeriod, color: '#10b981' },
    { name: 'Dostępne', value: Math.max(0, remaining), color: '#3b82f6' },
  ].filter(d => d.value > 0);

  // Category Breakdown
  const categories: Category[] = ['obligations', 'necessities', 'pleasures'];
  const categoryStats = categories.map(cat => {
    const amount = aggregatedData.transactions
      .filter(t => t.category === cat && t.type !== 'saving')
      .reduce((sum, t) => sum + t.amount, 0);
    return { cat, amount };
  }).sort((a, b) => b.amount - a.amount);

  // Daily/Timeline Data
  // If Month/Year, show trend by Day of Month or Month Index? 
  // For simplicity, sticking to Day of Week distribution for Week mode, 
  // and "Day of Month" for Month mode, and "Month" for Year mode would be ideal, 
  // but let's map it simply to a timeline.
  
  let chartData: {name: string, value: number}[] = [];

  if (viewMode === 'week') {
    const days = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So'];
    const daily = days.map((day, idx) => {
      const val = aggregatedData.transactions
        .filter(t => { const d = new Date(t.date); return d.getDay() === idx && (t.type === 'actual' || t.isConfirmed); })
        .reduce((s, t) => s + t.amount, 0);
      return { name: day, value: val };
    });
    chartData = [...daily.slice(1), daily[0]];
  } else if (viewMode === 'month') {
    // Group by day of month (1-31)
    const daysInMonth = new Date(cursorDate.getFullYear(), cursorDate.getMonth() + 1, 0).getDate();
    chartData = Array.from({length: daysInMonth}, (_, i) => {
       const dayNum = i + 1;
       const val = aggregatedData.transactions
        .filter(t => {
           const d = new Date(t.date);
           return d.getDate() === dayNum && (t.type === 'actual' || t.isConfirmed);
        })
        .reduce((s,t) => s + t.amount, 0);
       return { name: `${dayNum}`, value: val };
    });
  } else {
    // Year mode - group by Month
    const months = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
    chartData = months.map((m, idx) => {
       const val = aggregatedData.transactions
        .filter(t => {
           const d = new Date(t.date);
           return d.getMonth() === idx && (t.type === 'actual' || t.isConfirmed);
        })
        .reduce((s,t) => s + t.amount, 0);
       return { name: m, value: val };
    });
  }


  // -- Helpers for rendering --
  const getCatLabel = (c: Category) => {
    switch (c) {
      case 'obligations': return 'Zobowiązania';
      case 'necessities': return 'Konieczności';
      case 'pleasures': return 'Przyjemności';
      default: return 'Inne';
    }
  };
  const getCatIcon = (c: Category) => {
     switch (c) {
      case 'obligations': return <Briefcase size={14} />;
      case 'necessities': return <ShoppingBag size={14} />;
      case 'pleasures': return <PartyPopper size={14} />;
      default: return null;
    }
  };
  const getCatColor = (c: Category) => {
     switch (c) {
      case 'obligations': return 'bg-blue-100 text-blue-600';
      case 'necessities': return 'bg-orange-100 text-orange-600';
      case 'pleasures': return 'bg-pink-100 text-pink-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    setTimeout(async () => {
      const element = document.getElementById('stats-content-area');
      if (element) {
        try {
          const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
          
          const filename = viewMode === 'week' ? 'raport-tydzien.pdf' 
                         : viewMode === 'month' ? `raport-${cursorDate.getMonth()+1}-${cursorDate.getFullYear()}.pdf`
                         : `raport-${cursorDate.getFullYear()}.pdf`;
                         
          pdf.save(filename);
        } catch (e) {
          console.error("PDF generation failed", e);
        }
      }
      setIsGenerating(false);
    }, 500);
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="bg-[#F2F2F7] w-full h-[95vh] sm:h-[85vh] sm:max-w-md rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 bg-white border-b border-gray-100">
          <div>
             <h2 className="text-2xl font-black text-gray-900 tracking-tight">Analityka</h2>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* View Switcher */}
        <div className="px-6 pt-4 pb-2 bg-white">
          <div className="flex bg-gray-100 p-1 rounded-xl">
             <button onClick={() => setViewMode('week')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'week' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Tydzień</button>
             <button onClick={() => setViewMode('month')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'month' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Miesiąc</button>
             <button onClick={() => setViewMode('year')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${viewMode === 'year' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Rok</button>
          </div>
          
          {viewMode !== 'week' && (
             <div className="flex items-center justify-between mt-4 bg-gray-50 rounded-xl p-2 border border-gray-100">
                <button onClick={() => changeDate(-1)} className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronLeft size={16} className="text-gray-600"/></button>
                <span className="text-sm font-bold text-gray-800 capitalize">{formatPeriod(cursorDate, viewMode)}</span>
                <button onClick={() => changeDate(1)} className="p-1 hover:bg-white rounded-lg transition-colors"><ChevronRight size={16} className="text-gray-600"/></button>
             </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" id="stats-content-area">
          
          {/* Main Pie Chart Card */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
             <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
               <PieChartIcon size={18} className="text-blue-500"/> Dystrybucja {viewMode === 'week' ? 'Tygodnia' : 'Okresu'}
             </h3>
             <div className="h-56 relative">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                       formatter={(value: number) => `€${value.toFixed(2)}`}
                       contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                    />
                 </PieChart>
               </ResponsiveContainer>
               {/* Center Text */}
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-gray-400 text-xs font-medium uppercase">Dostępne</span>
                  <span className="text-2xl font-bold text-gray-900">€{remaining.toFixed(0)}</span>
               </div>
             </div>
             
             {/* Legend */}
             <div className="grid grid-cols-2 gap-2 mt-4">
               {pieData.map((d, i) => (
                 <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full" style={{ background: d.color }}></div>
                    <span className="text-gray-500">{d.name}</span>
                    <span className="font-bold ml-auto">€{d.value.toFixed(0)}</span>
                 </div>
               ))}
             </div>
          </div>

          {/* Savings Summary */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
             <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Całkowite Oszczędności</p>
             <h3 className="text-4xl font-black mb-4">€{totalSavings.toFixed(2)}</h3>
             <div className="flex gap-2 text-xs font-medium text-emerald-100 bg-emerald-700/30 p-3 rounded-xl backdrop-blur-sm">
                <span>W tym okresie:</span>
                <span className="text-white ml-auto font-bold">+€{savedInPeriod.toFixed(2)}</span>
             </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
             <div className="flex justify-between items-center mb-4">
               <h3 className="font-bold text-gray-800">Kategorie</h3>
               <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">{viewMode === 'week' ? 'Tydzień' : formatPeriod(cursorDate, viewMode)}</span>
             </div>
             <div className="space-y-4">
               {categoryStats.length === 0 || categoryStats.every(c => c.amount === 0) ? (
                 <p className="text-gray-400 text-sm text-center py-4">Brak danych w tym okresie.</p>
               ) : (
                 categoryStats.map((item, idx) => (
                   <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                         <div className="flex items-center gap-2">
                            <div className={`p-1 rounded-md ${getCatColor(item.cat)}`}>
                               {getCatIcon(item.cat)}
                            </div>
                            <span className="font-medium text-gray-700">{getCatLabel(item.cat)}</span>
                         </div>
                         <span className="font-bold text-gray-900">€{item.amount.toFixed(2)}</span>
                      </div>
                      {/* Progress Bar */}
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                         <div 
                           className="h-full rounded-full" 
                           style={{ 
                             width: `${spent > 0 ? (item.amount / spent) * 100 : 0}%`,
                             backgroundColor: item.cat === 'obligations' ? '#2563eb' : item.cat === 'necessities' ? '#ea580c' : '#db2777'
                           }}
                         ></div>
                      </div>
                   </div>
                 ))
               )}
             </div>
          </div>

          {/* Timeline Chart */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Wydatki w czasie</h3>
            <div className="h-40">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData}>
                   <XAxis 
                     dataKey="name" 
                     axisLine={false} 
                     tickLine={false} 
                     tick={{fontSize: 10, fill: '#9ca3af'}} 
                     dy={10}
                     interval={viewMode === 'month' ? 4 : 0} // Skip ticks for month view to prevent overlap
                   />
                   <Tooltip 
                     cursor={{fill: '#f3f4f6', radius: 4}}
                     contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px'}}
                   />
                   <Bar dataKey="value" fill="#1f2937" radius={[4, 4, 4, 4]} />
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Footer with PDF Button */}
        <div className="p-6 bg-white border-t border-gray-100 safe-bottom z-10">
           <button
             onClick={handleGeneratePDF}
             disabled={isGenerating}
             className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-gray-200 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
           >
             {isGenerating ? 'Generowanie...' : (
               <>
                 <FileDown size={18} /> Pobierz Raport PDF
               </>
             )}
           </button>
        </div>

      </div>
    </div>
  );
};
