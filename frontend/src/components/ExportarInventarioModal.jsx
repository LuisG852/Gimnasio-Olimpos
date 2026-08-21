import React from "react";
import { useState } from "react";
import { X, Download } from "lucide-react";

export const COLUMNAS_INVENTARIO = [
  { id: "nombre", label: "Nombre", marcada: true },
  { id: "categoria", label: "Categoría", marcada: true },
  { id: "tipo", label: "Tipo (interno/venta)", marcada: true },
  { id: "cantidad", label: "Cantidad en stock", marcada: true },
  { id: "costo_unitario", label: "Costo unitario", marcada: true },
  { id: "precio_venta", label: "Precio al público", marcada: true },
  { id: "precio_recomendado", label: "Precio recomendado", marcada: false },
  { id: "depreciacion_mensual", label: "Depreciación mensual", marcada: false },
  { id: "valor_en_libros", label: "Valor en libros hoy", marcada: false },
  { id: "fecha_ingreso", label: "Fecha de ingreso", marcada: false },
];

export default function ExportarInventarioModal({ onExportar, onCerrar }) {
  const [seleccion, setSeleccion] = useState(
    Object.fromEntries(COLUMNAS_INVENTARIO.map((c) => [c.id, c.marcada]))
  );

  const alternar = (id) => setSeleccion({ ...seleccion, [id]: !seleccion[id] });

  const confirmar = () => {
    const columnas = COLUMNAS_INVENTARIO.filter((c) => seleccion[c.id]).map((c) => c.id);
    if (columnas.length === 0) return;
    onExportar(columnas);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[60] bg-ink/55">
      <div className="rounded-2xl w-full max-w-sm bg-panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-ink">Exportar a Excel</h3>
          <button onClick={onCerrar} className="text-inksoft hover:text-ink"><X size={20} /></button>
        </div>
        <p className="text-sm text-inksoft">Elegí qué columnas incluir en el archivo.</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {COLUMNAS_INVENTARIO.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={!!seleccion[c.id]} onChange={() => alternar(c.id)} />
              {c.label}
            </label>
          ))}
        </div>
        <button onClick={confirmar}
          className="w-full py-2.5 rounded-lg font-semibold bg-accent text-accentink flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-95">
          <Download size={16} /> Descargar Excel
        </button>
      </div>
    </div>
  );
}
