import React from "react";
import { useEffect, useMemo, useState } from "react";
import { Search, EyeOff, Eye } from "lucide-react";
import { ejercicioService } from "../services/api";

const NOMBRES_MUSCULO = {
  quads: "Cuádriceps", hamstrings: "Femorales", glutes: "Glúteos",
  pectorals: "Pecho", "upper-back": "Espalda alta", lats: "Dorsales",
  delts: "Hombros", abs: "Abdomen", cardio: "Cardio",
  biceps: "Bíceps", triceps: "Tríceps", calves: "Pantorrillas",
  abductors: "Abductores", adductors: "Aductores", forearms: "Antebrazos",
  "levator-scapulae": "Elevador de la escápula", "serratus-anterior": "Serrato anterior",
  spine: "Espalda baja", traps: "Trapecios",
};

export default function Ejercicios() {
  const [ejercicios, setEjercicios] = useState([]);
  const [musculos, setMusculos] = useState([]);
  const [musculoElegido, setMusculoElegido] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("activos"); // activos | inactivos | todos
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    ejercicioService.musculos().then((res) => setMusculos(res.data));
  }, []);

  const cargar = () => {
    setCargando(true);
    const params = {};
    if (musculoElegido) params.musculo = musculoElegido;
    if (busqueda) params.buscar = busqueda;
    if (filtroActivo !== "todos") params.activo = filtroActivo === "activos";
    ejercicioService.listar(params).then((res) => {
      setEjercicios(res.data);
      setCargando(false);
    });
  };

  useEffect(() => { cargar(); }, [musculoElegido, filtroActivo]);

  const buscar = (e) => {
    e.preventDefault();
    cargar();
  };

  const alternarActivo = async (ej) => {
    await ejercicioService.actualizar(ej.id, !ej.activo);
    setEjercicios((prev) => prev.map((e) => (e.id === ej.id ? { ...e, activo: !e.activo } : e)));
  };

  const contador = useMemo(() => `${ejercicios.length} ejercicio${ejercicios.length === 1 ? "" : "s"}`, [ejercicios]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl text-ink">Biblioteca de ejercicios</h2>
        <p className="text-sm text-inksoft">
          Oculta los que no se pueden hacer en tu gimnasio — no se borran, solo dejan de
          aparecer en los planes de entrenamiento recomendados.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <form onSubmit={buscar} className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={16} className="text-inksoft" />
          <input
            placeholder="Buscar por nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full px-3 py-2 rounded-lg outline-none border border-line bg-panel text-sm"
          />
        </form>

        <select value={musculoElegido} onChange={(e) => setMusculoElegido(e.target.value)}
          className="px-3 py-2 rounded-lg outline-none border border-line bg-panel text-sm">
          <option value="">Todos los músculos</option>
          {musculos.map((m) => <option key={m} value={m}>{NOMBRES_MUSCULO[m] || m}</option>)}
        </select>

        <div className="flex gap-1 rounded-full p-1 bg-bg border border-line">
          {[{ id: "activos", label: "Activos" }, { id: "inactivos", label: "Ocultos" }, { id: "todos", label: "Todos" }].map((f) => (
            <button key={f.id} onClick={() => setFiltroActivo(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150
                ${filtroActivo === f.id ? "bg-accent text-accentink" : "text-inksoft hover:bg-panel"}`}>
              {f.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-inksoft">{contador}</span>
      </div>

      <div className="rounded-xl overflow-hidden bg-panel border border-line">
        {cargando ? (
          <p className="p-4 text-sm text-inksoft">Cargando...</p>
        ) : ejercicios.length === 0 ? (
          <p className="p-4 text-sm text-inksoft">No hay ejercicios que coincidan con el filtro.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left px-4 py-2.5 font-semibold uppercase text-xs text-inksoft">Gif</th>
                <th className="text-left px-4 py-2.5 font-semibold uppercase text-xs text-inksoft">Nombre</th>
                <th className="text-left px-4 py-2.5 font-semibold uppercase text-xs text-inksoft">Músculo</th>
                <th className="text-left px-4 py-2.5 font-semibold uppercase text-xs text-inksoft"></th>
              </tr>
            </thead>
            <tbody>
              {ejercicios.map((ej) => (
                <tr key={ej.id} className={`border-b border-line ${!ej.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2">
                    <img src={ej.gif_url} alt={ej.nombre} className="w-14 h-14 object-cover rounded-lg border border-line" />
                  </td>
                  <td className="px-4 py-2 text-ink font-semibold">{ej.nombre}</td>
                  <td className="px-4 py-2 text-inksoft">{NOMBRES_MUSCULO[ej.musculo] || ej.musculo}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => alternarActivo(ej)}
                      title={ej.activo ? "Ocultar de los planes" : "Volver a mostrar"}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ml-auto transition-all duration-150 hover:scale-105 active:scale-95
                        ${ej.activo ? "border border-line text-inksoft hover:bg-bg" : "bg-accent text-accentink"}`}>
                      {ej.activo ? <><EyeOff size={13} /> Ocultar</> : <><Eye size={13} /> Mostrar</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
