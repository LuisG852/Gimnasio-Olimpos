import React from "react";
import { useState } from "react";
import { X } from "lucide-react";
import { prepararVentanaWhatsapp } from "../utils/whatsapp";
import TelefonoInput from "./TelefonoInput";

const TIPOS_MEMBRESIA = ["Mensual", "Trimestral", "Semestral", "Anual", "Personalizado"];
const PRECIOS_DEFAULT = { Mensual: 200, Trimestral: 550, Semestral: 1100, Anual: 1920, Personalizado: 0 };
const PLANES_ESTANDAR = ["Mensual", "Trimestral", "Semestral", "Anual"];

export default function SocioModal({ socio, onClose, onSave }) {
  const [form, setForm] = useState(
    socio || {
      nombre: "", apellido: "", telefono: "", correo: "",
      fecha_inscripcion: new Date().toISOString().slice(0, 10),
      fecha_nacimiento: "",
      tipo_membresia: "Mensual",
      precio: PRECIOS_DEFAULT.Mensual,
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
    // Solo un socio NUEVO dispara el mensaje de bienvenida por WhatsApp
    // (a uno editado no se le manda nada) — se abre la pestaña vacía en
    // este mismo instante del clic, antes de que empiece a guardar.
    if (!socio) prepararVentanaWhatsapp();
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
                    set("tipo_membresia", valor);
                    set("precio", PRECIOS_DEFAULT[valor]);
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
              <input type="date" value={form.fecha_inscripcion} onChange={(e) => set("fecha_inscripcion", e.target.value)}
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
