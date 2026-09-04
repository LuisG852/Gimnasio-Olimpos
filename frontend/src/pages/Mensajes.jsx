import React from "react";
import { useEffect, useState } from "react";
import { MessageCircle, CalendarClock, Receipt, BellOff, Mail, Send } from "lucide-react";
import { obtenerPlantillas, guardarPlantillas } from "../utils/whatsapp";
import { recordatoriosService, socioService, plantillaCorreoService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { puede } from "../utils/permisos";

const SECCIONES_WHATSAPP = [
  { id: "bienvenida", label: "Bienvenida", icon: MessageCircle, variables: "{nombre}" },
  { id: "recordatorio", label: "Recordatorio de pago", icon: CalendarClock, variables: "{nombre}, {tipo}, {monto}, {fecha}" },
  { id: "comprobante", label: "Comprobante de pago", icon: Receipt, variables: "{nombre}" },
  { id: "vencido", label: "Membresía vencida", icon: BellOff, variables: "{nombre}, {fecha}" },
];

// El "correo_" adelante es solo para que el id no choque con las
// secciones de WhatsApp de arriba (que usan "bienvenida", "comprobante",
// etc.) — la clave que se manda al backend es la misma sin el prefijo,
// ver claveBackend() más abajo.
const SECCIONES_CORREO = [
  { id: "correo_bienvenida", label: "Bienvenida", icon: Send, variables: "{nombre}, {gym}, {membresia}, {vencimiento}" },
  { id: "correo_comprobante", label: "Comprobante de pago", icon: Receipt, variables: "{nombre}, {gym}, {membresia}, {vencimiento}" },
  { id: "correo_recordatorio", label: "Recordatorio de vencimiento", icon: CalendarClock, variables: "{nombre}, {gym}, {membresia}, {vencimiento}, {precio}, {estado}" },
];

const SECCIONES = [
  ...SECCIONES_WHATSAPP,
  ...SECCIONES_CORREO,
  { id: "__correo__", label: "Probar envío de correos", icon: Mail, variables: null },
];

const claveBackend = (id) => id.replace("correo_", "");

export default function Mensajes() {
  const { usuario } = useAuth();
  const [form, setForm] = useState(obtenerPlantillas());
  const [seccion, setSeccion] = useState("bienvenida");
  const [guardado, setGuardado] = useState(false);

  const [plantillasCorreo, setPlantillasCorreo] = useState({});
  const [guardandoCorreo, setGuardandoCorreo] = useState(false);
  const [guardadoCorreo, setGuardadoCorreo] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const [socios, setSocios] = useState([]);
  const [socioElegido, setSocioElegido] = useState("");
  const [reenviando, setReenviando] = useState(false);
  const [resultadoReenvio, setResultadoReenvio] = useState(null);

  useEffect(() => {
    socioService.listar().then((res) => setSocios(res.data.filter((s) => s.correo)));
  }, []);

  useEffect(() => {
    plantillaCorreoService.listar().then((res) => setPlantillasCorreo(res.data));
  }, []);

  const guardar = () => {
    guardarPlantillas(form);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2000);
  };

  const guardarCorreo = async (idSeccion) => {
    const clave = claveBackend(idSeccion);
    const { asunto, cuerpo } = plantillasCorreo[clave];
    setGuardandoCorreo(true);
    try {
      await plantillaCorreoService.actualizar(clave, { asunto, cuerpo });
      setGuardadoCorreo(true);
      setTimeout(() => setGuardadoCorreo(false), 2000);
    } finally {
      setGuardandoCorreo(false);
    }
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
  const esSeccionCorreo = SECCIONES_CORREO.some((s) => s.id === seccion);
  const plantillaCorreoActual = esSeccionCorreo ? plantillasCorreo[claveBackend(seccion)] : null;

  return (
    <div className="flex gap-6 max-w-4xl">
      <nav className="w-56 shrink-0 space-y-1">
        <p className="px-4 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-inksoft/60">WhatsApp</p>
        {SECCIONES_WHATSAPP.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-left transition-all duration-150
              ${seccion === s.id ? "bg-accent text-accentink" : "text-inksoft hover:bg-panel"}`}
          >
            <s.icon size={16} /> {s.label}
          </button>
        ))}

        <p className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-wide text-inksoft/60">Correo</p>
        {SECCIONES_CORREO.map((s) => (
          <button
            key={s.id}
            onClick={() => setSeccion(s.id)}
            className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-left transition-all duration-150
              ${seccion === s.id ? "bg-accent text-accentink" : "text-inksoft hover:bg-panel"}`}
          >
            <s.icon size={16} /> {s.label}
          </button>
        ))}
        <button
          onClick={() => setSeccion("__correo__")}
          className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-left transition-all duration-150
            ${seccion === "__correo__" ? "bg-accent text-accentink" : "text-inksoft hover:bg-panel"}`}
        >
          <Mail size={16} /> Probar envío de correos
        </button>
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
      ) : esSeccionCorreo ? (
        <div className="flex-1 rounded-xl p-5 bg-panel border border-line space-y-3">
          <h3 className="font-display text-xl text-ink">{actual.label} (correo)</h3>
          <p className="text-xs text-inksoft">Variables disponibles: {actual.variables}</p>
          <p className="text-xs text-inksoft/70">
            El logo, la tabla con los datos de la membresía y el pie de página se arman
            aparte y no se pueden editar acá — solo el asunto y el mensaje.
          </p>

          {!plantillaCorreoActual ? (
            <p className="text-sm text-inksoft">Cargando...</p>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-inksoft">Asunto</label>
                <input
                  value={plantillaCorreoActual.asunto}
                  onChange={(e) => setPlantillasCorreo((p) => ({
                    ...p,
                    [claveBackend(seccion)]: { ...p[claveBackend(seccion)], asunto: e.target.value },
                  }))}
                  disabled={!puede(usuario, "mensajes", "editar_plantillas")}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none text-sm border border-line disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-inksoft">Mensaje</label>
                <textarea
                  rows={6}
                  value={plantillaCorreoActual.cuerpo}
                  onChange={(e) => setPlantillasCorreo((p) => ({
                    ...p,
                    [claveBackend(seccion)]: { ...p[claveBackend(seccion)], cuerpo: e.target.value },
                  }))}
                  disabled={!puede(usuario, "mensajes", "editar_plantillas")}
                  className="w-full mt-1 px-3 py-2 rounded-lg outline-none text-sm border border-line disabled:opacity-60"
                />
              </div>

              {puede(usuario, "mensajes", "editar_plantillas") && (
                <div className="flex justify-end">
                  <button onClick={() => guardarCorreo(seccion)} disabled={guardandoCorreo}
                    className="px-5 py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50">
                    {guardadoCorreo ? "Guardado ✓" : guardandoCorreo ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              )}
            </>
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
