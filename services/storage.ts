
import { AppState } from '../types';

const STORAGE_KEY = 'weekly_wallet_v2';

const INITIAL_STATE: AppState = {
  currentWeek: {
    id: new Date().toISOString(),
    startDate: new Date().toISOString(),
    endDate: null,
    income: 0,
    transactions: [],
    isClosed: false,
  },
  history: [],
  totalSavings: 0,
  lastOpened: new Date().toISOString(),
  presets: ['Zioło', 'Gastro Zakupy', 'Subskrypcja JetBrains'],
};

export const saveState = (state: AppState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
};

export const loadState = (): AppState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration for old state without totalSavings
      if (typeof parsed.totalSavings === 'undefined') {
        parsed.totalSavings = 0;
      }
      // Migration for presets
      if (!parsed.presets) {
        parsed.presets = INITIAL_STATE.presets;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
  return INITIAL_STATE;
};
