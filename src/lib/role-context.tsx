import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "teacher" | "student";

interface RoleContextValue {
  role: Role;
  setRole: (r: Role) => void;
  name: string;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("teacher");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("classdeck-role") : null;
    if (stored === "teacher" || stored === "student") setRoleState(stored);
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    if (typeof window !== "undefined") window.localStorage.setItem("classdeck-role", r);
  };

  const name = role === "teacher" ? "M. Laurent" : "Lucas";

  return <RoleContext.Provider value={{ role, setRole, name }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
