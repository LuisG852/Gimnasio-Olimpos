const LOGO_URL = "https://i.postimg.cc/nzmgh37R/olimpos-logo.png";

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

function columnaDia(dia) {
  const items = dia.ejercicios.map((ej) => `
    <div class="ejercicio">
      <img src="${ej.gif_url}" alt="${ej.nombre}" loading="lazy" />
      <div class="info">
        <span class="musculo">${ej.musculo}</span>
        <p class="nombre">${ej.nombre}</p>
        <p class="series">${ej.series}×${ej.repeticiones}</p>
      </div>
    </div>
  `).join("");

  return `
    <div class="dia-col">
      <div class="dia-header">
        <h2>${dia.dia}</h2>
        <span>${dia.enfoque}</span>
      </div>
      <div class="dia-body">${items}</div>
    </div>
  `;
}

export function generarPlanHtml(plan) {
  const columnas = plan.dias.map(columnaDia).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Plan de entrenamiento — ${plan.socio_nombre}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; background: #F4FBF7; margin: 0; padding: 20px; color: #003F7D; }
  .contenedor { max-width: 1200px; margin: 0 auto; }
  header { background: #003F7D; border-radius: 16px 16px 0 0; padding: 32px 24px 26px; text-align: center; }
  header img { width: 72px; height: 72px; display: block; margin: 0 auto 8px; }
  header h1 { color: #FFD600; font-size: 20px; margin: 0; letter-spacing: 1px; }
  .datos { background: #FFFFFF; padding: 16px 24px; border-bottom: 2px solid #F4FBF7; }
  .datos p { margin: 3px 0; font-size: 13px; color: #4A6E93; }
  .datos b { color: #003F7D; }
  .chip { display: inline-block; background: #FFD600; color: #003F7D; font-weight: bold; font-size: 11px; padding: 3px 10px; border-radius: 999px; margin-top: 6px; margin-right: 6px; }
  .semana { display: flex; background: #FFFFFF; border-radius: 0 0 16px 16px; overflow: hidden; overflow-x: auto; }
  .dia-col { flex: 1; min-width: 190px; background: #FFFFFF; display: flex; flex-direction: column; border-right: 2px solid #D7E6F0; }
  .dia-col:last-child { border-right: none; }
  .dia-header { background: #EAF2FB; padding: 12px 10px; text-align: center; border-bottom: 2px solid #FFD600; min-height: 70px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
  .dia-header h2 { margin: 0; font-size: 14px; color: #003F7D; }
  .dia-header span { font-size: 10px; color: #D4AF37; font-weight: bold; display: block; margin-top: 2px; }
  .dia-body { padding: 8px; flex: 1; }
  .ejercicio { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 10px 4px; border-bottom: 1px solid #D7E6F0; }
  .ejercicio:last-child { border-bottom: none; }
  .ejercicio img { width: 64px; height: 64px; object-fit: cover; border-radius: 10px; border: 2px solid #D7E6F0; margin-bottom: 6px; }
  .musculo { font-size: 9px; text-transform: uppercase; color: #D4AF37; font-weight: bold; letter-spacing: 0.3px; }
  .nombre { margin: 2px 0; font-size: 12px; font-weight: bold; color: #003F7D; line-height: 1.2; }
  .series { margin: 0; font-size: 11px; color: #0E9A63; font-weight: bold; }
  footer { text-align: center; padding: 14px; font-size: 11px; color: #4A6E93; }
  @media print { body { background: #FFFFFF; padding: 0; } .semana { overflow-x: visible; } }
  @media (max-width: 700px) { .semana { flex-direction: column; } .dia-col { min-width: 100%; } }
</style>
</head>
<body>
  <div class="contenedor">
    <header>
      <img src="${LOGO_URL}" alt="Olimpo's Gym" />
      <h1>OLIMPO'S GYM</h1>
    </header>
    <div class="datos">
      <p><b>Socio:</b> ${plan.socio_nombre} &nbsp;·&nbsp; <b>Generado el:</b> ${plan.fecha_generado}</p>
      <div>
        <span class="chip">${ETIQUETAS_OBJETIVO[plan.objetivo] || plan.objetivo}</span>
        <span class="chip">${ETIQUETAS_NIVEL[plan.nivel] || plan.nivel}</span>
        <span class="chip">${plan.split}</span>
        ${plan.enfasis ? `<span class="chip">Énfasis: ${plan.enfasis}</span>` : ""}
      </div>
    </div>
    <div class="semana">${columnas}</div>
  </div>
  <footer>Plan generado automáticamente por Olimpo's Gym — consulta con tu entrenador ante cualquier molestia.</footer>
</body>
</html>`;
}

export function abrirPlanEnPestana(plan) {
  const html = generarPlanHtml(plan);
  const ventana = window.open("", "_blank");
  ventana.document.write(html);
  ventana.document.close();
}

export function descargarPlanHtml(plan) {
  const html = generarPlanHtml(plan);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `plan_${plan.socio_nombre.replace(/\s+/g, "_")}_${plan.fecha_generado}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
