// RED de la tarea R0.14 (REQ-LIBRO-002, REQ-LIBRO-003, REQ-LIBRO-004): el catálogo de los temas (`src/textos/es-MX/libro/`) y el corpus (`corpus/libro/`) cuentan lo mismo. Cada programa que un tema usa existe, con
// el papel que el tema le da y con su golden del oráculo; no sobra ningún programa en la carpeta de un tema; los programas cortos son cortos; y ningún texto escribe a mano una salida de consola: toda salida que el
// libro muestre sale del golden (REQ-LIBRO-003). Las reglas que no necesitan archivos (estructura, palabras, vocabulario) están en `src/textos/es-MX/libro/`. Que el motor coincida con el JDK lo prueba
// `pruebas/diferencial/libro.test.ts`.
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { idsDeProgramasDelLibro, leerProgramaDelLibro } from '../../herramientas/libro-programas.ts';
import { SECCIONES_DEL_TEMA } from '../../src/textos/es-MX/libro/etiquetas.ts';
import { META_DE_PALABRAS, MAXIMO_DE_PALABRAS, palabrasDelTema, programasDelTema, textosDelTema } from '../../src/textos/es-MX/libro/reglas-del-tema.ts';
import { IDS_DE_TEMAS } from '../../src/textos/es-MX/libro/tipos.ts';
import type { PapelDelPrograma, Tema } from '../../src/textos/es-MX/libro/tipos.ts';
import { TEMAS_DE_U6 } from '../../src/textos/es-MX/libro/u6.ts';

// Cuando lleguen las otras unidades (R2, R4) se suman aquí sus temas.
const TEMAS: readonly Tema[] = [...TEMAS_DE_U6];

/** Líneas máximas de un programa según el papel que cumple: el ejemplo de «Para empezar» y las predicciones son cortos; el de «Míralo paso a paso» puede ser un poco más largo. */
const MAXIMO_DE_LINEAS: Readonly<Record<PapelDelPrograma, number>> = {
  'para-empezar': 20,
  'paso-a-paso': 32,
  'error-tipico': 20,
  'ponte-a-prueba': 25,
  solucion: 32,
};

