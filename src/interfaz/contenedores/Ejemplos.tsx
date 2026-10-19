// La sección «Ejemplos» (tarea R0.11, REQ-AULA-001, ADR 017): pide el texto crudo de los programas con un `import()` DIFERIDO —la primera vez que el alumno abre la sección, no al cargar la página—, arma la
// galería (`presentacion/galeria.ts`, pura) y se la da a la lista (`Galeria`). Si el fragmento no se pudo cargar, lo dice; nunca deja la pantalla vacía. El cargador se puede inyectar (las pruebas) y por
// omisión es el fragmento real de Vite (`datos/programas-crudos.ts`), que el service worker precachea para que la galería funcione sin red (ADR 014).
import { useEffect, useState } from 'react';
import { armarGaleria, type ArchivosCrudos, type GaleriaVista, type ProgramaDeGaleria } from '../../presentacion/index.ts';
import { Galeria } from '../componentes/Galeria.tsx';

/** Carga diferida del fragmento con el texto de los programas: sale del paquete principal. */
function cargarArchivosCrudos(): Promise<ArchivosCrudos> {
  return import('../datos/programas-crudos.ts').then((modulo) => modulo.archivosCrudos);
}

export interface PropiedadesEjemplos {
  readonly alAbrir: (programa: ProgramaDeGaleria, entradaPreparada: string) => void;
  readonly cargar?: () => Promise<ArchivosCrudos>;
}

export function Ejemplos({ alAbrir, cargar = cargarArchivosCrudos }: PropiedadesEjemplos) {
  const [galeria, setGaleria] = useState<GaleriaVista | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vigente = true;
    cargar().then(
      (archivos) => {
        if (vigente) setGaleria(armarGaleria(archivos));
      },
      () => {
        if (vigente) setFallo(true);
      },
    );
    return () => {
      vigente = false;
    };
  }, [cargar]);

  return <Galeria galeria={galeria} fallo={fallo} alAbrir={alAbrir} />;
}
