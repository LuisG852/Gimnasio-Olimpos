import React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const guardado = localStorage.getItem("gimnasio_usuario");
    const token = localStorage.getItem("gimnasio_token");
    if (guardado && token) {
      setUsuario(JSON.parse(guardado));
    }
    setCargando(false);
  }, []);

  const login = async (usuarioInput, password) => {
    const res = await api.post("/auth/login", { usuario: usuarioInput, password });
    localStorage.setItem("gimnasio_token", res.data.access_token);
    localStorage.setItem("gimnasio_usuario", JSON.stringify(res.data.usuario));
    setUsuario(res.data.usuario);
  };

  const logout = () => {
    localStorage.removeItem("gimnasio_token");
    localStorage.removeItem("gimnasio_usuario");
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, login, logout, cargando }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