const CODIGO_EN_LINEA = /`[^`]+`/g;
const LARGO_MINIMO_DE_UNA_SALIDA_ESCRITA = 6;

/** Los renglones de la salida de un programa que aparecen tal cual en la prosa de un texto (el código en línea no cuenta: ahí se cita lo que el programa debe escribir). Los renglones de menos de 6 caracteres son números o palabras sueltas. */
function renglonesEscritosEnLaProsa(textos: readonly string[], salida: string): readonly string[] {
  const prosa = textos.map((texto) => texto.replace(CODIGO_EN_LINEA, ' ')).join('\n');
  const renglones = salida
    .split('\n')
    .map((renglon) => renglon.trim())
    .filter((renglon) => renglon.length >= LARGO_MINIMO_DE_UNA_SALIDA_ESCRITA);
  return [...new Set(renglones)].filter((renglon) => prosa.includes(renglon));
}

describe('el catálogo y el corpus del libro cuentan lo mismo (R0.14)', () => {
  it('hay temas con contenido que cruzar (guarda contra un recorrido vacío)', () => {
    expect(TEMAS.length).toBeGreaterThanOrEqual(5);
  });

  it('reporta el tamaño de cada tema contra la meta de 400 palabras y el máximo de 550 (design §5.1)', () => {
    const cuentas = TEMAS.map((tema) => palabrasDelTema(tema));
    const promedio = cuentas.reduce((suma, palabras) => suma + palabras, 0) / cuentas.length;
    console.log(`[libro] palabras por tema (sin código): ${TEMAS.map((tema, i) => `${tema.id}=${cuentas[i]}`).join(', ')}; promedio ${promedio.toFixed(0)} (meta ${META_DE_PALABRAS}, máximo ${MAXIMO_DE_PALABRAS})`);
    expect(Math.max(...cuentas)).toBeLessThanOrEqual(MAXIMO_DE_PALABRAS);
  });

  it('cada carpeta de corpus/libro es un tema de la lista cerrada del libro', () => {
    const carpetas = readdirSync(resolve('corpus', 'libro'), { withFileTypes: true })
      .filter((entrada) => entrada.isDirectory())
      .map((entrada) => entrada.name);
    expect(carpetas.length).toBeGreaterThanOrEqual(5);
    expect(carpetas.filter((carpeta) => !(IDS_DE_TEMAS as readonly string[]).includes(carpeta))).toEqual([]);
  });

  it.each(TEMAS.map((tema) => [tema.id, tema] as const))('%s: la carpeta del tema tiene exactamente los programas que el tema usa, ni uno más ni uno menos', (id, tema) => {
    const enLaCarpeta = idsDeProgramasDelLibro().filter((programa) => programa.startsWith(`${id}/`));
    const queUsaElTema = programasDelTema(tema).map((programa) => programa.id as string);
    expect([...enLaCarpeta].sort()).toEqual([...queUsaElTema].sort());
  });

  describe.each(TEMAS.map((tema) => [tema.id, tema] as const))('%s', (_id, tema) => {
    const programas = programasDelTema(tema).map(({ id, papel }) => ({ papel, programa: leerProgramaDelLibro(id) }));

    it('cada programa tiene en su .meta.json el mismo papel que el tema le da', () => {
      expect(programas.length).toBeGreaterThanOrEqual(7);
      for (const { papel, programa } of programas) {
        expect(programa.meta.papel, programa.id).toBe(papel);
      }
    });

    it('solo un error típico puede ser un programa que javac rechaza: todos los demás se ejecutan y escriben algo', () => {
      for (const { papel, programa } of programas) {
        if (papel === 'error-tipico') continue;
        expect(programa.meta.esperado, programa.id).toBe('ejecuta');
        expect(programa.oraculo.desenlace, programa.id).toBe('normal');
        expect(programa.salida.length, `${programa.id}: la respuesta y el «Para comprobar» salen del golden, que no puede estar vacío`).toBeGreaterThan(0);
      }
    });

    it('un error típico que javac rechaza deja el veredicto de javac en su golden; uno que se ejecuta escribe algo', () => {
      const errores = programas.filter(({ papel }) => papel === 'error-tipico');
      expect(errores.length).toBeGreaterThanOrEqual(1);
      for (const { programa } of errores) {
        if (programa.meta.esperado === 'error-compilacion') expect(programa.errores, programa.id).toMatch(/\.java:\d+: error:/);
        else expect(programa.salida.length, programa.id).toBeGreaterThan(0);
      }
    });

    it('los programas son cortos para leerse en una pantalla (según el papel que cumplen)', () => {
      for (const { papel, programa } of programas) {
        const lineas = programa.fuente.trimEnd().split('\n').length;
        expect(lineas, `${programa.id} (${papel})`).toBeLessThanOrEqual(MAXIMO_DE_LINEAS[papel]);
      }
    });

    it('ningún texto del tema escribe a mano un renglón de lo que imprimen sus programas: las salidas salen del golden', () => {
      const textos = textosDelTema(tema);
      for (const { programa } of programas) {
        expect(renglonesEscritosEnLaProsa(textos, programa.salida), `${programa.id}: renglones de su salida escritos en el texto`).toEqual([]);
      }
    });
  });
});

// Correcciones del panel R0 (maestro, «Puede esperar»): una consigna cita lo que el programa debe escribir entre « » y el código entre comillas invertidas. Cruzar cada cita con el golden de la solución
// evita que la consigna prometa un texto que el programa no imprime, o que el código y lo impreso se confundan.
const TITULOS_DE_SECCION: readonly string[] = SECCIONES_DEL_TEMA.map((seccion) => seccion.titulo);
const CITAS_ENTRE_COMILLAS_ANGULARES = /«([^»]+)»/gu;
const LARGO_MINIMO_DE_UN_CODIGO_QUE_SE_CONFUNDE = 4;

function citasDeLoImpreso(consigna: string): readonly string[] {
  return [...consigna.matchAll(CITAS_ENTRE_COMILLAS_ANGULARES)].map((coincidencia) => coincidencia[1] ?? '').filter((cita) => !TITULOS_DE_SECCION.includes(cita));
}

function codigoEnLinea(texto: string): readonly string[] {
  return (texto.match(CODIGO_EN_LINEA) ?? []).map((fragmento) => fragmento.slice(1, -1));
}

describe('las consignas de «Ahora hazlo tú» citan lo que el programa imprime entre « » (panel R0, maestro)', () => {
  const tareas = TEMAS.flatMap((tema) => tema.ahoraHazloTu.map((tarea) => ({ tema: tema.id, tarea, solucion: leerProgramaDelLibro(tarea.solucion) })));

  it('hay tareas que cruzar y al menos cinco consignas citan algo impreso (guarda contra un recorrido vacío)', () => {
    expect(tareas).toHaveLength(10);
    expect(tareas.filter(({ tarea }) => citasDeLoImpreso(tarea.consigna).length > 0).length).toBeGreaterThanOrEqual(5);
  });

  it.each(tareas.map(({ tema, tarea, solucion }) => [`${tema} · ${tarea.tipo}`, tarea.consigna, solucion.salida] as const))(
    '%s: lo que va entre « » lo imprime el programa, y ningún código en línea es un texto que se imprime',
    (_donde, consigna, salida) => {
      for (const cita of citasDeLoImpreso(consigna)) expect(salida, `«${cita}» debe salir del golden`).toContain(cita);
      const confundibles = codigoEnLinea(consigna).filter((codigo) => codigo.length >= LARGO_MINIMO_DE_UN_CODIGO_QUE_SE_CONFUNDE && salida.includes(codigo));
      expect(confundibles, 'lo que el programa imprime va entre « », no entre comillas invertidas').toEqual([]);
    },
  );

  it('control: una cita que el programa no imprime, y un código que sí se imprime, se detectan', () => {
    expect(citasDeLoImpreso('Escribe «Hola» y mira «Para empezar».')).toEqual(['Hola']);
    expect('Hola\nHola\n').not.toContain('Adiós');
    expect(codigoEnLinea('Escribe `Reprobados:` y usa `n`.')).toEqual(['Reprobados:', 'n']);
  });
});

// Correcciones del panel R0 (experto en Java; maestro): el código que una explicación cita como instrucción existe de verdad en un programa del tema, o en la forma general. Así una explicación no cita
// una línea que el programa no tiene (`mayores = mayores + 1;`, `int alumno = 1;`).
describe('las instrucciones que un tema cita en sus explicaciones están en sus programas o en su forma general (panel R0)', () => {
  const LARGO_MINIMO_DE_UNA_INSTRUCCION = 6;

  it.each(TEMAS.map((tema) => [tema.id, tema] as const))('%s: cada `instrucción;` citada está en un programa del tema o en su forma general', (_id, tema) => {
    const fuentes = programasDelTema(tema).map(({ id }) => leerProgramaDelLibro(id).fuente);
    const formas = tema.comoSeEscribe.flatMap((bloque) => (bloque.tipo === 'forma' ? [bloque.texto] : []));
    const instrucciones = textosDelTema(tema)
      .flatMap(codigoEnLinea)
      .filter((codigo) => codigo.endsWith(';') && codigo.length >= LARGO_MINIMO_DE_UNA_INSTRUCCION);
    const sinLugar = instrucciones.filter((instruccion) => ![...fuentes, ...formas].some((fuente) => fuente.includes(instruccion)));
    expect(sinLugar).toEqual([]);
  });

  it('tema 1: las tres partes que «Cómo se escribe» nombra son las del programa de «Para empezar»', () => {
    const fuente = leerProgramaDelLibro('u6-que-es-un-ciclo/pasar-lista').fuente;
    for (const parte of ['int alumno = 1;', 'alumno <= 3', 'alumno = alumno + 1;']) expect(fuente, parte).toContain(parte);
  });

  it('tema 2: el primer error típico imprime el 6 aunque `6 <= 5` da `false`, y la condición del programa es `numero <= 5`', () => {
    const orden = leerProgramaDelLibro('u6-while/orden-del-cuerpo');
    expect(orden.fuente).toContain('while (numero <= 5)');
    expect(orden.salida.split('\n')).toContain('6');
  });
});

// Correcciones del panel R0 (maestro L1): el nombre de la clase se lee en el editor, así que un nombre que cuenta cuántas vueltas da el programa, o dónde termina, le contesta la predicción al alumno antes de
// que la haga. El archivo y la clase pública se llaman igual (`pasar-lista` y `PasarLista`, como en NetBeans): renombrar uno obliga a renombrar el otro.
const NOMBRES_QUE_DABAN_LA_RESPUESTA: readonly string[] = [
  'u6-do-while/una-sola-vuelta',
  'u6-while/no-da-ni-una-vuelta',
  'u6-for/sin-vueltas',
  'u6-do-while/doblar-hasta-pasar-de-20',
  'u6-while/contar-del-1-al-5',
];

const NOMBRES_NUEVOS: readonly (readonly [id: string, clase: string])[] = [
  ['u6-do-while/primer-do-while', 'PrimerDoWhile'],
  ['u6-while/pagar-con-el-saldo', 'PagarConElSaldo'],
  ['u6-for/for-que-empieza-en-5', 'ForQueEmpiezaEn5'],
  ['u6-do-while/doblar-un-numero', 'DoblarUnNumero'],
  ['u6-while/contar-en-voz-alta', 'ContarEnVozAlta'],
];

/** Las palabras que, en el nombre de un programa que el alumno predice, le cuentan cuántas vueltas da o cuándo termina. */
const PALABRAS_QUE_CUENTAN_LA_RESPUESTA = /(?:^|-)(?:vueltas?|sola|ninguna|nunca|infinit[oa])(?:-|$)|hasta-pasar/u;

function nombreDeLaClase(fuente: string): string | undefined {
  return /public class (\w+)/u.exec(fuente)?.[1];
}

function claseEsperadaDelArchivo(id: string): string {
  const archivo = id.split('/').at(-1) ?? '';
  return archivo
    .split('-')
    .map((pedazo) => pedazo.charAt(0).toUpperCase() + pedazo.slice(1))
    .join('');
}

describe('los nombres de los programas no le dan la respuesta al alumno (panel R0, maestro L1)', () => {
  const todos = idsDeProgramasDelLibro();
  const usadosPorElLibro = TEMAS.flatMap((tema) => programasDelTema(tema)).map(({ id }) => id as string);

  it.each(NOMBRES_QUE_DABAN_LA_RESPUESTA.map((id) => [id] as const))('«%s» ya no existe en el corpus ni en el catálogo', (id) => {
    expect(todos).not.toContain(id);
    expect(usadosPorElLibro).not.toContain(id);
  });

  it.each(NOMBRES_NUEVOS)('«%s» existe, el catálogo lo usa y su clase se llama %s', (id, clase) => {
    expect(todos).toContain(id);
    expect(usadosPorElLibro).toContain(id);
    expect(nombreDeLaClase(leerProgramaDelLibro(id).fuente)).toBe(clase);
  });

  it('el archivo y la clase pública se llaman igual en los programas del libro (guarda contra un recorrido vacío)', () => {
    expect(todos.length).toBeGreaterThanOrEqual(43);
    for (const id of todos) {
      expect(nombreDeLaClase(leerProgramaDelLibro(id).fuente), id).toBe(claseEsperadaDelArchivo(id));
    }
  });

  it('ningún programa que el alumno predice (para empezar, paso a paso y ponte a prueba) trae en su nombre cuántas vueltas da ni dónde termina', () => {
    const quePredice = TEMAS.flatMap((tema) => programasDelTema(tema)).filter(({ papel }) => papel === 'para-empezar' || papel === 'paso-a-paso' || papel === 'ponte-a-prueba');
    expect(quePredice.length).toBeGreaterThanOrEqual(24);
    expect(quePredice.filter(({ id }) => PALABRAS_QUE_CUENTAN_LA_RESPUESTA.test(id)).map(({ id }) => id)).toEqual([]);
  });

  it('control: el criterio sí detecta los cinco nombres anteriores (no es un filtro que nunca dispara) y deja pasar los nombres neutros', () => {
    const queDetecta = NOMBRES_QUE_DABAN_LA_RESPUESTA.filter((id) => PALABRAS_QUE_CUENTAN_LA_RESPUESTA.test(id)).sort();
    expect(queDetecta).toEqual(['u6-do-while/doblar-hasta-pasar-de-20', 'u6-do-while/una-sola-vuelta', 'u6-for/sin-vueltas', 'u6-while/no-da-ni-una-vuelta']);
    for (const [id] of NOMBRES_NUEVOS) expect(PALABRAS_QUE_CUENTAN_LA_RESPUESTA.test(id), id).toBe(false);
    expect(PALABRAS_QUE_CUENTAN_LA_RESPUESTA.test('u6-que-es-un-ciclo/pasar-lista')).toBe(false);
  });
});

describe('control: el criterio de «salida escrita a mano» sí detecta una (no es un filtro que nunca dispara)', () => {
  it('detecta un renglón de la salida puesto en la prosa y no lo detecta dentro de código en línea ni si es corto', () => {
    const salida = 'Alumno número 1: presente\nLista terminada\n3\n';
    expect(renglonesEscritosEnLaProsa(['Java escribe Lista terminada al final.'], salida)).toEqual(['Lista terminada']);
    expect(renglonesEscritosEnLaProsa(['Escribe `Lista terminada` al final.'], salida)).toEqual([]);
    expect(renglonesEscritosEnLaProsa(['Escribe 3 veces.'], salida)).toEqual([]);
    expect(renglonesEscritosEnLaProsa(['Otro texto cualquiera.'], salida)).toEqual([]);
  });
});
