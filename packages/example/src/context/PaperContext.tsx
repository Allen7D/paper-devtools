import { createContext } from 'react';

interface PaperContextType {
  selectedItem: any;
  setSelectedItem: (item: any) => void;
}

export const PaperContext = createContext<PaperContextType>({
  selectedItem: null,
  setSelectedItem: () => {}
}); 