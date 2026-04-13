"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";

interface User {
  username: string;
  role: string;
  department_id?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

/* Pages that don't require authentication */
const PUBLIC_PATHS = ["/login"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("nitisetu_token");
    const savedUser = localStorage.getItem("nitisetu_user");

    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }

      // If already logged in and on login page, redirect to dashboard
      if (pathname === "/login") {
        router.replace("/dashboard");
      }
    } else if (!PUBLIC_PATHS.includes(pathname)) {
      // Not authenticated and not on a public page — redirect to login
      router.replace("/login");
    }

    setChecked(true);
  }, [pathname, router]);

  const logout = () => {
    localStorage.removeItem("nitisetu_token");
    localStorage.removeItem("nitisetu_user");
    setUser(null);
    setToken(null);
    router.replace("/login");
  };

  // Prevent flash of protected content
  if (!checked) return null;

  // Still redirecting to login
  if (!token && !PUBLIC_PATHS.includes(pathname)) return null;

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
