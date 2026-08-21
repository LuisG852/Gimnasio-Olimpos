/**
 * Exporta el inventario a un archivo .xlsx real, con el logo del gym,
 * color en el encabezado y las columnas que el usuario elija.
 * Requiere "exceljs" (única librería gratuita que permite insertar
 * imágenes en un Excel): npm install exceljs
 */

import ExcelJS from "exceljs";
import { LOGO_BASE64 } from "./logoBase64";

const ETIQUETAS = {
  nombre: "Nombre",
  categoria: "Categoría",
  tipo: "Tipo",
  cantidad: "Cantidad",
  costo_unitario: "Costo unitario (Q)",
  precio_venta: "Precio al público (Q)",
  precio_recomendado: "Precio recomendado (Q)",
  depreciacion_mensual: "Depreciación mensual (Q)",
  valor_en_libros: "Valor en libros hoy (Q)",
  fecha_ingreso: "Fecha de ingreso",
};

function formatear(producto, columna) {
  const valor = producto[columna];
  if (columna === "tipo") return valor === "venta" ? "Para venta" : "Uso interno";
  if (["costo_unitario", "precio_venta", "precio_recomendado", "depreciacion_mensual", "valor_en_libros"].includes(columna)) {
    return valor === null || valor === undefined ? "" : Number(valor);
  }
  return valor ?? "";
}

export async function exportarInventarioExcel(productos, columnas) {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Inventario");

  // Logo arriba a la izquierda
  const logoId = libro.addImage({ base64: LOGO_BASE64, extension: "png" });
  hoja.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 60, height: 60 } });
  hoja.getRow(1).height = 46;

  // Título junto al logo
  hoja.mergeCells(1, 2, 1, Math.max(columnas.length, 3));
  const celdaTitulo = hoja.getCell(1, 2);
  celdaTitulo.value = "OLIMPO'S GYM — Inventario";
  celdaTitulo.font = { bold: true, size: 14, color: { argb: "FF003F7D" } };
  celdaTitulo.alignment = { vertical: "middle" };

  hoja.addRow([]); // fila 2 en blanco, debajo del logo

  const encabezados = columnas.map((c) => ETIQUETAS[c] || c);
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

  productos.forEach((p) => {
    const fila = hoja.addRow(columnas.map((c) => formatear(p, c)));
    fila.eachCell((celda) => {
      celda.border = {
        top: { style: "thin", color: { argb: "FFD7E6F0" } },
        bottom: { style: "thin", color: { argb: "FFD7E6F0" } },
        left: { style: "thin", color: { argb: "FFD7E6F0" } },
        right: { style: "thin", color: { argb: "FFD7E6F0" } },
      };
    });
  });

  columnas.forEach((col, i) => {
    const etiqueta = encabezados[i];
    const maxContenido = productos.reduce(
      (max, p) => Math.max(max, String(formatear(p, col) ?? "").length),
      etiqueta.length
    );
    hoja.getColumn(i + 1).width = Math.min(Math.max(maxContenido + 2, 10), 40);
  });

  hoja.views = [{ state: "frozen", ySplit: 3 }];
  hoja.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: columnas.length } };

  const buffer = await libro.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `inventario_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
