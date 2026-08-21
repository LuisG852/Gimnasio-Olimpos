import React from "react";
import { useEffect, useState } from "react";
import { History, User, Wallet, ShoppingBag, PackagePlus, Receipt, DoorOpen } from "lucide-react";
import { actividadService } from "../services/api";

const DIAS_OPCIONES = [
  { value: 7, label: "Últimos 7 días" },
  { value: 30, label: "Últimos 30 días" },
  { value: 90, label: "Últimos 3 meses" },
];

const ICONOS_POR_TIPO = {
  "Apertura de caja": DoorOpen,
  "Ingreso en Caja": Wallet,
  "Gasto en Caja": Wallet,
  "Pago de socio": Receipt,
  "Venta de producto": ShoppingBag,
  "Compra de inventario": PackagePlus,
};

function iconoPara(tipo) {
  if (ICONOS_POR_TIPO[tipo]) return ICONOS_POR_TIPO[tipo];
  if (tipo.startsWith("Gasto")) return Wallet;
  return History;
}

export default function Actividad() {
  const [eventos, setEventos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [dias, setDias] = useState(30);
  const [usuarioId, setUsuarioId] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    actividadService.usuarios().then((res) => setUsuarios(res.data));
  }, []);

  useEffect(() => {
    setCargando(true);
    actividadService.listar(dias, usuarioId || null).then((res) => {
      setEventos(res.data);
      setCargando(false);
    });
  }, [dias, usuarioId]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl text-ink flex items-center gap-2">
          <History size={22} className="text-accent" /> Actividad
        </h2>
        <p className="text-sm text-inksoft">
          Quién registró cada pago, gasto, venta, compra y movimiento de caja del sistema.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-full p-1 bg-bg border border-line">
          {DIAS_OPCIONES.map((d) => (
            <button key={d.value} onClick={() => setDias(d.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150
                ${dias === d.value ? "bg-accent text-accentink" : "text-inksoft hover:bg-panel"}`}>
              {d.label}
            </button>
          ))}
        </div>
        <select value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)}
          className="px-3 py-2 rounded-lg outline-none border border-line bg-panel text-sm">
          <option value="">Todos los usuarios</option>
          {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
      </div>

      <div className="rounded-xl bg-panel border border-line divide-y divide-line">
        {cargando ? (
          <p className="p-4 text-sm text-inksoft">Cargando...</p>
        ) : eventos.length === 0 ? (
          <p className="p-4 text-sm text-inksoft">No hay actividad registrada en este rango.</p>
        ) : (
          eventos.map((ev, i) => {
            const Icono = iconoPara(ev.tipo);
            return (
              <div key={i} className="flex items-start gap-3 p-3.5">
                <div className="p-2 rounded-full bg-accent/20 shrink-0">
                  <Icono size={15} className="text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-ink">{ev.tipo}</span>
                    <span className="text-xs text-inksoft">·</span>
                    <span className="text-xs text-inksoft flex items-center gap-1">
                      <User size={11} /> {ev.usuario}
                    </span>
                  </div>
                  <p className="text-sm text-ink mt-0.5">{ev.detalle}</p>
                </div>
                <span className="text-xs text-inksoft shrink-0">
                  {ev.fecha}{ev.hora ? ` ${ev.hora}` : ""}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
