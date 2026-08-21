import ExcelJS from "exceljs";
import { LOGO_BASE64 } from "./logoBase64";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const q = (n) => Number(n ?? 0);

const ESTILO_ENCABEZADO = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF003F7D" } }, font: { bold: true, color: { argb: "FFFFFFFF" } }, alignment: { horizontal: "center", vertical: "center" } };
const BORDE = { top: { style: "thin", color: { argb: "FFD7E6F0" } }, bottom: { style: "thin", color: { argb: "FFD7E6F0" } }, left: { style: "thin", color: { argb: "FFD7E6F0" } }, right: { style: "thin", color: { argb: "FFD7E6F0" } } };

export async function exportarContabilidadExcelAnual(anio, resumenAnual) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Contabilidad " + anio);

  const logoId = libro.addImage({ base64: LOGO_BASE64, extension: "png" });
  hoja.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 60, height: 60 } });
  hoja.getRow(1).height = 46;

  hoja.mergeCells(1, 2, 1, 4);
  const titulo = hoja.getCell(1, 2);
  titulo.value = `OLIMPO'S GYM — Reporte anual ${anio}`;
  titulo.font = { bold: true, size: 14, color: { argb: "FF003F7D" } };
  titulo.alignment = { vertical: "middle" };

  hoja.addRow([]);
  hoja.addRow(["Ingresos totales del año", q(resumenAnual.ingresos_totales)]).getCell(2).numFmt = '"Q"#,##0.00';
  hoja.addRow(["Gastos totales del año", q(resumenAnual.gastos_totales)]).getCell(2).numFmt = '"Q"#,##0.00';
  const filaUtilidad = hoja.addRow(["Utilidad neta del año", q(resumenAnual.utilidad_total)]);
  filaUtilidad.getCell(2).numFmt = '"Q"#,##0.00';
  filaUtilidad.font = { bold: true };
  [3, 4, 5].forEach((f) => { hoja.getCell(f, 1).font = { bold: true, color: { argb: "FF4A6E93" } }; });

  hoja.addRow([]);

  const encMeses = hoja.addRow(["Mes", "Ingresos", "Gastos", "Utilidad"]);
  encMeses.eachCell((c) => Object.assign(c, { fill: ESTILO_ENCABEZADO.fill, font: ESTILO_ENCABEZADO.font, alignment: ESTILO_ENCABEZADO.alignment }));

  const filaMejorMes = resumenAnual.mejor_mes?.mes;
  resumenAnual.meses.forEach((m) => {
    const fila = hoja.addRow([m.mes_nombre, q(m.ingresos), q(m.gastos), q(m.utilidad)]);
    fila.getCell(2).numFmt = '"Q"#,##0.00';
    fila.getCell(3).numFmt = '"Q"#,##0.00';
    fila.getCell(4).numFmt = '"Q"#,##0.00';
    fila.eachCell((celda) => { celda.border = BORDE; });
    if (m.mes === filaMejorMes) {
      fila.eachCell((celda) => { celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDFFBEC" } }; });
    }
  });

  hoja.addRow([]);

  if (resumenAnual.por_categoria?.length > 0) {
    const filaTituloCat = hoja.addRow(["Gastos por categoría (todo el año)"]);
    filaTituloCat.getCell(1).font = { bold: true, size: 12, color: { argb: "FF003F7D" } };
    const encCat = hoja.addRow(["Categoría", "Total"]);
    encCat.eachCell((c) => Object.assign(c, { fill: ESTILO_ENCABEZADO.fill, font: ESTILO_ENCABEZADO.font, alignment: ESTILO_ENCABEZADO.alignment }));
    resumenAnual.por_categoria.forEach((c) => {
      const fila = hoja.addRow([c.categoria, q(c.total)]);
      fila.getCell(2).numFmt = '"Q"#,##0.00';
      fila.eachCell((celda) => { celda.border = BORDE; });
    });
  }

  hoja.getColumn(1).width = 20;
  hoja.getColumn(2).width = 16;
  hoja.getColumn(3).width = 16;
  hoja.getColumn(4).width = 16;

  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contabilidad_${anio}_anual.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportarContabilidadExcel(anio, mes, resumen, gastos) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Contabilidad");

  const logoId = libro.addImage({ base64: LOGO_BASE64, extension: "png" });
  hoja.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 60, height: 60 } });
  hoja.getRow(1).height = 46;

  hoja.mergeCells(1, 2, 1, 5);
  const titulo = hoja.getCell(1, 2);
  titulo.value = `OLIMPO'S GYM — Contabilidad de ${MESES[mes - 1]} ${anio}`;
  titulo.font = { bold: true, size: 14, color: { argb: "FF003F7D" } };
  titulo.alignment = { vertical: "middle" };

  hoja.addRow([]);

  const filasResumen = [
    ["Ingresos del mes", q(resumen.ingresos)],
    ["Gastos fijos", q(resumen.gastos_fijos)],
    ["Gastos variables", q(resumen.gastos_variables)],
    ["Depreciación de equipo", q(resumen.depreciacion)],
    ["Utilidad neta", q(resumen.utilidad_neta)],
  ];
  filasResumen.forEach(([label, valor], i) => {
    const fila = hoja.addRow([label, valor]);
    fila.getCell(1).font = { bold: true, color: { argb: "FF4A6E93" } };
    fila.getCell(2).font = { bold: i === filasResumen.length - 1, color: { argb: "FF003F7D" } };
    fila.getCell(2).numFmt = '"Q"#,##0.00';
  });

  hoja.addRow([]);

  if (resumen.por_categoria?.length > 0) {
    const filaTituloCat = hoja.addRow(["Gastos por categoría"]);
    filaTituloCat.getCell(1).font = { bold: true, size: 12, color: { argb: "FF003F7D" } };

    const encCat = hoja.addRow(["Categoría", "Total"]);
    encCat.eachCell((c) => Object.assign(c, { fill: ESTILO_ENCABEZADO.fill, font: ESTILO_ENCABEZADO.font, alignment: ESTILO_ENCABEZADO.alignment }));

    resumen.por_categoria.forEach((c) => {
      const fila = hoja.addRow([c.categoria, q(c.total)]);
      fila.getCell(2).numFmt = '"Q"#,##0.00';
      fila.eachCell((celda) => { celda.border = BORDE; });
    });
    hoja.addRow([]);
  }

  const filaTituloDet = hoja.addRow(["Detalle de gastos del mes"]);
  filaTituloDet.getCell(1).font = { bold: true, size: 12, color: { argb: "FF003F7D" } };

  const encabezados = ["Fecha", "Descripción", "Categoría", "Tipo", "Monto"];
  const filaEnc = hoja.addRow(encabezados);
  filaEnc.eachCell((c) => Object.assign(c, { fill: ESTILO_ENCABEZADO.fill, font: ESTILO_ENCABEZADO.font, alignment: ESTILO_ENCABEZADO.alignment }));

  gastos.forEach((g) => {
    const fila = hoja.addRow([g.fecha, g.descripcion, g.categoria, g.tipo === "fijo" ? "Fijo" : "Variable", q(g.monto)]);
    fila.getCell(5).numFmt = '"Q"#,##0.00';
    fila.eachCell((celda) => { celda.border = BORDE; });
  });

  hoja.getColumn(1).width = 16;
  hoja.getColumn(2).width = 32;
  hoja.getColumn(3).width = 16;
  hoja.getColumn(4).width = 12;
  hoja.getColumn(5).width = 14;

  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `contabilidad_${anio}-${String(mes).padStart(2, "0")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
