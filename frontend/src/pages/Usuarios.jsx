import React from "react";
import { useEffect, useState, useRef } from "react";
import { UserPlus, Pencil, Trash2, X, DatabaseBackup, UploadCloud, Coins, Tag } from "lucide-react";
import { usuarioService, backupService, configuracionService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import ConfirmModal from "../components/ConfirmModal";
import AvisoModal from "../components/AvisoModal";
import RestaurarBackupModal from "../components/RestaurarBackupModal";
import PermisosForm from "../components/PermisosForm";

const FORM_VACIO = { nombre: "", usuario: "", password: "", password_admin_actual: "", es_admin: false, activo: true };

export default function Usuarios() {
  const { logout } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [permisosForm, setPermisosForm] = useState({});
  const [modulosDisponibles, setModulosDisponibles] = useState({});
  const [editandoId, setEditandoId] = useState(null);
  const [error, setError] = useState("");
  const [eliminando, setEliminando] = useState(null);
  const [descargandoBackup, setDescargandoBackup] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [probandoAuto, setProbandoAuto] = useState(false);
  const [resultadoAuto, setResultadoAuto] = useState(null);
  const [archivoRestaurar, setArchivoRestaurar] = useState(null);
  const [passwordRestaurar, setPasswordRestaurar] = useState("");
  const [restaurando, setRestaurando] = useState(false);
  const [estadoBackup, setEstadoBackup] = useState(null);
  const [cuotaInscripcion, setCuotaInscripcion] = useState("");
  const [guardandoCuota, setGuardandoCuota] = useState(false);
  const [preciosForm, setPreciosForm] = useState({
    precio_mensual: "", descuento_trimestral: "", descuento_semestral: "", descuento_anual: "",
  });
  const [preciosCalculados, setPreciosCalculados] = useState(null);
  const [guardandoPrecios, setGuardandoPrecios] = useState(false);
  const inputArchivoRef = useRef(null);

  useEffect(() => {
    usuarioService.modulosPermisos().then(({ data }) => setModulosDisponibles(data));
  }, []);

  const cargar = () => usuarioService.listar().then((res) => setUsuarios(res.data));
  useEffect(() => { cargar(); }, []);
  useEffect(() => { backupService.estado().then(({ data }) => setEstadoBackup(data)).catch(() => {}); }, []);
  useEffect(() => {
    configuracionService.obtenerCuotaInscripcion().then(({ data }) => setCuotaInscripcion(String(data.cuota_inscripcion)));
  }, []);
  useEffect(() => {
    configuracionService.obtenerPreciosMembresia().then(({ data }) => {
      setPreciosForm({
        precio_mensual: String(data.precio_mensual),
        descuento_trimestral: String(data.descuento_trimestral),
        descuento_semestral: String(data.descuento_semestral),
        descuento_anual: String(data.descuento_anual),
      });
      setPreciosCalculados(data.precios);
    });
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const guardarCuotaInscripcion = async () => {
    const valor = Number(cuotaInscripcion);
    if (Number.isNaN(valor) || valor < 0) {
      setAviso({ titulo: "Valor inválido", tipo: "advertencia", mensaje: "La cuota de inscripción debe ser un número de 0 o más." });
      return;
    }
    setGuardandoCuota(true);
    try {
      await configuracionService.actualizarCuotaInscripcion(valor);
      setAviso({ titulo: "Guardado", tipo: "exito", mensaje: `La cuota de inscripción quedó en Q${valor}.` });
    } catch (error) {
      setAviso({
        titulo: "No se pudo guardar",
        tipo: "advertencia",
        mensaje: error?.response?.data?.detail || "No se pudo actualizar la cuota de inscripción.",
      });
    } finally {
      setGuardandoCuota(false);
    }
  };

  const guardarPreciosMembresia = async () => {
    const datos = {
      precio_mensual: Number(preciosForm.precio_mensual),
      descuento_trimestral: Number(preciosForm.descuento_trimestral),
      descuento_semestral: Number(preciosForm.descuento_semestral),
      descuento_anual: Number(preciosForm.descuento_anual),
    };
    if (Object.values(datos).some((v) => Number.isNaN(v) || v < 0)) {
      setAviso({ titulo: "Valores inválidos", tipo: "advertencia", mensaje: "Revisá que todos los campos sean números de 0 o más." });
      return;
    }
    setGuardandoPrecios(true);
    try {
      const { data } = await configuracionService.actualizarPreciosMembresia(datos);
      setPreciosCalculados(data.precios);
      setAviso({ titulo: "Guardado", tipo: "exito", mensaje: "Los precios de las membresías se actualizaron." });
    } catch (error) {
      setAviso({
        titulo: "No se pudo guardar",
        tipo: "advertencia",
        mensaje: error?.response?.data?.detail || "No se pudieron actualizar los precios.",
      });
    } finally {
      setGuardandoPrecios(false);
    }
  };

  const empezarEdicion = (u) => {
    setEditandoId(u.id);
    setForm({ nombre: u.nombre, usuario: u.usuario, password: "", password_admin_actual: "", es_admin: u.es_admin, activo: u.activo });
    setPermisosForm(u.permisos || {});
    setError("");
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setPermisosForm({});
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = { ...form, permisos: permisosForm };
    try {
      if (editandoId) {
        await usuarioService.actualizar(editandoId, payload);
      } else {
        await usuarioService.crear(payload);
      }
      setForm(FORM_VACIO);
      setPermisosForm({});
      setEditandoId(null);
      cargar();
    } catch (err) {
      setError(err?.response?.data?.detail || "No se pudo guardar el usuario.");
    }
  };

  const confirmarEliminar = async () => {
    try {
      await usuarioService.eliminar(eliminando.id);
      setEliminando(null);
      cargar();
    } catch (err) {
      setEliminando(null);
      setAviso({ titulo: "No se pudo eliminar", tipo: "advertencia", mensaje: err?.response?.data?.detail || "No se pudo eliminar el usuario." });
    }
  };

  const descargarBackup = async () => {
    setDescargandoBackup(true);
    try {
      const { data } = await backupService.descargar();
      const blob = new Blob([data], { type: "application/sql" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_gimnasio_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setAviso({ titulo: "No se pudo generar el backup", tipo: "advertencia", mensaje: "Revisá que pg_dump esté instalado y accesible." });
    } finally {
      setDescargandoBackup(false);
    }
  };

  const probarBackupAutomatico = async () => {
    setProbandoAuto(true);
    setResultadoAuto(null);
    try {
      const { data } = await backupService.ejecutarAhora();
      setResultadoAuto(data);
      backupService.estado().then(({ data }) => setEstadoBackup(data)).catch(() => {});
    } catch (err) {
      setResultadoAuto({ generado: false, motivo: "No se pudo conectar con el servidor." });
    } finally {
      setProbandoAuto(false);
    }
  };

  const elegirArchivoRestaurar = (e) => {
    const archivo = e.target.files?.[0];
    if (archivo) setArchivoRestaurar(archivo);
    e.target.value = ""; // para poder volver a elegir el mismo archivo si cancela y reintenta
  };

  const cancelarRestaurar = () => {
    if (restaurando) return;
    setArchivoRestaurar(null);
    setPasswordRestaurar("");
  };

  const confirmarRestaurar = async () => {
    setRestaurando(true);
    try {
      await backupService.restaurar(archivoRestaurar, passwordRestaurar);
      setArchivoRestaurar(null);
      setPasswordRestaurar("");
      setAviso({
        titulo: "Restauración completada",
        tipo: "exito",
        mensaje: "Los datos del sistema ya fueron reemplazados. Por seguridad, ahora vas a tener que iniciar sesión de nuevo.",
        forzarLogout: true,
      });
    } catch (err) {
      setAviso({
        titulo: "No se pudo restaurar",
        tipo: "advertencia",
        mensaje: err?.response?.data?.detail || "No se pudo restaurar el respaldo. No se modificó ningún dato.",
      });
    } finally {
      setRestaurando(false);
    }
  };

  const cerrarAviso = () => {
    const debeCerrarSesion = aviso?.forzarLogout;
    setAviso(null);
    if (debeCerrarSesion) logout();
  };

  return (
    <div className="max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-6">
      <div className="rounded-xl p-5 bg-panel border border-line flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg text-ink flex items-center gap-2">
            <DatabaseBackup size={18} className="text-accent" /> Backup de la base de datos
          </h3>
          <p className="text-xs text-inksoft mt-1">Descarga un archivo .sql con todos los datos del sistema, para guardarlo o pasarlo a otra computadora.</p>
        </div>
        <button onClick={descargarBackup} disabled={descargandoBackup}
          className="px-4 py-2.5 rounded-lg font-semibold border border-line text-inksoft transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60 shrink-0">
          {descargandoBackup ? "Generando..." : "Descargar backup"}
        </button>
      </div>

      <div className="rounded-xl p-5 bg-panel border border-line space-y-3">
        <div>
          <h3 className="font-display text-lg text-ink flex items-center gap-2">
            <DatabaseBackup size={18} className="text-accent" /> Respaldo automático diario
          </h3>
          <p className="text-xs text-inksoft mt-1">
            Mientras el sistema esté abierto, se genera solo un respaldo por día en la carpeta
            configurada en <code>BACKUP_DIR</code> del <code>.env</code>, y se borran los que ya
            pasaron los días de retención (<code>BACKUP_DIAS_RETENCION</code>).
          </p>
        </div>

        {estadoBackup && (
          <div className="rounded-lg p-3 text-sm bg-bg border border-line space-y-1">
            {estadoBackup.ultimo_intento_fecha ? (
              <>
                <p className={estadoBackup.ultimo_intento_generado ? "text-good" : "text-bad"}>
                  Último intento: {estadoBackup.ultimo_intento_fecha} {estadoBackup.ultimo_intento_hora} —{" "}
                  {estadoBackup.ultimo_intento_generado ? "exitoso" : `falló (${estadoBackup.ultimo_intento_motivo || "motivo desconocido"})`}
                </p>
                <p className="text-inksoft">
                  {estadoBackup.ultimo_exitoso_fecha
                    ? `Último respaldo exitoso: ${estadoBackup.ultimo_exitoso_fecha} (hace ${estadoBackup.dias_desde_ultimo_exitoso} día(s))`
                    : "Todavía no se ha generado ningún respaldo exitoso."}
                </p>
              </>
            ) : (
              <p className="text-inksoft">Todavía no se ha intentado generar ningún respaldo.</p>
            )}
          </div>
        )}

        <button onClick={probarBackupAutomatico} disabled={probandoAuto}
          className="px-4 py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60">
          {probandoAuto ? "Generando..." : "Probar ahora"}
        </button>
        {resultadoAuto && (
          <div className="rounded-lg p-3 text-sm bg-bg border border-line">
            {resultadoAuto.generado ? (
              <p className="text-good">Respaldo generado en: {resultadoAuto.ruta}</p>
            ) : (
              <p className="text-warn">{resultadoAuto.motivo || "Ya existía un respaldo de hoy."}</p>
            )}
            {resultadoAuto.borrados > 0 && (
              <p className="text-inksoft">Se borraron {resultadoAuto.borrados} respaldo(s) viejo(s).</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl p-5 bg-panel border border-line space-y-3">
        <div>
          <h3 className="font-display text-lg text-ink flex items-center gap-2">
            <Coins size={18} className="text-accent" /> Cuota de inscripción
          </h3>
          <p className="text-xs text-inksoft mt-1">
            Monto que se cobra, aparte del plan, solo la primera vez que se inscribe un socio nuevo — nunca en
            renovaciones. Se aplica automáticamente al registrar un socio.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div>
            <label className="text-xs font-semibold text-inksoft">Monto (Q)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={cuotaInscripcion}
              onChange={(e) => setCuotaInscripcion(e.target.value)}
              className="w-32 mt-1 px-3 py-2 rounded-lg outline-none border border-line"
            />
          </div>
          <button
            onClick={guardarCuotaInscripcion}
            disabled={guardandoCuota}
            className="px-4 py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
          >
            {guardandoCuota ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="rounded-xl p-5 bg-panel border border-line space-y-3">
        <div>
          <h3 className="font-display text-lg text-ink flex items-center gap-2">
            <Tag size={18} className="text-accent" /> Precios de membresías
          </h3>
          <p className="text-xs text-inksoft mt-1">
            Trimestral, Semestral y Anual se calculan solos a partir de la mensualidad y el % de
            descuento que le pongas a cada uno — no hay que definir cada precio por separado.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-inksoft">Mensualidad (Q)</label>
          <input
            type="number" min="0" step="0.01"
            value={preciosForm.precio_mensual}
            onChange={(e) => setPreciosForm((f) => ({ ...f, precio_mensual: e.target.value }))}
            className="w-32 mt-1 px-3 py-2 rounded-lg outline-none border border-line"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { clave: "descuento_trimestral", label: "Descuento Trimestral (%)", plan: "Trimestral" },
            { clave: "descuento_semestral", label: "Descuento Semestral (%)", plan: "Semestral" },
            { clave: "descuento_anual", label: "Descuento Anual (%)", plan: "Anual" },
          ].map(({ clave, label, plan }) => (
            <div key={clave}>
              <label className="text-xs font-semibold text-inksoft">{label}</label>
              <input
                type="number" min="0" max="100" step="0.01"
                value={preciosForm[clave]}
                onChange={(e) => setPreciosForm((f) => ({ ...f, [clave]: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line"
              />
              {preciosCalculados && (
                <p className="text-xs text-inksoft mt-1">Queda en Q{preciosCalculados[plan]}</p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={guardarPreciosMembresia}
          disabled={guardandoPrecios}
          className="px-4 py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-60"
        >
          {guardandoPrecios ? "Guardando..." : "Guardar precios"}
        </button>
      </div>

      <div className="rounded-xl p-5 bg-badbg border border-bad space-y-3">
        <div>
          <h3 className="font-display text-lg text-bad flex items-center gap-2">
            <UploadCloud size={18} /> Restaurar backup
          </h3>
          <p className="text-xs text-inksoft mt-1">
            Reemplaza TODOS los datos actuales del sistema con los de un archivo .sql que hayas
            respaldado antes. Se te va a pedir tu contraseña para confirmar, y se guarda un respaldo
            del estado actual antes de aplicar cualquier cambio, por si acaso. Solo funciona con
            respaldos generados por este sistema después de esta actualización.
          </p>
        </div>
        <input
          ref={inputArchivoRef}
          type="file"
          accept=".sql"
          onChange={elegirArchivoRestaurar}
          className="hidden"
        />
        <button
          onClick={() => inputArchivoRef.current?.click()}
          className="px-4 py-2.5 rounded-lg font-semibold border border-bad text-bad transition-all duration-200 hover:scale-105 active:scale-95"
        >
          Restaurar desde archivo...
        </button>
      </div>
      </div>

      <div className="space-y-6">
      <form onSubmit={submit} className="rounded-xl p-5 bg-panel border border-line space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl text-ink flex items-center gap-2">
            <UserPlus size={20} className="text-accent" /> {editandoId ? "Editar usuario" : "Nuevo usuario"}
          </h3>
          {editandoId && (
            <button type="button" onClick={cancelarEdicion} className="p-1 rounded-full hover:opacity-70">
              <X size={18} className="text-inksoft" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-inksoft">Nombre completo</label>
            <input required value={form.nombre} onChange={(e) => set("nombre", e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
          </div>
          <div>
            <label className="text-xs font-semibold text-inksoft">Usuario (para ingresar)</label>
            <input required value={form.usuario} onChange={(e) => set("usuario", e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-inksoft">
            Contraseña {editandoId && <span className="font-normal">(dejar en blanco para no cambiarla)</span>}
          </label>
          <input type="password" required={!editandoId} value={form.password} onChange={(e) => set("password", e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
        </div>

        {editandoId && form.password && (
          <div className="rounded-lg p-3 bg-warnbg border border-warn">
            <label className="text-xs font-semibold text-warn">
              Por seguridad, confirmá TU propia contraseña para cambiar la de este usuario
            </label>
            <input type="password" required value={form.password_admin_actual}
              onChange={(e) => set("password_admin_actual", e.target.value)}
              placeholder="Tu contraseña actual"
              className="w-full mt-1 px-3 py-2 rounded-lg outline-none border border-line" />
          </div>
        )}

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.es_admin} onChange={(e) => set("es_admin", e.target.checked)} />
            Permisos de administrador
          </label>
          {editandoId && (
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} />
              Usuario activo
            </label>
          )}
        </div>

        {!form.es_admin && (
          <div>
            <label className="text-xs font-semibold text-inksoft mb-2 block">
              Qué puede ver y hacer este usuario
            </label>
            <PermisosForm modulos={modulosDisponibles} permisos={permisosForm} onChange={setPermisosForm} />
          </div>
        )}

        {error && <div className="rounded-lg p-2.5 text-sm bg-badbg text-bad">{error}</div>}

        <button type="submit"
          className="px-5 py-2.5 rounded-lg font-semibold bg-accent text-accentink transition-all duration-200 hover:scale-105 active:scale-95">
          {editandoId ? "Guardar cambios" : "Crear usuario"}
        </button>
      </form>

      <div className="rounded-xl overflow-hidden bg-panel border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line">
              {["Nombre", "Usuario", "Rol", "Acciones"].map((h) => (
                <th key={h} className="text-left px-5 py-3 font-semibold uppercase text-xs text-inksoft">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-line">
                <td className="px-5 py-3 text-ink">{u.nombre}{!u.activo && <span className="text-xs text-inksoft"> (inactivo)</span>}</td>
                <td className="px-5 py-3 text-ink">{u.usuario}</td>
                <td className="px-5 py-3 text-ink">{u.es_admin ? "Administrador" : "Empleado"}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1">
                    <button title="Editar" onClick={() => empezarEdicion(u)}
                      className="p-2 rounded-lg hover:opacity-70 text-inksoft transition-transform duration-150 hover:scale-110 active:scale-90">
                      <Pencil size={16} />
                    </button>
                    <button title="Eliminar" onClick={() => setEliminando(u)}
                      className="p-2 rounded-lg hover:opacity-70 text-bad transition-transform duration-150 hover:scale-110 active:scale-90">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {eliminando && (
        <ConfirmModal
          titulo="¿Eliminar usuario?"
          mensaje={`Vas a eliminar el acceso de "${eliminando.usuario}". Esta acción no se puede deshacer.`}
          textoConfirmar="Eliminar usuario"
          onCancelar={() => setEliminando(null)}
          onConfirmar={confirmarEliminar}
        />
      )}

      {archivoRestaurar && (
        <RestaurarBackupModal
          archivo={archivoRestaurar}
          password={passwordRestaurar}
          onPasswordChange={setPasswordRestaurar}
          onCancelar={cancelarRestaurar}
          onConfirmar={confirmarRestaurar}
          cargando={restaurando}
        />
      )}

      {aviso && (
        <AvisoModal titulo={aviso.titulo} mensaje={aviso.mensaje} tipo={aviso.tipo} onCerrar={cerrarAviso} />
      )}
    </div>
  );
}
