import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { AppState, Transaction, WeekData, Currency, TransactionType, Category } from './types';
import { loadState, saveState } from './services/storage';
import { fetchEurPlnRate } from './services/nbp';
import { Welcome } from './components/Welcome';
import { StickyHeader } from './components/StickyHeader';
import { HistoryModal } from './components/HistoryModal';
import { EditTransactionModal } from './components/EditTransactionModal';
import { StatisticsModal } from './components/StatisticsModal';
import { PresetModal } from './components/PresetModal';
import { Plus, Check, ArrowRight, AlertCircle, ArrowUpRight, PiggyBank, Briefcase, ShoppingBag, PartyPopper, CheckCircle2 } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const App = () => {
  const [loading, setLoading] = useState(true);
  const [appState, setAppState] = useState<AppState>(loadState());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [showSundayModal, setShowSundayModal] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [nbpRate, setNbpRate] = useState<number>(4.30); // Default fallback

  // Form State
  const [newTransTitle, setNewTransTitle] = useState('');
  const [newTransAmount, setNewTransAmount] = useState('');
  const [amountError, setAmountError] = useState(''); // Validation state
  const [currency, setCurrency] = useState<Currency>('EUR');
  const [newTransType, setNewTransType] = useState<TransactionType>('planned');
  const [newTransCategory, setNewTransCategory] = useState<Category>('necessities');
  const [addSuccess, setAddSuccess] = useState(false);

  // Animation State
  const [justConfirmed, setJustConfirmed] = useState<string | null>(null);

  // Edit State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // New Income Logic
  const [newIncome, setNewIncome] = useState('');

  // Refs
  const isMounted = useRef(false);
  const statusTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Financial Calculations (Lifted) ---
  const { currentWeek, totalSavings } = appState;
  
  const totalPlanned = currentWeek.transactions
    .filter(t => t.type === 'planned' && !t.isConfirmed)
    .reduce((acc, t) => acc + t.amount, 0);

  const totalSpent = currentWeek.transactions
    .filter(t => t.isConfirmed || t.type === 'actual')
    .reduce((acc, t) => acc + t.amount, 0);

  const currentWeekSavings = currentWeek.transactions
    .filter(t => t.type === 'saving')
    .reduce((acc, t) => acc + t.amount, 0);

  // Available Funds Formula
  const availableFunds = currentWeek.income - totalSpent - totalPlanned - currentWeekSavings;

  // Initial Data Load
  useEffect(() => {
    const init = async () => {
      // Fetch rate
      const rate = await fetchEurPlnRate();
      setNbpRate(rate);
      
      // Sunday Logic
      const today = new Date();
      const isSunday = today.getDay() === 0;
      const weekStart = new Date(appState.currentWeek.startDate);
      const diffTime = Math.abs(today.getTime() - weekStart.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (isSunday && !appState.currentWeek.isClosed && diffDays >= 1) {
         // Pre-fill income from current week to avoid re-typing
         setNewIncome(appState.currentWeek.income.toString());
         setShowSundayModal(true);
      }
      
      const newState = { ...appState, lastOpened: today.toISOString() };
      setAppState(newState);
      setLoading(false);
    };

    // Small delay for welcome screen
    setTimeout(init, 2000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save Effect & Toast
  useEffect(() => {
    if (isMounted.current) {
      saveState(appState);
      
      // Show notification
      setStatusMsg('ZAPISANO W PAMIĘCI LOKALNEJ');
      
      if (statusTimeout.current) clearTimeout(statusTimeout.current);
      statusTimeout.current = setTimeout(() => {
        setStatusMsg('');
      }, 2000);
    } else {
      isMounted.current = true;
    }
  }, [appState]);

  // Autocomplete Data
  const historyTitles = useMemo(() => {
    const titles = new Set<string>();
    appState.currentWeek.transactions.forEach(t => titles.add(t.title));
    appState.history.forEach(week => {
      week.transactions.forEach(t => titles.add(t.title));
    });
    return Array.from(titles).sort();
  }, [appState]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    setAmountError('');

    if (!newTransTitle.trim()) return;

    // VALIDATION LOGIC
    const normalizedAmount = newTransAmount.replace(',', '.');
    const amountInput = parseFloat(normalizedAmount);
    
    // Check if valid number and greater than 0
    if (!newTransAmount || isNaN(amountInput) || amountInput <= 0) {
      setAmountError('Podaj poprawną kwotę (np. 12.99)');
      return;
    }

    let finalAmount = amountInput;
    if (currency === 'PLN') {
      finalAmount = amountInput / nbpRate;
    }

    const newTx: Transaction = {
      id: Date.now().toString(),
      title: newTransTitle,
      amount: finalAmount,
      originalAmount: currency === 'PLN' ? amountInput : undefined,
      originalCurrency: currency,
      type: newTransType,
      category: newTransType === 'saving' ? 'none' : newTransCategory,
      isConfirmed: newTransType === 'actual' || newTransType === 'saving', 
      date: new Date().toISOString()
    };

    if (newTransType === 'saving') {
       setAppState(prev => ({
         ...prev,
         totalSavings: prev.totalSavings + finalAmount,
         currentWeek: {
           ...prev.currentWeek,
           transactions: [newTx, ...prev.currentWeek.transactions]
         }
       }));
    } else {
      setAppState(prev => ({
        ...prev,
        currentWeek: {
          ...prev.currentWeek,
          transactions: [newTx, ...prev.currentWeek.transactions]
        }
      }));
    }

    // Success animation trigger
    setAddSuccess(true);
    setTimeout(() => setAddSuccess(false), 1500);

    setNewTransTitle('');
    setNewTransAmount('');
    setCurrency('EUR');
  };

  const handleUpdateTransaction = (updated: Transaction) => {
    setAppState(prev => {
      let newTotalSavings = prev.totalSavings;
      
      if (updated.type === 'saving') {
        const oldTx = prev.currentWeek.transactions.find(t => t.id === updated.id);
        if (oldTx) {
          const diff = updated.amount - oldTx.amount;
          newTotalSavings += diff;
        }
      }

      return {
        ...prev,
        totalSavings: newTotalSavings,
        currentWeek: {
          ...prev.currentWeek,
          transactions: prev.currentWeek.transactions.map(t => t.id === updated.id ? updated : t)
        }
      };
    });
    setEditingTransaction(null);
  };

  const toggleTransactionStatus = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    // Start animation
    setJustConfirmed(id);

    // Delay actual state change to allow animation to play
    setTimeout(() => {
      setAppState(prev => ({
        ...prev,
        currentWeek: {
          ...prev.currentWeek,
          transactions: prev.currentWeek.transactions.map(t => 
            t.id === id ? { ...t, isConfirmed: !t.isConfirmed } : t
          )
        }
      }));
      setJustConfirmed(null);
    }, 500);
  };

  const deleteTransaction = (id: string, type: TransactionType, amount: number) => {
    setAppState(prev => {
      let newTotalSavings = prev.totalSavings;
      if (type === 'saving') {
        newTotalSavings = prev.totalSavings - amount;
      }

      return {
        ...prev,
        totalSavings: newTotalSavings,
        currentWeek: {
          ...prev.currentWeek,
          transactions: prev.currentWeek.transactions.filter(t => t.id !== id)
        }
      };
    });
  };

  const handleEndWeek = () => {
    const archivedWeek: WeekData = {
      ...appState.currentWeek,
      endDate: new Date().toISOString(),
      isClosed: true
    };

    const newWeek: WeekData = {
      id: new Date().toISOString(),
      startDate: new Date().toISOString(),
      endDate: null,
      income: parseFloat(newIncome) || 0,
      transactions: [],
      isClosed: false
    };

    setAppState(prev => ({
      ...prev,
      history: [...prev.history, archivedWeek],
      currentWeek: newWeek
    }));

    setShowSundayModal(false);
    setNewIncome('');
  };

  // Preset Handlers
  const handleAddPreset = (val: string) => {
    if (!appState.presets.includes(val)) {
      setAppState(prev => ({ ...prev, presets: [...prev.presets, val] }));
    }
  };

  const handleDeletePreset = (val: string) => {
    setAppState(prev => ({ ...prev, presets: prev.presets.filter(p => p !== val) }));
  };

  // Filter Logic
  const [filterCategory, setFilterCategory] = useState<Category | 'all'>('all');
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');

  // Helpers
  const getCategoryIcon = (cat: Category) => {
    switch(cat) {
      case 'obligations': return <Briefcase size={12} />;
      case 'necessities': return <ShoppingBag size={12} />;
      case 'pleasures': return <PartyPopper size={12} />;
      default: return null;
    }
  };

  const getCategoryColor = (cat: Category) => {
    switch(cat) {
      case 'obligations': return 'bg-blue-100 text-blue-600';
      case 'necessities': return 'bg-orange-100 text-orange-600';
      case 'pleasures': return 'bg-pink-100 text-pink-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const renderCategoryBadge = (cat: Category) => {
    if (cat === 'none') return null;

    let label = '';
    let styleClass = '';
    let Icon = null;

    switch (cat) {
      case 'obligations':
        label = 'Zobowiązania';
        styleClass = 'bg-blue-50 text-blue-600 border-blue-100';
        Icon = Briefcase;
        break;
      case 'necessities':
        label = 'Konieczności';
        styleClass = 'bg-orange-50 text-orange-600 border-orange-100';
        Icon = ShoppingBag;
        break;
      case 'pleasures':
        label = 'Przyjemności';
        styleClass = 'bg-pink-50 text-pink-600 border-pink-100';
        Icon = PartyPopper;
        break;
    }

    return (
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${styleClass}`}>
        {Icon && <Icon size={10} />}
        {label}
      </span>
    );
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'numeric' });
  };

  // Filtered Lists
  const applyFilters = (list: Transaction[]) => {
    return list.filter(t => {
      const catMatch = filterCategory === 'all' || t.category === filterCategory;
      // Note: TransactionType 'actual' includes confirmed planned transactions for the 'done' list view logic below
      // But here we might just check basic type matching if needed.
      return catMatch;
    });
  };

  let planned = appState.currentWeek.transactions.filter(t => t.type === 'planned' && !t.isConfirmed);
  let done = appState.currentWeek.transactions.filter(t => (t.type === 'planned' && t.isConfirmed) || t.type === 'actual');
  let savings = appState.currentWeek.transactions.filter(t => t.type === 'saving');
  
  // Apply visual filters
  if (filterCategory !== 'all') {
    planned = planned.filter(t => t.category === filterCategory);
    done = done.filter(t => t.category === filterCategory);
  }
  
  if (filterType === 'planned') {
    done = []; // Hide actuals
  } else if (filterType === 'actual') {
    planned = []; // Hide planned
  }

  done.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const statsData = appState.currentWeek.transactions.map((t, i) => ({
    name: i,
    val: t.amount
  }));

  if (loading) return <Welcome onFinish={() => {}} availableFunds={availableFunds} totalSavings={totalSavings} />;

  return (
    <div className="flex flex-col min-h-screen pb-20">
      
      <datalist id="history-titles">
        {historyTitles.map((title, i) => (
          <option key={i} value={title} />
        ))}
      </datalist>

      {statusMsg && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-emerald-500 text-white text-[10px] py-2 text-center font-bold tracking-widest uppercase animate-fade-in-down shadow-md">
          {statusMsg}
        </div>
      )}

      {/* Header */}
      <StickyHeader 
        data={appState.currentWeek} 
        totalSavings={appState.totalSavings}
        availableFunds={availableFunds}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenStats={() => setIsStatsOpen(true)}
      />

      <main className="flex-1 px-4 space-y-5">
        
        {/* Weekly Income Alert */}
        {appState.currentWeek.income === 0 && !showSundayModal && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full text-red-600">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="font-bold text-red-900 text-sm">Brak tygodniówki</p>
                <p className="text-xs text-red-700">Podaj kwotę na start.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                placeholder="0 €"
                className="w-20 p-2 rounded-lg bg-white border border-red-200 text-center text-sm font-bold"
                value={newIncome}
                onChange={(e) => setNewIncome(e.target.value)}
              />
              <button 
                onClick={() => setAppState(prev => ({
                  ...prev, 
                  currentWeek: { ...prev.currentWeek, income: parseFloat(newIncome) || 0 }
                }))}
                className="bg-red-500 text-white px-3 py-2 rounded-lg font-bold text-xs"
              >
                OK
              </button>
            </div>
          </div>
        )}

        {/* Controls / Add New */}
        <div className="bg-white rounded-[24px] shadow-lg shadow-gray-200/50 p-5 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm font-bold text-gray-800">Nowa operacja</h3>
             <div className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500 font-medium">
                1 PLN = {(1/nbpRate).toFixed(3)} €
             </div>
          </div>

          <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
            {(['planned', 'actual', 'saving'] as const).map(type => (
              <button
                key={type}
                onClick={() => setNewTransType(type)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all active:scale-95 ${
                  newTransType === type 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {type === 'planned' ? 'Plan' : type === 'actual' ? 'Wydatek' : 'Odłożone'}
              </button>
            ))}
          </div>

          <form onSubmit={handleAddTransaction} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                list="history-titles"
                placeholder={newTransType === 'saving' ? "Na co odkładasz?" : "Wydatek"}
                value={newTransTitle}
                onChange={(e) => setNewTransTitle(e.target.value)}
                className="w-full p-3 pr-12 bg-gray-50 rounded-xl text-sm font-medium placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <button 
                type="button"
                onClick={() => setIsPresetModalOpen(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-gray-200 rounded-lg text-gray-600 hover:bg-gray-300 active:scale-90 transition-all"
              >
                <Plus size={14} />
              </button>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                 <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Kwota"
                  value={newTransAmount}
                  onChange={(e) => {
                    setNewTransAmount(e.target.value);
                    if (amountError) setAmountError('');
                  }}
                  className={`w-full p-3 bg-gray-50 rounded-xl text-sm font-bold placeholder-gray-400 focus:bg-white outline-none transition-all ${
                    amountError 
                      ? 'ring-2 ring-red-500 bg-red-50 text-red-900' 
                      : 'focus:ring-2 focus:ring-blue-500'
                  }`}
                />
                {amountError && (
                  <div className="absolute top-full left-1 mt-1 flex items-center gap-1 text-[10px] font-bold text-red-500 animate-fade-in-down z-10">
                    <AlertCircle size={10} /> {amountError}
                  </div>
                )}
              </div>

              <div className="flex bg-gray-50 rounded-xl p-1 w-28 shrink-0 h-[46px]">
                 <button type="button" onClick={() => setCurrency('EUR')} className={`flex-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${currency === 'EUR' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>€</button>
                 <button type="button" onClick={() => setCurrency('PLN')} className={`flex-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${currency === 'PLN' ? 'bg-white shadow-sm text-red-500' : 'text-gray-400'}`}>zł</button>
              </div>
            </div>

            {newTransType !== 'saving' && (
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setNewTransCategory('obligations')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all active:scale-95 flex items-center justify-center gap-1 ${newTransCategory === 'obligations' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-transparent border-gray-100 text-gray-400'}`}>
                   <Briefcase size={12} /> Zobowiązania
                </button>
                <button type="button" onClick={() => setNewTransCategory('necessities')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all active:scale-95 flex items-center justify-center gap-1 ${newTransCategory === 'necessities' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-transparent border-gray-100 text-gray-400'}`}>
                   <ShoppingBag size={12} /> Konieczności
                </button>
                <button type="button" onClick={() => setNewTransCategory('pleasures')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all active:scale-95 flex items-center justify-center gap-1 ${newTransCategory === 'pleasures' ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-transparent border-gray-100 text-gray-400'}`}>
                   <PartyPopper size={12} /> Przyjemności
                </button>
              </div>
            )}

            <button 
              type="submit"
              disabled={addSuccess}
              className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 mt-2 shadow-lg active:scale-95 ${
                addSuccess 
                  ? 'bg-green-500 text-white shadow-green-200' 
                  : 'bg-black text-white hover:bg-gray-800 shadow-gray-200'
              }`}
            >
              {addSuccess ? (
                <>
                  <CheckCircle2 size={18} className="animate-pop" /> 
                  <span className="animate-pop">Dodano!</span>
                </>
              ) : (
                <>
                  {newTransType === 'saving' ? <PiggyBank size={16}/> : <Plus size={18} />}
                  {newTransType === 'saving' ? 'Odkładam' : 'Dodaj'}
                </>
              )}
            </button>
          </form>

          {/* Filters Bar */}
          <div className="mt-6 -mx-2 overflow-x-auto no-scrollbar py-2">
            <div className="flex gap-2 px-2">
              {/* Type Filter */}
              <div className="flex p-1 bg-gray-100 rounded-lg shrink-0">
                <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${filterType === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}>Wszystkie</button>
                <button onClick={() => setFilterType('planned')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${filterType === 'planned' ? 'bg-white shadow-sm text-amber-500' : 'text-gray-400'}`}>Plan</button>
                <button onClick={() => setFilterType('actual')} className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${filterType === 'actual' ? 'bg-white shadow-sm text-blue-500' : 'text-gray-400'}`}>Faktyczne</button>
              </div>
              
              <div className="w-[1px] h-8 bg-gray-100 mx-1 shrink-0"></div>

              {/* Category Filter */}
               <button onClick={() => setFilterCategory(filterCategory === 'all' ? 'obligations' : 'all')} className={`shrink-0 px-3 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all ${filterCategory === 'obligations' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-gray-100 text-gray-400'}`}>
                 <Briefcase size={10} /> Zobowiązania
               </button>
               <button onClick={() => setFilterCategory(filterCategory === 'all' ? 'necessities' : 'all')} className={`shrink-0 px-3 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all ${filterCategory === 'necessities' ? 'bg-orange-50 border-orange-200 text-orange-600' : 'border-gray-100 text-gray-400'}`}>
                 <ShoppingBag size={10} /> Konieczności
               </button>
               <button onClick={() => setFilterCategory(filterCategory === 'all' ? 'pleasures' : 'all')} className={`shrink-0 px-3 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all ${filterCategory === 'pleasures' ? 'bg-pink-50 border-pink-200 text-pink-600' : 'border-gray-100 text-gray-400'}`}>
                 <PartyPopper size={10} /> Przyjemności
               </button>
            </div>
          </div>

        </div>

        {/* Small Chart */}
        {statsData.length > 2 && (
          <div className="h-20 w-full opacity-60 grayscale-[100%]">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={statsData}>
                 <Area type="monotone" dataKey="val" stroke="#000" fill="#e5e5e5" strokeWidth={1} />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        )}

        {/* Lists */}
        
        {/* Planned */}
        {filterType !== 'actual' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Planowane</h4>
            {planned.length === 0 && <p className="text-sm text-gray-300 pl-2 italic">Brak planów.</p>}
            {planned.map(t => {
              const isJustConfirmed = justConfirmed === t.id;
              return (
              <div 
                key={t.id} 
                onClick={() => setEditingTransaction(t)}
                className="group bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center transition-all hover:shadow-md cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                   {t.category !== 'none' && (
                     <div className={`p-2 rounded-full ${getCategoryColor(t.category)}`}>
                        {getCategoryIcon(t.category)}
                     </div>
                   )}
                   <div>
                    <div className="flex items-center gap-2">
                       <p className="font-semibold text-gray-800 text-sm">{t.title}</p>
                       {renderCategoryBadge(t.category)}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                       <p className="text-xs text-amber-500 font-bold">€{t.amount.toFixed(2)}</p>
                       {t.originalCurrency === 'PLN' && (
                         <p className="text-[10px] text-gray-400 bg-gray-100 px-1 rounded">{t.originalAmount} zł</p>
                       )}
                    </div>
                   </div>
                </div>
                <button 
                  onClick={(e) => toggleTransactionStatus(e, t.id)}
                  className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all active:scale-90 ${
                    isJustConfirmed 
                      ? 'bg-green-500 border-green-500 text-white animate-pop' 
                      : 'border-gray-200 text-gray-300 hover:bg-green-500 hover:text-white hover:border-green-500'
                  }`}
                >
                  <Check size={14} />
                </button>
              </div>
            )})}
          </div>
        )}

        {/* Recent Savings */}
        {savings.length > 0 && filterType === 'all' && filterCategory === 'all' && (
           <div className="space-y-3">
              <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest pl-2">Odłożone w tym tygodniu</h4>
              {savings.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => setEditingTransaction(t)}
                  className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-full text-emerald-600"><PiggyBank size={14} /></div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{t.title}</p>
                      <p className="text-[10px] text-emerald-600 font-medium">{formatDate(t.date)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                     <p className="font-bold text-emerald-600 text-sm">+€{t.amount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
           </div>
        )}

        {/* History / Actual */}
        {filterType !== 'planned' && (
          <div className="space-y-3 pb-8">
             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-2">Faktyczne</h4>
             {done.map(t => (
               <div 
                  key={t.id} 
                  onClick={() => setEditingTransaction(t)}
                  className="bg-gray-50 p-4 rounded-2xl flex justify-between items-center border border-gray-100 opacity-90 cursor-pointer active:scale-[0.98] transition-transform"
               >
                  <div className="flex items-center gap-3">
                     <div className={`p-2 rounded-full ${t.type === 'planned' ? 'bg-blue-100 text-blue-500' : 'bg-orange-100 text-orange-500'}`}>
                        {t.type === 'planned' ? <Check size={14}/> : <ArrowUpRight size={14}/>}
                     </div>
                     <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-700 text-sm">{t.title}</p>
                          {renderCategoryBadge(t.category)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                           <p className="text-[10px] text-gray-400 font-medium">{formatDate(t.date)}</p>
                           <p className="text-[10px] text-gray-300">|</p>
                           <p className="text-[10px] text-gray-400">{t.type === 'planned' ? 'Plan' : 'Z ręki'}</p>
                        </div>
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                     <span className="font-bold text-gray-800 text-sm">-€{t.amount.toFixed(2)}</span>
                     {t.originalCurrency === 'PLN' && <span className="text-[10px] text-gray-400">{t.originalAmount} zł</span>}
                  </div>
               </div>
             ))}
          </div>
        )}

      </main>

      {/* History Modal */}
      <HistoryModal 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        history={appState.history}
        onSetStatus={setStatusMsg}
      />

      {/* Statistics Modal */}
      <StatisticsModal
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        data={appState.currentWeek}
        history={appState.history}
        totalSavings={appState.totalSavings}
      />

      {/* Edit Modal */}
      {editingTransaction && (
        <EditTransactionModal
          transaction={editingTransaction}
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleUpdateTransaction}
          onDelete={deleteTransaction}
          nbpRate={nbpRate}
        />
      )}

      {/* Preset Modal */}
      <PresetModal
        isOpen={isPresetModalOpen}
        onClose={() => setIsPresetModalOpen(false)}
        presets={appState.presets}
        onSelect={(val) => setNewTransTitle(val)}
        onAdd={handleAddPreset}
        onDelete={handleDeletePreset}
      />

      {/* Sunday Modal */}
      {showSundayModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-scale-in text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Matki Boskiej Pieniężnej.</h2>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">Tydzień dobiegł końca. Czas na podsumowanie i nowe plany.</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="bg-gray-50 p-4 rounded-2xl">
                  <p className="text-xs text-gray-400 uppercase">Wydano</p>
                  <p className="font-bold text-gray-800 text-lg">€{done.reduce((a,b) => a+b.amount, 0).toFixed(0)}</p>
               </div>
               <div className="bg-gray-50 p-4 rounded-2xl">
                  <p className="text-xs text-gray-400 uppercase">Odłożono</p>
                  <p className="font-bold text-emerald-500 text-lg">€{savings.reduce((a,b) => a+b.amount, 0).toFixed(0)}</p>
               </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nowa Tygodniówka (€)</label>
              <input 
                type="number" 
                value={newIncome}
                onChange={(e) => setNewIncome(e.target.value)}
                placeholder="0.00"
                className="w-full text-4xl font-black p-2 bg-transparent border-none outline-none text-center placeholder-gray-200 text-gray-900"
                autoFocus
              />
            </div>

            <button 
              onClick={handleEndWeek}
              disabled={!newIncome}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
            >
              Start <ArrowRight size={20} />
            </button>
            
            <button 
              onClick={() => setShowSundayModal(false)}
              className="mt-6 text-xs text-gray-400 font-medium hover:text-gray-600"
            >
              Przypomnij później
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}