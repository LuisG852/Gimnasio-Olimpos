import React from "react";
import { useEffect, useState } from "react";
import { Users, DollarSign, AlertTriangle, CheckCircle2, UserRound, Cake, BellRing, MessageCircle, BellOff, PackageX, CircleAlert, Check } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { socioService, comprobanteService, inventarioService, cajaService } from "../services/api";
import { estadoSocio, formatFecha, diasHasta, aplicarPlantilla, abrirWhatsapp, obtenerPlantillas } from "../utils/whatsapp";
import StatCard from "../components/StatCard";
import Badge from "../components/Badge";

const COLORES = { Mensual: "#6EE7B7", Trimestral: "#0E9A63", Semestral: "#D4AF37", Anual: "#D64545", Personalizado: "#8B5CF6" };
const TIPOS_PRINCIPALES = ["Mensual", "Trimestral", "Semestral", "Anual"];

function diasHastaCumple(fechaNacStr) {
  if (!fechaNacStr) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const nac = new Date(fechaNacStr + "T00:00:00");
  let proximo = new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate());
  if (proximo < hoy) proximo = new Date(hoy.getFullYear() + 1, nac.getMonth(), nac.getDate());
  return Math.round((proximo - hoy) / 86400000);
}

function textoCumple(dias) {
  if (dias === 0) return "¡Hoy! 🎉";
  if (dias === 1) return "Mañana";
  return `En ${dias} días`;
}

