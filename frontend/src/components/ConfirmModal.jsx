import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmModal({ titulo, mensaje, textoConfirmar = "Eliminar", onConfirmar, onCancelar }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[60] bg-ink/55">
      <div className="rounded-2xl w-full max-w-sm bg-panel p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-badbg">
            <AlertTriangle size={20} className="text-bad" />
          </div>
          <h3 className="font-display text-xl text-ink">{titulo}</h3>
        </div>
        <p className="text-sm text-inksoft whitespace-pre-line">{mensaje}</p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancelar}
            className="flex-1 py-2.5 rounded-lg font-semibold border border-line text-inksoft transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirmar}
            className="flex-1 py-2.5 rounded-lg font-semibold bg-bad text-white transition-all duration-200 hover:scale-[1.02] active:scale-95"
          >
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
