// Aviso de «hay una versión nueva» (tarea 5.7, REQ-PLAT-008). Presentacional puro: el texto sale del catálogo y las dos decisiones llegan por propiedades. Advierte que recargar devuelve el editor al
// programa de ejemplo (el visualizador todavía no guarda lo que se escribe) y deja elegir: «Recargar ahora» o «Más tarde». Los dos botones llevan palabras, no solo un ícono, y se alcanzan con Tab.
// La región `status` que lo anuncia al lector de pantalla la pone el contenedor `VersionNueva`, para que exista desde antes de que el aviso aparezca.
import { textosVersionNueva } from '../../textos/es-MX/version-nueva.ts';

export interface PropiedadesAvisoVersionNueva {
  readonly alRecargar: () => void;
  readonly alDescartar: () => void;
}

export function AvisoVersionNueva({ alRecargar, alDescartar }: PropiedadesAvisoVersionNueva) {
  return (
    <div className="aviso-version-nueva">
      <p className="aviso-version-nueva-texto">
        <strong>{textosVersionNueva.aviso()}</strong> {textosVersionNueva.advertencia()}
      </p>
      <div className="aviso-version-nueva-botones">
        <button type="button" className="boton-principal" onClick={alRecargar}>
          {textosVersionNueva.botonRecargar()}
        </button>
        <button type="button" onClick={alDescartar}>
          {textosVersionNueva.botonDespues()}
        </button>
      </div>
    </div>
  );
}
