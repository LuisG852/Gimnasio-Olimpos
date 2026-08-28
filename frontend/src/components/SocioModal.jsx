import React from "react";
import { useState } from "react";
import { X } from "lucide-react";
import { prepararVentanaWhatsapp } from "../utils/whatsapp";
import TelefonoInput from "./TelefonoInput";

const TIPOS_MEMBRESIA = ["Mensual", "Trimestral", "Semestral", "Anual", "Personalizado"];
// Respaldo, solo por si el modal se abre antes de que terminen de cargar
// los precios reales desde Usuarios — en la práctica casi nunca se usa.
const PRECIOS_RESPALDO = { Mensual: 200, Trimestral: 550, Semestral: 1100, Anual: 1920, Personalizado: 0 };
// Mismos valores que DURACIONES_DIAS en backend/app/services/socio_service.py
// (91 y 182, no 90/180 exactos) — así un plan dura lo mismo sin importar
// si es una inscripción nueva o una renovación.
const DIAS_DEFAULT = { Mensual: 30, Trimestral: 91, Semestral: 182, Anual: 365 };
const PLANES_ESTANDAR = ["Mensual", "Trimestral", "Semestral", "Anual"];

function sumarDias(fechaISO, dias) {
  // Ojo con las fechas: new Date("2026-09-20") las interpreta como
  // UTC medianoche, y sumarle horas con getTime() puede correrse un
  // día para atrás/adelante según la zona horaria de quien lo usa.
  // Se separa año/mes/día a mano para evitar ese problema.
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  fecha.setDate(fecha.getDate() + dias);
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function SocioModal({ socio, cuotaInscripcion = 0, precios, onClose, onSave }) {
  const preciosActuales = precios && Object.keys(precios).length ? precios : PRECIOS_RESPALDO;
  const [form, setForm] = useState(
    socio || {
      nombre: "", apellido: "", telefono: "", correo: "",
      fecha_inscripcion: new Date().toISOString().slice(0, 10),
      fecha_nacimiento: "",
      tipo_membresia: "Mensual",
      precio: preciosActuales.Mensual,
      fecha_vencimiento: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      activo: true,
      metodo_pago: "efectivo",
    }
  );

  const esPersonalizado = !PLANES_ESTANDAR.includes(form.tipo_membresia);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.nombre || !form.apellido || !form.telefono) return;
    // Si el socio nuevo NO tiene correo, la bienvenida se manda por
    // WhatsApp — se abre la pestaña vacía en este mismo instante del
    // clic (antes de guardar), para que el navegador no la bloquee
    // como popup. Si SÍ tiene correo, la bienvenida va por correo con
    // el comprobante adjunto, y no hace falta abrir nada acá.
    if (!socio && !form.correo) prepararVentanaWhatsapp();
    onSave({ ...form, fecha_nacimiento: form.fecha_nacimiento || null });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-ink/55">
      <div className="rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto bg-panel">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="font-display text-2xl text-ink">{socio ? "Editar socio" : "Nuevo socio"}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:opacity-70 transition-transform hover:scale-110">
            <X size={20} className="text-inksoft" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4 font-body">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-inksoft">Nombre</label>
              <input required value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
            </div>
            <div>
              <label className="text-xs font-semibold text-inksoft">Apellido</label>
              <input required value={form.apellido} onChange={(e) => set("apellido", e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-inksoft">Teléfono (WhatsApp)</label>
            <div className="mt-1">
              <TelefonoInput required value={form.telefono} onChange={(v) => set("telefono", v)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-inksoft">Correo</label>
              <input type="email" value={form.correo || ""} onChange={(e) => set("correo", e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-inksoft">Tipo de membresía</label>
              <select
                value={esPersonalizado ? "Personalizado" : form.tipo_membresia}
                onChange={(e) => {
                  const valor = e.target.value;
                  if (valor === "Personalizado") {
                    set("tipo_membresia", "");
                  } else {
                    setForm((f) => ({
                      ...f,
                      tipo_membresia: valor,
                      precio: preciosActuales[valor],
                      fecha_vencimiento: sumarDias(f.fecha_inscripcion, DIAS_DEFAULT[valor]),
                    }));
                  }
                }}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line"
              >
                {TIPOS_MEMBRESIA.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-inksoft">Precio (Q)</label>
              <input type="number" value={form.precio} onChange={(e) => set("precio", Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
            </div>
          </div>
          {esPersonalizado && (
            <div>
              <label className="text-xs font-semibold text-inksoft">Nombre del plan personalizado</label>
              <input
                required
                placeholder="Ej: Plan Familiar"
                value={form.tipo_membresia}
                onChange={(e) => set("tipo_membresia", e.target.value)}
                maxLength={20}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-inksoft">Fecha de inscripción</label>
              <input
                type="date"
                value={form.fecha_inscripcion}
                onChange={(e) => {
                  const nuevaFecha = e.target.value;
                  // Si es un plan estándar (no personalizado), mover la
                  // fecha de inicio también recorre el vencimiento la
                  // misma cantidad de días — así el plan sigue durando
                  // lo que debe durar. En "Personalizado" no se toca,
                  // porque ahí el vencimiento lo decide quien lo carga.
                  if (!esPersonalizado && DIAS_DEFAULT[form.tipo_membresia]) {
                    setForm((f) => ({
                      ...f,
                      fecha_inscripcion: nuevaFecha,
                      fecha_vencimiento: sumarDias(nuevaFecha, DIAS_DEFAULT[f.tipo_membresia]),
                    }));
                  } else {
                    set("fecha_inscripcion", nuevaFecha);
                  }
                }}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
            </div>
            <div>
              <label className="text-xs font-semibold text-inksoft">Próximo vencimiento</label>
              <input type="date" required value={form.fecha_vencimiento} onChange={(e) => set("fecha_vencimiento", e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-inksoft">Fecha de nacimiento (opcional)</label>
            <input type="date" value={form.fecha_nacimiento || ""} onChange={(e) => set("fecha_nacimiento", e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
          </div>
          {!socio && (
            <div>
              <label className="text-xs font-semibold text-inksoft">Método de pago (inscripción)</label>
              <select value={form.metodo_pago} onChange={(e) => set("metodo_pago", e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line">
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia</option>
              </select>
              {cuotaInscripcion > 0 && (
                <p className="text-xs text-inksoft mt-1.5">
                  Además del plan, se va a cobrar <span className="font-semibold text-ink">Q{cuotaInscripcion}</span> de
                  cuota de inscripción (solo aplica esta vez, no en renovaciones). Se puede cambiar el monto en Usuarios.
                </p>
              )}
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} />
            Socio activo
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg font-semibold border border-line text-inksoft transition-all duration-200 hover:scale-[1.02] active:scale-95">
              Cancelar
            </button>
            <button type="submit" className="flex-1 py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-[1.02] active:scale-95">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
