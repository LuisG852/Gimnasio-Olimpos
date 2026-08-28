/**
 * Genera / reimprime comprobantes de pago y descarga el PDF.
 */

import { comprobanteService } from "../services/api";
import { abrirWhatsapp, obtenerPlantillas, aplicarPlantilla } from "./whatsapp";

async function descargarPdf(comprobanteId) {
  const { data: pdfBlob } = await comprobanteService.descargarPdf(comprobanteId);
  const blob = new Blob([pdfBlob], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comprobante_${String(comprobanteId).padStart(6, "0")}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function generarNuevoComprobante(socio) {
  const { data: comprobante } = await comprobanteService.crear(socio.id);
  await descargarPdf(comprobante.id);
  // Si el socio tiene correo, el comprobante ya se le mandó adjunto en
  // el correo de bienvenida — no hace falta también abrir WhatsApp acá.
  // Si no tiene correo, sí se abre WhatsApp, para poder mandárselo por
  // celular igual (como funcionaba antes).
  if (!socio.correo) {
    const plantillas = obtenerPlantillas();
    abrirWhatsapp(socio.telefono, aplicarPlantilla(plantillas.comprobante, socio));
  }
}

export async function reimprimirOGenerarComprobante(socio) {
  let comprobanteId;
  try {
    const { data: ultimo } = await comprobanteService.ultimoPorSocio(socio.id);
    comprobanteId = ultimo.id;
  } catch (error) {
    if (error?.response?.status === 404) {
      const { data: comprobante } = await comprobanteService.crear(socio.id);
      comprobanteId = comprobante.id;
    } else {
      throw error;
    }
  }
  await descargarPdf(comprobanteId);
  // Este botón es una acción manual explícita — siempre abre WhatsApp,
  // tenga o no correo el socio, a diferencia del envío automático al
  // registrar (generarNuevoComprobante, arriba).
  const plantillas = obtenerPlantillas();
  abrirWhatsapp(socio.telefono, aplicarPlantilla(plantillas.comprobante, socio));
}
