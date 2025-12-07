import React, { useState } from 'react';
import { Transaction, Currency, Category, TransactionType } from '../types';
import { X, Trash2, Save, AlertTriangle, Briefcase, ShoppingBag, PartyPopper } from 'lucide-react';

interface EditTransactionModalProps {
  transaction: Transaction;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Transaction) => void;
  onDelete: (id: string, type: TransactionType, amount: number) => void;
  nbpRate: number;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ 
  transaction, isOpen, onClose, onSave, onDelete, nbpRate 
}) => {
  const [title, setTitle] = useState(transaction.title);
  const [amount, setAmount] = useState(
    transaction.originalCurrency === 'PLN' 
      ? transaction.originalAmount?.toString() || '' 
      : transaction.amount.toString()
  );
  const [currency, setCurrency] = useState<Currency>(transaction.originalCurrency);
  const [category, setCategory] = useState<Category>(transaction.category);
  
  // Confirmation states
  const [confirmingSave, setConfirmingSave] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingSave) {
      setConfirmingSave(true);
      return;
    }
    
    // Process Save
    const numAmount = parseFloat(amount.replace(',', '.'));
    let finalAmount = numAmount;
    if (currency === 'PLN') {
      finalAmount = numAmount / nbpRate;
    }

    onSave({
      ...transaction,
      title,
      amount: finalAmount,
      originalAmount: currency === 'PLN' ? numAmount : undefined,
      originalCurrency: currency,
      category
    });
    onClose();
  };

  const handleDelete = () => {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    onDelete(transaction.id, transaction.type, transaction.amount);
    onClose();
  };

  const categories: { id: Category; label: string; icon: any; color: string }[] = [
    { id: 'obligations', label: 'Zobowiązania', icon: Briefcase, color: 'bg-blue-100 text-blue-600' },
    { id: 'necessities', label: 'Konieczności', icon: ShoppingBag, color: 'bg-orange-100 text-orange-600' },
    { id: 'pleasures', label: 'Przyjemności', icon: PartyPopper, color: 'bg-pink-100 text-pink-600' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">Edytuj transakcję</h3>
          <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm">
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nazwa</label>
            <input
              type="text"
              list="history-titles"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl text-gray-800 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Amount & Currency */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Kwota</label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 p-3 bg-gray-50 rounded-xl text-gray-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <div className="flex bg-gray-100 rounded-xl p-1 shrink-0">
                 <button type="button" onClick={() => setCurrency('EUR')} className={`px-3 rounded-lg text-xs font-bold transition-all ${currency === 'EUR' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}>€</button>
                 <button type="button" onClick={() => setCurrency('PLN')} className={`px-3 rounded-lg text-xs font-bold transition-all ${currency === 'PLN' ? 'bg-white shadow-sm text-red-500' : 'text-gray-400'}`}>zł</button>
              </div>
            </div>
          </div>

          {/* Category (Only if not saving) */}
          {transaction.type !== 'saving' && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Kategoria</label>
              <div className="flex gap-2">
                {categories.map(cat => {
                   const Icon = cat.icon;
                   const isSelected = category === cat.id;
                   return (
                     <button
                       key={cat.id}
                       type="button"
                       onClick={() => setCategory(cat.id)}
                       className={`flex-1 flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all ${
                         isSelected 
                          ? 'border-black bg-gray-50 opacity-100' 
                          : 'border-transparent bg-gray-50 opacity-50 hover:opacity-100'
                       }`}
                     >
                        <div className={`p-1.5 rounded-full mb-1 ${cat.color}`}>
                          <Icon size={16} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-600">{cat.label}</span>
                     </button>
                   );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 flex flex-col gap-3">
            {confirmingSave ? (
               <div className="flex items-center gap-2 animate-fade-in">
                  <button 
                    type="button" 
                    onClick={() => setConfirmingSave(false)} 
                    className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl"
                  >
                    Anuluj
                  </button>
                  <button 
                    type="submit" 
                    className="flex-[2] py-3 bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2"
                  >
                    <AlertTriangle size={16} className="text-yellow-400" />
                    Potwierdź zmiany
                  </button>
               </div>
            ) : (
              <button type="submit" className="w-full py-3 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800">
                <Save size={18} /> Zapisz
              </button>
            )}

            {confirmingDelete ? (
              <div className="flex items-center gap-2 animate-fade-in">
                 <button 
                    type="button" 
                    onClick={() => setConfirmingDelete(false)} 
                    className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl"
                  >
                    Anuluj
                  </button>
                  <button 
                    type="button" 
                    onClick={handleDelete}
                    className="flex-[2] py-3 bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} />
                    Potwierdź usunięcie
                  </button>
              </div>
            ) : (
              <button 
                type="button" 
                onClick={handleDelete}
                className="w-full py-3 bg-white border border-gray-200 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-50"
              >
                <Trash2 size={18} /> Usuń
              </button>
            )}
          </div>

        </form>
      </div>
    </div>
  );
};