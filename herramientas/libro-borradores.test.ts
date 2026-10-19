// RED de la tarea R0.14: el guion que arma, desde el catálogo y los goldens, el Markdown que el PO lee para aprobar los borradores (design §5.4: «desde R0 el PO puede revisar borradores como texto»). El texto sale del
// catálogo y toda salida sale del golden de su programa: nadie copia nada a mano, así que lo que el PO lee es lo que el alumno verá. La prueba de la muestra usa un tema inventado y programas falsos para fijar
// la forma del documento; la del final exige que el archivo que está en el repositorio sea EXACTAMENTE lo que el guion genera hoy (si alguien edita el catálogo, un golden o el Markdown a mano, falla).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SECCIONES_DEL_TEMA } from '../src/textos/es-MX/libro/etiquetas.ts';
import { temaCompleto } from '../src/textos/es-MX/libro/indice.ts';
import { palabrasDelTema, programasDelTema } from '../src/textos/es-MX/libro/reglas-del-tema.ts';
import type { ContenidoDelTema } from '../src/textos/es-MX/libro/tipos.ts';
import { TEMAS_DE_U6 } from '../src/textos/es-MX/libro/u6.ts';
import { BORRADORES, escaparCelda, generarBorrador, renderizarBorradores } from './libro-borradores.ts';
import { RAIZ_DEL_PROYECTO, leerProgramaDelLibro } from './libro-programas.ts';
import type { ProgramaDelLibro } from './libro-programas.ts';

const CONTENIDO: ContenidoDelTema = {
  paraEmpezar: { situacion: 'Cuentas en voz alta.', programa: 'u6-while/contar' },
  idea: ['Primera frase de la idea.', 'Segunda frase de la idea.', 'Tercera frase de la idea.'],
  comoSeEscribe: [
    { tipo: 'forma', texto: 'while (condición) {\n    instrucciones\n}' },
    { tipo: 'parrafo', texto: 'Java sigue este orden:' },
    { tipo: 'lista', elementos: ['Revisa la condición.', 'Hace la vuelta.'] },
    { tipo: 'nota', texto: 'Una nota aparte.' },
  ],
  pasoAPaso: { queObservar: 'Mira `numero`.', programa: 'u6-while/con-entrada', sugerirReto: true },
  erroresTipicos: [
    { texto: 'Un error que corre.', programa: 'u6-while/error-que-corre' },
    { texto: 'Un error que javac rechaza.', programa: 'u6-while/error-que-no-compila' },
  ],
  ponteAPrueba: [
    { pregunta: 'Primera pregunta.', programa: 'u6-while/prueba-uno' },
    { pregunta: 'Segunda pregunta.', programa: 'u6-while/prueba-dos' },
  ],
  ahoraHazloTu: [
    { tipo: 'modificar', consigna: 'Cambia el ejemplo.', solucion: 'u6-while/solucion-modificar' },
    { tipo: 'crear', consigna: 'Crea un programa.', solucion: 'u6-while/solucion-crear' },
  ],
  resumen: ['Primera viñeta.', 'Segunda viñeta.', 'Tercera viñeta.'],
};

function programaFalso(id: string, extras: Partial<ProgramaDelLibro> = {}): ProgramaDelLibro {
  return {
    id,
    rutaFuente: `corpus/libro/${id}.java`,
    fuente: `class ${id.split('/')[1]?.replace(/-/g, '_')} {}\n`,
    entrada: null,
    salida: `SALIDA-DE-${id}\n`,
    errores: '',
    meta: { papel: 'para-empezar', esperado: 'ejecuta' },
    oraculo: { compilo: true, codigoSalida: 0, agotoTiempo: false, desenlace: 'normal' },
    ...extras,
  };
}

const PROGRAMAS_FALSOS: Readonly<Record<string, ProgramaDelLibro>> = Object.fromEntries(
  [
    programaFalso('u6-while/contar'),
    programaFalso('u6-while/con-entrada', { entrada: '3\n' }),
    programaFalso('u6-while/error-que-corre'),
    programaFalso('u6-while/error-que-no-compila', {
      salida: '',
      errores: 'Falla.java:6: error: cannot find symbol\n  symbol: variable i\n1 error\n',
      meta: { papel: 'error-tipico', esperado: 'error-compilacion' },
      oraculo: { compilo: false, codigoSalida: null, agotoTiempo: false, desenlace: 'error-compilacion' },
    }),
    programaFalso('u6-while/prueba-uno'),
    programaFalso('u6-while/prueba-dos'),
    programaFalso('u6-while/solucion-modificar', { entrada: '9\n' }),
    programaFalso('u6-while/solucion-crear'),
  ].map((programa) => [programa.id, programa]),
);

const TEMA = temaCompleto('u6-while', CONTENIDO);

