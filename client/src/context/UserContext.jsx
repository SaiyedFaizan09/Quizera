import { createContext, useContext, useState, useCallback } from "react";

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [userName, setUserNameState] = useState(
    () => localStorage.getItem("userName") || "User"
  );

  const setUserName = useCallback((name) => {
    setUserNameState(name);
    if (name) localStorage.setItem("userName", name);
  }, []);

  return (
    <UserContext.Provider value={{ userName, setUserName }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
