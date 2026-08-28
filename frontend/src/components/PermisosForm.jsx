import React from "react";

// Nombres bonitos para cada pestaña y cada acción — las claves deben
// coincidir exactamente con MODULOS_PERMISOS en el backend
// (backend/app/core/permisos.py). Si el backend agrega o quita algo
// y no está acá, igual se muestra (con su nombre técnico tal cual)
// para que nunca quede una acción invisible sin darse cuenta.
const NOMBRE_MODULO = {
  socios: "Socios",
  caja: "Caja",
  inventario: "Inventario",
  ejercicios: "Ejercicios",
  mensajes: "Mensajes",
};

const NOMBRE_ACCION = {
  crear: "Nuevo socio",
  editar: "Editar",
  eliminar: "Eliminar",
  renovar: "Renovar",
  medir: "Medidas corporales",
  historial: "Historial de pagos",
  comprobante: "Comprobante de pago (reimprimir)",
  bienvenida: "Enviar bienvenida",
  recordatorio_proximo: "Recordatorio próximo a vencer",
  recordatorio_vencido: "Avisar que ya venció",
  exportar: "Exportar a Excel",
  ingreso: "Registrar ingreso",
  gasto: "Registrar gasto",
  cerrar: "Cerrar caja del día",
  ver_anteriores: "Ver cierres anteriores",
  editar_producto: "Agregar/editar producto",
  comprar: "Registrar compra",
  vender: "Registrar venta",
  editar_plantillas: "Editar plantillas de mensajes",
  enviar_recordatorios: "Enviar recordatorios manuales",
};

export default function PermisosForm({ modulos, permisos, onChange }) {
  const moduloConfig = (modulo) => permisos[modulo] || { activo: false, acciones: {} };

  const alternarModulo = (modulo) => {
    const actual = moduloConfig(modulo);
    onChange({ ...permisos, [modulo]: { ...actual, activo: !actual.activo } });
  };

  const alternarAccion = (modulo, accion) => {
    const actual = moduloConfig(modulo);
    onChange({
      ...permisos,
      [modulo]: {
        ...actual,
        acciones: { ...actual.acciones, [accion]: !actual.acciones?.[accion] },
      },
    });
  };

  return (
    <div className="space-y-2.5">
      {Object.entries(modulos).map(([modulo, acciones]) => {
        const config = moduloConfig(modulo);
        return (
          <div key={modulo} className="bg-bg border border-line rounded-lg p-3.5">
            <label className="flex items-center gap-2.5 text-sm font-semibold text-ink cursor-pointer">
              <input type="checkbox" checked={!!config.activo} onChange={() => alternarModulo(modulo)} />
              {NOMBRE_MODULO[modulo] || modulo}
            </label>
            {config.activo && acciones.length > 0 && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2.5 ml-6">
                {acciones.map((accion) => (
                  <label key={accion} className="flex items-center gap-2 text-xs text-inksoft cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!config.acciones?.[accion]}
                      onChange={() => alternarAccion(modulo, accion)}
                    />
                    {NOMBRE_ACCION[accion] || accion}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
