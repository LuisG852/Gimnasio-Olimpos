/**
 * Un admin siempre puede todo. Para cualquier otro usuario, revisa
 * sus permisos guardados: primero que el módulo (la pestaña) esté
 * activo, y si se pide una acción puntual, que esa acción también
 * lo esté. Coincide exactamente con la misma lógica que ya aplica
 * el backend (backend/app/api/deps.py, requiere_permiso) — esto es
 * solo para decidir qué mostrar en pantalla, la protección real
 * vive del lado del servidor.
 */
export function puede(usuario, modulo, accion) {
  if (!usuario) return false;
  if (usuario.es_admin) return true;

  const config = usuario.permisos?.[modulo];
  if (!config?.activo) return false;
  if (!accion) return true;
  return !!config.acciones?.[accion];
}
