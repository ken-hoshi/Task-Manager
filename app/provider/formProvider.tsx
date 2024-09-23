"use client";

import React, { createContext, useContext, useState } from "react";

const FormContext = createContext({
  backForm: false,
  setBackForm: (value: boolean) => {},
});

export const FormProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [backForm, setBackForm] = useState(false);

  return (
    <FormContext.Provider value={{ backForm, setBackForm }}>
      {children}
    </FormContext.Provider>
  );
};

export const useFormContext = () => useContext(FormContext);
