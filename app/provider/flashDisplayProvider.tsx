"use client";

import React, { createContext, useContext, useState } from "react";

enum Target{
  project,
  task
}

interface NewItem {
  target: Target|null;
  id: number;
}

interface FlashDisplayContextType {
  newItem: NewItem;
  addItem: (value: NewItem) => void;
}

const FlashDisplayContext = createContext<FlashDisplayContextType>({
  newItem: { target: null, id: 0 },
  addItem: (value: NewItem) => {},
});

export const FlashDisplayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [newItem, setNewItem] = useState({ target: null, id: 0 });

  const addItem = (item: any) => {
    setNewItem(item);
    setTimeout(() => {
      setNewItem({ target: null, id: 0 });
    }, 5000);
  };

  return (
    <FlashDisplayContext.Provider value={{ newItem, addItem }}>
      {children}
    </FlashDisplayContext.Provider>
  );
};

export const useFlashDisplayContext = () => useContext(FlashDisplayContext);
