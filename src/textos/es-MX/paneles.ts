// Catálogo es-MX — las cuatro zonas de la pantalla (código, estado, consola, explicación) y sus paneles (tareas 4.3 a 4.9, 4.11; ADR 015, design.md §6.2). Un solo
// lugar con las palabras que el alumno ve —o escucha— en cada panel: los componentes las piden aquí y nunca llevan un texto suelto. Los fragmentos de código van entre
// comillas invertidas (`if`) y la presentación los segmenta para pintarlos como código. Solo puede importar tipos de `motor/vista` (matriz de capas).
import { tituloDelAvisoDeLimite } from './avisos-de-limite.ts';

/**
 * Los tipos de aviso que ve el alumno (REQ-VIS-002): los dos primeros llegan al revisar el programa; los otros dos, al ejecutarlo. `interno` es el quinto, aparte: un fallo del propio
 * visualizador NUNCA se presenta como error del alumno (ni como una detención "por seguridad").
 */
export type TipoDeAviso = 'error-compilacion' | 'no-disponible' | 'excepcion' | 'seguridad' | 'interno';

/** Las clases de objeto de la biblioteca que una variable puede guardar (`Valor` de `motor/vista`). */
type ClaseDeObjeto = 'Scanner' | 'Random';

const TITULOS_DE_AVISO: Readonly<Record<TipoDeAviso, string>> = {
  'error-compilacion': 'Error de compilación',
  'no-disponible': 'No disponible en el visualizador',
  excepcion: 'El programa se detuvo por un error',
  // El título del aviso de seguridad vive en su catálogo (`avisos-de-limite.ts`): una sola frase para el ícono del globo y para el aviso (hito 2C).
  seguridad: tituloDelAvisoDeLimite(),
  interno: 'Falla del visualizador',
};

/** Los caracteres invisibles que más se pegan desde una página o un PDF, con su nombre en español. */
const NOMBRES_DE_CARACTERES_ESPECIALES: ReadonlyMap<number, string> = new Map([
  [0x00a0, 'Espacio de no separación'],
  [0x00ad, 'Guion suave'],
  [0x200b, 'Espacio de ancho cero'],
  [0x200e, 'Marca de izquierda a derecha'],
  [0x200f, 'Marca de derecha a izquierda'],
  [0x2028, 'Separador de línea'],
  [0x2029, 'Separador de párrafo'],
  [0x202f, 'Espacio fino de no separación'],
  [0xfeff, 'Marca de orden de bytes'],
]);

function codigoUnicode(codigo: number): string {
  return `U+${codigo.toString(16).toUpperCase().padStart(4, '0')}`;
}

