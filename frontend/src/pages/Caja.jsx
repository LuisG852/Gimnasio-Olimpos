import React from "react";
import { useEffect, useState } from "react";
import { Wallet, PlusCircle, MinusCircle, Lock, Unlock, CalendarDays, Eye, ShoppingBag, CircleAlert, Check } from "lucide-react";
import { cajaService, inventarioService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import AvisoModal from "../components/AvisoModal";
import ConfirmModal from "../components/ConfirmModal";

// OJO: antes esto usaba new Date().toISOString(), que convierte a UTC.
// En Guatemala (UTC-6) eso hace que después de las 18:00 ya "cuente" como
// el día siguiente. Ahora se arma la fecha con el año/mes/día LOCALES.
const hoyISO = () => {
  const d = new Date();
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};

export default function Caja() {
  const { usuario } = useAuth();
  const [fecha, setFecha] = useState(hoyISO());
  const [resumen, setResumen] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [montoApertura, setMontoApertura] = useState("");
  const [descGasto, setDescGasto] = useState("");
  const [montoGasto, setMontoGasto] = useState("");
  const [descIngreso, setDescIngreso] = useState("");
  const [montoIngreso, setMontoIngreso] = useState("");
  const [metodoIngreso, setMetodoIngreso] = useState("efectivo");
  const [errorIngreso, setErrorIngreso] = useState("");
  const [error, setError] = useState("");
  const [productos, setProductos] = useState([]);
  const [productoVenta, setProductoVenta] = useState("");
  const [cantidadVenta, setCantidadVenta] = useState("1");
  const [metodoVenta, setMetodoVenta] = useState("efectivo");
  const [errorVenta, setErrorVenta] = useState("");
  const [aviso, setAviso] = useState(null);
  const [confirmandoCierre, setConfirmandoCierre] = useState(false);
  const [confirmandoReapertura, setConfirmandoReapertura] = useState(false);

  const esHoy = fecha === hoyISO();

  const cargarResumen = () => cajaService.resumen(fecha).then((res) => setResumen(res.data));
  const [pendientes, setPendientes] = useState([]);
  const [pendienteSeleccionado, setPendienteSeleccionado] = useState(null);
  const cargarPendientes = () => cajaService.pendientes().then((res) => setPendientes(res.data)).catch(() => {});

  const usarPendiente = (p) => {
    setDescIngreso(p.descripcion);
    setMontoIngreso(String(p.monto));
    setPendienteSeleccionado(p.id);
  };
  const cargarHistorial = () => cajaService.historial().then((res) => setHistorial(res.data));
  const cargarProductos = () =>
    inventarioService.listar({ tipo: "venta", activo: true }).then((res) => setProductos(res.data));

  useEffect(() => { cargarResumen(); }, [fecha]);
  useEffect(() => { cargarHistorial(); cargarProductos(); cargarPendientes(); }, []);

  const abrirCaja = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await cajaService.apertura(Number(montoApertura));
      setMontoApertura("");
      cargarResumen();
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo abrir la caja.");
    }
  };

  const agregarGasto = async (e) => {
    e.preventDefault();
    if (!descGasto || !montoGasto) return;
    await cajaService.gasto(descGasto, Number(montoGasto));
    setDescGasto("");
    setMontoGasto("");
    cargarResumen();
  };

  const agregarIngreso = async (e) => {
    e.preventDefault();
    setErrorIngreso("");
    if (!descIngreso || !montoIngreso) return;
    try {
      await cajaService.ingreso(descIngreso, Number(montoIngreso), metodoIngreso);
      if (pendienteSeleccionado) {
        await cajaService.resolverPendiente(pendienteSeleccionado);
        setPendienteSeleccionado(null);
        cargarPendientes();
      }
      setDescIngreso("");
      setMontoIngreso("");
      cargarResumen();
    } catch (err) {
      setErrorIngreso(err?.response?.data?.detail || "No se pudo registrar el ingreso.");
    }
  };

  const venderProducto = async (e) => {
    e.preventDefault();
    setErrorVenta("");
    if (!productoVenta || !cantidadVenta) return;
    try {
      await inventarioService.vender(productoVenta, Number(cantidadVenta), metodoVenta);
      setProductoVenta("");
      setCantidadVenta("1");
      cargarResumen();
      cargarProductos();
    } catch (err) {
      setErrorVenta(err?.response?.data?.detail || "No se pudo registrar la venta.");
    }
  };

  const cerrarCaja = () => {
    if (!resumen) return;
    setConfirmandoCierre(true);
  };

  const ejecutarCierre = async () => {
    setConfirmandoCierre(false);
    try {
      await cajaService.cerrar();
      cargarResumen();
      cargarHistorial();
    } catch (err) {
      setAviso({ titulo: "No se pudo cerrar la caja", tipo: "advertencia", mensaje: err?.response?.data?.detail || "Ocurrió un error." });
    }
  };

  const reabrirCaja = () => setConfirmandoReapertura(true);

  const ejecutarReapertura = async () => {
    setConfirmandoReapertura(false);
    try {
      await cajaService.reabrir();
      cargarResumen();
      cargarHistorial();
    } catch (err) {
      setAviso({ titulo: "No se pudo reabrir la caja", tipo: "advertencia", mensaje: err?.response?.data?.detail || "Ocurrió un error." });
    }
  };

  if (!resumen) return <p className="text-inksoft">Cargando...</p>;

  return (
    <div className={pendientes.length > 0 ? "flex items-start gap-6" : ""}>
      {pendientes.length > 0 && (
        <aside className="w-72 shrink-0 sticky top-4 rounded-xl p-4 bg-warnbg border border-warn space-y-3">
          <p className="font-semibold text-warn flex items-center gap-2">
            <CircleAlert size={18} /> {pendientes.length} pendiente{pendientes.length === 1 ? "" : "s"} de sumar
          </p>
          <p className="text-xs text-inksoft">
            No se pudieron registrar porque la caja de ese día ya estaba cerrada. Dale
            "Usar este" para llenar el formulario de "Registrar ingreso" — se va a quitar
            de esta lista solo cuando lo completes de verdad.
          </p>
          <div className="space-y-1.5">
            {pendientes.map((p) => (
              <div key={p.id} className={`rounded-lg px-3 py-2 border text-sm space-y-1.5
                ${pendienteSeleccionado === p.id ? "bg-panel border-accent" : "bg-panel border-line"}`}>
                <div>
                  <p className="text-ink font-semibold leading-tight">{p.descripcion}</p>
                  <p className="text-inksoft text-xs">Q{Number(p.monto).toFixed(2)} — {p.fecha}</p>
                </div>
                <button onClick={() => usarPendiente(p)}
                  className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-good text-white transition-transform hover:scale-105 active:scale-95">
                  <Check size={12} /> {pendienteSeleccionado === p.id ? "Seleccionado" : "Usar este"}
                </button>
              </div>
            ))}
          </div>
        </aside>
      )}

      <div className="max-w-3xl flex-1 space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-inksoft" />
          <input
            type="date"
            value={fecha}
            max={hoyISO()}
            onChange={(e) => setFecha(e.target.value)}
            className="px-3 py-2 rounded-lg outline-none border border-line bg-panel text-sm"
          />
          {!esHoy && (
            <button onClick={() => setFecha(hoyISO())}
              className="text-xs font-semibold text-ink underline">
              Volver a hoy
            </button>
          )}
        </div>
        <button onClick={() => setMostrarHistorial((v) => !v)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-line text-inksoft hover:bg-panel transition-all duration-150 hover:scale-105 active:scale-95">
          <Eye size={16} /> {mostrarHistorial ? "Ocultar" : "Ver"} cierres anteriores
        </button>
      </div>

      {mostrarHistorial && (
        <div className="rounded-xl overflow-hidden border border-line">
          {historial.length === 0 ? (
            <p className="p-4 text-sm text-inksoft">Todavía no hay ningún cierre registrado.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-panel">
                  {["Fecha", "Apertura", "Ingresos efectivo", "Gastos", "Retirado"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-semibold uppercase text-xs text-inksoft">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.fecha} onClick={() => { setFecha(h.fecha); setMostrarHistorial(false); }}
                    className="border-b border-line bg-panel hover:bg-bg cursor-pointer transition-colors">
                    <td className="px-4 py-2.5 text-ink font-semibold">{h.fecha}</td>
                    <td className="px-4 py-2.5 text-ink">Q{Number(h.apertura).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-good">Q{Number(h.ingresos_efectivo).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-bad">Q{Number(h.gastos).toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-ink font-semibold">Q{Number(h.a_retirar).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!esHoy && (
        <div className="rounded-xl p-4 bg-panel border border-line flex items-center gap-2 text-inksoft text-sm">
          <Eye size={16} /> Viendo la caja del <span className="font-semibold text-ink">{fecha}</span> (solo lectura)
        </div>
      )}

      {esHoy && !resumen.tiene_apertura ? (
        <div className="max-w-md">
          <form onSubmit={abrirCaja} className="rounded-xl p-5 bg-panel border border-line space-y-4">
            <h3 className="font-display text-xl text-ink flex items-center gap-2">
              <Wallet size={20} className="text-accent" /> Abrir caja de hoy
            </h3>
            <p className="text-sm text-inksoft">
              Ingresá con cuánto efectivo arranca la caja hoy (el fondo fijo).
            </p>
            <div>
              <label className="text-xs font-semibold text-inksoft">Monto inicial (Q)</label>
              <input required type="number" step="0.01" value={montoApertura}
                onChange={(e) => setMontoApertura(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
            </div>
            {error && <div className="rounded-lg p-2.5 text-sm bg-badbg text-bad">{error}</div>}
            <button type="submit"
              className="w-full py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-[1.01] active:scale-95">
              Abrir caja
            </button>
          </form>
        </div>
      ) : (
        <>
          {esHoy && resumen.tiene_cierre && (
            <div className="rounded-xl p-4 bg-goodbg border border-good space-y-2">
              <div className="flex items-center gap-2 text-good font-semibold">
                <Lock size={18} /> Caja cerrada hoy — ya se retiraron Q{Number(resumen.a_retirar).toFixed(2)}, quedó el fondo fijo de Q{Number(resumen.apertura).toFixed(2)}
              </div>
              {usuario?.es_admin && (
                <button onClick={reabrirCaja}
                  className="flex items-center gap-2 text-sm font-semibold text-good underline transition-transform hover:scale-105">
                  <Unlock size={15} /> ¿Se cerró por error? Reabrir caja
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="rounded-xl p-4 bg-panel border border-line">
              <p className="text-xs font-semibold text-inksoft uppercase">Apertura</p>
              <p className="text-xl font-display text-ink">Q{Number(resumen.apertura).toFixed(2)}</p>
            </div>
            <div className="rounded-xl p-4 bg-goodbg border border-line">
              <p className="text-xs font-semibold text-inksoft uppercase">Ingresos efectivo</p>
              <p className="text-xl font-display text-good">Q{Number(resumen.ingresos_efectivo).toFixed(2)}</p>
            </div>
            <div className="rounded-xl p-4 bg-panel border border-line">
              <p className="text-xs font-semibold text-inksoft uppercase">Ingresos transferencia</p>
              <p className="text-xl font-display text-ink">Q{Number(resumen.ingresos_transferencia).toFixed(2)}</p>
              <p className="text-xs text-inksoft mt-1">No es efectivo físico</p>
            </div>
            <div className="rounded-xl p-4 bg-badbg border border-line">
              <p className="text-xs font-semibold text-inksoft uppercase">Gastos</p>
              <p className="text-xl font-display text-bad">Q{Number(resumen.gastos).toFixed(2)}</p>
            </div>
            <div className="rounded-xl p-4 bg-panel border border-line">
              <p className="text-xs font-semibold text-inksoft uppercase">Efectivo esperado</p>
              <p className="text-xl font-display text-ink">Q{Number(resumen.efectivo_esperado).toFixed(2)}</p>
            </div>
            <div className="rounded-xl p-4 bg-accent/10 border-2 border-accent">
              <p className="text-xs font-semibold text-inksoft uppercase">{esHoy && !resumen.tiene_cierre ? "A retirar" : "Se retiró"}</p>
              <p className="text-xl font-display text-ink">Q{Number(resumen.a_retirar).toFixed(2)}</p>
            </div>
          </div>

          {esHoy && !resumen.tiene_cierre && (
            <>
              <form onSubmit={venderProducto} className="rounded-xl p-5 bg-panel border border-line space-y-4">
                <h3 className="font-display text-lg text-ink flex items-center gap-2">
                  <ShoppingBag size={18} className="text-good" /> Vender producto
                </h3>
                {productos.length === 0 ? (
                  <p className="text-sm text-inksoft">
                    No hay productos marcados como "para venta" en el inventario todavía.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-3">
                    <select required value={productoVenta} onChange={(e) => setProductoVenta(e.target.value)}
                      className="col-span-2 px-3 py-2 rounded-lg outline-none border border-line bg-panel text-sm">
                      <option value="">Elegí un producto...</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.cantidad <= 0}>
                          {p.nombre} — Q{Number(p.precio_venta || 0).toFixed(2)} ({p.cantidad} en stock)
                        </option>
                      ))}
                    </select>
                    <input required type="number" min="1" placeholder="Cantidad" value={cantidadVenta}
                      onChange={(e) => setCantidadVenta(e.target.value)}
                      className="px-3 py-2 rounded-lg outline-none border border-line" />
                    <select value={metodoVenta} onChange={(e) => setMetodoVenta(e.target.value)}
                      className="px-3 py-2 rounded-lg outline-none border border-line bg-panel text-sm">
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </div>
                )}
                {errorVenta && <div className="rounded-lg p-2.5 text-sm bg-badbg text-bad">{errorVenta}</div>}
                {productos.length > 0 && (
                  <button type="submit"
                    className="px-5 py-2.5 rounded-lg font-semibold bg-good text-white transition-all duration-200 hover:scale-105 active:scale-95">
                    Registrar venta
                  </button>
                )}
              </form>

              <form onSubmit={agregarIngreso} className="rounded-xl p-5 bg-panel border border-line space-y-4">
                <h3 className="font-display text-lg text-ink flex items-center gap-2">
                  <PlusCircle size={18} className="text-good" /> Registrar ingreso
                </h3>
                <p className="text-xs text-inksoft">
                  Para agregar a mano un pago que no se guardó solo (por ejemplo, si la caja
                  ya estaba cerrada cuando se cobró).
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <input required placeholder="Descripción (ej: Renovación - Juan Pérez)" value={descIngreso}
                    onChange={(e) => setDescIngreso(e.target.value)}
                    className="col-span-2 px-3 py-2 rounded-lg outline-none border border-line" />
                  <input required type="number" step="0.01" placeholder="Monto (Q)" value={montoIngreso}
                    onChange={(e) => setMontoIngreso(e.target.value)}
                    className="px-3 py-2 rounded-lg outline-none border border-line" />
                  <select value={metodoIngreso} onChange={(e) => setMetodoIngreso(e.target.value)}
                    className="col-span-3 px-3 py-2 rounded-lg outline-none border border-line bg-panel text-sm">
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
                {errorIngreso && <div className="rounded-lg p-2.5 text-sm bg-badbg text-bad">{errorIngreso}</div>}
                <button type="submit"
                  className="px-5 py-2.5 rounded-lg font-semibold bg-good text-white transition-all duration-200 hover:scale-105 active:scale-95">
                  Agregar ingreso
                </button>
              </form>

              <form onSubmit={agregarGasto} className="rounded-xl p-5 bg-panel border border-line space-y-4">
                <h3 className="font-display text-lg text-ink flex items-center gap-2">
                  <MinusCircle size={18} className="text-bad" /> Registrar gasto
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <input required placeholder="Descripción (ej: escoba y recogedor)" value={descGasto}
                    onChange={(e) => setDescGasto(e.target.value)}
                    className="col-span-2 px-3 py-2 rounded-lg outline-none border border-line" />
                  <input required type="number" step="0.01" placeholder="Monto (Q)" value={montoGasto}
                    onChange={(e) => setMontoGasto(e.target.value)}
                    className="px-3 py-2 rounded-lg outline-none border border-line" />
                </div>
                <button type="submit"
                  className="px-5 py-2.5 rounded-lg font-semibold bg-bad text-white transition-all duration-200 hover:scale-105 active:scale-95">
                  Agregar gasto
                </button>
              </form>

              <button onClick={cerrarCaja}
                className="w-full py-3 rounded-xl font-semibold bg-ink text-panel flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-95">
                <Lock size={18} /> Cerrar caja del día
              </button>
            </>
          )}

          <div>
            <h3 className="font-display text-lg text-ink mb-3 flex items-center gap-2">
              <PlusCircle size={18} className="text-good" /> Movimientos de {esHoy ? "hoy" : "ese día"}
            </h3>
            {resumen.movimientos.length === 0 ? (
              <p className="text-sm text-inksoft">No hay movimientos ese día.</p>
            ) : (
              <div className="rounded-xl overflow-hidden bg-panel border border-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line">
                      {["Tipo", "Descripción", "Método", "Monto"].map((h) => (
                        <th key={h} className="text-left px-4 py-2.5 font-semibold uppercase text-xs text-inksoft">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.movimientos.map((m) => (
                      <tr key={m.id} className="border-b border-line">
                        <td className={`px-4 py-2.5 font-semibold ${
                          m.tipo === "ingreso" ? "text-good" : m.tipo === "gasto" ? "text-bad" : "text-gold"
                        }`}>
                          {m.tipo === "ingreso" ? "Ingreso" : m.tipo === "gasto" ? "Gasto" : "Cierre"}
                        </td>
                        <td className="px-4 py-2.5 text-ink">{m.descripcion}</td>
                        <td className="px-4 py-2.5 text-inksoft">{m.metodo || "—"}</td>
                        <td className="px-4 py-2.5 text-ink">Q{Number(m.monto).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      </div>

      {confirmandoCierre && resumen && (
        <ConfirmModal
          titulo="¿Cerrar la caja de hoy?"
          mensaje={`Retirar: Q${Number(resumen.a_retirar).toFixed(2)}\nQueda el fondo fijo: Q${Number(resumen.apertura).toFixed(2)}\n\nDespués de cerrar no vas a poder cargar más gastos hoy.`}
          textoConfirmar="Cerrar caja"
          onCancelar={() => setConfirmandoCierre(false)}
          onConfirmar={ejecutarCierre}
        />
      )}

      {confirmandoReapertura && (
        <ConfirmModal
          titulo="¿Reabrir la caja de hoy?"
          mensaje="Esto deshace el cierre (útil si se cerró por error) y vas a poder volver a cargar gastos."
          textoConfirmar="Reabrir caja"
          onCancelar={() => setConfirmandoReapertura(false)}
          onConfirmar={ejecutarReapertura}
        />
      )}

      {aviso && (
        <AvisoModal
          titulo={aviso.titulo}
          mensaje={aviso.mensaje}
          tipo={aviso.tipo}
          onCerrar={() => setAviso(null)}
        />
      )}
    </div>
  );
}
