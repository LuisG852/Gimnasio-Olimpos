import React from "react";
import { useEffect, useState } from "react";
import { MessageCircle, CalendarClock, Receipt, BellOff, Mail } from "lucide-react";
import { obtenerPlantillas, guardarPlantillas } from "../utils/whatsapp";
import { recordatoriosService, socioService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { puede } from "../utils/permisos";

const SECCIONES = [
  { id: "bienvenida", label: "Bienvenida", icon: MessageCircle, variables: "{nombre}" },
  { id: "recordatorio", label: "Recordatorio de pago", icon: CalendarClock, variables: "{nombre}, {tipo}, {monto}, {fecha}" },
  { id: "comprobante", label: "Comprobante de pago", icon: Receipt, variables: "{nombre}" },
  { id: "vencido", label: "Membresía vencida", icon: BellOff, variables: "{nombre}, {fecha}" },
  { id: "__correo__", label: "Recordatorio por correo", icon: Mail, variables: null },
];

export default function Mensajes() {
  const { usuario } = useAuth();
  const [form, setForm] = useState(obtenerPlantillas());
  const [seccion, setSeccion] = useState("bienvenida");
  const [guardado, setGuardado] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const [socios, setSocios] = useState([]);
  const [socioElegido, setSocioElegido] = useState("");
  const [reenviando, setReenviando] = useState(false);
  const [resultadoReenvio, setResultadoReenvio] = useState(null);

  useEffect(() => {
    socioService.listar().then((res) => setSocios(res.data.filter((s) => s.correo)));
  }, []);

  const guardar = () => {
    guardarPlantillas(form);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  const probarEnvio = async () => {
    setEnviando(true);
    setResultado(null);
    try {
      const res = await recordatoriosService.enviarAhora();
      setResultado(res.data);
    } catch (error) {
      setResultado({ error: error?.response?.data?.detail || "No se pudo conectar con el servidor." });
    } finally {
      setEnviando(false);
    }
  };

  const reenviarASocio = async () => {
    if (!socioElegido) return;
    setReenviando(true);
    setResultadoReenvio(null);
    try {
      const res = await recordatoriosService.reenviarASocio(socioElegido);
      setResultadoReenvio(res.data);
    } catch (error) {
      setResultadoReenvio({ ok: false, error: error?.response?.data?.detail || "No se pudo conectar con el servidor." });
    } finally {
      setReenviando(false);
    }
  };

  const actual = SECCIONES.find((s) => s.id === seccion);

  return (
    <div className="flex gap-6 max-w-4xl">
      <nav className="w-56 shrink-0 space-y-1">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-left transition-all duration-150
              ${seccion === s.id ? "bg-accent text-accentink" : "text-inksoft hover:bg-panel"}`}
          >
            <s.icon size={16} /> {s.label}
          </button>
        ))}
      </nav>

      {actual.id === "__correo__" ? (
        <div className="flex-1 space-y-6">
          <div className="rounded-xl p-5 bg-panel border border-line space-y-4">
            <h3 className="font-display text-xl text-ink flex items-center gap-2">
              <Mail size={18} /> Recordatorio de vencimiento por correo
            </h3>
            <p className="text-sm text-inksoft">
              El sistema revisa automáticamente, cada 6 horas mientras el sistema está
              abierto, qué socios están por vencer (según los días de aviso configurados
              en el archivo <code>.env</code> del backend) y les manda un correo. A cada
              socio solo se le manda un aviso por cada vencimiento, no se repite.
            </p>
            <p className="text-sm text-inksoft">
              Puedes ver el historial completo de correos enviados (a quién, cuándo, si se
              abrieron) entrando a tu cuenta de Brevo → Estadísticas → Transaccional.
            </p>

            {puede(usuario, "mensajes", "enviar_recordatorios") && (
              <button onClick={probarEnvio} disabled={enviando}
                className="px-5 py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50">
                {enviando ? "Enviando..." : "Revisar y enviar vencimientos ahora"}
              </button>
            )}

            {resultado && (
              <div className="rounded-lg p-3 text-sm bg-bg border border-line">
                {resultado.error ? (
                  <p className="text-bad">{resultado.error}</p>
                ) : (
                  <>
                    <p className="text-good">Enviados: {resultado.enviados.length}</p>
                    {resultado.fallidos.length > 0 && (
                      <p className="text-bad">Fallaron: {resultado.fallidos.join(", ")}</p>
                    )}
                    {resultado.enviados.length === 0 && resultado.fallidos.length === 0 && (
                      <p className="text-inksoft">No había ningún socio por avisar en este momento.</p>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {puede(usuario, "mensajes", "enviar_recordatorios") && (
          <div className="rounded-xl p-5 bg-panel border border-line space-y-4">
            <h3 className="font-display text-lg text-ink">Reenviar a un socio en específico</h3>
            <p className="text-sm text-inksoft">
              Útil para probar cómo se ve el correo, sin esperar a que le toque su turno
              automático. No afecta el control de "ya se le avisó" del envío normal.
            </p>

            <div className="flex gap-2">
              <select value={socioElegido} onChange={(e) => setSocioElegido(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg outline-none border border-line bg-panel text-sm">
                <option value="">Elegí un socio con correo registrado...</option>
                {socios.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre} {s.apellido} — {s.correo}</option>
                ))}
              </select>
              <button onClick={reenviarASocio} disabled={!socioElegido || reenviando}
                className="px-5 py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 whitespace-nowrap">
                {reenviando ? "Enviando..." : "Reenviar"}
              </button>
            </div>

            {socios.length === 0 && (
              <p className="text-xs text-inksoft">Ningún socio tiene correo registrado todavía.</p>
            )}

            {resultadoReenvio && (
              <div className="rounded-lg p-3 text-sm bg-bg border border-line">
                {resultadoReenvio.ok ? (
                  <p className="text-good">Correo reenviado correctamente.</p>
                ) : (
                  <p className="text-bad">{resultadoReenvio.error}</p>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      ) : (
        <div className="flex-1 rounded-xl p-5 bg-panel border border-line space-y-3">
          <h3 className="font-display text-xl text-ink">{actual.label}</h3>
          <p className="text-xs text-inksoft">Variables disponibles: {actual.variables}</p>

          <textarea
            rows={8}
            value={form[actual.id]}
            onChange={(e) => setForm((f) => ({ ...f, [actual.id]: e.target.value }))}
            disabled={!puede(usuario, "mensajes", "editar_plantillas")}
            className="w-full px-3 py-2 rounded-lg outline-none text-sm border border-line disabled:opacity-60"
          />

          {puede(usuario, "mensajes", "editar_plantillas") && (
            <div className="flex justify-end">
              <button onClick={guardar}
                className="px-5 py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-105 active:scale-95">
                {guardado ? "Guardado ✓" : "Guardar"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
