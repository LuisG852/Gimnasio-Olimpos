import React from "react";
import { useState, useEffect } from "react";
import { LayoutDashboard, Users, Settings, UserCog, LogOut, Wallet, Boxes, Dumbbell, Calculator, Sun, Moon, History, AlertTriangle, X } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import Socios from "./pages/Socios";
import Mensajes from "./pages/Mensajes";
import Usuarios from "./pages/Usuarios";
import Caja from "./pages/Caja";
import Inventario from "./pages/Inventario";
import Ejercicios from "./pages/Ejercicios";
import Contabilidad from "./pages/Contabilidad";
import Actividad from "./pages/Actividad";
import Login from "./pages/Login";
import ConfirmModal from "./components/ConfirmModal";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { backupService } from "./services/api";
import logo from "./assets/olimpos-logo.png";

function tabsPara(usuario) {
  const tabs = [
    { id: "socios", label: "Socios", icon: Users },
    { id: "caja", label: "Caja", icon: Wallet },
  ];
  if (usuario?.es_admin) {
    tabs.unshift({ id: "dashboard", label: "Dashboard", icon: LayoutDashboard });
    tabs.push({ id: "inventario", label: "Inventario", icon: Boxes });
    tabs.push({ id: "ejercicios", label: "Ejercicios", icon: Dumbbell });
    tabs.push({ id: "contabilidad", label: "Contabilidad", icon: Calculator });
    tabs.push({ id: "actividad", label: "Actividad", icon: History });
    tabs.push({ id: "mensajes", label: "Mensajes", icon: Settings });
    tabs.push({ id: "usuarios", label: "Usuarios", icon: UserCog });
  }
  return tabs;
}

function useTema() {
  const [oscuro, setOscuro] = useState(() => {
    const guardado = localStorage.getItem("tema");
    if (guardado) return guardado === "oscuro";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", oscuro);
    localStorage.setItem("tema", oscuro ? "oscuro" : "claro");
  }, [oscuro]);

  return [oscuro, setOscuro];
}

function AppInterno() {
  const { usuario, logout, cargando } = useAuth();
  const [tab, setTab] = useState("socios");
  const [oscuro, setOscuro] = useTema();
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  const [cerrandoSesion, setCerrandoSesion] = useState(false);
  const [avisoBackup, setAvisoBackup] = useState(null);
  const [avisoBackupCerrado, setAvisoBackupCerrado] = useState(false);

  useEffect(() => {
    setTab("socios");
  }, [usuario?.id]);

  useEffect(() => {
    if (!usuario?.es_admin) return;
    backupService
      .estado()
      .then(({ data }) => {
        const hayProblema =
          data.ultimo_intento_generado === false ||
          data.ultimo_exitoso_fecha === null ||
          (data.dias_desde_ultimo_exitoso ?? 0) > 1;
        if (hayProblema) setAvisoBackup(data);
      })
      .catch(() => {}); // si esto falla, mejor no molestar con un aviso sobre el aviso
  }, [usuario?.id]);

  if (cargando) return null;
  if (!usuario) return <Login />;

  const TABS = tabsPara(usuario);

  const confirmarCerrarSesion = async () => {
    if (cerrandoSesion) return;
    setCerrandoSesion(true);
    try {
      await backupService.porEvento();
    } catch (error) {
      // Si el respaldo falla, no debe impedir que la persona pueda
      // salir del sistema — solo se pierde ese respaldo puntual.
      console.error("No se pudo generar el respaldo al cerrar sesión:", error);
    }
    setCerrandoSesion(false);
    setConfirmandoSalida(false);
    logout();
  };

  const mensajeAvisoBackup = () => {
    if (!avisoBackup) return "";
    if (avisoBackup.ultimo_intento_generado === false) {
      return `El último respaldo falló: ${avisoBackup.ultimo_intento_motivo || "motivo desconocido"}. Revisá la pantalla de Usuarios.`;
    }
    if (avisoBackup.ultimo_exitoso_fecha === null) {
      return "Todavía no se ha generado ningún respaldo exitoso. Revisá la configuración en la pantalla de Usuarios.";
    }
    return `No hay un respaldo reciente: el último exitoso fue hace ${avisoBackup.dias_desde_ultimo_exitoso} día(s). Revisá la pantalla de Usuarios.`;
  };

  return (
    <div className="min-h-screen bg-bg font-body">
      <header className="border-b border-line bg-panel">
        <div className="px-6 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="Olimpo's Gym"
              className="h-20 w-20 object-contain drop-shadow-md transition-transform duration-300 hover:scale-110"
            />
            <h1 className="font-display text-3xl tracking-wide text-ink">
              OLIMPO´S <span className="text-accent">GYM</span>
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setOscuro((v) => !v)}
              title={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              className="p-2 rounded-full text-inksoft hover:opacity-70 transition-transform hover:scale-110"
            >
              {oscuro ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={() => setConfirmandoSalida(true)}
              title="Cerrar sesión"
              className="p-2 rounded-full text-inksoft hover:opacity-70 transition-transform hover:scale-110"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        <nav className="px-6 pb-3 flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold
                transition-all duration-200 ease-out hover:scale-105 active:scale-95
                ${tab === t.id ? "bg-accent text-accentink shadow-md" : "text-inksoft hover:bg-bg hover:text-ink"}`}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </nav>
      </header>

      {avisoBackup && !avisoBackupCerrado && (
        <div className="bg-warnbg border-b border-warn px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-warn">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{mensajeAvisoBackup()}</span>
          </div>
          <button
            onClick={() => setAvisoBackupCerrado(true)}
            title="Cerrar aviso"
            className="p-1 rounded-full text-warn hover:opacity-70 transition-transform hover:scale-110 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <main className="p-6 max-w-6xl mx-auto">
        {tab === "dashboard" && usuario.es_admin && <Dashboard />}
        {tab === "socios" && <Socios />}
        {tab === "caja" && <Caja />}
        {tab === "inventario" && usuario.es_admin && <Inventario />}
        {tab === "ejercicios" && usuario.es_admin && <Ejercicios />}
        {tab === "contabilidad" && usuario.es_admin && <Contabilidad />}
        {tab === "actividad" && usuario.es_admin && <Actividad />}
        {tab === "mensajes" && usuario.es_admin && <Mensajes />}
        {tab === "usuarios" && usuario.es_admin && <Usuarios />}
      </main>

      {confirmandoSalida && (
        <ConfirmModal
          titulo="¿Seguro que quiere cerrar sesión?"
          mensaje="Antes de salir se va a generar un respaldo de la base de datos."
          textoConfirmar={cerrandoSesion ? "Generando respaldo..." : "Cerrar sesión"}
          onCancelar={() => setConfirmandoSalida(false)}
          onConfirmar={confirmarCerrarSesion}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInterno />
    </AuthProvider>
  );
}
