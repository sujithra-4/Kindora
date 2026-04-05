import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setToken } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("lf_user") || "null"));
  const [token, setAuthToken] = useState(() => localStorage.getItem("lf_token"));

  useEffect(() => setToken(token), [token]);

  const login = async payload => {
    const { data } = await api.post("/auth/login", payload);
    setUser(data.user);
    setAuthToken(data.token);
    localStorage.setItem("lf_user", JSON.stringify(data.user));
    localStorage.setItem("lf_token", data.token);
  };

  const register = async payload => {
    const { data } = await api.post("/auth/register", payload);
    setUser(data.user);
    setAuthToken(data.token);
    localStorage.setItem("lf_user", JSON.stringify(data.user));
    localStorage.setItem("lf_token", data.token);
  };

  const logout = () => {
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem("lf_user");
    localStorage.removeItem("lf_token");
  };

  const value = useMemo(() => ({ user, token, login, register, logout }), [user, token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
