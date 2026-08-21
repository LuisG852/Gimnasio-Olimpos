import React from "react";
import { useState } from "react";
import { X } from "lucide-react";

export default function CompraExistenteModal({ productos, onGuardar, onCerrar }) {
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [costoUnitario, setCostoUnitario] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));

  const enviar = (e) => {
    e.preventDefault();
    if (!productoId) return;
    onGuardar(productoId, {
      cantidad: Number(cantidad),
      costo_unitario: Number(costoUnitario),
      fecha,
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[60] bg-ink/55">
      <form onSubmit={enviar} className="rounded-2xl w-full max-w-md bg-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-ink">Comprar producto existente</h3>
          <button type="button" onClick={onCerrar} className="text-inksoft hover:text-ink"><X size={20} /></button>
        </div>

        <div>
          <label className="text-xs font-semibold text-inksoft">Producto</label>
          <select required value={productoId} onChange={(e) => setProductoId(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel">
            <option value="">Elegí un producto...</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.cantidad} en stock actual)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-inksoft">Cantidad comprada</label>
            <input required type="number" min="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
          </div>
          <div>
            <label className="text-xs font-semibold text-inksoft">Costo unitario (Q)</label>
            <input required type="number" step="0.01" value={costoUnitario} onChange={(e) => setCostoUnitario(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-inksoft">Fecha de la compra</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
          </div>
        </div>

        <p className="text-xs text-inksoft">
          Esto suma la cantidad al stock actual y guarda este precio en el historial del producto.
          El costo unitario del producto queda actualizado con este último precio.
        </p>

        <button type="submit"
          className="w-full py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-[1.01] active:scale-95">
          Registrar compra
        </button>
      </form>
    </div>
  );
}
