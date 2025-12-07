import React from 'react';
import { Wallet, TrendingUp } from 'lucide-react';

interface WelcomeProps {
  onFinish: () => void;
  availableFunds: number;
  totalSavings: number;
}

export const Welcome: React.FC<WelcomeProps> = ({ onFinish, availableFunds, totalSavings }) => {
  React.useEffect(() => {
    const timer = setTimeout(onFinish, 3400);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-between bg-black text-white py-12 px-6 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 right-0 h-[50vh] bg-blue-600/20 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 right-0 h-[40vh] bg-emerald-600/10 blur-[100px] pointer-events-none"></div>

      {/* Top: Available Funds */}
      <div className="relative z-10 pt-10 text-center animate-fade-in-down">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-3">
          Dostępne Środki
        </p>
        <h1 className="text-5xl sm:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">
          €{availableFunds.toFixed(2)}
        </h1>
      </div>

      {/* Center: Logo / App Name */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
         <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-[30px] opacity-40 rounded-full animate-pulse"></div>
            <div className="relative z-10 p-5 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl">
              <Wallet size={42} className="text-white" />
            </div>
         </div>
         <h2 className="text-xl font-bold tracking-tight text-gray-200">MiloWeeklyWallet</h2>
      </div>

      {/* Bottom: Savings */}
      <div className="relative z-10 pb-8 text-center animate-slide-up">
         <div className="inline-flex flex-col items-center bg-white/5 backdrop-blur-lg px-8 py-4 rounded-3xl border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-emerald-400" />
              <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                Zgromadzone Oszczędności
              </span>
            </div>
            <p className="text-3xl font-bold text-white tracking-tight">
              €{totalSavings.toFixed(2)}
            </p>
         </div>
      </div>

      {/* Loading Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-900">
        <div className="h-full bg-blue-500 animate-[width_3.4s_ease-out_forwards] w-0" style={{ width: '100%' }}></div>
      </div>
    </div>
  );
};