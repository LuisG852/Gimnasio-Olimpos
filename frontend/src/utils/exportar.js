/**
 * Exporta una lista de socios a un archivo CSV que Excel abre
 * directamente, con tildes y ñ mostrándose bien (por eso el BOM \uFEFF).
 */

function escaparCampo(valor) {
  const texto = String(valor ?? "");
  return `"${texto.replace(/"/g, '""')}"`;
}

export function exportarSociosCSV(socios) {
  const encabezados = [
    "Nombre", "Apellido", "Teléfono", "Correo", "Tipo de membresía",
    "Precio", "Fecha de inscripción", "Fecha de vencimiento", "Activo",
  ];

  const filas = socios.map((s) => [
    s.nombre, s.apellido, s.telefono, s.correo || "",
    s.tipo_membresia, s.precio, s.fecha_inscripcion, s.fecha_vencimiento,
    s.activo ? "Sí" : "No",
  ]);

  const csv = [encabezados, ...filas]
    .map((fila) => fila.map(escaparCampo).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `socios_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
