/**
 * Genera / reimprime comprobantes de pago: descarga el PDF y abre
 * WhatsApp con la plantilla configurada en "Mensajes" (el PDF hay que
 * adjuntarlo a mano en esa conversación, WhatsApp no permite adjuntar
 * archivos automáticamente desde un link).
 */

import { comprobanteService } from "../services/api";
import { abrirWhatsapp, obtenerPlantillas, aplicarPlantilla } from "./whatsapp";

async function descargarYAvisar(comprobanteId, socio) {
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

  const plantillas = obtenerPlantillas();
  abrirWhatsapp(socio.telefono, aplicarPlantilla(plantillas.comprobante, socio));
}

export async function generarNuevoComprobante(socio) {
  const { data: comprobante } = await comprobanteService.crear(socio.id);
  await descargarYAvisar(comprobante.id, socio);
}

export async function reimprimirOGenerarComprobante(socio) {
  try {
    const { data: ultimo } = await comprobanteService.ultimoPorSocio(socio.id);
    await descargarYAvisar(ultimo.id, socio);
  } catch (error) {
    if (error?.response?.status === 404) {
      const { data: comprobante } = await comprobanteService.crear(socio.id);
      await descargarYAvisar(comprobante.id, socio);
    } else {
      throw error;
    }
  }
}
