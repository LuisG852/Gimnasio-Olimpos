import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { LOGO_BASE64 } from "./logoBase64";

const ETIQUETAS_OBJETIVO = {
  bajar_peso: "Bajar de peso",
  ganar_musculo: "Ganar músculo",
  mantenimiento: "Mantenimiento",
  fuerza: "Fuerza",
};

const ETIQUETAS_NIVEL = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};

export async function exportarPlanExcel(plan) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Plan de entrenamiento");

  const logoId = libro.addImage({ base64: LOGO_BASE64, extension: "png" });
  hoja.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 60, height: 60 } });
  hoja.getRow(1).height = 46;

  hoja.mergeCells(1, 2, 1, 5);
  const titulo = hoja.getCell(1, 2);
  titulo.value = "OLIMPO'S GYM — Plan de entrenamiento";
  titulo.font = { bold: true, size: 14, color: { argb: "FF003F7D" } };
  titulo.alignment = { vertical: "middle" };

  hoja.addRow([]);
  hoja.addRow(["Socio", plan.socio_nombre]);
  hoja.addRow(["Generado el", plan.fecha_generado]);
  hoja.addRow(["Objetivo", ETIQUETAS_OBJETIVO[plan.objetivo] || plan.objetivo]);
  hoja.addRow(["Nivel", ETIQUETAS_NIVEL[plan.nivel] || plan.nivel]);
  hoja.addRow(["Split", plan.split]);
  if (plan.enfasis) hoja.addRow(["Énfasis", plan.enfasis]);
  [3, 4, 5, 6, 7, 8].forEach((fila) => {
    hoja.getCell(fila, 1).font = { bold: true, color: { argb: "FF4A6E93" } };
  });

  const encabezados = ["Día", "Enfoque", "Músculo", "Ejercicio", "Series", "Repeticiones", "Ver (QR)"];

  for (const dia of plan.dias) {
    hoja.addRow([]);
    const filaDia = hoja.addRow([dia.dia, dia.enfoque]);
    filaDia.font = { bold: true, color: { argb: "FF003F7D" } };
    filaDia.eachCell((celda) => {
      celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF2FB" } };
    });

    const filaEncabezado = hoja.addRow(encabezados);
    filaEncabezado.eachCell((celda) => {
      celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003F7D" } };
      celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
      celda.alignment = { horizontal: "center", vertical: "center" };
    });

    for (const ej of dia.ejercicios) {
      const fila = hoja.addRow([dia.dia, dia.enfoque, ej.musculo, ej.nombre, ej.series, ej.repeticiones, ""]);
      fila.height = 60;
      fila.eachCell((celda) => {
        celda.border = {
          top: { style: "thin", color: { argb: "FFD7E6F0" } },
          bottom: { style: "thin", color: { argb: "FFD7E6F0" } },
          left: { style: "thin", color: { argb: "FFD7E6F0" } },
          right: { style: "thin", color: { argb: "FFD7E6F0" } },
        };
      });

      try {
        const qrBase64 = await QRCode.toDataURL(ej.gif_url, { margin: 1, width: 200 });
        const qrId = libro.addImage({ base64: qrBase64, extension: "png" });
        hoja.addImage(qrId, { tl: { col: 6, row: fila.number - 1 }, ext: { width: 55, height: 55 } });
      } catch {
        // si un gif no tiene URL válida, se deja esa celda sin QR y sigue con el resto
      }
    }
  }

  hoja.getColumn(1).width = 12;
  hoja.getColumn(2).width = 28;
  hoja.getColumn(3).width = 14;
  hoja.getColumn(4).width = 30;
  hoja.getColumn(5).width = 9;
  hoja.getColumn(6).width = 13;
  hoja.getColumn(7).width = 12;

  hoja.views = [{ state: "frozen", ySplit: 8 }];

  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `plan_${plan.socio_nombre.replace(/\s+/g, "_")}_${plan.fecha_generado}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
