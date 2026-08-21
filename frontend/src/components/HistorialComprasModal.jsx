import React from "react";
import { X, Clock } from "lucide-react";

const q = (n) => `Q${Number(n ?? 0).toFixed(2)}`;

export default function HistorialComprasModal({ producto, compras, onCerrar }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[60] bg-ink/55">
      <div className="rounded-2xl w-full max-w-md bg-panel p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-ink flex items-center gap-2">
            <Clock size={18} /> Historial: {producto.nombre}
          </h3>
          <button onClick={onCerrar} className="text-inksoft hover:text-ink"><X size={20} /></button>
        </div>

        {compras.length === 0 ? (
          <p className="text-sm text-inksoft">Todavía no hay compras registradas para este producto.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase text-inksoft">
                <th className="text-left py-2">Fecha</th>
                <th className="text-left py-2">Cantidad</th>
                <th className="text-left py-2">Costo unitario</th>
              </tr>
            </thead>
            <tbody>
              {compras.map((c) => (
                <tr key={c.id} className="border-b border-line">
                  <td className="py-2 text-ink">{c.fecha}</td>
                  <td className="py-2 text-ink">{c.cantidad}</td>
                  <td className="py-2 text-ink">{q(c.costo_unitario)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
