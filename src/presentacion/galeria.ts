// La galería «Ejemplos» (tarea R0.11, REQ-AULA-001, ADR 017): secciones por unidad (U3 a U7) y «Para empezar» con los programas del curso y la máquina de snacks del PO, cada uno con su código y su entrada
// preparada tal como la usó el oráculo (cada renglón con su salto de línea, como en NetBeans). Todo se arma desde el TEXTO CRUDO de los archivos —la presentación no toca Vite ni el disco: el
// `import.meta.glob` vive en `interfaz/datos/programas-crudos.ts`, un fragmento diferido— y desde el catálogo es-MX (`textos/es-MX/galeria.ts`), que manda: un archivo que el catálogo no conoce no entra, y
// un programa que el catálogo conoce pero cuyo archivo falta no se ofrece (nunca un ejemplo inventado). Puro, sin DOM.
import { ORDEN_DE_LA_GALERIA, textosGaleria, type IdDeGaleria, type OrigenDeUnPrograma, type UnidadDeGaleria } from '../textos/es-MX/galeria.ts';

/** Los archivos del corpus como texto, por nombre de archivo (sin carpeta): `u3-hola-mundo.java`, `u3-saludo-con-scanner.entrada.txt`… */
export type ArchivosCrudos = Readonly<Record<string, string>>;

/** Uno de los datos de ejemplo de un programa que se prueba con varias entradas (hoy, la máquina de snacks). */
export interface MuestraDeGaleria {
  /** Los renglones de la entrada en una línea: `a1 · 2 · 50`. */
  readonly etiqueta: string;
  /** Qué pasa con esos datos, con las palabras del catálogo. */
  readonly descripcion: string;
  readonly entradaPreparada: string;
}

export interface ProgramaDeGaleria {
  readonly id: IdDeGaleria;
  readonly titulo: string;
  readonly queObservar: string;
  readonly origen: OrigenDeUnPrograma;
  /** La unidad del curso, o `null` para el ejercicio del PO de «Para empezar». */
  readonly unidad: UnidadDeGaleria | null;
  readonly codigo: string;
  /** La entrada con la que el oráculo ejecutó el programa (byte a byte, cada renglón con su `\n`); vacía si el programa no lee datos. */
  readonly entradaPreparada: string;
  /** Solo si el programa ofrece varios datos de ejemplo; si no, vacía. */
  readonly muestras: readonly MuestraDeGaleria[];
  /** Abre con el aviso del revisor en «después» (REQ-AULA-001): predicciones y trampas. */
  readonly demostracion: boolean;
}

export interface SeccionDeGaleria {
  readonly unidad: UnidadDeGaleria | null;
  readonly titulo: string;
  readonly programas: readonly ProgramaDeGaleria[];
}

export interface GaleriaVista {
  readonly secciones: readonly SeccionDeGaleria[];
}

/** `a1\n2\n50\n` → `a1 · 2 · 50`. */
export function etiquetaDeLaEntrada(entrada: string): string {
  return entrada
    .split('\n')
    .filter((renglon) => renglon !== '')
    .join(' · ');
}

function muestrasDeLaMaquinaDeSnacks(archivos: ArchivosCrudos): readonly (MuestraDeGaleria & { readonly codigo: string })[] {
  return textosGaleria.muestrasDeLaMaquinaDeSnacks.flatMap(({ archivo, descripcion }) => {
    const codigo = archivos[`${archivo}.java`];
    const entrada = archivos[`${archivo}.entrada.txt`];
    return codigo === undefined || entrada === undefined ? [] : [{ etiqueta: etiquetaDeLaEntrada(entrada), descripcion, entradaPreparada: entrada, codigo }];
  });
}

function programaDe(id: IdDeGaleria, unidad: UnidadDeGaleria | null, archivos: ArchivosCrudos): ProgramaDeGaleria | null {
  const { titulo, queObservar } = textosGaleria.programa(id);
  const demostracion = textosGaleria.demostraciones.includes(id);
  if (id === 'maquina-snacks') {
    const muestras = muestrasDeLaMaquinaDeSnacks(archivos);
    const primera = muestras[0];
    if (primera === undefined) return null;
    return {
      id,
      titulo,
      queObservar,
      origen: 'del-po',
      unidad,
      codigo: primera.codigo,
      entradaPreparada: primera.entradaPreparada,
      muestras: muestras.map(({ etiqueta, descripcion, entradaPreparada }) => ({ etiqueta, descripcion, entradaPreparada })),
      demostracion,
    };
  }
  const codigo = archivos[`${id}.java`];
  if (codigo === undefined) return null;
  return { id, titulo, queObservar, origen: 'curricular', unidad, codigo, entradaPreparada: archivos[`${id}.entrada.txt`] ?? '', muestras: [], demostracion };
}

export function armarGaleria(archivos: ArchivosCrudos): GaleriaVista {
  const secciones = ORDEN_DE_LA_GALERIA.flatMap(({ unidad, programas }): SeccionDeGaleria[] => {
    const disponibles = programas.flatMap((id) => programaDe(id, unidad, archivos) ?? []);
    if (disponibles.length === 0) return [];
    return [{ unidad, titulo: unidad === null ? textosGaleria.seccion.paraEmpezar() : textosGaleria.seccion.unidad(unidad), programas: disponibles }];
  });
  return { secciones };
}
