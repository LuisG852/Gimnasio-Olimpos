import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Download, Boxes, Wrench, ShoppingBag, Clock, PackagePlus, PackageSearch } from "lucide-react";
import { inventarioService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { puede } from "../utils/permisos";
import ProductoModal from "../components/ProductoModal";
import CompraExistenteModal from "../components/CompraExistenteModal";
import HistorialComprasModal from "../components/HistorialComprasModal";
import ExportarInventarioModal from "../components/ExportarInventarioModal";
import ConfirmModal from "../components/ConfirmModal";
import AvisoModal from "../components/AvisoModal";
import { exportarInventarioExcel } from "../utils/exportarInventario";

const FILTROS_TIPO = [
  { id: "todos", label: "Todos" },
  { id: "venta", label: "Para venta" },
  { id: "interno", label: "Uso interno" },
];

const q = (n) => `Q${Number(n ?? 0).toFixed(2)}`;

export default function Inventario() {
  const { usuario } = useAuth();
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const [menuCompra, setMenuCompra] = useState(false);
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [modalExistenteAbierto, setModalExistenteAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [verHistorial, setVerHistorial] = useState(null); // producto seleccionado
  const [compras, setCompras] = useState([]);

  const cargar = () => inventarioService.listar({ activo: true }).then((res) => setProductos(res.data));
  useEffect(() => { cargar(); }, []);

  const categoriasExistentes = useMemo(
    () => [...new Set(productos.map((p) => p.categoria).filter(Boolean))],
    [productos]
  );

  const guardarNuevo = async (datos) => {
    try {
      await inventarioService.crear(datos);
      setModalNuevoAbierto(false);
      cargar();
    } catch (error) {
      setAviso({ titulo: "No se pudo guardar", tipo: "advertencia", mensaje: error?.response?.data?.detail || "No se pudo guardar el producto." });
    }
  };

  const guardarEdicion = async (datos) => {
    try {
      await inventarioService.actualizar(datos.id, datos);
      setEditando(null);
      cargar();
    } catch (error) {
      setAviso({ titulo: "No se pudo guardar", tipo: "advertencia", mensaje: error?.response?.data?.detail || "No se pudo guardar el producto." });
    }
  };

  const registrarCompraExistente = async (productoId, datos) => {
    try {
      await inventarioService.comprar(productoId, datos);
      setModalExistenteAbierto(false);
      cargar();
    } catch (error) {
      setAviso({ titulo: "No se pudo registrar", tipo: "advertencia", mensaje: error?.response?.data?.detail || "No se pudo registrar la compra." });
    }
  };

  const abrirHistorial = async (producto) => {
    const res = await inventarioService.historialCompras(producto.id);
    setCompras(res.data);
    setVerHistorial(producto);
  };

  const confirmarEliminar = async () => {
    try {
      await inventarioService.eliminar(eliminando.id);
      setEliminando(null);
      cargar();
    } catch (error) {
      setEliminando(null);
      setAviso({
        titulo: "No se pudo eliminar",
        tipo: "advertencia",
        mensaje: error?.response?.data?.detail || "No se pudo eliminar el producto.",
      });
    }
  };

  const filtrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideTipo = filtroTipo === "todos" || p.tipo === filtroTipo;
      const coincideBusqueda = !busqueda ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.categoria || "").toLowerCase().includes(busqueda.toLowerCase());
      return coincideTipo && coincideBusqueda;
    });
  }, [productos, filtroTipo, busqueda]);

  const totales = useMemo(() => ({
    piezas: productos.reduce((acc, p) => acc + p.cantidad, 0),
    valorLibros: productos.filter((p) => p.tipo === "interno").reduce((acc, p) => acc + Number(p.valor_en_libros || 0), 0),
    paraVenta: productos.filter((p) => p.tipo === "venta").length,
  }), [productos]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl p-4 bg-panel border border-line flex items-center gap-3">
          <div className="p-2 rounded-full bg-accent/20"><Boxes size={18} className="text-gold" /></div>
          <div>
            <p className="text-xs font-semibold text-inksoft uppercase">Piezas en inventario</p>
            <p className="text-xl font-display text-ink">{totales.piezas}</p>
          </div>
        </div>
        <div className="rounded-xl p-4 bg-panel border border-line flex items-center gap-3">
          <div className="p-2 rounded-full bg-good/20"><Wrench size={18} className="text-good" /></div>
          <div>
            <p className="text-xs font-semibold text-inksoft uppercase">Valor en libros (equipo)</p>
            <p className="text-xl font-display text-ink">{q(totales.valorLibros)}</p>
          </div>
        </div>
        <div className="rounded-xl p-4 bg-panel border border-line flex items-center gap-3">
          <div className="p-2 rounded-full bg-warn/20"><ShoppingBag size={18} className="text-warn" /></div>
          <div>
            <p className="text-xs font-semibold text-inksoft uppercase">Productos para venta</p>
            <p className="text-xl font-display text-ink">{totales.paraVenta}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={16} className="text-inksoft" />
          <input
            placeholder="Buscar por nombre o categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-3 py-2 rounded-lg outline-none border border-line bg-panel text-sm"
          />
        </div>
        <div className="flex gap-1 rounded-full p-1 bg-bg border border-line">
          {FILTROS_TIPO.map((f) => (
            <button key={f.id} onClick={() => setFiltroTipo(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150
                ${filtroTipo === f.id ? "bg-accent text-accentink" : "text-inksoft hover:bg-panel"}`}>
              {f.label}
            </button>
          ))}
        </div>
        {puede(usuario, "inventario", "exportar") && (
          <button onClick={() => setExportando(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-line text-inksoft hover:bg-panel transition-all duration-150 hover:scale-105 active:scale-95">
            <Download size={16} /> Exportar
          </button>
        )}

        {(puede(usuario, "inventario", "comprar") || puede(usuario, "inventario", "editar_producto")) && (
        <div className="relative">
          <button onClick={() => setMenuCompra((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-105 active:scale-95">
            <Plus size={16} /> Nueva compra
          </button>
          {menuCompra && (
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-panel shadow-lg z-50 overflow-hidden">
              {puede(usuario, "inventario", "comprar") && (
                <button
                  onClick={() => { setMenuCompra(false); setModalExistenteAbierto(true); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-ink hover:bg-bg text-left">
                  <PackageSearch size={16} /> Producto existente
                </button>
              )}
              {puede(usuario, "inventario", "editar_producto") && (
                <button
                  onClick={() => { setMenuCompra(false); setModalNuevoAbierto(true); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-ink hover:bg-bg text-left border-t border-line">
                  <PackagePlus size={16} /> Producto nuevo
                </button>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      <div className="rounded-xl overflow-hidden bg-panel border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              {["Nombre", "Categoría", "Tipo", "Cantidad", "Costo", "Precio / Depreciación", ""].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 font-semibold uppercase text-xs text-inksoft">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p) => (
              <tr key={p.id} className="border-b border-line">
                <td className="px-4 py-2.5 text-ink font-semibold">{p.nombre}</td>
                <td className="px-4 py-2.5 text-inksoft">{p.categoria || "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.tipo === "venta" ? "bg-warnbg text-warn" : "bg-goodbg text-good"}`}>
                    {p.tipo === "venta" ? "Para venta" : "Uso interno"}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={p.stock_bajo ? "font-semibold text-bad" : "text-ink"}>{p.cantidad}</span>
                  {p.stock_bajo && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-badbg text-bad">
                      Stock bajo
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-ink">{q(p.costo_unitario)}</td>
                <td className="px-4 py-2.5 text-inksoft">
                  {p.tipo === "venta"
                    ? `Precio: ${q(p.precio_venta)}`
                    : p.depreciacion_mensual
                      ? `Deprecia ${q(p.depreciacion_mensual)}/mes · Valor hoy: ${q(p.valor_en_libros)}`
                      : "Sin vida útil definida"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => abrirHistorial(p)}
                      title="Ver historial de precios"
                      className="p-2 rounded-lg text-inksoft hover:bg-bg transition-transform hover:scale-110">
                      <Clock size={15} />
                    </button>
                    {puede(usuario, "inventario", "editar_producto") && (
                      <button onClick={() => setEditando(p)}
                        title="Editar"
                        className="p-2 rounded-lg text-inksoft hover:bg-bg transition-transform hover:scale-110">
                        <Pencil size={15} />
                      </button>
                    )}
                    {puede(usuario, "inventario", "eliminar") && (
                      <button onClick={() => setEliminando(p)}
                        title="Dar de baja"
                        className="p-2 rounded-lg text-bad hover:bg-badbg transition-transform hover:scale-110">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-inksoft">No hay productos que coincidan.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalNuevoAbierto && (
        <ProductoModal categoriasExistentes={categoriasExistentes} onGuardar={guardarNuevo} onCerrar={() => setModalNuevoAbierto(false)} />
      )}

      {editando && (
        <ProductoModal producto={editando} categoriasExistentes={categoriasExistentes} onGuardar={guardarEdicion} onCerrar={() => setEditando(null)} />
      )}

      {modalExistenteAbierto && (
        <CompraExistenteModal productos={productos} onGuardar={registrarCompraExistente} onCerrar={() => setModalExistenteAbierto(false)} />
      )}

      {verHistorial && (
        <HistorialComprasModal producto={verHistorial} compras={compras} onCerrar={() => setVerHistorial(null)} />
      )}

      {exportando && (
        <ExportarInventarioModal
          onCerrar={() => setExportando(false)}
          onExportar={(columnas) => { exportarInventarioExcel(filtrados, columnas); setExportando(false); }}
        />
      )}

      {eliminando && (
        <ConfirmModal
          titulo="Dar de baja producto"
          mensaje={`¿Seguro que querés dar de baja "${eliminando.nombre}"? No se borra el historial, pero dejará de aparecer en el inventario activo.`}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setEliminando(null)}
        />
      )}

      {aviso && (
        <AvisoModal titulo={aviso.titulo} mensaje={aviso.mensaje} tipo={aviso.tipo} onCerrar={() => setAviso(null)} />
      )}
    </div>
  );
}
