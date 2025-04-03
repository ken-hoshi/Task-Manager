"use client";

import React, { createContext, useContext, useState } from "react";

interface DisplayWorkspaceIdContextType {
  displayWorkspaceId: number | null;
  setDisplayWorkspaceId: (value: number | null) => void;
}

const DisplayWorkspaceIdContext = createContext<DisplayWorkspaceIdContextType>({
  displayWorkspaceId: null,
  setDisplayWorkspaceId: (value: number | null) => {},
});

export const DisplayWorkspaceIdProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [displayWorkspaceId, setDisplayWorkspaceId] = useState<number | null>(
    null
  );

  return (
    <DisplayWorkspaceIdContext.Provider
      value={{ displayWorkspaceId, setDisplayWorkspaceId }}
    >
      {children}
    </DisplayWorkspaceIdContext.Provider>
  );
};

export const useDisplayWorkspaceIdContext = () =>
  useContext(DisplayWorkspaceIdContext);