function documento(): string {
  return renderizarBorradores({
    titulo: 'Borradores de muestra',
    temas: [TEMA],
    leerPrograma: (id) => PROGRAMAS_FALSOS[id] as ProgramaDelLibro,
    mensajeDelMotor: (fuente) => (fuente.includes('error_que_no_compila') ? 'Línea 6: No existe una variable llamada "i".' : null),
  });
}

describe('renderizarBorradores: el documento que lee el PO, armado desde el catálogo y los goldens', () => {
  it('empieza con el título, dice que está generado y que no se edita a mano, y trae una tabla con los temas', () => {
    const md = documento();
    expect(md.startsWith('# Borradores de muestra\n')).toBe(true);
    expect(md).toContain('Generado con `npm run libro:borradores`');
    expect(md).toContain('No se edita a mano');
    const palabras = palabrasDelTema(TEMA);
    expect(md).toContain(`| 1 | El ciclo \`while\` | ${palabras} | ${programasDelTema(TEMA).length} | borrador |`);
  });

  it('cada tema lleva su título, su id, su unidad, su oleada, su estado, sus palabras contra la meta y su cuenta de programas', () => {
    const md = documento();
    expect(md).toContain('## 1. El ciclo `while`');
    expect(md).toContain(`\`u6-while\` · U6 · oleada 1 · borrador · ${palabrasDelTema(TEMA)} palabras (meta 400, máximo 550) · 8 programas`);
  });

  it('las ocho secciones salen con su título, en el orden del libro', () => {
    const md = documento();
    const posiciones = SECCIONES_DEL_TEMA.map((seccion) => md.indexOf(`### ${seccion.titulo}\n`));
    expect(posiciones.every((posicion) => posicion >= 0)).toBe(true);
    expect([...posiciones].sort((a, b) => a - b)).toEqual(posiciones);
  });

  it('«Para empezar»: la situación, el programa, «¿Qué crees que imprime?» y «Ver la salida» con el golden del oráculo', () => {
    const md = documento();
    const seccion = md.slice(md.indexOf('### Para empezar'), md.indexOf('### La idea'));
    expect(seccion).toContain('Cuentas en voz alta.');
    expect(seccion).toContain('```java\nclass contar {}\n```');
    expect(seccion).toContain('**¿Qué crees que imprime?**');
    expect(seccion.indexOf('**¿Qué crees que imprime?**')).toBeLessThan(seccion.indexOf('**Ver la salida**'));
    expect(seccion).toContain('```text\nSALIDA-DE-u6-while/contar\n```');
  });

  it('«La idea» y «En resumen» salen como viñetas', () => {
    const md = documento();
    expect(md).toContain('- Primera frase de la idea.\n- Segunda frase de la idea.\n- Tercera frase de la idea.');
    expect(md).toContain('- Primera viñeta.\n- Segunda viñeta.\n- Tercera viñeta.');
  });

  it('«Cómo se escribe»: la forma general como código, el párrafo, la lista numerada y la nota', () => {
    const md = documento();
    const seccion = md.slice(md.indexOf('### Cómo se escribe'), md.indexOf('### Míralo paso a paso'));
    expect(seccion).toContain('```java\nwhile (condición) {\n    instrucciones\n}\n```');
    expect(seccion).toContain('Java sigue este orden:');
    expect(seccion).toContain('1. Revisa la condición.\n2. Hace la vuelta.');
    expect(seccion).toContain('> Una nota aparte.');
  });

  it('«Míralo paso a paso»: qué observar, el programa con su entrada de prueba y si se sugiere el reto', () => {
    const md = documento();
    const seccion = md.slice(md.indexOf('### Míralo paso a paso'), md.indexOf('### Errores típicos'));
    expect(seccion).toContain('Mira `numero`.');
    expect(seccion).toContain('**Entrada de prueba**\n\n```text\n3\n```');
    expect(seccion).toContain('Se sugiere encender el modo reto');
  });

  it('«Errores típicos»: el que se ejecuta muestra su salida; el que javac rechaza muestra lo que dijo javac y lo que le dice el visualizador al alumno', () => {
    const md = documento();
    const seccion = md.slice(md.indexOf('### Errores típicos'), md.indexOf('### Ponte a prueba'));
    expect(seccion).toContain('Un error que corre.');
    expect(seccion).toContain('```text\nSALIDA-DE-u6-while/error-que-corre\n```');
    expect(seccion).toContain('Un error que javac rechaza.');
    expect(seccion).toContain('**javac dice**');
    expect(seccion).toContain('Falla.java:6: error: cannot find symbol');
    expect(seccion).toContain('**El visualizador le dice al alumno**');
    expect(seccion).toContain('Línea 6: No existe una variable llamada "i".');
  });

  it('«Ponte a prueba»: cada pregunta numerada con su programa y «Ver la respuesta» con el golden', () => {
    const md = documento();
    const seccion = md.slice(md.indexOf('### Ponte a prueba'), md.indexOf('### Ahora hazlo tú'));
    expect(seccion).toContain('**1.** Primera pregunta.');
    expect(seccion).toContain('**2.** Segunda pregunta.');
    expect(seccion).toContain('**Ver la respuesta**');
    expect(seccion).toContain('```text\nSALIDA-DE-u6-while/prueba-uno\n```');
    expect(seccion).toContain('```text\nSALIDA-DE-u6-while/prueba-dos\n```');
  });

  it('«Ahora hazlo tú»: la consigna, «Para comprobar» con la entrada y la salida del golden de la solución, y la solución solo para el docente', () => {
    const md = documento();
    const seccion = md.slice(md.indexOf('### Ahora hazlo tú'), md.indexOf('### En resumen'));
    expect(seccion).toContain('**Modificar.** Cambia el ejemplo.');
    expect(seccion).toContain('**Crear.** Crea un programa.');
    expect(seccion).toContain('**Para comprobar: con esta entrada debe imprimir**');
    expect(seccion).toContain('**Para comprobar: debe imprimir**');
    expect(seccion).toContain('```text\n9\n```');
    expect(seccion).toContain('```text\nSALIDA-DE-u6-while/solucion-modificar\n```');
    expect(seccion).toContain('Solución de referencia (solo para el docente; el alumno no la ve): `corpus/libro/u6-while/solucion-crear.java`');
    expect(seccion).toContain('```java\nclass solucion_crear {}\n```');
  });

  it('toda salida que muestra es la del golden: cada marcador de golden aparece y no hay ninguna salida más', () => {
    const md = documento();
    const marcadores = md.match(/SALIDA-DE-[\w/-]+/g) ?? [];
    expect(new Set(marcadores)).toEqual(new Set(['SALIDA-DE-u6-while/contar', 'SALIDA-DE-u6-while/con-entrada', 'SALIDA-DE-u6-while/error-que-corre', 'SALIDA-DE-u6-while/prueba-uno', 'SALIDA-DE-u6-while/prueba-dos', 'SALIDA-DE-u6-while/solucion-modificar', 'SALIDA-DE-u6-while/solucion-crear']));
  });

  it('no deja marcadores sin resolver', () => {
    const md = documento();
    expect(md).not.toMatch(/undefined|\[object|NaN/);
  });
});

describe('escaparCelda: un título con `||` no rompe la tabla de Markdown', () => {
  it('escapa cada barra vertical y deja el resto igual', () => {
    expect(escaparCelda('Operadores lógicos: `&&`, `||` y `!`')).toBe('Operadores lógicos: `&&`, `\\|\\|` y `!`');
    expect(escaparCelda('El ciclo `while`')).toBe('El ciclo `while`');
  });
});

describe('BORRADORES y el archivo para el PO (R0.14)', () => {
  const parte1 = BORRADORES.find((borrador) => borrador.archivo.endsWith('u6-parte-1.md'));

  it('el borrador «U6, parte 1» son los cinco temas de la tarea y se escribe en openspec/changes/robots-tutores/borradores/u6-parte-1.md', () => {
    expect(parte1?.archivo).toBe('openspec/changes/robots-tutores/borradores/u6-parte-1.md');
    expect(parte1?.ids).toEqual(['u6-que-es-un-ciclo', 'u6-while', 'u6-contador-acumulador-bandera', 'u6-do-while', 'u6-for']);
  });

  it('el archivo que está en el repositorio es exactamente lo que el guion genera hoy (no se edita a mano)', () => {
    expect(parte1).toBeDefined();
    const ruta = resolve(RAIZ_DEL_PROYECTO, parte1?.archivo ?? '');
    expect(existsSync(ruta), 'corre `npm run libro:borradores` para generarlo').toBe(true);
    expect(readFileSync(ruta, 'utf-8')).toBe(generarBorrador(parte1 as NonNullable<typeof parte1>));
  });

  it('el documento real trae los cinco temas, cada salida del golden de cada programa y el veredicto de javac de los errores que no compilan', () => {
    const md = generarBorrador(parte1 as NonNullable<typeof parte1>);
    expect(TEMAS_DE_U6).toHaveLength(5);
    for (const tema of TEMAS_DE_U6) {
      expect(md, tema.id).toContain(`## ${TEMAS_DE_U6.indexOf(tema) + 1}. ${tema.titulo}`);
      for (const { id } of programasDelTema(tema)) {
        const programa = leerProgramaDelLibro(id);
        if (programa.meta.esperado === 'ejecuta') expect(md, id).toContain(`\`\`\`text\n${programa.salida.trimEnd()}\n\`\`\``);
        else expect(md, id).toContain(programa.errores.trimEnd());
        expect(md, id).toContain(programa.fuente.trimEnd());
      }
    }
  });
});
