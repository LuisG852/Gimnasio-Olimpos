import React from "react";
import { useEffect, useState, useMemo } from "react";
import { Plus, Pencil, Trash2, MessageCircle, CalendarClock, Search, RefreshCw, Ruler, Receipt, BellOff, History, Download } from "lucide-react";
import { socioService, cajaService, configuracionService } from "../services/api";
import { estadoSocio, diasHasta, aplicarPlantilla, abrirWhatsapp, obtenerPlantillas, prepararVentanaWhatsapp } from "../utils/whatsapp";
import { generarNuevoComprobante, reimprimirOGenerarComprobante } from "../utils/comprobante";
import { exportarSociosExcel } from "../utils/exportarSocios";
import Badge from "../components/Badge";
import SocioModal from "../components/SocioModal";
import RenovarModal from "../components/RenovarModal";
import AvisoModal from "../components/AvisoModal";
import MedicionesModal from "../components/MedicionesModal";
import HistorialPagosModal from "../components/HistorialPagosModal";
import ConfirmModal from "../components/ConfirmModal";

const FILTROS = [
  { id: "todos", label: "Todos", tone: null },
  { id: "good", label: "Al día", tone: "good" },
  { id: "warn", label: "Por vencer", tone: "warn" },
  { id: "bad", label: "Vencido", tone: "bad" },
];

const TONE_ACTIVO = {
  good: "bg-goodbg text-good border-good",
  warn: "bg-warnbg text-warn border-warn",
  bad: "bg-badbg text-bad border-bad",
};

const TONE_TEXTO = { good: "text-good", warn: "text-warn", bad: "text-bad" };

function textoDias(dias) {
  if (dias > 0) return `${dias} día${dias === 1 ? "" : "s"}`;
  if (dias === 0) return "Vence hoy";
  return `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`;
}

