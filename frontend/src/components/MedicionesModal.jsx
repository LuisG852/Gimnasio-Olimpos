import React from "react";
import { useEffect, useState, useMemo } from "react";
import { X, Ruler, Trash2, Dumbbell, ClipboardEdit } from "lucide-react";
import { medicionService } from "../services/api";
import ConfirmModal from "./ConfirmModal";
import AvisoModal from "./AvisoModal";
import PlanRevisionModal from "./PlanRevisionModal";

const CAMPOS_MEDIDAS = [
  { key: "pecho", label: "Pecho" },
  { key: "cintura", label: "Cintura" },
  { key: "cadera", label: "Cadera" },
  { key: "brazo_derecho", label: "Brazo derecho" },
  { key: "brazo_izquierdo", label: "Brazo izquierdo" },
  { key: "muslo_derecho", label: "Muslo derecho" },
  { key: "muslo_izquierdo", label: "Muslo izquierdo" },
  { key: "gemelo_derecho", label: "Gemelo derecho" },
  { key: "gemelo_izquierdo", label: "Gemelo izquierdo" },
];

const OBJETIVOS = [
  { value: "bajar_peso", label: "Bajar de peso" },
  { value: "ganar_musculo", label: "Ganar músculo" },
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "fuerza", label: "Fuerza" },
];

