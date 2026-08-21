import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Copy, TrendingUp, TrendingDown, DollarSign, Wallet, Wrench, FileText, FileSpreadsheet } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { contabilidadService } from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import AvisoModal from "../components/AvisoModal";
import { exportarContabilidadExcel, exportarContabilidadExcelAnual } from "../utils/contabilidadExcel";

const CATEGORIAS = ["Renta", "Servicios", "Salarios", "Mantenimiento", "Publicidad", "Impuestos", "Inventario", "Otro"];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const q = (n) => `Q${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const FORM_VACIO = { descripcion: "", categoria: "Renta", tipo: "fijo", monto: "", fecha: new Date().toISOString().slice(0, 10) };

function nombreMesCorto(mesISO) {
  const [anio, mes] = mesISO.split("-");
  return `${MESES[Number(mes) - 1].slice(0, 3)} ${anio.slice(2)}`;
}

export default function Contabilidad() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);

  const [gastos, setGastos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [historico, setHistorico] = useState([]);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORM_VACIO);
  const [eliminando, setEliminando] = useState(null);
  const [duplicando, setDuplicando] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [modoReporte, setModoReporte] = useState("mensual"); // mensual | anual

  const cargar = () => {
    contabilidadService.listar({ anio, mes }).then((res) => setGastos(res.data));
    contabilidadService.resumen(anio, mes).then((res) => setResumen(res.data));
  };

  useEffect(() => { cargar(); }, [anio, mes]);
  useEffect(() => { contabilidadService.historico(6).then((res) => setHistorico(res.data)); }, []);

  const abrirNuevo = () => {
    setEditando(null);
    setForm({ ...FORM_VACIO, fecha: `${anio}-${String(mes).padStart(2, "0")}-01` });
    setModalAbierto(true);
  };

  const abrirEditar = (g) => {
    setEditando(g.id);
    setForm({ descripcion: g.descripcion, categoria: g.categoria, tipo: g.tipo, monto: g.monto, fecha: g.fecha });
    setModalAbierto(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    const payload = { ...form, monto: Number(form.monto) };
    if (editando) {
      await contabilidadService.actualizar(editando, payload);
    } else {
      await contabilidadService.crear(payload);
    }
    setModalAbierto(false);
    cargar();
    contabilidadService.historico(6).then((res) => setHistorico(res.data));
  };

  const confirmarEliminar = async () => {
    try {
      await contabilidadService.eliminar(eliminando);
      setEliminando(null);
      cargar();
      contabilidadService.historico(6).then((res) => setHistorico(res.data));
    } catch (error) {
      setEliminando(null);
      setAviso({
        titulo: "No se pudo eliminar",
        tipo: "advertencia",
        mensaje: error?.response?.data?.detail || "No se pudo eliminar el registro.",
      });
    }
  };

  const duplicarMesAnterior = async () => {
    setDuplicando(true);
    try {
      const res = await contabilidadService.duplicarMesAnterior(anio, mes);
      setAviso({
        titulo: "Gastos fijos copiados",
        tipo: res.data.copiados > 0 ? "exito" : "info",
        mensaje: res.data.copiados > 0
          ? `Se copiaron ${res.data.copiados} gasto(s) fijo(s) del mes anterior.`
          : "No había gastos fijos nuevos para copiar (o ya estaban todos).",
      });
      cargar();
    } finally {
      setDuplicando(false);
    }
  };

  const descargarPdf = async () => {
    setDescargandoPdf(true);
    try {
      const { data } = modoReporte === "anual"
        ? await contabilidadService.reportePdfAnual(anio)
        : await contabilidadService.reportePdf(anio, mes);
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = modoReporte === "anual"
        ? `contabilidad_${anio}_anual.pdf`
        : `contabilidad_${anio}-${String(mes).padStart(2, "0")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setAviso({ titulo: "No se pudo generar", tipo: "advertencia", mensaje: "No se pudo generar el PDF." });
    } finally {
      setDescargandoPdf(false);
    }
  };

  const descargarExcel = async () => {
    if (modoReporte === "anual") {
      const { data } = await contabilidadService.resumenAnual(anio);
      exportarContabilidadExcelAnual(anio, data);
    } else {
      if (!resumen) return;
      exportarContabilidadExcel(anio, mes, resumen, gastos);
    }
  };

  const dataHistorico = useMemo(() => historico.map((h) => ({
    mes: nombreMesCorto(h.mes), Ingresos: Number(h.ingresos), Gastos: Number(h.gastos), Utilidad: Number(h.utilidad),
  })), [historico]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-ink">Contabilidad</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))}
            className="px-3 py-2 rounded-lg outline-none border border-line bg-panel text-sm">
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))}
            className="px-3 py-2 rounded-lg outline-none border border-line bg-panel text-sm">
            {[hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <div className="flex gap-1 rounded-full p-1 bg-bg border border-line">
            {[{ id: "mensual", label: "Reporte mensual" }, { id: "anual", label: "Reporte anual" }].map((o) => (
              <button key={o.id} onClick={() => setModoReporte(o.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150
                  ${modoReporte === o.id ? "bg-accent text-accentink" : "text-inksoft hover:bg-panel"}`}>
                {o.label}
              </button>
            ))}
          </div>

          <button onClick={descargarExcel} disabled={!resumen}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-line text-inksoft hover:bg-bg transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-50">
            <FileSpreadsheet size={15} /> Excel
          </button>
          <button onClick={descargarPdf} disabled={descargandoPdf}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-line text-inksoft hover:bg-bg transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-50">
            <FileText size={15} /> {descargandoPdf ? "Generando..." : "PDF"}
          </button>
        </div>
      </div>
      {modoReporte === "anual" && (
        <p className="text-xs text-inksoft -mt-3">
          El reporte anual junta los 12 meses de {anio} completo — el mes que elegiste arriba solo se usa para navegar la tabla de gastos de abajo.
        </p>
      )}

      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="rounded-xl p-4 bg-panel border border-line flex items-center gap-3">
            <div className="p-2 rounded-full bg-good/20"><TrendingUp size={18} className="text-good" /></div>
            <div>
              <p className="text-xs font-semibold text-inksoft uppercase">Ingresos del mes</p>
              <p className="text-xl font-display text-ink">{q(resumen.ingresos)}</p>
            </div>
          </div>
          <div className="rounded-xl p-4 bg-panel border border-line flex items-center gap-3">
            <div className="p-2 rounded-full bg-warn/20"><Wallet size={18} className="text-warn" /></div>
            <div>
              <p className="text-xs font-semibold text-inksoft uppercase">Gastos fijos</p>
              <p className="text-xl font-display text-ink">{q(resumen.gastos_fijos)}</p>
            </div>
          </div>
          <div className="rounded-xl p-4 bg-panel border border-line flex items-center gap-3">
            <div className="p-2 rounded-full bg-warn/20"><TrendingDown size={18} className="text-warn" /></div>
            <div>
              <p className="text-xs font-semibold text-inksoft uppercase">Gastos variables</p>
              <p className="text-xl font-display text-ink">{q(resumen.gastos_variables)}</p>
            </div>
          </div>
          <div className="rounded-xl p-4 bg-panel border border-line flex items-center gap-3">
            <div className="p-2 rounded-full bg-gold/20"><Wrench size={18} className="text-gold" /></div>
            <div>
              <p className="text-xs font-semibold text-inksoft uppercase">Depreciación de equipo</p>
              <p className="text-xl font-display text-ink">{q(resumen.depreciacion)}</p>
            </div>
          </div>
          <div className="rounded-xl p-4 bg-panel border border-line flex items-center gap-3">
            <div className={`p-2 rounded-full ${resumen.utilidad_neta >= 0 ? "bg-good/20" : "bg-bad/20"}`}>
              <DollarSign size={18} className={resumen.utilidad_neta >= 0 ? "text-good" : "text-bad"} />
            </div>
            <div>
              <p className="text-xs font-semibold text-inksoft uppercase">Utilidad neta</p>
              <p className={`text-xl font-display ${resumen.utilidad_neta >= 0 ? "text-good" : "text-bad"}`}>{q(resumen.utilidad_neta)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-5 bg-panel border border-line">
          <h3 className="font-display text-lg mb-4 text-ink">Ingresos vs. gastos (últimos 6 meses)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dataHistorico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#D7E6F0" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#4A6E93" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#4A6E93" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => q(v)} />
              <Line type="monotone" dataKey="Ingresos" stroke="#0E9A63" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Gastos" stroke="#D64545" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Utilidad" stroke="#003F7D" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-5 bg-panel border border-line">
          <h3 className="font-display text-lg mb-4 text-ink">Gastos por categoría — {MESES[mes - 1]}</h3>
          {resumen && resumen.por_categoria.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={resumen.por_categoria.map((c) => ({ categoria: c.categoria, total: Number(c.total) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D7E6F0" vertical={false} />
                <XAxis dataKey="categoria" tick={{ fontSize: 11, fill: "#4A6E93" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#4A6E93" }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => q(v)} cursor={{ fill: "#F4FBF7" }} />
                <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="#FFD600" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-inksoft">Todavía no hay gastos registrados este mes.</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-ink">Gastos de {MESES[mes - 1]} {anio}</h3>
        <div className="flex gap-2">
          <button onClick={duplicarMesAnterior} disabled={duplicando}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-line text-inksoft hover:bg-bg transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-50">
            <Copy size={15} /> {duplicando ? "Copiando..." : "Copiar fijos del mes anterior"}
          </button>
          <button onClick={abrirNuevo}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-105 active:scale-95">
            <Plus size={16} /> Nuevo gasto
          </button>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden bg-panel border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              {["Fecha", "Descripción", "Categoría", "Tipo", "Monto", ""].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 font-semibold uppercase text-xs text-inksoft">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gastos.map((g) => (
              <tr key={g.id} className="border-b border-line">
                <td className="px-4 py-2.5 text-inksoft">{g.fecha}</td>
                <td className="px-4 py-2.5 text-ink font-semibold">{g.descripcion}</td>
                <td className="px-4 py-2.5 text-inksoft">{g.categoria}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${g.tipo === "fijo" ? "bg-goodbg text-good" : "bg-warnbg text-warn"}`}>
                    {g.tipo === "fijo" ? "Fijo" : "Variable"}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-ink font-semibold">{q(g.monto)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => abrirEditar(g)} className="p-2 rounded-lg text-inksoft hover:bg-bg transition-transform hover:scale-110">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setEliminando(g.id)} className="p-2 rounded-lg text-bad hover:bg-badbg transition-transform hover:scale-110">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {gastos.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-inksoft">Todavía no hay gastos registrados este mes.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[60] bg-ink/55">
          <form onSubmit={guardar} className="rounded-2xl w-full max-w-md bg-panel p-6 space-y-4">
            <h3 className="font-display text-xl text-ink">{editando ? "Editar gasto" : "Nuevo gasto"}</h3>

            <div>
              <label className="text-xs font-semibold text-inksoft">Descripción</label>
              <input required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                placeholder="Ej: Renta del local"
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-inksoft">Categoría</label>
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel">
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-inksoft">Monto (Q)</label>
                <input required type="number" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
              </div>
              <div>
                <label className="text-xs font-semibold text-inksoft">Fecha</label>
                <input required type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
              </div>
              <div>
                <label className="text-xs font-semibold text-inksoft">Tipo</label>
                <div className="flex gap-3 mt-2">
                  <label className="flex items-center gap-1.5 text-sm text-ink cursor-pointer">
                    <input type="radio" checked={form.tipo === "fijo"} onChange={() => setForm({ ...form, tipo: "fijo" })} /> Fijo
                  </label>
                  <label className="flex items-center gap-1.5 text-sm text-ink cursor-pointer">
                    <input type="radio" checked={form.tipo === "variable"} onChange={() => setForm({ ...form, tipo: "variable" })} /> Variable
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setModalAbierto(false)}
                className="flex-1 py-2.5 rounded-lg font-semibold border border-line text-inksoft">
                Cancelar
              </button>
              <button type="submit"
                className="flex-1 py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-[1.01] active:scale-95">
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {eliminando && (
        <ConfirmModal
          titulo="¿Eliminar este gasto?"
          mensaje="Se va a borrar de forma permanente."
          textoConfirmar="Eliminar gasto"
          onCancelar={() => setEliminando(null)}
          onConfirmar={confirmarEliminar}
        />
      )}

      {aviso && (
        <AvisoModal titulo={aviso.titulo} mensaje={aviso.mensaje} tipo={aviso.tipo} onCerrar={() => setAviso(null)} />
      )}
    </div>
  );
}
