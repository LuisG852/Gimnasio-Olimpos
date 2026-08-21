import React from "react";
import { useState } from "react";
import { X } from "lucide-react";

const CATEGORIAS_BASE = ["Maquinaria", "Bebida", "Suplemento", "Utensilio"];

const VACIO = {
  nombre: "", categoria: "", tipo: "venta", cantidad: "", costo_unitario: "",
  vida_util_meses: "", valor_residual_pct: "", margen_pct: "", precio_venta: "", stock_minimo: "",
};

function calcularSugerido(costo, margen) {
  const c = Number(costo);
  const m = Number(margen);
  if (!c || !m || m >= 100) return "";
  return (c / (1 - m / 100)).toFixed(2);
}

export default function ProductoModal({ producto, categoriasExistentes = [], onGuardar, onCerrar }) {
  const [datos, setDatos] = useState(
    producto
      ? {
          ...VACIO,
          ...producto,
          costo_unitario: producto.costo_unitario ?? "",
          cantidad: producto.cantidad ?? "",
          vida_util_meses: producto.vida_util_meses ?? "",
          valor_residual_pct: producto.valor_residual_pct ?? "",
          margen_pct: producto.margen_pct ?? "",
          precio_venta: producto.precio_venta ?? "",
          stock_minimo: producto.stock_minimo ?? "",
        }
      : VACIO
  );
  const [categoriaNueva, setCategoriaNueva] = useState(false);

  const categorias = [...new Set([...CATEGORIAS_BASE, ...categoriasExistentes.filter(Boolean)])].sort();

  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });

  // El precio sugerido se recalcula solo y se pone directo en la casilla de
  // precio; el admin puede sobreescribirlo a mano después sin problema.
  const cambiarMargen = (e) => {
    const margen = e.target.value;
    setDatos((prev) => ({
      ...prev,
      margen_pct: margen,
      precio_venta: calcularSugerido(prev.costo_unitario, margen) || prev.precio_venta,
    }));
  };

  const cambiarCosto = (e) => {
    const costo = e.target.value;
    setDatos((prev) => ({
      ...prev,
      costo_unitario: costo,
      precio_venta: prev.tipo === "venta" && prev.margen_pct
        ? calcularSugerido(costo, prev.margen_pct) || prev.precio_venta
        : prev.precio_venta,
    }));
  };

  const enviar = (e) => {
    e.preventDefault();
    const payload = {
      ...datos,
      id: producto?.id,
      cantidad: Number(datos.cantidad),
      costo_unitario: Number(datos.costo_unitario),
      vida_util_meses: datos.tipo === "interno" && datos.vida_util_meses ? Number(datos.vida_util_meses) : null,
      valor_residual_pct: datos.tipo === "interno" && datos.valor_residual_pct ? Number(datos.valor_residual_pct) : null,
      margen_pct: datos.tipo === "venta" && datos.margen_pct ? Number(datos.margen_pct) : null,
      precio_venta: datos.tipo === "venta" && datos.precio_venta ? Number(datos.precio_venta) : null,
      stock_minimo: datos.stock_minimo !== "" ? Number(datos.stock_minimo) : null,
    };
    onGuardar(payload);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[60] bg-ink/55">
      <form onSubmit={enviar} className="rounded-2xl w-full max-w-lg bg-panel p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-ink">{producto ? "Editar producto" : "Nuevo producto"}</h3>
          <button type="button" onClick={onCerrar} className="text-inksoft hover:text-ink"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-inksoft">Nombre</label>
            <input required value={datos.nombre} onChange={cambiar("nombre")}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
          </div>

          <div className="col-span-2">
            <label className="text-xs font-semibold text-inksoft">Categoría</label>
            {categoriaNueva ? (
              <div className="flex gap-2 mt-1">
                <input autoFocus value={datos.categoria} onChange={cambiar("categoria")}
                  placeholder="Escribí la nueva categoría"
                  className="w-full px-3 py-2 rounded-lg outline-none border border-line" />
                <button type="button" onClick={() => setCategoriaNueva(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold border border-line text-inksoft">
                  Cancelar
                </button>
              </div>
            ) : (
              <select
                value={categorias.includes(datos.categoria) ? datos.categoria : ""}
                onChange={(e) => {
                  if (e.target.value === "__nueva__") {
                    setCategoriaNueva(true);
                    setDatos({ ...datos, categoria: "" });
                  } else {
                    setDatos({ ...datos, categoria: e.target.value });
                  }
                }}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel">
                <option value="" disabled>Elegí una categoría...</option>
                {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="__nueva__">+ Nueva categoría...</option>
              </select>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-inksoft">Cantidad</label>
            <input required type="number" min="0" value={datos.cantidad} onChange={cambiar("cantidad")}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
          </div>
          <div>
            <label className="text-xs font-semibold text-inksoft">Costo unitario (Q)</label>
            <input required type="number" step="0.01" value={datos.costo_unitario} onChange={cambiarCosto}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-inksoft">Avisarme cuando queden (opcional)</label>
            <input type="number" min="0" value={datos.stock_minimo} onChange={cambiar("stock_minimo")}
              placeholder="Ej: 3 — se avisa en el Dashboard cuando llegue a ese número"
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
          </div>
        </div>

        <div className="rounded-lg border border-line p-3 flex gap-4">
          <label className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
            <input type="radio" name="tipo" checked={datos.tipo === "venta"}
              onChange={() => setDatos({ ...datos, tipo: "venta" })} />
            Es para venta
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
            <input type="radio" name="tipo" checked={datos.tipo === "interno"}
              onChange={() => setDatos({ ...datos, tipo: "interno" })} />
            Solo uso interno del gym
          </label>
        </div>

        {datos.tipo === "interno" ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-inksoft">Vida útil (meses)</label>
              <input type="number" min="1" value={datos.vida_util_meses} onChange={cambiar("vida_util_meses")}
                placeholder="Ej: 60"
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
            </div>
            <div>
              <label className="text-xs font-semibold text-inksoft">Valor residual (%)</label>
              <input type="number" step="0.01" value={datos.valor_residual_pct} onChange={cambiar("valor_residual_pct")}
                placeholder="Ej: 10"
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
            </div>
            <p className="col-span-2 text-xs text-inksoft">
              Con esto se calcula la depreciación mensual y el valor en libros automáticamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-inksoft">Margen deseado (%)</label>
              <input type="number" step="0.01" value={datos.margen_pct} onChange={cambiarMargen}
                placeholder="Ej: 40"
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
            </div>
            <div>
              <label className="text-xs font-semibold text-inksoft">Precio al público (Q)</label>
              <input type="number" step="0.01" value={datos.precio_venta} onChange={cambiar("precio_venta")}
                placeholder="Se llena solo con el margen"
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
            </div>
            <p className="col-span-2 text-xs text-inksoft">
              Al poner el margen, el precio se calcula solo — podés cambiarlo a mano si querés otro.
            </p>
          </div>
        )}

        <button type="submit"
          className="w-full py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-[1.01] active:scale-95">
          Guardar
        </button>
      </form>
    </div>
  );
}
