import React from "react";
import { useState, useRef, useEffect } from "react";

// Lista amplia de países con su código de marcación, en español.
// Guatemala aparece primero (es el país por defecto), el resto en
// orden alfabético.
const PAISES = [
  { codigo: "+502", nombre: "Guatemala" },
  { codigo: "+93", nombre: "Afganistán" }, { codigo: "+355", nombre: "Albania" },
  { codigo: "+49", nombre: "Alemania" }, { codigo: "+376", nombre: "Andorra" },
  { codigo: "+244", nombre: "Angola" }, { codigo: "+1268", nombre: "Antigua y Barbuda" },
  { codigo: "+966", nombre: "Arabia Saudita" }, { codigo: "+213", nombre: "Argelia" },
  { codigo: "+54", nombre: "Argentina" }, { codigo: "+374", nombre: "Armenia" },
  { codigo: "+61", nombre: "Australia" }, { codigo: "+43", nombre: "Austria" },
  { codigo: "+994", nombre: "Azerbaiyán" }, { codigo: "+1242", nombre: "Bahamas" },
  { codigo: "+880", nombre: "Bangladés" }, { codigo: "+1246", nombre: "Barbados" },
  { codigo: "+973", nombre: "Baréin" }, { codigo: "+32", nombre: "Bélgica" },
  { codigo: "+501", nombre: "Belice" }, { codigo: "+229", nombre: "Benín" },
  { codigo: "+375", nombre: "Bielorrusia" }, { codigo: "+95", nombre: "Birmania (Myanmar)" },
  { codigo: "+591", nombre: "Bolivia" }, { codigo: "+387", nombre: "Bosnia y Herzegovina" },
  { codigo: "+267", nombre: "Botsuana" }, { codigo: "+55", nombre: "Brasil" },
  { codigo: "+673", nombre: "Brunéi" }, { codigo: "+359", nombre: "Bulgaria" },
  { codigo: "+226", nombre: "Burkina Faso" }, { codigo: "+257", nombre: "Burundi" },
  { codigo: "+975", nombre: "Bután" }, { codigo: "+238", nombre: "Cabo Verde" },
  { codigo: "+855", nombre: "Camboya" }, { codigo: "+237", nombre: "Camerún" },
  { codigo: "+1", nombre: "Canadá / Estados Unidos" }, { codigo: "+974", nombre: "Catar" },
  { codigo: "+235", nombre: "Chad" }, { codigo: "+56", nombre: "Chile" },
  { codigo: "+86", nombre: "China" }, { codigo: "+357", nombre: "Chipre" },
  { codigo: "+57", nombre: "Colombia" }, { codigo: "+269", nombre: "Comoras" },
  { codigo: "+850", nombre: "Corea del Norte" }, { codigo: "+82", nombre: "Corea del Sur" },
  { codigo: "+225", nombre: "Costa de Marfil" }, { codigo: "+506", nombre: "Costa Rica" },
  { codigo: "+385", nombre: "Croacia" }, { codigo: "+53", nombre: "Cuba" },
  { codigo: "+45", nombre: "Dinamarca" }, { codigo: "+1767", nombre: "Dominica" },
  { codigo: "+593", nombre: "Ecuador" }, { codigo: "+20", nombre: "Egipto" },
  { codigo: "+503", nombre: "El Salvador" }, { codigo: "+971", nombre: "Emiratos Árabes Unidos" },
  { codigo: "+291", nombre: "Eritrea" }, { codigo: "+421", nombre: "Eslovaquia" },
  { codigo: "+386", nombre: "Eslovenia" }, { codigo: "+372", nombre: "Estonia" },
  { codigo: "+251", nombre: "Etiopía" }, { codigo: "+63", nombre: "Filipinas" },
  { codigo: "+358", nombre: "Finlandia" }, { codigo: "+679", nombre: "Fiyi" },
  { codigo: "+33", nombre: "Francia" }, { codigo: "+241", nombre: "Gabón" },
  { codigo: "+220", nombre: "Gambia" }, { codigo: "+995", nombre: "Georgia" },
  { codigo: "+233", nombre: "Ghana" }, { codigo: "+1473", nombre: "Granada" },
  { codigo: "+30", nombre: "Grecia" }, { codigo: "+592", nombre: "Guyana" },
  { codigo: "+224", nombre: "Guinea" }, { codigo: "+245", nombre: "Guinea-Bisáu" },
  { codigo: "+240", nombre: "Guinea Ecuatorial" }, { codigo: "+509", nombre: "Haití" },
  { codigo: "+504", nombre: "Honduras" }, { codigo: "+36", nombre: "Hungría" },
  { codigo: "+91", nombre: "India" }, { codigo: "+62", nombre: "Indonesia" },
  { codigo: "+964", nombre: "Irak" }, { codigo: "+98", nombre: "Irán" },
  { codigo: "+353", nombre: "Irlanda" }, { codigo: "+354", nombre: "Islandia" },
  { codigo: "+692", nombre: "Islas Marshall" }, { codigo: "+677", nombre: "Islas Salomón" },
  { codigo: "+972", nombre: "Israel" }, { codigo: "+39", nombre: "Italia" },
  { codigo: "+1876", nombre: "Jamaica" }, { codigo: "+81", nombre: "Japón" },
  { codigo: "+962", nombre: "Jordania" }, { codigo: "+7", nombre: "Kazajistán / Rusia" },
  { codigo: "+254", nombre: "Kenia" }, { codigo: "+996", nombre: "Kirguistán" },
  { codigo: "+686", nombre: "Kiribati" }, { codigo: "+965", nombre: "Kuwait" },
  { codigo: "+856", nombre: "Laos" }, { codigo: "+266", nombre: "Lesoto" },
  { codigo: "+371", nombre: "Letonia" }, { codigo: "+961", nombre: "Líbano" },
  { codigo: "+231", nombre: "Liberia" }, { codigo: "+218", nombre: "Libia" },
  { codigo: "+423", nombre: "Liechtenstein" }, { codigo: "+370", nombre: "Lituania" },
  { codigo: "+352", nombre: "Luxemburgo" }, { codigo: "+389", nombre: "Macedonia del Norte" },
  { codigo: "+261", nombre: "Madagascar" }, { codigo: "+60", nombre: "Malasia" },
  { codigo: "+265", nombre: "Malaui" }, { codigo: "+960", nombre: "Maldivas" },
  { codigo: "+223", nombre: "Malí" }, { codigo: "+356", nombre: "Malta" },
  { codigo: "+212", nombre: "Marruecos" }, { codigo: "+230", nombre: "Mauricio" },
  { codigo: "+222", nombre: "Mauritania" }, { codigo: "+52", nombre: "México" },
  { codigo: "+691", nombre: "Micronesia" }, { codigo: "+373", nombre: "Moldavia" },
  { codigo: "+377", nombre: "Mónaco" }, { codigo: "+976", nombre: "Mongolia" },
  { codigo: "+382", nombre: "Montenegro" }, { codigo: "+258", nombre: "Mozambique" },
  { codigo: "+264", nombre: "Namibia" }, { codigo: "+674", nombre: "Nauru" },
  { codigo: "+977", nombre: "Nepal" }, { codigo: "+505", nombre: "Nicaragua" },
  { codigo: "+227", nombre: "Níger" }, { codigo: "+234", nombre: "Nigeria" },
  { codigo: "+47", nombre: "Noruega" }, { codigo: "+64", nombre: "Nueva Zelanda" },
  { codigo: "+968", nombre: "Omán" }, { codigo: "+31", nombre: "Países Bajos" },
  { codigo: "+92", nombre: "Pakistán" }, { codigo: "+680", nombre: "Palaos" },
  { codigo: "+507", nombre: "Panamá" }, { codigo: "+675", nombre: "Papúa Nueva Guinea" },
  { codigo: "+595", nombre: "Paraguay" }, { codigo: "+51", nombre: "Perú" },
  { codigo: "+48", nombre: "Polonia" }, { codigo: "+351", nombre: "Portugal" },
  { codigo: "+44", nombre: "Reino Unido" }, { codigo: "+236", nombre: "República Centroafricana" },
  { codigo: "+420", nombre: "República Checa" }, { codigo: "+242", nombre: "República del Congo" },
  { codigo: "+243", nombre: "República Democrática del Congo" }, { codigo: "+1809", nombre: "República Dominicana" },
  { codigo: "+250", nombre: "Ruanda" }, { codigo: "+40", nombre: "Rumanía" },
  { codigo: "+685", nombre: "Samoa" }, { codigo: "+1869", nombre: "San Cristóbal y Nieves" },
  { codigo: "+378", nombre: "San Marino" }, { codigo: "+1784", nombre: "San Vicente y las Granadinas" },
  { codigo: "+1758", nombre: "Santa Lucía" }, { codigo: "+239", nombre: "Santo Tomé y Príncipe" },
  { codigo: "+221", nombre: "Senegal" }, { codigo: "+381", nombre: "Serbia" },
  { codigo: "+248", nombre: "Seychelles" }, { codigo: "+232", nombre: "Sierra Leona" },
  { codigo: "+65", nombre: "Singapur" }, { codigo: "+963", nombre: "Siria" },
  { codigo: "+252", nombre: "Somalia" }, { codigo: "+94", nombre: "Sri Lanka" },
  { codigo: "+268", nombre: "Suazilandia (Esuatini)" }, { codigo: "+27", nombre: "Sudáfrica" },
  { codigo: "+249", nombre: "Sudán" }, { codigo: "+211", nombre: "Sudán del Sur" },
  { codigo: "+46", nombre: "Suecia" }, { codigo: "+41", nombre: "Suiza" },
  { codigo: "+597", nombre: "Surinam" }, { codigo: "+66", nombre: "Tailandia" },
  { codigo: "+255", nombre: "Tanzania" }, { codigo: "+992", nombre: "Tayikistán" },
  { codigo: "+670", nombre: "Timor Oriental" }, { codigo: "+228", nombre: "Togo" },
  { codigo: "+676", nombre: "Tonga" }, { codigo: "+1868", nombre: "Trinidad y Tobago" },
  { codigo: "+216", nombre: "Túnez" }, { codigo: "+993", nombre: "Turkmenistán" },
  { codigo: "+90", nombre: "Turquía" }, { codigo: "+688", nombre: "Tuvalu" },
  { codigo: "+380", nombre: "Ucrania" }, { codigo: "+256", nombre: "Uganda" },
  { codigo: "+598", nombre: "Uruguay" }, { codigo: "+998", nombre: "Uzbekistán" },
  { codigo: "+678", nombre: "Vanuatu" }, { codigo: "+379", nombre: "Vaticano" },
  { codigo: "+58", nombre: "Venezuela" }, { codigo: "+84", nombre: "Vietnam" },
  { codigo: "+967", nombre: "Yemen" }, { codigo: "+253", nombre: "Yibuti" },
  { codigo: "+260", nombre: "Zambia" }, { codigo: "+263", nombre: "Zimbabue" },
];

