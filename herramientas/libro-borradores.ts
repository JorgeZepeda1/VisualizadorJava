// Arma, desde el catálogo del libro y los goldens del oráculo, el Markdown que el PO lee para aprobar los borradores (R0.14; design §5.4: «desde R0 el PO puede revisar borradores como texto»). `npm run libro:borradores`
// reescribe cada archivo de `BORRADORES`. Nadie copia nada a mano: el texto sale de `src/textos/es-MX/libro/`, toda salida sale del `.salida` que generó el JDK 17 real, el veredicto de un error de compilación sale del
// `.errores` de javac y el mensaje que ve el alumno sale del propio motor. Así lo que el PO aprueba es lo que el alumno verá, y una prueba exige que el archivo del repositorio sea exactamente lo que este guion genera hoy.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilar } from '../src/motor/index.ts';
import { textoDelProblema } from '../src/presentacion/texto-del-problema.ts';
import { ETIQUETAS_DEL_LIBRO, SECCIONES_DEL_TEMA } from '../src/textos/es-MX/libro/etiquetas.ts';
import { META_DE_PALABRAS, MAXIMO_DE_PALABRAS, palabrasDelTema, programasDelTema } from '../src/textos/es-MX/libro/reglas-del-tema.ts';
import type { Bloque, IdTema, Tema } from '../src/textos/es-MX/libro/tipos.ts';
import { TEMAS_DE_U6 } from '../src/textos/es-MX/libro/u6.ts';
import { RAIZ_DEL_PROYECTO, leerProgramaDelLibro } from './libro-programas.ts';
import type { ProgramaDelLibro } from './libro-programas.ts';

export interface Borrador {
  /** Ruta del Markdown, relativa a la raíz del proyecto. */
  readonly archivo: string;
  readonly titulo: string;
  readonly ids: readonly IdTema[];
}

/** Los documentos que se generan para el PO. R1.17 agrega el de U6, parte 2. */
export const BORRADORES: readonly Borrador[] = [
  {
    archivo: 'openspec/changes/robots-tutores/borradores/u6-parte-1.md',
    titulo: 'Borradores de U6, parte 1',
    ids: ['u6-que-es-un-ciclo', 'u6-while', 'u6-contador-acumulador-bandera', 'u6-do-while', 'u6-for'],
  },
];

export interface OpcionesDeRenderizado {
  readonly titulo: string;
  readonly temas: readonly Tema[];
  readonly leerPrograma: (id: string) => ProgramaDelLibro;
  /** El mensaje que el visualizador le da al alumno por un programa que no compila (`null` si compila). */
  readonly mensajeDelMotor: (fuente: string) => string | null;
}

/** Una celda de tabla de Markdown: la barra vertical (`||` en un título) la rompería. */
export function escaparCelda(texto: string): string {
  return texto.replaceAll('|', '\\|');
}

function bloqueDeCodigo(lenguaje: 'java' | 'text', contenido: string): string {
  return `\`\`\`${lenguaje}\n${contenido.trimEnd()}\n\`\`\``;
}

function programaConEntrada(programa: ProgramaDelLibro): string[] {
  const partes = [bloqueDeCodigo('java', programa.fuente)];
  if (programa.entrada !== null) partes.push('**Entrada de prueba**', bloqueDeCodigo('text', programa.entrada));
  return partes;
}

/** Lo que imprimió el JDK; un programa que no imprime nada lo dice en vez de dejar un bloque vacío. */
function salidaDelGolden(programa: ProgramaDelLibro): string {
  return programa.salida === '' ? '*(no imprime nada)*' : bloqueDeCodigo('text', programa.salida);
}

function bloquesDeComoSeEscribe(bloques: readonly Bloque[]): string[] {
  return bloques.map((bloque) => {
    switch (bloque.tipo) {
      case 'forma':
        return bloqueDeCodigo('java', bloque.texto);
      case 'parrafo':
        return bloque.texto;
      case 'lista':
        return bloque.elementos.map((elemento, posicion) => `${posicion + 1}. ${elemento}`).join('\n');
      case 'nota':
        return `> ${bloque.texto}`;
    }
  });
}

