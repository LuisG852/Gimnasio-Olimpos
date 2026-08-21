import React from "react";
import { Info, CheckCircle2, AlertTriangle } from "lucide-react";

const ESTILOS = {
  info: { icono: Info, fondo: "bg-accent/20", color: "text-gold" },
  exito: { icono: CheckCircle2, fondo: "bg-goodbg", color: "text-good" },
  advertencia: { icono: AlertTriangle, fondo: "bg-warnbg", color: "text-warn" },
};

export default function AvisoModal({ titulo, mensaje, tipo = "advertencia", onCerrar }) {
  const estilo = ESTILOS[tipo] || ESTILOS.advertencia;
  const Icono = estilo.icono;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[80] bg-ink/55">
      <div className="rounded-2xl w-full max-w-sm bg-panel p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${estilo.fondo}`}>
            <Icono size={20} className={estilo.color} />
          </div>
          <h3 className="font-display text-xl text-ink">{titulo}</h3>
        </div>
        <p className="text-sm text-inksoft whitespace-pre-line">{mensaje}</p>
        <button
          onClick={onCerrar}
          className="w-full py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-[1.01] active:scale-95"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
