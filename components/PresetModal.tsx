
import React, { useState } from 'react';
import { X, Plus, Trash2, Tag } from 'lucide-react';

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  presets: string[];
  onSelect: (val: string) => void;
  onAdd: (val: string) => void;
  onDelete: (val: string) => void;
}

export const PresetModal: React.FC<PresetModalProps> = ({ isOpen, onClose, presets, onSelect, onAdd, onDelete }) => {
  const [newPreset, setNewPreset] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPreset.trim()) {
      onAdd(newPreset.trim());
      setNewPreset('');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      <div className="bg-white w-full max-w-sm rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden animate-slide-up relative z-10 safe-bottom">
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
               <h3 className="text-xl font-bold text-gray-900">Szybki Wybór</h3>
               <p className="text-xs text-gray-400">Wybierz lub dodaj stałe pozycje</p>
            </div>
            <button onClick={() => setIsEditing(!isEditing)} className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${isEditing ? 'bg-red-100 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
              {isEditing ? 'Gotowe' : 'Edytuj'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mb-6 max-h-60 overflow-y-auto">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (isEditing) {
                    onDelete(preset);
                  } else {
                    onSelect(preset);
                    onClose();
                  }
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                  isEditing 
                    ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' 
                    : 'bg-gray-50 text-gray-700 border border-gray-100 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100'
                }`}
              >
                {isEditing && <Trash2 size={12} />}
                {preset}
              </button>
            ))}
          </div>

          <form onSubmit={handleAdd} className="relative">
             <input 
               type="text" 
               placeholder="Dodaj nowy (np. Kawa)" 
               value={newPreset}
               onChange={(e) => setNewPreset(e.target.value)}
               className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 pl-4 pr-12 text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all placeholder:font-normal"
             />
             <button 
               type="submit"
               disabled={!newPreset.trim()}
               className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black text-white rounded-xl disabled:opacity-20 active:scale-90 transition-all"
             >
                <Plus size={16} />
             </button>
          </form>
        </div>
      </div>
    </div>
  );
};