function errorTipico(opciones: OpcionesDeRenderizado, texto: string, id: string, posicion: number): string[] {
  const programa = opciones.leerPrograma(id);
  const partes = [`**${posicion}.** ${texto}`, ...programaConEntrada(programa)];
  if (programa.meta.esperado === 'ejecuta') return [...partes, '**Salida**', salidaDelGolden(programa)];
  const mensaje = opciones.mensajeDelMotor(programa.fuente);
  return [
    ...partes,
    '**javac dice**',
    bloqueDeCodigo('text', programa.errores),
    ...(mensaje === null ? [] : ['**El visualizador le dice al alumno**', bloqueDeCodigo('text', mensaje)]),
  ];
}

function seccionesDeUnTema(opciones: OpcionesDeRenderizado, tema: Tema): string[] {
  const { leerPrograma } = opciones;
  const titulo = (posicion: number): string => `### ${SECCIONES_DEL_TEMA[posicion]?.titulo ?? ''}`;
  const empezar = leerPrograma(tema.paraEmpezar.programa);
  const pasoAPaso = leerPrograma(tema.pasoAPaso.programa);

  return [
    titulo(0),
    tema.paraEmpezar.situacion,
    ...programaConEntrada(empezar),
    `**${ETIQUETAS_DEL_LIBRO.preguntaDelEjemplo}**`,
    `**${ETIQUETAS_DEL_LIBRO.verLaSalida}**`,
    salidaDelGolden(empezar),

    titulo(1),
    tema.idea.map((frase) => `- ${frase}`).join('\n'),

    titulo(2),
    ...bloquesDeComoSeEscribe(tema.comoSeEscribe),

    titulo(3),
    tema.pasoAPaso.queObservar,
    ...programaConEntrada(pasoAPaso),
    '**Salida**',
    salidaDelGolden(pasoAPaso),
    ...(tema.pasoAPaso.sugerirReto ? ['*Se sugiere encender el modo reto en este ejemplo.*'] : []),

    titulo(4),
    ...tema.erroresTipicos.flatMap((error, posicion) => errorTipico(opciones, error.texto, error.programa, posicion + 1)),

    titulo(5),
    ...tema.ponteAPrueba.flatMap((pregunta, posicion) => {
      const programa = leerPrograma(pregunta.programa);
      return [`**${posicion + 1}.** ${pregunta.pregunta}`, ...programaConEntrada(programa), `**${ETIQUETAS_DEL_LIBRO.verLaRespuesta}**`, salidaDelGolden(programa)];
    }),

    titulo(6),
    ...tema.ahoraHazloTu.flatMap((tarea) => {
      const solucion = leerPrograma(tarea.solucion);
      const etiqueta = tarea.tipo === 'modificar' ? 'Modificar' : 'Crear';
      return [
        `**${etiqueta}.** ${tarea.consigna}`,
        `**${ETIQUETAS_DEL_LIBRO.paraComprobar(solucion.entrada !== null)}**`,
        ...(solucion.entrada === null ? [] : ['Entrada:', bloqueDeCodigo('text', solucion.entrada)]),
        'Salida esperada:',
        salidaDelGolden(solucion),
        `Solución de referencia (solo para el docente; el alumno no la ve): \`${solucion.rutaFuente}\``,
        bloqueDeCodigo('java', solucion.fuente),
      ];
    }),

    titulo(7),
    tema.resumen.map((vineta) => `- ${vineta}`).join('\n'),
  ];
}

