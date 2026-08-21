import React from "react";
import { AlertTriangle } from "lucide-react";

export default function RestaurarBackupModal({ archivo, password, onPasswordChange, onCancelar, onConfirmar, cargando }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[60] bg-ink/55">
      <div className="rounded-2xl w-full max-w-sm bg-panel p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-badbg">
            <AlertTriangle size={20} className="text-bad" />
          </div>
          <h3 className="font-display text-xl text-ink">¿Restaurar este respaldo?</h3>
        </div>

        <p className="text-sm text-inksoft">
          Vas a reemplazar <span className="font-semibold text-ink">todos los datos actuales</span> del
          sistema con el contenido de:
        </p>
        <p className="text-sm font-semibold text-ink break-all bg-bg rounded-lg px-3 py-2 border border-line">
          {archivo?.name}
        </p>
        <p className="text-xs text-inksoft">
          Antes de aplicarlo se genera automáticamente un respaldo del estado actual, y si algo falla en el
          camino no se modifica nada. Aun así, confirmá tu contraseña de administrador para continuar.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); onConfirmar(); }} className="space-y-1">
          <label className="text-xs font-semibold text-inksoft">Tu contraseña</label>
          <input
            type="password"
            required
            autoFocus
            disabled={cargando}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg outline-none border border-line disabled:opacity-60"
          />

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancelar}
              disabled={cargando}
              className="flex-1 py-2.5 rounded-lg font-semibold border border-line text-inksoft transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="flex-1 py-2.5 rounded-lg font-semibold bg-bad text-white transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-60"
            >
              {cargando ? "Restaurando..." : "Restaurar y reemplazar todo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
