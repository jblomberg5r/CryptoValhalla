import { create } from 'zustand';

export type Currency = 'USD' | 'EUR' | 'SEK';

interface CurrencyState {
  selectedCurrency: Currency;
  setSelectedCurrency: (currency: Currency) => void;
}

export const useCurrencyStore = create<CurrencyState>((set) => ({
  selectedCurrency: 'USD', // Default currency
  setSelectedCurrency: (currency) => set({ selectedCurrency: currency }),
}));

// Hook for easy access to the selected currency and setter
export const useCurrentCurrency = () => {
  const currency = useCurrencyStore((state) => state.selectedCurrency);
  const setCurrency = useCurrencyStore((state) => state.setSelectedCurrency);
  return { currency, setCurrency };
};