/** El documento completo: encabezado, tabla de resumen y cada tema con sus ocho secciones. Termina en un solo salto de línea. */
export function renderizarBorradores(opciones: OpcionesDeRenderizado): string {
  const { titulo, temas } = opciones;
  const palabras = temas.map((tema) => palabrasDelTema(tema));
  const cuentaDeProgramas = temas.map((tema) => programasDelTema(tema).length);
  const promedio = Math.round(palabras.reduce((suma, cuenta) => suma + cuenta, 0) / Math.max(temas.length, 1));

  const encabezado = [
    `# ${titulo}`,
    'Generado con `npm run libro:borradores` desde el catálogo (`src/textos/es-MX/libro/`) y los goldens del oráculo (`corpus/libro/`). No se edita a mano: se corrige el catálogo o el programa y se vuelve a generar. Estado: **borrador**, sin publicar; nada se aprueba sin tu visto bueno (REQ-LIBRO-007).',
    `Cómo leerlo: cada tema sigue las ocho secciones del libro. Toda salida es lo que imprimió el JDK 17 real (Temurin 17.0.18) y el motor del visualizador da exactamente lo mismo. Lo que se teclea no aparece en la salida: va en «Entrada de prueba». «Ahora hazlo tú» le muestra al alumno solo la salida esperada; la solución de referencia queda aquí para ti. Palabras: lo que el alumno lee, sin contar el código (un fragmento de código en línea cuenta como una palabra); la meta es ${META_DE_PALABRAS} y el máximo ${MAXIMO_DE_PALABRAS}.`,
    ['| # | Tema | Palabras | Programas | Estado |', '|---|---|---|---|---|']
      .concat(temas.map((tema, posicion) => `| ${posicion + 1} | ${escaparCelda(tema.titulo)} | ${palabras[posicion]} | ${cuentaDeProgramas[posicion]} | ${tema.estado} |`))
      .concat(`| | **Promedio** | ${promedio} | ${cuentaDeProgramas.reduce((suma, cuenta) => suma + cuenta, 0)} | |`)
      .join('\n'),
  ];

  const deCadaTema = temas.flatMap((tema, posicion) => [
    '---',
    `## ${posicion + 1}. ${tema.titulo}`,
    `\`${tema.id}\` · U${tema.unidad} · oleada ${tema.oleada} · ${tema.estado} · ${palabras[posicion]} palabras (meta ${META_DE_PALABRAS}, máximo ${MAXIMO_DE_PALABRAS}) · ${cuentaDeProgramas[posicion]} programas`,
    ...seccionesDeUnTema(opciones, tema),
  ]);

  return `${[...encabezado, ...deCadaTema].join('\n\n')}\n`;
}

/** Los temas con contenido del libro (R2 y R4 suman aquí sus unidades). */
const TEMAS_CON_CONTENIDO: readonly Tema[] = [...TEMAS_DE_U6];

function mensajeDelMotorReal(fuente: string): string | null {
  const resultado = compilar(fuente);
  return resultado.ok ? null : textoDelProblema(resultado.problema);
}

/** El Markdown de un borrador, con los programas, goldens y mensajes reales del proyecto. */
export function generarBorrador(borrador: Borrador, raiz: string = RAIZ_DEL_PROYECTO): string {
  const temas = borrador.ids.map((id) => {
    const tema = TEMAS_CON_CONTENIDO.find((candidato) => candidato.id === id);
    if (tema === undefined) throw new Error(`El tema ${id} todavía no tiene contenido en el catálogo.`);
    return tema;
  });
  return renderizarBorradores({ titulo: borrador.titulo, temas, leerPrograma: (id) => leerProgramaDelLibro(id, raiz), mensajeDelMotor: mensajeDelMotorReal });
}

function main(): void {
  for (const borrador of BORRADORES) {
    const ruta = resolve(RAIZ_DEL_PROYECTO, borrador.archivo);
    mkdirSync(dirname(ruta), { recursive: true });
    writeFileSync(ruta, generarBorrador(borrador), 'utf-8');
    console.log(`Libro: ${borrador.archivo} generado (${borrador.ids.length} temas).`);
  }
}

const esEjecutadoDirectamente = process.argv[1] === fileURLToPath(import.meta.url);
if (esEjecutadoDirectamente) {
  main();
}
