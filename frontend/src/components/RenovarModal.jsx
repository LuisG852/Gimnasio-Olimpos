import React from "react";
import { useState, useMemo } from "react";
import { X, RefreshCw } from "lucide-react";
import { prepararVentanaWhatsapp } from "../utils/whatsapp";

const TIPOS_MEMBRESIA = ["Mensual", "Trimestral", "Semestral", "Anual", "Personalizado"];
// Respaldo, solo por si el modal se abre antes de que terminen de cargar
// los precios reales desde Usuarios — en la práctica casi nunca se usa.
const PRECIOS_RESPALDO = { Mensual: 200, Trimestral: 550, Semestral: 1100, Anual: 1920, Personalizado: 0 };
const DURACIONES_DIAS = { Mensual: 30, Trimestral: 91, Semestral: 182, Anual: 365 };

function calcularNuevaFecha(fechaVencimientoActual, dias) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimientoActual = new Date(fechaVencimientoActual + "T00:00:00");
  const base = vencimientoActual >= hoy ? vencimientoActual : hoy;
  const nueva = new Date(base);
  nueva.setDate(nueva.getDate() + dias);
  return nueva.toISOString().slice(0, 10);
}

export default function RenovarModal({ socio, precios, onClose, onRenovar }) {
  const preciosActuales = precios && Object.keys(precios).length ? precios : PRECIOS_RESPALDO;
  const planActualEsEstandar = ["Mensual", "Trimestral", "Semestral", "Anual"].includes(socio.tipo_membresia);
  const [tipo, setTipo] = useState(planActualEsEstandar ? socio.tipo_membresia : "Mensual");
  // Ojo: el precio inicial debe ser el precio VIGENTE de ese plan hoy
  // (preciosActuales), no lo que ese socio pagó la última vez
  // (socio.precio) — si no, al abrir "Renovar" seguía mostrando
  // precios viejos hasta que tocabas el selector de tipo de membresía.
  const [precio, setPrecio] = useState(planActualEsEstandar ? preciosActuales[socio.tipo_membresia] : preciosActuales.Mensual);
  const [nombrePersonalizado, setNombrePersonalizado] = useState("");
  const [diasPersonalizados, setDiasPersonalizados] = useState(30);
  const [metodoPago, setMetodoPago] = useState("efectivo");

  const dias = tipo === "Personalizado" ? Number(diasPersonalizados) || 0 : DURACIONES_DIAS[tipo];
  const nuevaFecha = useMemo(
    () => calcularNuevaFecha(socio.fecha_vencimiento, dias),
    [socio.fecha_vencimiento, dias]
  );

  const submit = (e) => {
    e.preventDefault();
    // Se abre (vacía) en este mismo instante del clic — la renovación va a
    // tardar unos segundos (guardar, generar comprobante, descargar PDF)
    // y para entonces el navegador ya no dejaría abrir la pestaña solo.
    // OJO: solo se abre si el socio NO tiene correo — es la misma condición
    // que usa generarNuevoComprobante() para decidir si abre WhatsApp o no
    // (si tiene correo, el comprobante se manda por email y WhatsApp nunca
    // se abre). Si no se revisa esto acá, queda una pestaña en blanco sin
    // usar cada vez que el socio sí tiene correo registrado.
    if (!socio.correo) {
      prepararVentanaWhatsapp();
    }
    const tipoFinal = tipo === "Personalizado" ? (nombrePersonalizado.trim() || "Personalizado") : tipo;
    onRenovar(socio.id, {
      tipo_membresia: tipoFinal,
      precio,
      dias: tipo === "Personalizado" ? dias : undefined,
      metodo_pago: metodoPago,
    });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-ink/55">
      <div className="rounded-2xl w-full max-w-md bg-panel">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="font-display text-2xl text-ink flex items-center gap-2">
            <RefreshCw size={20} className="text-accent" /> Renovar membresía
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:opacity-70 transition-transform hover:scale-110">
            <X size={20} className="text-inksoft" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4 font-body">
          <div className="text-sm text-inksoft">
            Socio: <span className="font-semibold text-ink">{socio.nombre} {socio.apellido}</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-inksoft">Plan</label>
            <select
              value={tipo}
              onChange={(e) => {
                const nuevoTipo = e.target.value;
                setTipo(nuevoTipo);
                if (nuevoTipo !== "Personalizado") setPrecio(preciosActuales[nuevoTipo]);
              }}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line"
            >
              {TIPOS_MEMBRESIA.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {tipo === "Personalizado" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-inksoft">Nombre del plan</label>
                <input
                  required
                  placeholder="Ej: Plan Familiar"
                  value={nombrePersonalizado}
                  onChange={(e) => setNombrePersonalizado(e.target.value)}
                  maxLength={20}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-inksoft">Duración (días)</label>
                <input
                  required
                  type="number"
                  min={1}
                  value={diasPersonalizados}
                  onChange={(e) => setDiasPersonalizados(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-inksoft">Precio (Q)</label>
              <input
                type="number"
                value={precio}
                onChange={(e) => setPrecio(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-inksoft">Método de pago</label>
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line"
              >
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg p-3 bg-goodbg text-sm text-ink">
            Nuevo vencimiento: <span className="font-semibold text-good">{nuevaFecha}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg font-semibold border border-line text-inksoft transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-[1.02] active:scale-95"
            >
              Confirmar renovación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