// Ordenados de más largo a más corto, para no confundir "+1" con "+1809".
const CODIGOS_ORDENADOS = [...PAISES].sort((a, b) => b.codigo.length - a.codigo.length);

function normalizar(txt) {
  return (txt || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function separar(telefonoCompleto) {
  const valor = (telefonoCompleto || "").trim();
  if (!valor.startsWith("+")) return { codigo: "+502", numero: valor.replace(/\D/g, "") };
  const encontrado = CODIGOS_ORDENADOS.find((p) => valor.startsWith(p.codigo));
  if (encontrado) return { codigo: encontrado.codigo, numero: valor.slice(encontrado.codigo.length).replace(/\D/g, "") };
  const match = valor.match(/^\+(\d{1,4})/);
  return { codigo: match ? `+${match[1]}` : "+502", numero: valor.replace(/^\+\d{1,4}/, "").replace(/\D/g, "") };
}

export default function TelefonoInput({ value, onChange, required = false, placeholder = "12345678" }) {
  const [codigo, setCodigo] = useState("+502");
  const [texto, setTexto] = useState("+502");
  const [numero, setNumero] = useState("");
  const [buscando, setBuscando] = useState(false);
  const contenedorRef = useRef(null);

  useEffect(() => {
    const partes = separar(value);
    setCodigo(partes.codigo);
    setTexto(partes.codigo);
    setNumero(partes.numero);
    // Solo se separa cuando cambia el valor desde afuera (ej. al abrir el
    // modal para editar), no en cada tecla que escribe el usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const cerrarSiAfuera = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) setBuscando(false);
    };
    document.addEventListener("mousedown", cerrarSiAfuera);
    return () => document.removeEventListener("mousedown", cerrarSiAfuera);
  }, []);

  const emitir = (nuevoCodigo, nuevoNumero) => onChange(`${nuevoCodigo}${nuevoNumero.replace(/\D/g, "")}`);

  const elegirPais = (pais) => {
    setCodigo(pais.codigo);
    setTexto(pais.codigo);
    setBuscando(false);
    emitir(pais.codigo, numero);
  };

  const cambiarTexto = (e) => {
    const val = e.target.value;
    setTexto(val);
    setBuscando(true);
    if (/^\+\d+$/.test(val)) {
      setCodigo(val);
      emitir(val, numero);
    }
  };

  const cambiarNumero = (e) => {
    setNumero(e.target.value);
    emitir(codigo, e.target.value);
  };

  const filtro = normalizar(texto.replace("+", ""));
  const sugerencias = PAISES.filter(
    (p) => p.codigo.replace("+", "").startsWith(filtro) || normalizar(p.nombre).includes(filtro)
  ).slice(0, 8);

  return (
    <div className="flex gap-2">
      <div className="relative w-44 shrink-0" ref={contenedorRef}>
        <input
          value={texto}
          onChange={cambiarTexto}
          onFocus={() => setBuscando(true)}
          placeholder="+502"
          className="w-full px-3 py-2 rounded-lg outline-none border border-line"
        />
        {buscando && sugerencias.length > 0 && (
          <div className="absolute z-20 mt-1 w-72 max-h-56 overflow-y-auto rounded-lg border border-line bg-panel shadow-lg">
            {sugerencias.map((p) => (
              <button
                type="button"
                key={p.codigo + p.nombre}
                onClick={() => elegirPais(p)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-bg"
              >
                <span className="text-ink truncate">{p.nombre}</span>
                <span className="text-inksoft shrink-0">{p.codigo}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        required={required}
        type="tel"
        placeholder={placeholder}
        value={numero}
        onChange={cambiarNumero}
        className="flex-1 min-w-0 px-3 py-2 rounded-lg outline-none border border-line"
      />
    </div>
  );
}
