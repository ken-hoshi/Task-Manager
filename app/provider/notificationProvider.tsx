"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";

enum Color {
  green,
  red,
}

interface NotificationValue {
  message: string | null;
  color: Color | null;
}

interface NotificationContextType {
  notificationValue: NotificationValue;
  setNotificationValue: (value: NotificationValue) => void;
  show: boolean;
  setShow: (value: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notificationValue: { message: null, color: null },
  setNotificationValue: () => {},
  show: false,
  setShow: (value: boolean) => {},
});

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [notificationValue, setNotificationValue] = useState<NotificationValue>(
    {
      message: null,
      color: null,
    }
  );
  const [show, setShow] = useState(false);
  return (
    <NotificationContext.Provider
      value={{
        notificationValue,
        setNotificationValue,
        show,
        setShow,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationContext = () => useContext(NotificationContext);