function nombreMes(mesISO) {
  const [anio, mes] = mesISO.split("-");
  const f = new Date(Number(anio), Number(mes) - 1, 1);
  return f.toLocaleDateString("es-GT", { month: "short" });
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [socios, setSocios] = useState([]);
  const [ingresosMensuales, setIngresosMensuales] = useState([]);
  const [stockBajo, setStockBajo] = useState([]);
  const [pendientes, setPendientes] = useState([]);

  const cargarPendientes = () => cajaService.pendientes().then((res) => setPendientes(res.data)).catch(() => {});

  useEffect(() => {
    socioService.estadisticas().then((res) => setStats(res.data)).catch(() => {});
    socioService.listar().then((res) => setSocios(res.data)).catch(() => {});
    comprobanteService.ingresosMensuales(6).then((res) => setIngresosMensuales(res.data)).catch(() => {});
    inventarioService.stockBajo().then((res) => setStockBajo(res.data)).catch(() => {});
    cargarPendientes();
  }, []);

  if (!stats) return <p className="text-inksoft">Cargando...</p>;

  const dataPorTipo = TIPOS_PRINCIPALES.map((tipo) => ({
    tipo,
    cantidad: stats.por_tipo[tipo] || 0,
  }));
  // Los planes con nombre propio (ej. "Plan Familiar") no encajan en
  // ninguno de los 4 estándar — antes simplemente no aparecían en esta
  // gráfica, como si esos socios no existieran. Se agrupan todos bajo
  // una sola columna "Personalizado" para que sí queden a la vista.
  const totalPersonalizados = Object.entries(stats.por_tipo)
    .filter(([tipo]) => !TIPOS_PRINCIPALES.includes(tipo))
    .reduce((suma, [, cantidad]) => suma + cantidad, 0);
  if (totalPersonalizados > 0) {
    dataPorTipo.push({ tipo: "Personalizado", cantidad: totalPersonalizados });
  }

  const dataIngresos = ingresosMensuales.map((i) => ({ mes: nombreMes(i.mes), total: i.total }));

  const proximos = [...socios]
    .sort((a, b) => diasHasta(a.fecha_vencimiento) - diasHasta(b.fecha_vencimiento))
    .slice(0, 5);

  const cumpleanios = socios
    .filter((s) => s.fecha_nacimiento)
    .map((s) => ({ ...s, diasCumple: diasHastaCumple(s.fecha_nacimiento) }))
    .filter((s) => s.diasCumple <= 7)
    .sort((a, b) => a.diasCumple - b.diasCumple);

  const plantillas = obtenerPlantillas();
  const pendientesRecordatorio = [...socios]
    .map((s) => ({ ...s, estado: estadoSocio(s) }))
    .filter((s) => s.estado.tone !== "good")
    .sort((a, b) => diasHasta(a.fecha_vencimiento) - diasHasta(b.fecha_vencimiento));

  const enviarRecordatorio = (s) => {
    const plantilla = s.estado.tone === "bad" ? plantillas.vencido : plantillas.recordatorio;
    abrirWhatsapp(s.telefono, aplicarPlantilla(plantilla, s));
  };

  return (
    <div className="space-y-6">
      {pendientes.length > 0 && (
        <div className="rounded-xl p-4 bg-warnbg border border-warn space-y-2">
          <p className="font-semibold text-warn flex items-center gap-2">
            <CircleAlert size={18} /> Tienes {pendientes.length} ingreso{pendientes.length === 1 ? "" : "s"} pendiente{pendientes.length === 1 ? "" : "s"} de sumar a Caja
          </p>
          <p className="text-xs text-inksoft">
            No se pudieron registrar porque la caja de ese día ya estaba cerrada. Ve a la pestaña
            Caja para agregarlos — ahí se van a quitar de esta lista solos, en cuanto los completes.
          </p>
          <div className="space-y-1.5 pt-1">
            {pendientes.map((p) => (
              <div key={p.id} className="text-sm bg-panel rounded-lg px-3 py-2 border border-line">
                <span className="text-ink font-semibold">{p.descripcion}</span>
                <span className="text-inksoft"> — Q{Number(p.monto).toFixed(2)} — {p.fecha}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <StatCard icon={Users} label="Total de socios" value={stats.total} />
        <StatCard icon={CheckCircle2} label="Socios activos" value={stats.activos} toneClass="text-good" />
        <StatCard icon={AlertTriangle} label="Membresías vencidas" value={stats.vencidos} toneClass="text-bad" />
        <StatCard icon={DollarSign} label="Ingresos estimados este mes" value={`Q${stats.ingresos_mes.toLocaleString()}`} toneClass="text-good" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-5 bg-panel border border-line">
          <h3 className="font-display text-xl mb-4 text-ink">Ingresos de los últimos 6 meses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dataIngresos}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DEE4E2" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#64767A" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#64767A" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `Q${v.toLocaleString()}`} cursor={{ stroke: "#EEF1EF" }} />
              <Line type="monotone" dataKey="total" stroke="#FFD600" strokeWidth={3} dot={{ fill: "#003F7D", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-5 bg-panel border border-line">
          <h3 className="font-display text-xl mb-4 text-ink">Socios por tipo de membresía</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dataPorTipo}>
              <CartesianGrid strokeDasharray="3 3" stroke="#DEE4E2" vertical={false} />
              <XAxis dataKey="tipo" tick={{ fontSize: 12, fill: "#64767A" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64767A" }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#EEF1EF" }} />
              <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                {dataPorTipo.map((d) => <Cell key={d.tipo} fill={COLORES[d.tipo]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl p-5 bg-panel border border-line">
        <h3 className="font-display text-xl mb-1 text-ink flex items-center gap-2">
          <BellRing size={20} className="text-accent" /> Recordatorios pendientes hoy
        </h3>
        <p className="text-xs text-inksoft mb-4">Socios por vencer o ya vencidos — un clic les manda el mensaje.</p>
        {pendientesRecordatorio.length === 0 ? (
          <p className="text-sm text-inksoft">Nadie necesita un recordatorio hoy. 🎉</p>
        ) : (
          <ul className="space-y-2">
            {pendientesRecordatorio.map((s) => (
              <li key={s.id} className="flex items-center justify-between text-sm py-1.5">
                <div className="flex items-center gap-2">
                  <UserRound size={16} className="text-inksoft" />
                  <span className="text-ink">{s.nombre} {s.apellido}</span>
                  <Badge tone={s.estado.tone}>{s.estado.label}</Badge>
                </div>
                <button onClick={() => enviarRecordatorio(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 hover:scale-105 active:scale-95 ${
                    s.estado.tone === "bad" ? "bg-badbg text-bad" : "bg-warnbg text-warn"
                  }`}>
                  {s.estado.tone === "bad" ? <BellOff size={14} /> : <MessageCircle size={14} />}
                  Avisar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl p-5 bg-panel border border-line">
        <h3 className="font-display text-xl mb-1 text-ink flex items-center gap-2">
          <PackageX size={20} className="text-bad" /> Stock bajo en Inventario
        </h3>
        <p className="text-xs text-inksoft mb-4">Productos que ya llegaron al mínimo que configuraste.</p>
        {stockBajo.length === 0 ? (
          <p className="text-sm text-inksoft">Todo el inventario está en buen nivel. 👍</p>
        ) : (
          <ul className="space-y-2">
            {stockBajo.map((p) => (
              <li key={p.id} className="flex items-center justify-between text-sm py-1.5">
                <span className="text-ink">{p.nombre}</span>
                <span className="font-semibold text-bad">Quedan {p.cantidad} (mínimo {p.stock_minimo})</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl p-5 bg-panel border border-line">
          <h3 className="font-display text-xl mb-4 text-ink">Próximos vencimientos</h3>
          {proximos.length === 0 ? (
            <p className="text-sm text-inksoft">Todavía no hay socios cargados.</p>
          ) : (
            <ul className="space-y-3">
              {proximos.map((s) => {
                const estado = estadoSocio(s);
                return (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <UserRound size={16} className="text-inksoft" />
                      <span className="text-ink">{s.nombre} {s.apellido}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-inksoft">{formatFecha(s.fecha_vencimiento)}</span>
                      <Badge tone={estado.tone}>{estado.label}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl p-5 bg-panel border border-line">
          <h3 className="font-display text-xl mb-4 text-ink flex items-center gap-2">
            <Cake size={20} className="text-accent" /> Próximos cumpleaños
          </h3>
          {cumpleanios.length === 0 ? (
            <p className="text-sm text-inksoft">Nadie cumple años en los próximos 7 días.</p>
          ) : (
            <ul className="space-y-3">
              {cumpleanios.map((s) => (
                <li key={s.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <UserRound size={16} className="text-inksoft" />
                    <span className="text-ink">{s.nombre} {s.apellido}</span>
                  </div>
                  <span className={`font-semibold ${s.diasCumple === 0 ? "text-gold" : "text-inksoft"}`}>
                    {textoCumple(s.diasCumple)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
