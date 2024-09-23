"use client";

import React, { createContext, useContext, useState } from "react";

const PageUpdateContext = createContext({
  pageUpdated: false,
  setPageUpdated: (value: boolean) => {},
});

export const PageUpdateProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [pageUpdated, setPageUpdated] = useState(false);

  return (
    <PageUpdateContext.Provider
      value={{ pageUpdated, setPageUpdated }}
    >
      {children}
    </PageUpdateContext.Provider>
  );
};

export const usePageUpdateContext = () => useContext(PageUpdateContext);

