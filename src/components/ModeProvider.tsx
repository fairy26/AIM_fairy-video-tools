import React, { createContext, useContext, useState } from 'react';

const ModeCtx = createContext(null);
export const useModeFunctions = () => useContext(ModeCtx);

export const ModeProvider: React.FC<React.ReactNode> = ({ children }: any) => {
  const [modeIs, setModes] = useState<Object>({
    device_strages: true,
    disk_copy: false,
  });

  const handleMode = (mode: string) => (event: React.KeyboardEvent | React.MouseEvent) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' ||
        (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }

    setModes(Object.fromEntries(Object.entries(modeIs).map(([key, _]) => [key, key === mode])));
  };

  return (
    <ModeCtx.Provider
      value={{
        modeIs,
        handleMode,
      }}
    >
      {children}
    </ModeCtx.Provider>
  );
};