const NIVELES = [
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

const SPLITS = [
  { value: "full_body", label: "Cuerpo completo" },
  { value: "upper_lower", label: "Torso / Pierna" },
  { value: "ppl", label: "Push / Pull / Legs" },
  { value: "bro_split", label: "Split por músculo (5 días)" },
];

const DIAS_SEMANA_OPCIONES = [2, 3, 4, 5, 6];

const ENFASIS_OPCIONES = [
  { value: "", label: "Ninguno" },
  { value: "gluteo_pierna", label: "Glúteo y pierna" },
  { value: "pecho_espalda", label: "Pecho y espalda" },
  { value: "brazo", label: "Brazo" },
  { value: "hombro", label: "Hombro" },
];

const ETIQUETA_OBJETIVO = Object.fromEntries(OBJETIVOS.map((o) => [o.value, o.label]));
const ETIQUETA_NIVEL = Object.fromEntries(NIVELES.map((n) => [n.value, n.label]));
const ETIQUETA_SPLIT = Object.fromEntries(SPLITS.map((s) => [s.value, s.label]));
const ETIQUETA_ENFASIS = Object.fromEntries(ENFASIS_OPCIONES.filter((e) => e.value).map((e) => [e.value, e.label]));

const LB_A_KG = 0.453592;
const KG_A_LB = 2.20462;

function calcularImc(pesoLb, altura) {
  const pLb = Number(pesoLb);
  const a = Number(altura);
  if (!pLb || !a) return null;
  const pKg = pLb * LB_A_KG;
  return (pKg / (a * a)).toFixed(2);
}

function categoriaImc(imc) {
  if (!imc) return null;
  const valor = Number(imc);
  if (valor < 18.5) return { label: "Bajo peso", tone: "warn" };
  if (valor < 25) return { label: "Normal", tone: "good" };
  if (valor < 30) return { label: "Sobrepeso", tone: "warn" };
  return { label: "Obesidad", tone: "bad" };
}

const TONE_TEXTO = { good: "text-good", warn: "text-warn", bad: "text-bad" };

const FORM_VACIO = {
  fecha: new Date().toISOString().slice(0, 10),
  peso: "",
  altura: "",
  pecho: "", cintura: "", cadera: "",
  brazo_derecho: "", brazo_izquierdo: "",
  muslo_derecho: "", muslo_izquierdo: "",
  gemelo_derecho: "", gemelo_izquierdo: "",
  notas: "",
  objetivo: "mantenimiento",
  nivel: "principiante",
  split: "full_body",
  dias_por_semana: 3,
  enfasis: "",
};

export default function MedicionesModal({ socio, onClose }) {
  const [historial, setHistorial] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [cargando, setCargando] = useState(true);
  const [eliminando, setEliminando] = useState(null);
  const [revisando, setRevisando] = useState(null); // id de la medición cuyo plan se está revisando
  const [aviso, setAviso] = useState(null);

  const cargar = () => {
    medicionService.listarPorSocio(socio.id).then((res) => {
      setHistorial(res.data);
      setCargando(false);
    });
  };

  useEffect(() => { cargar(); }, [socio.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const imcPreview = useMemo(() => calcularImc(form.peso, form.altura), [form.peso, form.altura]);
  const catPreview = categoriaImc(imcPreview);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.peso || !form.altura) return;

    const payload = {
      socio_id: socio.id,
      fecha: form.fecha,
      peso: Number((Number(form.peso) * LB_A_KG).toFixed(2)),
      altura: Number(form.altura),
      objetivo: form.objetivo,
      nivel: form.nivel,
      split: form.split,
      dias_por_semana: Number(form.dias_por_semana),
      enfasis: form.enfasis || null,
    };
    CAMPOS_MEDIDAS.forEach(({ key }) => {
      payload[key] = form[key] === "" ? null : Number(form[key]);
    });
    payload.notas = form.notas || null;

    try {
      await medicionService.crear(payload);
      setForm(FORM_VACIO);
      cargar();
    } catch (error) {
      setAviso({
        titulo: "No se pudo guardar",
        tipo: "advertencia",
        mensaje: error?.response?.data?.detail || "No se pudo guardar la medición.",
      });
    }
  };

  const confirmarEliminar = async () => {
    try {
      await medicionService.eliminar(eliminando);
      setEliminando(null);
      cargar();
    } catch (error) {
      setEliminando(null);
      setAviso({
        titulo: "No se pudo eliminar",
        tipo: "advertencia",
        mensaje: error?.response?.data?.detail || "No se pudo eliminar la medición.",
      });
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-ink/55">
      <div className="rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-panel">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line sticky top-0 bg-panel z-10">
          <h2 className="font-display text-2xl text-ink flex items-center gap-2">
            <Ruler size={20} className="text-accent" /> Medidas — {socio.nombre} {socio.apellido}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:opacity-70 transition-transform hover:scale-110">
            <X size={20} className="text-inksoft" />
          </button>
        </div>

        <div className="p-6 space-y-6 font-body">
          <form onSubmit={submit} className="rounded-xl p-5 bg-bg border border-line space-y-4">
            <h3 className="font-display text-lg text-ink">Nuevo control</h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-inksoft">Fecha</label>
                <input type="date" required value={form.fecha} onChange={(e) => set("fecha", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel" />
              </div>
              <div>
                <label className="text-xs font-semibold text-inksoft">Peso (lb)</label>
                <input type="number" step="0.1" required value={form.peso} onChange={(e) => set("peso", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel" />
              </div>
              <div>
                <label className="text-xs font-semibold text-inksoft">Altura (m)</label>
                <input type="number" step="0.01" placeholder="Ej: 1.75" required value={form.altura} onChange={(e) => set("altura", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel" />
              </div>
            </div>

            {imcPreview && (
              <div className="rounded-lg p-3 text-sm bg-panel border border-line">
                IMC calculado: <span className="font-semibold text-ink">{imcPreview}</span>
                {" — "}
                <span className={`font-semibold ${TONE_TEXTO[catPreview.tone]}`}>{catPreview.label}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {CAMPOS_MEDIDAS.map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-inksoft">{label} (cm)</label>
                  <input type="number" step="0.1" value={form[key]} onChange={(e) => set(key, e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel" />
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-line p-3 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-inksoft">Objetivo</label>
                <select value={form.objetivo} onChange={(e) => set("objetivo", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel">
                  {OBJETIVOS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-inksoft">Nivel</label>
                <select value={form.nivel} onChange={(e) => set("nivel", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel">
                  {NIVELES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-inksoft">Split (tipo de rutina)</label>
                <select value={form.split} onChange={(e) => set("split", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel">
                  {SPLITS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-inksoft">Días por semana</label>
                <select value={form.dias_por_semana} onChange={(e) => set("dias_por_semana", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel">
                  {DIAS_SEMANA_OPCIONES.map((d) => <option key={d} value={d}>{d} días</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-inksoft">Énfasis (opcional)</label>
                <select value={form.enfasis} onChange={(e) => set("enfasis", e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel">
                  {ENFASIS_OPCIONES.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
              <p className="col-span-2 text-xs text-inksoft">
                Con esto se puede generar un plan de entrenamiento recomendado, dividido por
                los días que elijas, para este control.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-inksoft">Notas (opcional)</label>
              <input value={form.notas} onChange={(e) => set("notas", e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel" />
            </div>

            <button type="submit"
              className="w-full py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-[1.01] active:scale-95">
              Guardar control
            </button>
          </form>

          <div>
            <h3 className="font-display text-lg text-ink mb-3">Historial</h3>
            {cargando ? (
              <p className="text-sm text-inksoft">Cargando...</p>
            ) : historial.length === 0 ? (
              <p className="text-sm text-inksoft">Todavía no hay mediciones registradas para este socio.</p>
            ) : (
              <div className="space-y-2">
                {historial.map((m) => {
                  const cat = categoriaImc(m.imc);
                  const pesoLb = (Number(m.peso) * KG_A_LB).toFixed(1);
                  return (
                    <div key={m.id} className="rounded-lg p-3 border border-line text-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-ink">{m.fecha}</span>
                          <span className="text-inksoft"> — {pesoLb} lb, {m.altura} m — IMC </span>
                          <span className={`font-semibold ${TONE_TEXTO[cat.tone]}`}>{m.imc} ({cat.label})</span>
                          {m.notas && <div className="text-xs text-inksoft mt-1">{m.notas}</div>}
                          {(m.objetivo || m.nivel) && (
                            <div className="text-xs text-inksoft mt-1">
                              {m.objetivo && <>Objetivo: <span className="font-semibold text-ink">{ETIQUETA_OBJETIVO[m.objetivo] || m.objetivo}</span></>}
                              {m.objetivo && m.nivel && " · "}
                              {m.nivel && <>Nivel: <span className="font-semibold text-ink">{ETIQUETA_NIVEL[m.nivel] || m.nivel}</span></>}
                              {m.split && <> · Split: <span className="font-semibold text-ink">{ETIQUETA_SPLIT[m.split] || m.split}</span></>}
                              {m.dias_por_semana && <> · {m.dias_por_semana} días</>}
                              {m.enfasis && <> · Énfasis: <span className="font-semibold text-ink">{ETIQUETA_ENFASIS[m.enfasis] || m.enfasis}</span></>}
                            </div>
                          )}
                        </div>
                        <button onClick={() => setEliminando(m.id)}
                          className="p-2 rounded-lg hover:opacity-70 text-bad transition-transform duration-150 hover:scale-110 active:scale-90">
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {m.objetivo && m.nivel && (
                        <div className="flex gap-2">
                          <button onClick={() => setRevisando(m.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent text-accentink transition-all duration-150 hover:scale-105 active:scale-95">
                            <Dumbbell size={13} /> Generar y revisar plan <ClipboardEdit size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {eliminando && (
        <ConfirmModal
          titulo="¿Eliminar esta medición?"
          mensaje="Este control del historial se va a borrar de forma permanente."
          textoConfirmar="Eliminar medición"
          onCancelar={() => setEliminando(null)}
          onConfirmar={confirmarEliminar}
        />
      )}

      {revisando && (
        <PlanRevisionModal
          medicionId={revisando}
          socio={socio}
          onClose={() => setRevisando(null)}
        />
      )}

      {aviso && (
        <AvisoModal titulo={aviso.titulo} mensaje={aviso.mensaje} tipo={aviso.tipo} onCerrar={() => setAviso(null)} />
      )}
    </div>
  );
}
