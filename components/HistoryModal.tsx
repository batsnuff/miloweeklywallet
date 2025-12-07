import React, { useState } from 'react';
import { WeekData } from '../types';
import { X, FileDown, PieChart, ChevronLeft } from 'lucide-react';
import { generateWeeklyReport } from '../services/gemini';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: WeekData[];
  onSetStatus: (msg: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onSetStatus }) => {
  const [selectedWeek, setSelectedWeek] = useState<WeekData | null>(null);
  const [reportText, setReportText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const handleWeekClick = (week: WeekData) => {
    setSelectedWeek(week);
    setReportText('');
  };

  const generatePDF = async () => {
    if (!selectedWeek) return;
    setIsGenerating(true);
    onSetStatus('AI ANALIZUJE DANE...');
    
    const analysis = await generateWeeklyReport(selectedWeek);
    setReportText(analysis);
    
    onSetStatus('GENEROWANIE PDF...');

    setTimeout(async () => {
      const element = document.getElementById('pdf-report-container');
      if (element) {
        const canvas = await html2canvas(element, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`tydzien-${selectedWeek.startDate.slice(0, 10)}.pdf`);
        onSetStatus('SUKCES! PDF POBRANY.');
        setTimeout(() => onSetStatus(''), 3000);
      }
      setIsGenerating(false);
    }, 1000);
  };

  const getChartData = (week: WeekData) => {
    const planned = week.transactions.filter(t => t.type === 'planned').reduce((s, t) => s + t.amount, 0);
    const actual = week.transactions.filter(t => t.type === 'actual' || t.isConfirmed).reduce((s, t) => s + t.amount, 0);
    const saved = week.transactions.filter(t => t.type === 'saving').reduce((s, t) => s + t.amount, 0);
    
    return [
      { name: 'Przychód', value: week.income, color: '#3b82f6' },
      { name: 'Wydatki', value: actual, color: '#ef4444' },
      { name: 'Odłożone', value: saved, color: '#10b981' },
      { name: 'Plan', value: planned, color: '#f59e0b' },
    ];
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="bg-[#f2f2f7] w-full h-[95vh] sm:h-[80vh] sm:max-w-md rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-4 bg-white border-b border-gray-100">
          {selectedWeek ? (
            <button onClick={() => setSelectedWeek(null)} className="p-2 -ml-2 rounded-full hover:bg-gray-100">
              <ChevronLeft className="text-gray-800" />
            </button>
          ) : (
             <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Archiwum</h2>
          )}
          
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!selectedWeek ? (
            <div className="grid grid-cols-1 gap-4">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <p>Brak historii.</p>
                </div>
              ) : (
                history.slice().reverse().map((week, idx) => (
                  <button
                    key={week.id + idx}
                    onClick={() => handleWeekClick(week)}
                    className="bg-white p-5 rounded-2xl shadow-sm active:scale-95 transition-all text-left group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Tydzień {idx + 1}
                      </span>
                      <span className="text-xs font-medium text-gray-400">
                         {new Date(week.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="block text-2xl font-bold text-gray-800">€{week.income}</span>
                      </div>
                      <div className="text-right">
                         <span className="text-xs text-gray-400">Transakcje</span>
                         <span className="block font-semibold text-blue-600">{week.transactions.length}</span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div id="pdf-report-container" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <div className="text-center mb-8">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Raport Tygodniowy</p>
                  <h3 className="text-3xl font-bold text-gray-900">Podsumowanie</h3>
                  <p className="text-gray-500 mt-2 text-sm">
                    {new Date(selectedWeek.startDate).toLocaleDateString()} — {selectedWeek.endDate ? new Date(selectedWeek.endDate).toLocaleDateString() : 'Teraz'}
                  </p>
                </div>

                <div className="h-48 mb-8">
                   <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData(selectedWeek)}>
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        cursor={{fill: 'transparent'}}
                        contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} 
                      />
                      <Bar dataKey="value" radius={[6, 6, 6, 6]} barSize={40}>
                        {getChartData(selectedWeek).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-500 text-sm">Przychód</span>
                    <span className="font-bold text-gray-900">€{selectedWeek.income.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                     <span className="text-gray-500 text-sm">Suma wydatków</span>
                     <span className="font-bold text-red-500">
                       €{selectedWeek.transactions.filter(t => t.type !== 'saving').reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
                     </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                     <span className="text-gray-500 text-sm">Suma odłożona</span>
                     <span className="font-bold text-emerald-500">
                       €{selectedWeek.transactions.filter(t => t.type === 'saving').reduce((acc, t) => acc + t.amount, 0).toFixed(2)}
                     </span>
                  </div>
                </div>

                {reportText && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <PieChart size={14} /> Analiza AI
                    </h4>
                    <div className="text-sm text-blue-800 whitespace-pre-line leading-relaxed opacity-90">
                      {reportText}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {selectedWeek && (
          <div className="p-6 bg-white border-t border-gray-100 safe-bottom">
            <button
              onClick={generatePDF}
              disabled={isGenerating}
              className="w-full bg-black text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-gray-200 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? 'Generowanie...' : (
                <>
                  <FileDown size={18} /> Pobierz PDF
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};