export default function Socios() {
  const [socios, setSocios] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [renovando, setRenovando] = useState(null);
  const [midiendo, setMidiendo] = useState(null);
  const [verHistorial, setVerHistorial] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [cuotaInscripcion, setCuotaInscripcion] = useState(0);

  const cargar = () => socioService.listar().then((res) => setSocios(res.data));

  useEffect(() => { cargar(); }, []);
  useEffect(() => {
    configuracionService.obtenerCuotaInscripcion().then(({ data }) => setCuotaInscripcion(data.cuota_inscripcion));
  }, []);

  const guardar = async (datos) => {
    try {
      if (datos.id) {
        await socioService.actualizar(datos.id, datos);
      } else {
        const res = await socioService.crear(datos);
        const plantillas = obtenerPlantillas();
        abrirWhatsapp(res.data.telefono, aplicarPlantilla(plantillas.bienvenida, res.data));
        await generarNuevoComprobante(res.data);
        await cajaService.ingreso(
          `Inscripción - ${res.data.nombre} ${res.data.apellido}`,
          Number(res.data.precio),
          datos.metodo_pago || "efectivo"
        );
        // La cuota de inscripción es aparte del pago de la membresía, y
        // solo se cobra al registrar un socio NUEVO — nunca en
        // renovaciones ni ediciones. Si es 0 (el admin la puso así en
        // Usuarios), no se registra un movimiento vacío en Caja.
        if (cuotaInscripcion > 0) {
          await cajaService.ingreso(
            `Cuota de inscripción - ${res.data.nombre} ${res.data.apellido}`,
            Number(cuotaInscripcion),
            datos.metodo_pago || "efectivo"
          );
        }
      }
      setModalAbierto(false);
      setEditando(null);
      cargar();
    } catch (error) {
      const mensaje = error?.response?.data?.detail || "No se pudo guardar el socio. Intentá de nuevo.";
      setAviso({ titulo: "No se pudo guardar", tipo: "advertencia", mensaje });
    }
  };

  const confirmarRenovacion = async (id, datos) => {
    await socioService.renovar(id, datos);
    const socio = renovando;
    setRenovando(null);
    cargar();
    if (socio) {
      await generarNuevoComprobante(socio);
      try {
        await cajaService.ingreso(
          `Renovación - ${socio.nombre} ${socio.apellido}`,
          Number(datos.precio),
          datos.metodo_pago || "efectivo"
        );
      } catch (error) {
        setAviso({
          titulo: "El pago no se pudo agregar a Caja",
          tipo: "advertencia",
          mensaje:
            `La membresía de ${socio.nombre} ${socio.apellido} sí quedó renovada, pero el pago NO se pudo agregar a Caja:\n\n` +
            (error?.response?.data?.detail || "Error desconocido.") +
            `\n\nUsa el formulario "Registrar ingreso" en la pestaña Caja para agregarlo a mano.`,
        });
      }
    }
  };

  const confirmarEliminar = async () => {
    try {
      await socioService.eliminar(eliminando.id);
      setEliminando(null);
      cargar();
    } catch (error) {
      setEliminando(null);
      setAviso({
        titulo: "No se pudo eliminar al socio",
        tipo: "advertencia",
        mensaje: error?.response?.data?.detail || "Error desconocido. Intenta de nuevo.",
      });
    }
  };

  const plantillas = obtenerPlantillas();

  const conteos = useMemo(() => {
    const c = { good: 0, warn: 0, bad: 0 };
    socios.forEach((s) => { c[estadoSocio(s).tone]++; });
    return c;
  }, [socios]);

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase();
    return socios.filter((s) => {
      const coincideBusqueda = `${s.nombre} ${s.apellido}`.toLowerCase().includes(q);
      const coincideFiltro = filtroEstado === "todos" || estadoSocio(s).tone === filtroEstado;
      return coincideBusqueda && coincideFiltro;
    });
  }, [socios, busqueda, filtroEstado]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-inksoft" />
          <input
            placeholder="Buscar socio..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg outline-none border border-line bg-panel"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportarSociosExcel(filtrados)}
            title="Exportar la lista que ves ahora a Excel/CSV"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold border border-line text-inksoft transition-all duration-200 hover:scale-105 active:scale-95">
            <Download size={18} /> Exportar
          </button>
          <button onClick={() => { setEditando(null); setModalAbierto(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-105 active:scale-95">
            <Plus size={18} /> Nuevo socio
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const activo = filtroEstado === f.id;
          const clasesInactivo = "bg-panel border-line text-inksoft hover:bg-bg";
          const clasesActivo = f.tone ? TONE_ACTIVO[f.tone] : "bg-ink text-panel border-ink";
          return (
            <button
              key={f.id}
              onClick={() => setFiltroEstado(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 hover:scale-105 active:scale-95 ${
                activo ? clasesActivo : clasesInactivo
              }`}
            >
              {f.label}
              {f.tone && <span className="ml-1.5 opacity-70">({conteos[f.tone]})</span>}
            </button>
          );
        })}
      </div>

      <div className="rounded-xl overflow-hidden bg-panel border border-line">
        {filtrados.length === 0 ? (
          <div className="p-10 text-center text-inksoft">
            {socios.length === 0
              ? "Todavía no cargaste ningún socio. Empezá con 'Nuevo socio'."
              : "No se encontraron socios con esos filtros."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                {["Socio", "Membresía", "Vence", "Estado", "Días", "Acciones"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 font-semibold uppercase text-xs text-inksoft">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((s) => {
                const estado = estadoSocio(s);
                const dias = diasHasta(s.fecha_vencimiento);
                return (
                  <tr key={s.id} className="border-b border-line">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-ink">{s.nombre} {s.apellido}</div>
                      <div className="text-xs text-inksoft">{s.telefono}</div>
                    </td>
                    <td className="px-5 py-3 text-ink">{s.tipo_membresia} · Q{s.precio}</td>
                    <td className="px-5 py-3 text-ink">{s.fecha_vencimiento}</td>
                    <td className="px-5 py-3"><Badge tone={estado.tone}>{estado.label}</Badge></td>
                    <td className={`px-5 py-3 font-semibold ${TONE_TEXTO[estado.tone]}`}>{textoDias(dias)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button title="Renovar membresía"
                          onClick={() => setRenovando(s)}
                          className="p-2 rounded-lg hover:opacity-70 text-gold transition-transform duration-150 hover:scale-110 active:scale-90">
                          <RefreshCw size={17} />
                        </button>
                        <button title="Medidas corporales"
                          onClick={() => setMidiendo(s)}
                          className="p-2 rounded-lg hover:opacity-70 text-ink transition-transform duration-150 hover:scale-110 active:scale-90">
                          <Ruler size={17} />
                        </button>
                        <button title="Historial de pagos"
                          onClick={() => setVerHistorial(s)}
                          className="p-2 rounded-lg hover:opacity-70 text-inksoft transition-transform duration-150 hover:scale-110 active:scale-90">
                          <History size={17} />
                        </button>
                        <button title="Comprobante de pago (reimprime el último, o genera el primero)"
                          onClick={() => { prepararVentanaWhatsapp(); reimprimirOGenerarComprobante(s); }}
                          className="p-2 rounded-lg hover:opacity-70 text-ink transition-transform duration-150 hover:scale-110 active:scale-90">
                          <Receipt size={17} />
                        </button>
                        <button title="Enviar bienvenida por WhatsApp"
                          onClick={() => abrirWhatsapp(s.telefono, aplicarPlantilla(plantillas.bienvenida, s))}
                          className="p-2 rounded-lg hover:opacity-70 text-good transition-transform duration-150 hover:scale-110 active:scale-90">
                          <MessageCircle size={17} />
                        </button>
                        <button title="Enviar recordatorio de pago"
                          onClick={() => abrirWhatsapp(s.telefono, aplicarPlantilla(plantillas.recordatorio, s))}
                          className="p-2 rounded-lg hover:opacity-70 text-warn transition-transform duration-150 hover:scale-110 active:scale-90">
                          <CalendarClock size={17} />
                        </button>
                        <button title="Avisar que el plan ya venció"
                          onClick={() => abrirWhatsapp(s.telefono, aplicarPlantilla(plantillas.vencido, s))}
                          className="p-2 rounded-lg hover:opacity-70 text-bad transition-transform duration-150 hover:scale-110 active:scale-90">
                          <BellOff size={17} />
                        </button>
                        <button title="Editar" onClick={() => { setEditando(s); setModalAbierto(true); }}
                          className="p-2 rounded-lg hover:opacity-70 text-inksoft transition-transform duration-150 hover:scale-110 active:scale-90">
                          <Pencil size={16} />
                        </button>
                        <button title="Eliminar" onClick={() => setEliminando(s)}
                          className="p-2 rounded-lg hover:opacity-70 text-bad transition-transform duration-150 hover:scale-110 active:scale-90">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modalAbierto && (
        <SocioModal
          socio={editando}
          cuotaInscripcion={cuotaInscripcion}
          onClose={() => { setModalAbierto(false); setEditando(null); }}
          onSave={guardar}
        />
      )}

      {renovando && (
        <RenovarModal
          socio={renovando}
          onClose={() => setRenovando(null)}
          onRenovar={confirmarRenovacion}
        />
      )}

      {midiendo && (
        <MedicionesModal
          socio={midiendo}
          onClose={() => setMidiendo(null)}
        />
      )}

      {verHistorial && (
        <HistorialPagosModal
          socio={verHistorial}
          onClose={() => setVerHistorial(null)}
        />
      )}

      {eliminando && (
        <ConfirmModal
          titulo="¿Eliminar socio?"
          mensaje={`Vas a eliminar a ${eliminando.nombre} ${eliminando.apellido} de forma permanente. Esta acción no se puede deshacer.`}
          textoConfirmar="Eliminar socio"
          onCancelar={() => setEliminando(null)}
          onConfirmar={confirmarEliminar}
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
