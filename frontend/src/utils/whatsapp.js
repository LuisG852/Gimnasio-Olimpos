/**
 * Utilidades para armar y abrir mensajes de WhatsApp.
 */

export const PLANTILLAS_DEFAULT = {
  bienvenida:
    "¡Hola {nombre}! 💪 Gracias por inscribirte en el gimnasio. Estamos muy contentos de tenerte con nosotros, cualquier duda escribinos por acá.",
  recordatorio:
    "Hola {nombre}, te recordamos que tu membresía {tipo} vence el {fecha}. El monto a pagar es Q{monto}. ¡Te esperamos!",
  comprobante:
    "¡Hola {nombre}! 📄 Te comparto tu comprobante de pago de Olimpo's Gym. Te lo adjunto en un momento. ¡Gracias por tu pago!",
  vencido:
    "Hola {nombre}, notamos que tu membresía venció el {fecha}. Te extrañamos en el gym 💪 Cuando puedas, pasate a renovar tu plan para seguir entrenando con nosotros. ¡Te esperamos!",
};

export function obtenerPlantillas() {
  const guardadas = localStorage.getItem("gimnasio_plantillas");
  const parseadas = guardadas ? JSON.parse(guardadas) : {};
  return { ...PLANTILLAS_DEFAULT, ...parseadas };
}

export function guardarPlantillas(plantillas) {
  localStorage.setItem("gimnasio_plantillas", JSON.stringify(plantillas));
}

export function formatFecha(fechaStr) {
  const f = new Date(fechaStr + "T00:00:00");
  return f.toLocaleDateString("es-GT", { day: "2-digit", month: "short", year: "numeric" });
}

export function aplicarPlantilla(plantilla, socio) {
  return plantilla
    .replaceAll("{nombre}", socio.nombre)
    .replaceAll("{tipo}", socio.tipo_membresia || "")
    .replaceAll("{monto}", String(socio.precio ?? ""))
    .replaceAll("{fecha}", socio.fecha_vencimiento ? formatFecha(socio.fecha_vencimiento) : "");
}

// Se guarda la referencia de la pestaña de WhatsApp que ya se abrió, para
// poder reutilizarla directamente.
let ventanaWhatsapp = null;

// OJO: hay que llamar a esta función de forma SINCRÓNICA, en el mismo
// instante del clic del usuario (antes de cualquier await/petición al
// backend). Si se llama más tarde (por ejemplo, después de guardar un
// pago o descargar un PDF), el navegador ya no reconoce que viene de una
// acción directa del usuario y BLOQUEA la ventana como si fuera spam —
// eso es justo lo que generaba varias pestañas bloqueadas seguidas.
export function prepararVentanaWhatsapp() {
  if (!ventanaWhatsapp || ventanaWhatsapp.closed) {
    ventanaWhatsapp = window.open("about:blank", "whatsapp_gym");
  }
  return ventanaWhatsapp;
}

export function abrirWhatsapp(telefono, mensaje) {
  const numero = (telefono || "").replace(/\D/g, "");
  // Se usa web.whatsapp.com (no api.whatsapp.com) a propósito: ese dominio
  // no tiene la app de escritorio asociada en Windows, así que el
  // navegador ya no pregunta "¿Abrir WhatsApp?" antes de continuar.
  const url = `https://web.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensaje)}`;

  const ventana = prepararVentanaWhatsapp();
  if (ventana && !ventana.closed) {
    // Ya hay una pestaña (abierta ahora mismo o de antes): se le cambia
    // la dirección a esta, en vez de abrir una nueva, y se trae al frente.
    ventana.location.href = url;
    ventana.focus();
  } else {
    // Respaldo por si ni siquiera la ventana en blanco se pudo abrir
    // (poco común si prepararVentanaWhatsapp() se llamó justo al clic).
    window.open(url, "whatsapp_gym");
  }
}

export function diasHasta(fechaStr) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fechaStr + "T00:00:00");
  return Math.round((f - hoy) / 86400000);
}

export function estadoSocio(socio) {
  const dias = diasHasta(socio.fecha_vencimiento);
  if (dias < 0) return { label: "Vencido", tone: "bad" };
  if (dias <= 5) return { label: "Por vencer", tone: "warn" };
  return { label: "Al día", tone: "good" };
}
