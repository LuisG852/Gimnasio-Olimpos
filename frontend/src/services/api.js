/**
 * Cliente HTTP centralizado.
 */

import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("gimnasio_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("gimnasio_token");
      localStorage.removeItem("gimnasio_usuario");
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const socioService = {
  listar: () => api.get("/socios/"),
  obtener: (id) => api.get(`/socios/${id}`),
  crear: (datos) => api.post("/socios/", datos),
  actualizar: (id, datos) => api.put(`/socios/${id}`, datos),
  renovar: (id, datos) => api.post(`/socios/${id}/renovar`, datos),
  eliminar: (id) => api.delete(`/socios/${id}`),
  estadisticas: () => api.get("/socios/estadisticas"),
};

export const medicionService = {
  listarPorSocio: (socioId) => api.get(`/mediciones/socio/${socioId}`),
  crear: (datos) => api.post("/mediciones/", datos),
  eliminar: (id) => api.delete(`/mediciones/${id}`),
};

export const comprobanteService = {
  crear: (socioId) => api.post("/comprobantes/", { socio_id: socioId }),
  ultimoPorSocio: (socioId) => api.get(`/comprobantes/socio/${socioId}/ultimo`),
  historialPorSocio: (socioId) => api.get(`/comprobantes/socio/${socioId}/historial`),
  descargarPdf: (id) => api.get(`/comprobantes/${id}/pdf`, { responseType: "blob" }),
  ingresosMensuales: (meses = 6) => api.get(`/comprobantes/ingresos-mensuales?meses=${meses}`),
};

export const usuarioService = {
  listar: () => api.get("/usuarios/"),
  crear: (datos) => api.post("/usuarios/", datos),
  actualizar: (id, datos) => api.put(`/usuarios/${id}`, datos),
  eliminar: (id) => api.delete(`/usuarios/${id}`),
};

export const cajaService = {
  resumen: (fecha) => api.get("/caja/resumen", fecha ? { params: { fecha } } : {}),
  historial: () => api.get("/caja/historial"),
  apertura: (monto) => api.post("/caja/apertura", { monto }),
  gasto: (descripcion, monto) => api.post("/caja/gasto", { descripcion, monto }),
  ingreso: (descripcion, monto, metodo) => api.post("/caja/ingreso", { descripcion, monto, metodo }),
  cerrar: () => api.post("/caja/cierre"),
  reabrir: () => api.post("/caja/reabrir"),
  pendientes: () => api.get("/caja/pendientes"),
  resolverPendiente: (id) => api.post(`/caja/pendientes/${id}/resolver`),
};

export const backupService = {
  descargar: () => api.get("/backup/descargar", { responseType: "blob" }),
  ejecutarAhora: () => api.post("/backup/ejecutar-ahora"),
  porEvento: () => api.post("/backup/evento"),
  estado: () => api.get("/backup/estado"),
  restaurar: (archivo, password) => {
    const formData = new FormData();
    formData.append("archivo", archivo);
    formData.append("password", password);
    return api.post("/backup/restaurar", formData);
  },
};

export const inventarioService = {
  listar: (params = {}) => api.get("/inventario/", { params }),
  crear: (datos) => api.post("/inventario/", datos),
  actualizar: (id, datos) => api.put(`/inventario/${id}`, datos),
  eliminar: (id) => api.delete(`/inventario/${id}`),
  vender: (id, cantidad, metodo) => api.post(`/inventario/${id}/vender`, { cantidad, metodo }),
  comprar: (id, datos) => api.post(`/inventario/${id}/comprar`, datos),
  historialCompras: (id) => api.get(`/inventario/${id}/compras`),
  stockBajo: () => api.get("/inventario/stock-bajo"),
};

export const recordatoriosService = {
  enviarAhora: () => api.post("/recordatorios/enviar-ahora"),
  reenviarASocio: (socioId) => api.post(`/recordatorios/reenviar/${socioId}`),
};

export const planService = {
  generar: (medicionId) => api.get(`/planes/generar/${medicionId}`),
  enviarCorreo: (datos) => api.post("/planes/enviar-correo", datos),
};

export const ejercicioService = {
  listar: (params = {}) => api.get("/ejercicios/", { params }),
  musculos: () => api.get("/ejercicios/musculos"),
  actualizar: (id, activo) => api.put(`/ejercicios/${id}`, { activo }),
};

export const contabilidadService = {
  listar: (params = {}) => api.get("/contabilidad/", { params }),
  crear: (datos) => api.post("/contabilidad/", datos),
  actualizar: (id, datos) => api.put(`/contabilidad/${id}`, datos),
  eliminar: (id) => api.delete(`/contabilidad/${id}`),
  resumen: (anio, mes) => api.get("/contabilidad/resumen", { params: { anio, mes } }),
  historico: (meses = 6) => api.get("/contabilidad/historico", { params: { meses } }),
  duplicarMesAnterior: (anio, mes) => api.post("/contabilidad/duplicar-mes-anterior", null, { params: { anio, mes } }),
  reportePdf: (anio, mes) => api.get("/contabilidad/reporte-pdf", { params: { anio, mes }, responseType: "blob" }),
  reportePdfAnual: (anio) => api.get("/contabilidad/reporte-pdf-anual", { params: { anio }, responseType: "blob" }),
  resumenAnual: (anio) => api.get("/contabilidad/resumen-anual", { params: { anio } }),
};

export const actividadService = {
  listar: (dias = 30, usuarioId = null) => api.get("/actividad/", { params: { dias, usuario_id: usuarioId || undefined } }),
  usuarios: () => api.get("/actividad/usuarios"),
};

export const configuracionService = {
  obtenerCuotaInscripcion: () => api.get("/configuracion/cuota-inscripcion"),
  actualizarCuotaInscripcion: (cuota_inscripcion) => api.put("/configuracion/cuota-inscripcion", { cuota_inscripcion }),
};

export default api;
