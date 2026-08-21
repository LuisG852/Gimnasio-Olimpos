import React from "react";
import { useEffect, useState } from "react";
import { X, RefreshCw, Trash2, Plus, ExternalLink, FileSpreadsheet, Mail, Dumbbell } from "lucide-react";
import { planService, ejercicioService } from "../services/api";
import { abrirPlanEnPestana, generarPlanHtml } from "../utils/planHtml";
import { exportarPlanExcel } from "../utils/planExcel";
import { NOMBRES_MUSCULO, SERIES_REPS_POR_OBJETIVO } from "../utils/musculos";
import AvisoModal from "./AvisoModal";

function AgregarEjercicio({ onAgregar }) {
  const [musculo, setMusculo] = useState("");
  const [opciones, setOpciones] = useState([]);
  const [elegido, setElegido] = useState("");

  useEffect(() => {
    if (!musculo) { setOpciones([]); return; }
    ejercicioService.listar({ musculo, activo: true }).then((res) => setOpciones(res.data));
  }, [musculo]);

  return (
    <div className="mt-2 space-y-1 w-full min-w-0">
      <select value={musculo} onChange={(e) => { setMusculo(e.target.value); setElegido(""); }}
        className="w-full min-w-0 max-w-full px-2 py-1.5 rounded-lg outline-none border border-line bg-panel text-xs">
        <option value="">Músculo...</option>
        {Object.entries(NOMBRES_MUSCULO).map(([slug, nombre]) => <option key={slug} value={slug}>{nombre}</option>)}
      </select>
      <div className="flex gap-1.5 min-w-0">
        <select value={elegido} onChange={(e) => setElegido(e.target.value)} disabled={!musculo}
          className="flex-1 min-w-0 max-w-full px-2 py-1.5 rounded-lg outline-none border border-line bg-panel text-xs disabled:opacity-50">
          <option value="">Ejercicio...</option>
          {opciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
        </select>
        <button
          disabled={!elegido}
          onClick={() => {
            const ej = opciones.find((o) => String(o.id) === String(elegido));
            if (ej) onAgregar(ej, musculo);
            setElegido("");
          }}
          className="shrink-0 p-1.5 rounded-lg bg-accent text-accentink disabled:opacity-40 transition-transform hover:scale-110">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function SelectorReemplazo({ musculoSlug, onElegir, onCerrar }) {
  const [opciones, setOpciones] = useState([]);
  useEffect(() => {
    ejercicioService.listar({ musculo: musculoSlug, activo: true }).then((res) => setOpciones(res.data));
  }, [musculoSlug]);

  return (
    <div className="flex gap-1.5 mt-1 min-w-0">
      <select autoFocus onChange={(e) => {
        const ej = opciones.find((o) => String(o.id) === e.target.value);
        if (ej) onElegir(ej);
      }} defaultValue=""
        className="flex-1 min-w-0 max-w-full px-2 py-1 rounded-lg outline-none border border-line bg-panel text-xs">
        <option value="" disabled>Elegí el reemplazo...</option>
        {opciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
      </select>
      <button onClick={onCerrar} className="shrink-0 text-inksoft hover:text-ink"><X size={14} /></button>
    </div>
  );
}

export default function PlanRevisionModal({ medicionId, socio, onClose }) {
  const [plan, setPlan] = useState(null);
  const [cambiando, setCambiando] = useState(null); // {diaIdx, ejIdx}
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);

  useEffect(() => {
    planService.generar(medicionId).then((res) => setPlan(res.data));
  }, [medicionId]);

  const actualizarCampo = (diaIdx, ejIdx, campo, valor) => {
    setPlan((prev) => {
      const copia = structuredClone(prev);
      copia.dias[diaIdx].ejercicios[ejIdx][campo] = valor;
      return copia;
    });
  };

  const quitarEjercicio = (diaIdx, ejIdx) => {
    setPlan((prev) => {
      const copia = structuredClone(prev);
      copia.dias[diaIdx].ejercicios.splice(ejIdx, 1);
      return copia;
    });
  };

  const reemplazarEjercicio = (diaIdx, ejIdx, nuevo) => {
    setPlan((prev) => {
      const copia = structuredClone(prev);
      const actual = copia.dias[diaIdx].ejercicios[ejIdx];
      copia.dias[diaIdx].ejercicios[ejIdx] = {
        ...actual,
        nombre: nuevo.nombre,
        gif_url: nuevo.gif_url,
        musculo_slug: nuevo.musculo,
        musculo: NOMBRES_MUSCULO[nuevo.musculo] || nuevo.musculo,
      };
      return copia;
    });
    setCambiando(null);
  };

  const agregarEjercicio = (diaIdx, ejercicioBase, musculoSlug) => {
    const defaults = SERIES_REPS_POR_OBJETIVO[plan.objetivo] || SERIES_REPS_POR_OBJETIVO.mantenimiento;
    setPlan((prev) => {
      const copia = structuredClone(prev);
      copia.dias[diaIdx].ejercicios.push({
        musculo: NOMBRES_MUSCULO[musculoSlug] || musculoSlug,
        musculo_slug: musculoSlug,
        nombre: ejercicioBase.nombre,
        gif_url: ejercicioBase.gif_url,
        instrucciones: null,
        series: defaults.series,
        repeticiones: defaults.repeticiones,
      });
      return copia;
    });
  };

  const enviarPorCorreo = async () => {
    if (!socio.correo) {
      setAviso({ titulo: "Falta el correo", tipo: "advertencia", mensaje: "Este socio no tiene correo registrado. Agrégaselo en su ficha para poder enviarle el plan." });
      return;
    }
    setEnviando(true);
    try {
      const html = generarPlanHtml(plan);
      await planService.enviarCorreo({
        destinatario_email: socio.correo,
        destinatario_nombre: `${socio.nombre} ${socio.apellido}`,
        asunto: "Tu plan de entrenamiento — Olimpo's Gym",
        html,
      });
      setAviso({ titulo: "Plan enviado", tipo: "exito", mensaje: `Se mandó correctamente a ${socio.correo}.` });
    } catch (error) {
      setAviso({ titulo: "No se pudo enviar", tipo: "advertencia", mensaje: error?.response?.data?.detail || "No se pudo enviar el correo." });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[70] bg-ink/55">
      <div className="rounded-2xl w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-panel">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line sticky top-0 bg-panel z-10">
          <h2 className="font-display text-2xl text-ink flex items-center gap-2">
            <Dumbbell size={20} className="text-accent" /> Revisar plan — {socio.nombre} {socio.apellido}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:opacity-70 transition-transform hover:scale-110">
            <X size={20} className="text-inksoft" />
          </button>
        </div>

        {!plan ? (
          <p className="p-6 text-sm text-inksoft">Generando plan...</p>
        ) : (
          <>
            <p className="px-6 pt-4 text-sm text-inksoft">
              Ajusta lo que necesites — cambiar un ejercicio, quitarlo, o agregar otro — y después usa
              los botones de abajo con la versión ya ajustada.
            </p>

            <div className="p-6 flex gap-3 overflow-x-auto">
              {plan.dias.map((dia, diaIdx) => (
                <div key={diaIdx} className="w-64 shrink-0 rounded-xl border border-line bg-bg overflow-hidden">
                  <div className="bg-accentink text-white px-3 py-2 rounded-t-xl">
                    <p className="font-display text-sm">{dia.dia}</p>
                    <p className="text-[11px] text-accent font-semibold">{dia.enfoque}</p>
                  </div>
                  <div className="p-2 space-y-2">
                    {dia.ejercicios.map((ej, ejIdx) => (
                      <div key={ejIdx} className="rounded-lg bg-panel border border-line p-2">
                        <div className="flex gap-2">
                          <img src={ej.gif_url} alt={ej.nombre} className="w-12 h-12 rounded-lg object-cover border border-line shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] uppercase font-semibold text-gold">{ej.musculo}</p>
                            <p className="text-xs font-semibold text-ink leading-tight">{ej.nombre}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <input type="number" min="1" value={ej.series}
                                onChange={(e) => actualizarCampo(diaIdx, ejIdx, "series", Number(e.target.value))}
                                className="w-10 px-1 py-0.5 rounded border border-line text-xs" />
                              <span className="text-xs text-inksoft">×</span>
                              <input value={ej.repeticiones}
                                onChange={(e) => actualizarCampo(diaIdx, ejIdx, "repeticiones", e.target.value)}
                                className="w-14 px-1 py-0.5 rounded border border-line text-xs" />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 mt-1.5">
                          <button onClick={() => setCambiando({ diaIdx, ejIdx })}
                            className="flex-1 flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-semibold border border-line text-inksoft hover:bg-bg">
                            <RefreshCw size={11} /> Cambiar
                          </button>
                          <button onClick={() => quitarEjercicio(diaIdx, ejIdx)}
                            className="p-1 rounded-md text-bad hover:bg-badbg">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {cambiando && cambiando.diaIdx === diaIdx && cambiando.ejIdx === ejIdx && (
                          <SelectorReemplazo
                            musculoSlug={ej.musculo_slug}
                            onElegir={(nuevo) => reemplazarEjercicio(diaIdx, ejIdx, nuevo)}
                            onCerrar={() => setCambiando(null)}
                          />
                        )}
                      </div>
                    ))}
                    <AgregarEjercicio onAgregar={(ej, musculoSlug) => agregarEjercicio(diaIdx, ej, musculoSlug)} />
                  </div>
                </div>
              ))}
            </div>

            <div className="sticky bottom-0 bg-panel border-t border-line px-6 py-4 flex flex-wrap gap-2 justify-end">
              <button onClick={() => abrirPlanEnPestana(plan)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-accentink transition-all duration-150 hover:scale-105 active:scale-95">
                <ExternalLink size={15} /> Ver plan
              </button>
              <button onClick={() => exportarPlanExcel(plan)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-line text-inksoft hover:bg-bg transition-all duration-150 hover:scale-105 active:scale-95">
                <FileSpreadsheet size={15} /> Excel con QR
              </button>
              <button onClick={enviarPorCorreo} disabled={enviando}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-line text-inksoft hover:bg-bg transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-50">
                <Mail size={15} /> {enviando ? "Enviando..." : "Enviar por correo"}
              </button>
            </div>
          </>
        )}
      </div>

      {aviso && (
        <AvisoModal titulo={aviso.titulo} mensaje={aviso.mensaje} tipo={aviso.tipo} onCerrar={() => setAviso(null)} />
      )}
    </div>
  );
}
