import React from "react";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/olimpos-logo.png";

export default function ConfiguracionInicial() {
  const { configurarInicial } = useAuth();
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    try {
      await configurarInicial(nombre, usuario, password);
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo crear la cuenta de administrador.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg font-body p-4">
      <div className="w-full max-w-sm rounded-2xl p-8 bg-panel border border-line shadow-lg">
        <div className="flex justify-center mb-4">
          <img src={logo} alt="Olimpo's Gym" className="h-24 w-24 object-contain drop-shadow-md" />
        </div>
        <h1 className="font-display text-2xl text-center text-ink mb-1 tracking-wide">
          OLIMPO´S <span className="text-accent">GYM</span>
        </h1>
        <p className="text-center text-sm text-inksoft mb-6">
          Primera vez que se abre el sistema — creá tu cuenta de administrador para empezar.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-inksoft">Tu nombre</label>
            <input
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-inksoft">Usuario para iniciar sesión</label>
            <input
              required
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-inksoft">Contraseña</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-inksoft">Confirmar contraseña</label>
            <input
              required
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line"
            />
          </div>

          {error && (
            <div className="rounded-lg p-2.5 text-sm bg-badbg text-bad">{error}</div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-[1.01] active:scale-95 disabled:opacity-60"
          >
            {cargando ? "Creando cuenta..." : "Crear cuenta de administrador"}
          </button>
        </form>
      </div>
    </div>
  );
}
