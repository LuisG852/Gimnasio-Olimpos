import React from "react";
import { useEffect, useState } from "react";
import { X, History, Download } from "lucide-react";
import { comprobanteService } from "../services/api";

export default function HistorialPagosModal({ socio, onClose }) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    comprobanteService.historialPorSocio(socio.id).then((res) => {
      setHistorial(res.data);
      setCargando(false);
    });
  }, [socio.id]);

  const descargar = async (comprobanteId) => {
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
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 bg-ink/55">
      <div className="rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-panel">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line sticky top-0 bg-panel">
          <h2 className="font-display text-2xl text-ink flex items-center gap-2">
            <History size={20} className="text-accent" /> Historial de pagos — {socio.nombre} {socio.apellido}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:opacity-70 transition-transform hover:scale-110">
            <X size={20} className="text-inksoft" />
          </button>
        </div>

        <div className="p-6">
          {cargando ? (
            <p className="text-sm text-inksoft">Cargando...</p>
          ) : historial.length === 0 ? (
            <p className="text-sm text-inksoft">Este socio todavía no tiene pagos registrados.</p>
          ) : (
            <div className="rounded-xl overflow-hidden border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    {["Fecha de pago", "Plan", "Monto", "Venció el", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-2.5 font-semibold uppercase text-xs text-inksoft">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={h.id} className="border-b border-line">
                      <td className="px-4 py-2.5 text-ink font-semibold">{h.fecha}</td>
                      <td className="px-4 py-2.5 text-ink">{h.tipo_membresia}</td>
                      <td className="px-4 py-2.5 text-ink">Q{h.precio}</td>
                      <td className="px-4 py-2.5 text-inksoft">{h.fecha_vencimiento}</td>
                      <td className="px-4 py-2.5">
                        <button title="Descargar comprobante" onClick={() => descargar(h.id)}
                          className="p-1.5 rounded-lg hover:opacity-70 text-ink transition-transform duration-150 hover:scale-110 active:scale-90">
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
