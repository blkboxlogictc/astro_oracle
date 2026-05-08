import { createContext, useContext, useState, type ReactNode } from 'react';

export type Mode = 'science' | 'mystic';

interface AppCtxValue {
  mode: Mode;
  setMode: (m: Mode) => void;
}

const AppContext = createContext<AppCtxValue>({
  mode: 'science',
  setMode: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('science');
  return (
    <AppContext.Provider value={{ mode, setMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppMode() {
  return useContext(AppContext);
}
