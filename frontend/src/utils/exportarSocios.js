/**
 * Exporta los socios a un .xlsx real, con el logo del gym y el mismo
 * estilo que el Excel de Inventario. Requiere "exceljs".
 */

import ExcelJS from "exceljs";
import { LOGO_BASE64 } from "./logoBase64";

export async function exportarSociosExcel(socios) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Socios");

  const encabezados = [
    "Nombre", "Apellido", "Teléfono", "Correo", "Tipo de membresía",
    "Precio", "Fecha de inscripción", "Fecha de vencimiento", "Activo",
  ];

  const logoId = libro.addImage({ base64: LOGO_BASE64, extension: "png" });
  hoja.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 60, height: 60 } });
  hoja.getRow(1).height = 46;

  hoja.mergeCells(1, 2, 1, encabezados.length);
  const celdaTitulo = hoja.getCell(1, 2);
  celdaTitulo.value = "OLIMPO'S GYM — Socios";
  celdaTitulo.font = { bold: true, size: 14, color: { argb: "FF003F7D" } };
  celdaTitulo.alignment = { vertical: "middle" };

  hoja.addRow([]);

  const filaEncabezado = hoja.addRow(encabezados);
  filaEncabezado.eachCell((celda) => {
    celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003F7D" } };
    celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
    celda.alignment = { horizontal: "center", vertical: "center" };
    celda.border = {
      top: { style: "thin", color: { argb: "FFD7E6F0" } },
      bottom: { style: "thin", color: { argb: "FFD7E6F0" } },
      left: { style: "thin", color: { argb: "FFD7E6F0" } },
      right: { style: "thin", color: { argb: "FFD7E6F0" } },
    };
  });

  socios.forEach((s) => {
    const fila = hoja.addRow([
      s.nombre, s.apellido, s.telefono, s.correo || "",
      s.tipo_membresia, Number(s.precio ?? 0), s.fecha_inscripcion, s.fecha_vencimiento,
      s.activo ? "Sí" : "No",
    ]);
    fila.eachCell((celda) => {
      celda.border = {
        top: { style: "thin", color: { argb: "FFD7E6F0" } },
        bottom: { style: "thin", color: { argb: "FFD7E6F0" } },
        left: { style: "thin", color: { argb: "FFD7E6F0" } },
        right: { style: "thin", color: { argb: "FFD7E6F0" } },
      };
    });
  });

  encabezados.forEach((etiqueta, i) => {
    const maxContenido = socios.reduce((max, s) => {
      const valores = [s.nombre, s.apellido, s.telefono, s.correo, s.tipo_membresia,
        s.precio, s.fecha_inscripcion, s.fecha_vencimiento, s.activo ? "Sí" : "No"];
      return Math.max(max, String(valores[i] ?? "").length);
    }, etiqueta.length);
    hoja.getColumn(i + 1).width = Math.min(Math.max(maxContenido + 2, 10), 40);
  });

  hoja.views = [{ state: "frozen", ySplit: 3 }];
  hoja.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: encabezados.length } };

  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `socios_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