export const textosPaneles = {
  zonas: {
    codigo: (): string => 'Código',
    estado: (): string => 'Estado del programa',
    consola: (): string => 'Consola',
    explicacion: (): string => 'Explicación del robot',
  },
  variables: {
    titulo: (): string => 'Variables',
    columnas: {
      nombre: (): string => 'Nombre',
      tipo: (): string => 'Tipo',
      valor: (): string => 'Valor',
    },
    vacio: (): string => 'Todavía no hay variables.',
    sinInicializar: (): string => 'sin inicializar',
    nueva: (): string => 'nueva',
    salioDeAlcance: (): string => 'ya no existe: salió de su bloque',
    cambio: (anterior: string, nuevo: string): string => `cambió de ${anterior} a ${nuevo}`,
    objeto: (clase: ClaseDeObjeto): string => `un ${clase}`,
  },
  condicion: {
    titulo: (): string => 'Condición',
    seEjecuta: (): string => 'se ejecuta',
    noSeEjecuta: (): string => 'no se ejecuta',
    // Cada rama dice con sus propias palabras si corre o no (panel 1, C6): «✗ Entra al `if`» se leía como «entra». `corre` es lo que el motor calculó para ESA rama.
    ramaIf: (corre: boolean): string => `${corre ? 'Entra' : 'No entra'} al \`if\``,
    ramaElse: (corre: boolean): string => `${corre ? 'Entra' : 'No entra'} al \`else\``,
    ramaElseIf: (corre: boolean): string => `${corre ? 'Entra' : 'No entra'} al \`else if\``,
    ramaCicloEntra: (corre: boolean): string => `${corre ? 'Entra' : 'No entra'} al cuerpo del ciclo`,
    ramaCicloSale: (corre: boolean): string => `${corre ? 'Sale' : 'No sale'} del ciclo`,
    ramaCicloRepite: (corre: boolean): string => `${corre ? 'Repite' : 'No repite'} el ciclo`,
    cadenaDeCondiciones: (): string => 'Condiciones revisadas, en orden',
    casoIgualado: (etiqueta: string): string => `Coincide con \`case ${etiqueta}\``,
    casoCae: (etiqueta: string | null): string =>
      `Cae ${etiqueta === null ? 'al `default`' : `a \`case ${etiqueta}\``} porque no hubo \`break\``,
    casoPorDefecto: (): string => 'Ningún `case` coincide: va al `default`',
    sinCoincidencia: (): string => 'Ningún `case` coincide y no hay `default`: sigue después del `switch`',
  },
  vueltas: {
    titulo: (): string => 'Vueltas',
    /** `nivel` cuenta de afuera hacia adentro (0 = el más externo) y `total` es cuántos ciclos hay activos a la vez. */
    nombreDelCiclo: (nivel: number, total: number): string => {
      if (total <= 1) return 'ciclo';
      if (total === 2) return nivel === 0 ? 'ciclo externo' : 'ciclo interno';
      if (total === 3) return ['ciclo externo', 'ciclo intermedio', 'ciclo interno'][nivel] ?? `ciclo ${nivel + 1}`;
      return `ciclo ${nivel + 1}`;
    },
    vuelta: (nombre: string, vuelta: number): string => `${nombre}: vuelta ${vuelta}`,
    etiquetaEnElEditor: (vuelta: number): string => `↻ vuelta ${vuelta}`,
    yaTermino: (): string => 'terminó',
  },
  consola: {
    titulo: (): string => 'Consola',
    etiquetaDelError: (): string => 'Error',
    etiquetaDeLoTecleado: (): string => 'Lo que tecleaste',
    etiquetaDelCampo: (): string => 'Escribe tu dato y pulsa Enter',
    botonEnviar: (): string => 'Enviar',
    bufer: {
      // «Pendiente» no se entendía (panel 1, C9): «Sin leer todavía» dice lo que el Scanner aún no ha tomado del texto que llegó.
      pendiente: (visible: string): string => `Sin leer todavía: ${visible}`,
      nada: (): string => 'Sin leer todavía: nada',
      explicacion: (): string => 'Lo que el Scanner todavía no leyó. ␣ es un espacio y ⏎ es un salto de línea.',
    },
  },
  avisos: {
    titulo: (tipo: TipoDeAviso): string => TITULOS_DE_AVISO[tipo],
    masAvisos: (cuantos: number): string => `y ${cuantos} ${cuantos === 1 ? 'aviso' : 'avisos'} más`,
  },
  editor: {
    etiqueta: (): string => 'Código Java',
    lineaEjecutada: (): string => 'Línea recién ejecutada',
    lineaSiguiente: (): string => 'Línea siguiente',
    /** La etiqueta junto a la rama del `if` que el programa se salta (el código se atenúa, nunca se oculta). */
    ramaNoTomada: (): string => '✗ esta rama no se ejecuta',
    /** El nombre de un carácter invisible (el título que sale al pasar el ratón sobre su marca roja). */
    caracterEspecial: (codigo: number): string => `${NOMBRES_DE_CARACTERES_ESPECIALES.get(codigo) ?? 'Carácter de control'} (${codigoUnicode(codigo)})`,
  },
};
