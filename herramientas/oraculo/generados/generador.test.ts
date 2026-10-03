// RED de la tarea 1.31: el generador de programas del subconjunto U3–U7, guiado por tipos y
// determinista por semilla. Estas pruebas NO necesitan javac: miden que el generador produzca, sobre
// una muestra fija, cada construcción que la tarea exige cubrir (el veredicto de javac sobre esos
// programas, su sintaxis y la proporción de aceptados/rechazados se miden en `generador-javac.test.ts`).
// Como todo sale de una semilla fija, un fallo de cobertura es reproducible: se sube el peso de la
// plantilla que falta, no se «reintenta».
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { generarPrograma, generarProgramas } from './generador.ts';
import { IDENTIFICADORES_CONTEXTUALES } from '../../../pruebas/compilacion/tablas-lexicas.ts';
import { NOMBRES_DE_OBJECT_PROTOTYPE } from '../../../pruebas/compilacion/tablas-de-prototipo.ts';
import { NOMBRES_CONTEXTUALES, PALABRAS_RESERVADAS } from './vocabulario.ts';
import { crearAzar } from './azar.ts';
import { cargarCatalogoApi } from './catalogo-api.ts';
import { crearEntorno, elegirNombreNuevo } from './entorno.ts';
import {
  etiquetasDe,
  pretendeErrorDeSintaxis,
  renderizarCuerpo,
  renderizarExpr,
  renderizarPrograma,
  sentenciasDe,
  todasLasExprs,
  type Caso,
  type Declaracion,
  type Expr,
  type Programa,
  type Sentencia,
} from './programa.ts';

const SEMILLA = 20260929;
const CANTIDAD_DE_LA_MUESTRA = 4000;

const TIPOS_DEL_SUBCONJUNTO = ['int', 'long', 'double', 'boolean', 'char', 'String', 'Scanner', 'Random'] as const;
const PRIMITIVOS = ['int', 'long', 'double', 'boolean', 'char'] as const;

let muestra: readonly Programa[] = [];
beforeAll(() => {
  muestra = generarProgramas(SEMILLA, CANTIDAD_DE_LA_MUESTRA);
});

function declaraciones(programa: Programa): Declaracion[] {
  return [...sentenciasDe(programa.sentencias)].filter((s): s is Declaracion => s.k === 'declaracion');
}

function todasLasDeclaraciones(): Declaracion[] {
  return muestra.flatMap(declaraciones);
}

function todasLasExpresiones(): Expr[] {
  return muestra.flatMap((programa) => [...todasLasExprs(programa)]);
}

function conEtiqueta(etiqueta: string): Expr[] {
  return todasLasExpresiones().filter((e) => e.etiquetas?.includes(etiqueta as never) === true);
}

function textoDe(programa: Programa): string {
  return renderizarPrograma(programa);
}

describe('generarPrograma — determinismo por semilla', () => {
  it('la misma semilla y el mismo índice producen el MISMO programa', () => {
    expect(textoDe(generarPrograma(7, 3))).toBe(textoDe(generarPrograma(7, 3)));
  });

  it('semillas distintas producen programas distintos', () => {
    expect(textoDe(generarPrograma(1, 0))).not.toBe(textoDe(generarPrograma(2, 0)));
  });

  it('el programa número k no depende de cuántos se pidan (los primeros 20 de 40 son los 20 de 20)', () => {
    expect(generarProgramas(7, 20).map(textoDe)).toEqual(generarProgramas(7, 40).slice(0, 20).map(textoDe));
  });

  it('hay variedad: al menos el 98 % de la muestra son programas distintos', () => {
    expect(new Set(muestra.map(textoDe)).size).toBeGreaterThanOrEqual(CANTIDAD_DE_LA_MUESTRA * 0.98);
  });
});

describe('generarPrograma — forma del programa', () => {
  it('cada programa tiene de 1 a 6 sentencias en main, y se ven los seis tamaños', () => {
    const tamanos = new Set(muestra.map((p) => p.sentencias.length));
    expect(Math.min(...tamanos)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...tamanos)).toBeLessThanOrEqual(6);
    expect([...tamanos].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('todo programa que usa Scanner o Random trae su import casi siempre (a veces lo omite: es un error real de alumno)', () => {
    const conScanner = muestra.filter((p) => /\bScanner\b/.test(textoDe(p).replace(/import .*;/g, '')));
    const conImport = conScanner.filter((p) => p.imports.some((i) => i.includes('java.util.Scanner')));
    expect(conScanner.length).toBeGreaterThan(50);
    expect(conImport.length / conScanner.length).toBeGreaterThan(0.75);
    expect(conImport.length).toBeLessThan(conScanner.length);
  });
});

describe('cobertura — declaraciones', () => {
  it.each(TIPOS_DEL_SUBCONJUNTO)('declara %s con y sin final', (tipo) => {
    const deEseTipo = todasLasDeclaraciones().filter((d) => d.tipo === tipo);
    expect(deEseTipo.some((d) => d.esFinal), `final ${tipo}`).toBe(true);
    expect(deEseTipo.some((d) => !d.esFinal), `${tipo} sin final`).toBe(true);
  });

  it('declara variables sin valor inicial y también los tipos envoltorio y fuera del subconjunto', () => {
    const declaradas = todasLasDeclaraciones();
    expect(declaradas.some((d) => d.inicial === null)).toBe(true);
    for (const tipo of ['Integer', 'Double', 'Character', 'Long', 'Object', 'float', 'byte', 'short', 'var']) {
      expect(declaradas.some((d) => d.tipo === tipo), tipo).toBe(true);
    }
  });
});

describe('cobertura — asignaciones, incremento y final', () => {
  it('hay asignación simple, compuesta, ++ y -- (prefijos y sufijos)', () => {
    expect(conEtiqueta('asignacion').length).toBeGreaterThan(0);
    expect(conEtiqueta('asignacion-compuesta').length).toBeGreaterThan(0);
    const incrementos = conEtiqueta('incremento').map(renderizarExpr);
    for (const patron of [/^\w+\+\+$/, /^\w+--$/, /^\+\+\w+$/, /^--\w+$/]) {
      expect(incrementos.some((t) => patron.test(t)), String(patron)).toBe(true);
    }
  });

  it('a veces se asigna, se compuesta y se incrementa una variable final', () => {
    const casos = new Set<string>();
    for (const programa of muestra) {
      const finales = new Set(declaraciones(programa).filter((d) => d.esFinal).map((d) => d.nombre));
      for (const expr of todasLasExprs(programa)) {
        for (const etiqueta of ['asignacion', 'asignacion-compuesta', 'incremento'] as const) {
          if (expr.etiquetas?.includes(etiqueta) !== true) continue;
          const objetivo = expr.hijos.find((h) => finales.has(renderizarExpr(h)));
          if (objetivo !== undefined) casos.add(etiqueta);
        }
      }
    }
    expect([...casos].sort()).toEqual(['asignacion', 'asignacion-compuesta', 'incremento']);
  });
});

describe('cobertura — operadores entre tipos mezclados', () => {
  const binarias = () => conEtiqueta('operador').filter((e) => e.hijos.length === 2);

  it('usa los operadores aritméticos, relacionales, de igualdad, lógicos y de bits', () => {
    const operadores = new Set(binarias().map((e) => e.partes[1]!.trim()));
    for (const operador of ['+', '-', '*', '/', '%', '<', '>', '<=', '>=', '==', '!=', '&&', '||', '&', '|', '^', '<<', '>>', '>>>']) {
      expect(operadores.has(operador), operador).toBe(true);
    }
  });

  it('mezcla tipos distintos en los dos lados (al menos 25 parejas de tipos diferentes)', () => {
    const parejas = new Set(binarias().filter((e) => e.hijos[0]!.tipo !== e.hijos[1]!.tipo).map((e) => `${e.hijos[0]!.tipo}|${e.hijos[1]!.tipo}`));
    expect(parejas.size).toBeGreaterThanOrEqual(25);
  });
});

describe('cobertura — casts entre todos los pares de tipos', () => {
  it('hay al menos un cast por cada uno de los 64 pares (origen, destino) de los 8 tipos del subconjunto', () => {
    const pares = new Set(conEtiqueta('cast').map((e) => `${e.hijos[0]!.tipo}->${e.partes[0]!.replace(/[() ]/g, '')}`));
    const faltan: string[] = [];
    for (const origen of TIPOS_DEL_SUBCONJUNTO) {
      for (const destino of TIPOS_DEL_SUBCONJUNTO) if (!pares.has(`${origen}->${destino}`)) faltan.push(`${origen}->${destino}`);
    }
    expect(faltan).toEqual([]);
  });

  it('también castea hacia tipos envoltorio y fuera del subconjunto (Integer, Double, Character, Object, byte, short, float)', () => {
    const destinos = new Set(conEtiqueta('cast').map((e) => e.partes[0]!.replace(/[() ]/g, '')));
    for (const destino of ['Integer', 'Double', 'Character', 'Long', 'Object', 'byte', 'short', 'float']) {
      expect(destinos.has(destino), destino).toBe(true);
    }
  });
});

describe('cobertura — miembros y llamadas sobre primitivos', () => {
  it('accede a miembros de un receptor de cada tipo primitivo, como llamada y como campo', () => {
    const nodos = conEtiqueta('miembro-de-primitivo');
    for (const tipo of PRIMITIVOS) {
      const deEseTipo = nodos.filter((e) => e.hijos[0]?.tipo === tipo);
      expect(deEseTipo.some((e) => e.partes.join('').includes('(')), `llamada sobre ${tipo}`).toBe(true);
      expect(deEseTipo.some((e) => !e.partes.join('').includes('(')), `campo de ${tipo}`).toBe(true);
    }
  });

  it('a veces una variable primitiva se llama como una clase del JDK (int Math = 3; Math.abs(2))', () => {
    const sombras = todasLasDeclaraciones().filter((d) => ['Math', 'String', 'Integer', 'System', 'Double', 'Character'].includes(d.nombre));
    expect(sombras.length).toBeGreaterThan(0);
  });
});

describe('cobertura — métodos de biblioteca sobre un objeto y sobre el nombre de la clase', () => {
  const llamadas = () => conEtiqueta('llamada-de-biblioteca');

  it.each(['String', 'Scanner', 'Math', 'Integer', 'Double', 'Character', 'Random'])('llama métodos de %s por el nombre de la clase', (clase) => {
    expect(llamadas().some((e) => e.partes[0]!.startsWith(`${clase}.`)), clase).toBe(true);
  });

  it.each(['String', 'Scanner', 'Integer', 'Double', 'Character', 'Random'])('llama métodos de %s sobre un objeto de ese tipo', (clase) => {
    expect(llamadas().some((e) => e.partes[0] === '' && e.hijos[0]?.tipo === clase), clase).toBe(true);
  });

  it('llama métodos de instancia por el nombre de la clase (String.length()) y métodos estáticos por un objeto (s.valueOf(1))', () => {
    expect(conEtiqueta('metodo-de-instancia-por-clase').length).toBeGreaterThan(0);
    expect(conEtiqueta('metodo-estatico-por-objeto').length).toBeGreaterThan(0);
  });

  it('lee campos de biblioteca (Math.PI, Integer.MAX_VALUE) también a través de un objeto', () => {
    expect(conEtiqueta('campo-de-biblioteca').length).toBeGreaterThan(0);
  });
});

describe('cobertura — llamadas void en posición de valor', () => {
  it('pone una llamada void como argumento, como inicializador y como operando', () => {
    const esVoid = (e: Expr) => e.tipo === 'void';
    const comoArgumento = todasLasExpresiones().some(
      (e) => (e.etiquetas?.includes('impresion') === true || e.etiquetas?.includes('llamada-de-biblioteca') === true) && e.hijos.some(esVoid),
    );
    const comoOperando = todasLasExpresiones().some((e) => e.etiquetas?.includes('operador') === true && e.hijos.some(esVoid));
    const comoInicializador = todasLasDeclaraciones().some((d) => d.inicial !== null && esVoid(d.inicial));
    expect({ comoArgumento, comoOperando, comoInicializador }).toEqual({ comoArgumento: true, comoOperando: true, comoInicializador: true });
  });

  it('también usa una llamada void como condición y como operando de un cast', () => {
    const comoCondicion = muestra.some((p) => [...sentenciasDe(p.sentencias)].some((s) => (s.k === 'si' || s.k === 'mientras') && s.condicion.tipo === 'void'));
    const comoCast = conEtiqueta('cast').some((e) => e.hijos[0]?.tipo === 'void');
    expect({ comoCondicion, comoCast }).toEqual({ comoCondicion: true, comoCast: true });
  });
});

function casosDe(): { readonly selector: Expr; readonly casos: readonly Caso[] }[] {
  return muestra.flatMap((p) => [...sentenciasDe(p.sentencias)].flatMap((s) => (s.k === 'seleccion' ? [{ selector: s.selector, casos: s.casos }] : [])));
}

describe('cobertura — switch', () => {
  it.each(['int', 'long', 'double', 'boolean', 'char', 'String', 'byte', 'Integer'])('hay un switch con selector %s', (tipo) => {
    expect(casosDe().some((s) => s.selector.tipo === tipo), tipo).toBe(true);
  });

  it.each(['int', 'long', 'double', 'boolean', 'char', 'String'])('hay etiquetas case de tipo %s', (tipo) => {
    const etiquetas = casosDe().flatMap((s) => s.casos.flatMap((c) => (c.etiquetas === 'default' ? [] : c.etiquetas)));
    expect(etiquetas.some((e) => e.tipo === tipo), tipo).toBe(true);
  });

  it('a veces repite una etiqueta y a veces repite el default; también hay switch con flecha', () => {
    const repiteEtiqueta = casosDe().some((s) => {
      const textos = s.casos.flatMap((c) => (c.etiquetas === 'default' ? [] : c.etiquetas.map(renderizarExpr)));
      return new Set(textos).size < textos.length;
    });
    const repiteDefault = casosDe().some((s) => s.casos.filter((c) => c.etiquetas === 'default').length >= 2);
    const conFlecha = muestra.some((p) => [...sentenciasDe(p.sentencias)].some((s) => s.k === 'seleccion' && s.flecha));
    expect({ repiteEtiqueta, repiteDefault, conFlecha }).toEqual({ repiteEtiqueta: true, repiteDefault: true, conFlecha: true });
  });
});

describe('cobertura — condiciones y saltos', () => {
  function condicionesDe(clase: 'si' | 'mientras' | 'para' | 'haz'): Expr[] {
    return muestra.flatMap((p) => [...sentenciasDe(p.sentencias)].flatMap((s) => (s.k === clase && s.condicion !== null ? [s.condicion] : [])));
  }

  it.each(['si', 'mientras', 'para', 'haz'] as const)('la condición de %s es a veces booleana y a veces no', (clase) => {
    const tipos = condicionesDe(clase).map((c) => c.tipo);
    expect(tipos.some((t) => t === 'boolean'), 'booleana').toBe(true);
    expect(tipos.some((t) => t !== 'boolean'), 'no booleana').toBe(true);
  });

  it('usa break y continue dentro de ciclos o switch y también fuera de ellos', () => {
    let dentro = 0;
    let fuera = 0;
    const visitar = (sentencias: readonly Sentencia[], envuelto: boolean): void => {
      for (const s of sentencias) {
        if (s.k === 'salto') {
          if (envuelto) dentro += 1;
          else fuera += 1;
        } else if (s.k === 'si') {
          visitar(s.entonces, envuelto);
          visitar(s.sino ?? [], envuelto);
        } else if (s.k === 'mientras' || s.k === 'haz' || s.k === 'para') visitar(s.cuerpo, true);
        else if (s.k === 'seleccion') s.casos.forEach((c) => visitar(c.cuerpo, true));
        else if (s.k === 'bloque') visitar(s.sentencias, envuelto);
      }
    };
    for (const p of muestra) visitar(p.sentencias, false);
    expect(dentro).toBeGreaterThan(20);
    expect(fuera).toBeGreaterThan(5);
    const palabras = new Set(muestra.flatMap((p) => [...sentenciasDe(p.sentencias)].flatMap((s) => (s.k === 'salto' ? [s.palabra] : []))));
    expect([...palabras].sort()).toEqual(['break', 'continue']);
  });
});

describe('cobertura — identificadores que son palabras clave', () => {
  it.each(['var', 'yield', 'record', 'sealed', 'permits', 'module', 'open', 'exports'])('usa «%s» como nombre de variable', (palabra) => {
    expect(todasLasDeclaraciones().some((d) => d.nombre === palabra), palabra).toBe(true);
  });

  it('también usa palabras reservadas y «_» como nombre, siempre marcadas como error de sintaxis a propósito', () => {
    const reservadas = todasLasDeclaraciones().filter((d) => ['class', '_', 'goto', 'enum'].includes(d.nombre));
    expect(reservadas.length).toBeGreaterThan(0);
    expect(reservadas.every((d) => d.sintaxisInvalida)).toBe(true);
  });
});

// ---- Ampliaciones a partir de la primera corrida contra el compilador real (tarea 1.31) ----
//
// La primera campaña de 5 000 programas contra `compilar()` encontró 6 de las 7 familias conocidas: la F3
// (`final` con `++`/`--`/asignación) NO apareció, porque un `final` casi nunca coincidía con su
// modificación en un programa sin otras construcciones que escondieran el error (un aviso de biblioteca
// fuera del subconjunto tapaba el resto). Además, el 27 % de los programas llevaba un método de
// biblioteca que el subconjunto no cubre, así que casi nada de lo demás se revisaba. De ahí estas pruebas.

function nombreDelMetodo(expr: Expr): string {
  const cabeza = expr.partes[0]! === '' ? expr.partes[1]! : expr.partes[0]!;
  return /([A-Za-z_]\w*)\($/.exec(cabeza.slice(0, cabeza.indexOf('(') + 1))?.[1] ?? '';
}

const METODOS_DEL_CURRICULO = new Set([
  'length', 'charAt', 'substring', 'indexOf', 'equals', 'equalsIgnoreCase', 'compareTo', 'toUpperCase', 'toLowerCase', 'trim', 'isEmpty', 'contains', 'startsWith', 'endsWith', 'replace', 'valueOf',
  'nextInt', 'nextDouble', 'nextBoolean', 'next', 'nextLine', 'close', 'hasNext', 'hasNextInt',
  'abs', 'max', 'min', 'pow', 'sqrt', 'round', 'floor', 'ceil', 'random',
  'isDigit', 'isLetter', 'isLetterOrDigit', 'isUpperCase', 'isLowerCase', 'isWhitespace',
  'parseInt', 'parseDouble', 'toString',
]);

describe('cobertura — ampliaciones tras la primera corrida real', () => {
  it('la mayoría de las llamadas de biblioteca son métodos del currículo (para que el compilador REVISE el programa en vez de avisar)', () => {
    const nombres = conEtiqueta('llamada-de-biblioteca').map(nombreDelMetodo).filter((n) => n !== '');
    const delCurriculo = nombres.filter((n) => METODOS_DEL_CURRICULO.has(n)).length;
    expect(nombres.length).toBeGreaterThan(500);
    expect(delCurriculo / nombres.length).toBeGreaterThan(0.6);
  });

  it('F3: un final con inicializador y, justo después, su modificación (++, --, = o +=), en al menos 30 programas', () => {
    let casos = 0;
    for (const programa of muestra) {
      programa.sentencias.forEach((sentencia, i) => {
        const siguiente = programa.sentencias[i + 1];
        if (sentencia.k !== 'declaracion' || !sentencia.esFinal || sentencia.inicial === null || siguiente?.k !== 'expresion') return;
        const modifica = siguiente.expr.etiquetas?.some((e) => e === 'incremento' || e === 'asignacion' || e === 'asignacion-compuesta') === true;
        if (modifica && siguiente.expr.hijos.some((h) => renderizarExpr(h) === sentencia.nombre)) casos += 1;
      });
    }
    expect(casos).toBeGreaterThanOrEqual(30);
  });

  it('las declaraciones de un tipo envoltorio o Object llevan la etiqueta tipo-envoltorio', () => {
    const envoltorios = todasLasDeclaraciones().filter((d) => ['Integer', 'Double', 'Character', 'Long', 'Boolean', 'Object'].includes(d.tipo));
    expect(envoltorios.length).toBeGreaterThan(50);
    expect(envoltorios.every((d) => etiquetasDe({ imports: [], sentencias: [d] }).includes('tipo-envoltorio'))).toBe(true);
  });

  it('estrecha constantes enteras a char, byte y short, dentro y fuera de rango, y con una constante final o no final', () => {
    const inicialesEnteras = (tipo: string) => todasLasDeclaraciones().filter((d) => d.tipo === tipo && d.inicial !== null && /^-?\d+$/.test(renderizarExpr(d.inicial)));
    for (const tipo of ['char', 'byte', 'short']) {
      const valores = new Set(inicialesEnteras(tipo).map((d) => Number(renderizarExpr(d.inicial!))));
      expect(valores.size, `constantes enteras para ${tipo}`).toBeGreaterThanOrEqual(4);
    }
    const desdeUnaVariable = todasLasDeclaraciones().filter((d) => ['byte', 'short', 'char'].includes(d.tipo) && d.inicial !== null && d.inicial.hijos.length === 0 && /^[a-z]\w*$/.test(renderizarExpr(d.inicial)));
    expect(desdeUnaVariable.length).toBeGreaterThan(5);
  });

  it('aplica operadores unarios a operandos de cualquier tipo (!5, -true, ~1.5, +"a")', () => {
    const unarios = conEtiqueta('operador').filter((e) => e.hijos.length === 1 && ['!', '-', '~', '+'].includes(e.partes[0]!));
    const mal = (e: Expr): boolean => {
      const tipo = e.hijos[0]!.tipo;
      const operador = e.partes[0]!;
      if (operador === '!') return tipo !== 'boolean';
      if (operador === '~') return !['int', 'long', 'char'].includes(tipo);
      return !['int', 'long', 'double', 'char'].includes(tipo);
    };
    expect(unarios.filter(mal).length).toBeGreaterThan(20);
    expect(unarios.filter((e) => !mal(e)).length).toBeGreaterThan(20);
  });

  it('a veces se asigna, se incrementa o se compuesta un campo final de biblioteca (Math.PI = 3, Integer.MAX_VALUE++)', () => {
    const modificaCampos = todasLasExpresiones().filter(
      (e) => e.etiquetas?.some((t) => t === 'asignacion' || t === 'asignacion-compuesta' || t === 'incremento') === true && e.hijos[0]?.etiquetas?.includes('campo-de-biblioteca') === true,
    );
    expect(modificaCampos.length).toBeGreaterThan(5);
  });
});

describe('cobertura — literales, identificadores y tipos envoltorio al usarse', () => {
  const inicialesDeDeclaraciones = (): string[] => todasLasDeclaraciones().flatMap((d) => (d.inicial === null ? [] : [renderizarExpr(d.inicial)]));

  it.each([
    ['hexadecimal', /^0x[0-9a-f]+L?$/i],
    ['octal', /^0[0-7]+$/],
    ['binario', /^0b[01]+$/i],
    ['con guiones bajos', /^\d+(_+\d+)+L?$/],
    ['flotante hexadecimal', /^0x[0-9a-f.]*p[+-]?\d+$/i],
    ['sin parte entera o sin parte decimal', /^(\.\d+|\d+\.)$/],
    ['con exponente', /^\d+[eE][+-]?\d+$/],
    ['de carácter con escape Unicode', /^'\\u[0-9a-fA-F]{4}'$/],
    ['de carácter con escape octal', /^'\\[0-7]{1,3}'$/],
    ['de cadena con comillas escapadas', /^"\\"q\\""$/],
  ])('usa un literal %s (válido en Java)', (_nombre, patron) => {
    expect(inicialesDeDeclaraciones().some((texto) => patron.test(texto)), String(patron)).toBe(true);
  });

  it.each([
    ['guion bajo al final', /^\d+_+$/],
    ['octal con un 9', /^0\d*[89]\d*$/],
    ['entero fuera de rango sin L', /^3000000000L?$/],
    ['carácter con dos símbolos', /^'ab'$/],
    ['carácter vacío', /^''$/],
    ['escape ilegal', /^"\\q"$/],
    ['hexadecimal sin dígitos', /^0x$/],
  ])('usa un literal inválido a propósito: %s (marcado como error de sintaxis)', (_nombre, patron) => {
    const marcadas = todasLasDeclaraciones().filter((d) => d.inicial !== null && d.inicial.sintaxisInvalida === true && patron.test(renderizarExpr(d.inicial)));
    expect(marcadas.length, String(patron)).toBeGreaterThan(0);
  });

  it('usa identificadores con letras que no son ASCII y con $ y _, válidos en Java', () => {
    const nombres = new Set(todasLasDeclaraciones().filter((d) => !d.sintaxisInvalida).map((d) => d.nombre));
    for (const esperado of ['año', 'π', '$dinero', '_valor']) expect(nombres.has(esperado), esperado).toBe(true);
  });

  it('usa nombres que no son identificadores (empiezan con un dígito, llevan un guion), marcados como error de sintaxis', () => {
    const invalidos = new Set(todasLasDeclaraciones().filter((d) => d.sintaxisInvalida).map((d) => d.nombre));
    for (const esperado of ['1a', 'a-b']) expect(invalidos.has(esperado), esperado).toBe(true);
  });

  it('usa una variable envoltorio donde va un primitivo (desempaquetado: int y = k) y al revés (empaquetado: Integer k = n)', () => {
    const declaraciones = todasLasDeclaraciones();
    const desempaqueta = declaraciones.filter((d) => ['int', 'double', 'char', 'long', 'boolean'].includes(d.tipo) && d.inicial !== null && d.inicial.hijos.length === 0 && ['Integer', 'Double', 'Character', 'Long', 'Boolean'].includes(d.inicial.tipo));
    const empaqueta = declaraciones.filter((d) => ['Integer', 'Double', 'Character', 'Long', 'Boolean'].includes(d.tipo) && d.inicial !== null && d.inicial.hijos.length === 0 && ['int', 'double', 'char', 'long', 'boolean'].includes(d.inicial.tipo) && /^[a-z$_]\w*$/i.test(renderizarExpr(d.inicial)));
    expect(desempaqueta.length).toBeGreaterThan(3);
    expect(empaqueta.length).toBeGreaterThan(3);
  });
});

// ---- Tarea 1.33: las formas que el generador de la 1.31 NO sorteaba y que las campañas de la 1.32 sí encontraron sueltas ----
//
// La campaña de 35 000 programas de la 1.32 midió que de N3/N4 solo salían `1_`, `1__`, `0x1p3` y, UNA vez, `case s ->`; las demás
// formas (`1_L`, `1_.0`, `1._0`, `1_e1`, `0x1.8p1`, `0x.8p0`, `0X1P-2`, `0x1p3d`) salieron de un sondeo directo con javac. Si el
// generador no las sortea, la próxima regresión en esas formas solo la verá el corpus. De ahí estas pruebas, y las plantillas de
// `switch` con flecha y etiqueta de variable constante y de `printf` usado como valor.
describe('cobertura — 1.33: literales con guion bajo mal puesto y flotantes hexadecimales', () => {
  const declaracionesConInicial = (): { readonly tipo: string; readonly inicial: Expr }[] =>
    todasLasDeclaraciones().flatMap((d) => (d.inicial === null ? [] : [{ tipo: d.tipo, inicial: d.inicial }]));

  it.each([
    ['1_L', 'long'],
    ['1_.0', 'double'],
    ['1._0', 'double'],
    ['1_e1', 'double'],
  ])('sortea el literal inválido %s, con el tipo que pide (con otro, un error de conversión taparía el del guion bajo) y marcado como error de sintaxis', (texto, tipo) => {
    const usos = declaracionesConInicial().filter((d) => renderizarExpr(d.inicial) === texto);
    expect(usos.length, texto).toBeGreaterThan(0);
    expect(usos.every((d) => d.tipo === tipo && d.inicial.sintaxisInvalida === true), texto).toBe(true);
  });

  it.each(['0x1.8p1', '0x.8p0', '0X1P-2', '0x1p3d'])('sortea el flotante hexadecimal válido %s como un double', (texto) => {
    const usos = declaracionesConInicial().filter((d) => renderizarExpr(d.inicial) === texto);
    expect(usos.length, texto).toBeGreaterThan(0);
    expect(usos.every((d) => d.tipo === 'double' && d.inicial.sintaxisInvalida !== true), texto).toBe(true);
  });

  it('etiqueta esos literales con su rasgo, para que sus familias no salgan «sin rasgos»', () => {
    const rasgosDe = (texto: string) => etiquetasDe({ imports: [], sentencias: todasLasDeclaraciones().filter((d) => d.inicial !== null && renderizarExpr(d.inicial) === texto).slice(0, 1) });
    for (const texto of ['1_', '1__', '1_L', '1_.0', '1._0', '1_e1']) expect(rasgosDe(texto), texto).toContain('guion-bajo-en-literal');
    for (const texto of ['0x1p3', '0x1.8p1', '0x.8p0', '0X1P-2', '0x1p3d']) expect(rasgosDe(texto), texto).toContain('flotante-hexadecimal');
    // Un literal válido de otra clase (un octal) no lleva ninguno de los dos.
    expect(rasgosDe('017')).toEqual([]);
  });
});

describe('cobertura — 1.33: switch con flecha y etiqueta que es una variable constante', () => {
  // `final int s = 3; switch (s) { case s -> { } }`: la etiqueta es el NOMBRE de una variable `final` declarada antes.
  function switchesConEtiquetaDeVariable(): { readonly flecha: boolean; readonly etiquetas: readonly Expr[]; readonly finalesDeclaradasAntes: readonly string[] }[] {
    return muestra.flatMap((programa) => {
      const finales: string[] = [];
      const salida: { flecha: boolean; etiquetas: readonly Expr[]; finalesDeclaradasAntes: readonly string[] }[] = [];
      for (const sentencia of sentenciasDe(programa.sentencias)) {
        if (sentencia.k === 'declaracion' && sentencia.esFinal) finales.push(sentencia.nombre);
        if (sentencia.k !== 'seleccion') continue;
        const deVariable = sentencia.casos.flatMap((c) => (c.etiquetas === 'default' ? [] : c.etiquetas)).filter((e) => e.etiquetas?.includes('etiqueta-de-variable') === true);
        if (deVariable.length > 0) salida.push({ flecha: sentencia.flecha, etiquetas: deVariable, finalesDeclaradasAntes: [...finales] });
      }
      return salida;
    });
  }

  it('hay switch con flecha (`case K -> { … }`) y switch clásico (`case K:`) cuya etiqueta es una variable `final` declarada antes, en al menos 25 programas de cada forma', () => {
    const usos = switchesConEtiquetaDeVariable();
    const conNombreDeFinal = (flecha: boolean) => usos.filter((u) => u.flecha === flecha && u.etiquetas.every((e) => u.finalesDeclaradasAntes.includes(renderizarExpr(e)))).length;
    expect(conNombreDeFinal(true)).toBeGreaterThanOrEqual(25);
    expect(conNombreDeFinal(false)).toBeGreaterThanOrEqual(25);
  });

  it('a veces la etiqueta NO es constante (una variable sin final) o repite el valor de otra: el error que javac da con `case s ->` también', () => {
    const usos = switchesConEtiquetaDeVariable();
    expect(usos.some((u) => u.etiquetas.some((e) => !u.finalesDeclaradasAntes.includes(renderizarExpr(e))))).toBe(true);
  });

  it('el switch con flecha lleva el rasgo switch-flecha, y la etiqueta de variable, etiqueta-de-variable', () => {
    const conFlecha = muestra.find((p) => [...sentenciasDe(p.sentencias)].some((s) => s.k === 'seleccion' && s.flecha));
    expect(conFlecha).toBeDefined();
    expect(etiquetasDe(conFlecha!)).toContain('switch-flecha');
    expect(muestra.some((p) => etiquetasDe(p).includes('etiqueta-de-variable' as never))).toBe(true);
  });
});

describe('cobertura — 1.33: printf usado como VALOR (devuelve un PrintStream)', () => {
  const conPrintfComoValor = (): Expr[] => conEtiqueta('printf-como-valor');
  const esPrintf = (e: Expr): boolean => e.etiquetas?.includes('printf-como-valor') === true;

  it('usa el resultado de printf como inicializador de una declaración (int, String, boolean, double…)', () => {
    const tipos = new Set(todasLasDeclaraciones().filter((d) => d.inicial !== null && esPrintf(d.inicial)).map((d) => d.tipo));
    expect(tipos.size).toBeGreaterThanOrEqual(3);
  });

  it('lo usa como condición de un if/while, como operando, como operando de un cast, como asignación, como argumento de println y como receptor encadenado', () => {
    const comoCondicion = muestra.some((p) => [...sentenciasDe(p.sentencias)].some((s) => (s.k === 'si' || s.k === 'mientras') && esPrintf(s.condicion)));
    const comoOperando = todasLasExpresiones().some((e) => e.etiquetas?.includes('operador') === true && e.hijos.some(esPrintf));
    const comoCast = todasLasExpresiones().some((e) => e.etiquetas?.includes('cast') === true && e.hijos.some(esPrintf));
    const comoAsignacion = todasLasExpresiones().some((e) => e.etiquetas?.includes('asignacion') === true && e.hijos.some(esPrintf));
    const comoArgumento = todasLasExpresiones().some((e) => e.partes[0] === 'System.out.println(' && e.hijos.some(esPrintf));
    const comoReceptor = todasLasExpresiones().some((e) => e.partes[0] === '' && (e.partes[1] ?? '').startsWith('.println(') && esPrintf(e.hijos[0]!));
    expect({ comoCondicion, comoOperando, comoCast, comoAsignacion, comoArgumento, comoReceptor }).toEqual({
      comoCondicion: true,
      comoOperando: true,
      comoCast: true,
      comoAsignacion: true,
      comoArgumento: true,
      comoReceptor: true,
    });
  });

  it('aparece en al menos 60 programas de la muestra, y el printf como sentencia sigue existiendo (no todos son valores)', () => {
    expect(new Set(conPrintfComoValor().map(renderizarExpr)).size).toBeGreaterThanOrEqual(30);
    const comoSentencia = muestra.some((p) => p.sentencias.some((s) => s.k === 'expresion' && s.expr.partes[0]!.startsWith('System.out.printf(') && !esPrintf(s.expr)));
    expect(comoSentencia).toBe(true);
  });
});


// ---- Tarea 1.33: el vocabulario de nombres del generador es el que el oráculo leyó de javac ----

describe('cobertura — 1.33: las palabras reservadas y los identificadores contextuales del generador son los de javac', () => {
  it('PALABRAS_RESERVADAS del vocabulario es exactamente la lista del oráculo (`Tokens.TokenKind` de javac 17, corpus/datos/lexico/palabras-reservadas.json)', () => {
    const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
    const delOraculo = (JSON.parse(readFileSync(resolve(raiz, 'corpus', 'datos', 'lexico', 'palabras-reservadas.json'), 'utf-8')) as { reservadas: string[] }).reservadas;
    expect([...PALABRAS_RESERVADAS].sort()).toEqual([...delOraculo].sort());
    expect(PALABRAS_RESERVADAS).toHaveLength(54);
  });

  it('los nombres contextuales del vocabulario están en la tabla de javac y ninguno es una palabra reservada', () => {
    expect(NOMBRES_CONTEXTUALES.filter((nombre) => !IDENTIFICADORES_CONTEXTUALES.includes(nombre))).toEqual([]);
    expect(NOMBRES_CONTEXTUALES.filter((nombre) => PALABRAS_RESERVADAS.includes(nombre))).toEqual([]);
  });

  it('al pedir un nombre reservado, el generador puede sortear CADA una de las 54 palabras (en particular las 15 que el motor aceptaba como nombre antes de la 1.33)', () => {
    // Una muestra de 4 000 programas no alcanza para ver las 54 (solo ~1 de cada 100 nombres es reservado); por eso se sortea el nombre directamente.
    const entorno = crearEntorno(crearAzar(SEMILLA), cargarCatalogoApi());
    const sorteadas = new Set<string>();
    for (let i = 0; i < 4000; i += 1) {
      const elegido = elegirNombreNuevo(entorno, 'reservada');
      if (elegido.etiquetas.includes('palabra-reservada-como-nombre')) sorteadas.add(elegido.nombre);
    }
    expect(PALABRAS_RESERVADAS.filter((palabra) => !sorteadas.has(palabra))).toEqual([]);
  });

  it('y la muestra de 4 000 programas ya usa varias de ellas como nombre de una declaración marcada como error de sintaxis', () => {
    const usadas = new Set(todasLasDeclaraciones().filter((d) => d.sintaxisInvalida === true && PALABRAS_RESERVADAS.includes(d.nombre)).map((d) => d.nombre));
    expect(usadas.size).toBeGreaterThanOrEqual(10);
  });
});


// ---- Tarea 1.34: las cuatro familias de falsos aceptos que la re-verificación del lote 1 halló FUERA de la gramática del generador ----
//
// La re-verificación independiente (≈ 105 800 programas escritos aparte) encontró cuatro familias que las campañas del generador (218 000
// programas con código 0) no veían, porque la gramática no podía producirlas: A una sentencia dentro del `switch` antes del primer `case`,
// B `args` y `System.in`/`System.out`/`System.err` usados como VALOR, C la clase del alumno con el nombre de una clase del JDK y D una
// expresión entre paréntesis como sentencia. Un generador que no las sortea las verá por casualidad o nunca: de ahí estas pruebas, que
// miden que cada una SALGA, en cada posición, con una semilla fija (un fallo de cobertura es reproducible: se sube el peso, no se «reintenta»).
const NOMBRES_DE_CLASE_DEL_JDK = ['System', 'Math', 'String', 'Integer', 'Scanner', 'Random', 'Object', 'Double', 'Character', 'Long', 'Boolean'] as const;

describe('cobertura — 1.34 A: una sentencia dentro del switch antes del primer case', () => {
  const switchesConAntes = () =>
    muestra.flatMap((p) => [...sentenciasDe(p.sentencias)].flatMap((s) => (s.k === 'seleccion' && (s.antes ?? []).length > 0 ? [s] : [])));

  it('hay al menos 40 `switch` con sentencias antes del primer case, con y sin flecha', () => {
    const encontrados = switchesConAntes();
    expect(encontrados.length).toBeGreaterThanOrEqual(40);
    expect(encontrados.some((s) => s.flecha)).toBe(true);
    expect(encontrados.some((s) => !s.flecha)).toBe(true);
  });

  it('las sentencias de antes son de las formas que halló el verificador: break, println, declaración, final, `;`, bloque, ++, return, if, for', () => {
    const formas = new Set<string>();
    for (const s of switchesConAntes()) {
      for (const sentencia of s.antes ?? []) {
        const texto = renderizarPrograma({ imports: [], sentencias: [sentencia] }).split('\n').slice(2, -3).map((l) => l.trim()).join(' ');
        if (texto === 'break;') formas.add('break');
        else if (texto.startsWith('System.out.print')) formas.add('println');
        else if (texto.startsWith('final ')) formas.add('final');
        else if (sentencia.k === 'declaracion') formas.add('declaracion');
        else if (texto === ';') formas.add('vacia');
        else if (sentencia.k === 'bloque') formas.add('bloque');
        else if (texto.startsWith('return')) formas.add('return');
        else if (/^(\+\+|--)?\w+(\+\+|--)?;$/.test(texto)) formas.add('incremento');
        else if (sentencia.k === 'si') formas.add('if');
        else if (sentencia.k === 'para') formas.add('for');
      }
    }
    expect([...formas].sort()).toEqual(['bloque', 'break', 'declaracion', 'final', 'for', 'if', 'incremento', 'println', 'return', 'vacia']);
  });

  it('es un switch por lo demás normal: lleva casos (el error es SOLO la sentencia de antes) y el programa pretende un error de sintaxis', () => {
    const programas = muestra.filter((p) => [...sentenciasDe(p.sentencias)].some((s) => s.k === 'seleccion' && (s.antes ?? []).length > 0));
    expect(programas.length).toBeGreaterThanOrEqual(40);
    expect(programas.every((p) => pretendeErrorDeSintaxis(p))).toBe(true);
    expect(switchesConAntes().every((s) => s.casos.length > 0)).toBe(true);
    expect(programas.every((p) => etiquetasDe(p).includes('sentencia-antes-del-primer-case'))).toBe(true);
  });

  it('y el switch SIN sentencias antes del primer case sigue siendo la gran mayoría (no todo switch es de esta familia)', () => {
    const todos = muestra.flatMap((p) => [...sentenciasDe(p.sentencias)].filter((s) => s.k === 'seleccion'));
    expect(switchesConAntes().length / todos.length).toBeLessThan(0.3);
  });
});

describe('cobertura — 1.34 B: args y System.in/out/err usados como VALOR (un tipo que el subconjunto no modela)', () => {
  const esValor = (e: Expr): boolean => e.etiquetas?.includes('valor-de-tipo-no-modelado') === true;
  const valores = () => conEtiqueta('valor-de-tipo-no-modelado');

  it.each([
    'args',
    'args.length',
    'args.length()',
    'args[0]',
    'System.in',
    'System.out',
    'System.err',
    'System.in.read()',
    'System.in.nextInt()',
    'System.toString',
    'System.constructor',
  ])('usa «%s» como valor (marcado con el rasgo valor-de-tipo-no-modelado)', (texto) => {
    expect(valores().some((e) => renderizarExpr(e) === texto), texto).toBe(true);
  });

  it('lo pone en cada posición de valor: inicializador, condición, operando, cast, asignación, argumento de println, argumento de biblioteca, receptor y selector', () => {
    const comoInicializador = todasLasDeclaraciones().some((d) => d.inicial !== null && esValor(d.inicial));
    const comoCondicion = muestra.some((p) => [...sentenciasDe(p.sentencias)].some((s) => (s.k === 'si' || s.k === 'mientras') && esValor(s.condicion)));
    const comoOperando = todasLasExpresiones().some((e) => e.etiquetas?.includes('operador') === true && e.hijos.some(esValor));
    const comoCast = todasLasExpresiones().some((e) => e.etiquetas?.includes('cast') === true && e.hijos.some(esValor));
    const comoAsignacion = todasLasExpresiones().some((e) => e.etiquetas?.includes('asignacion') === true && e.hijos.some(esValor));
    const comoArgumentoDePrintln = todasLasExpresiones().some((e) => e.partes[0] === 'System.out.println(' && e.hijos.some(esValor));
    const comoArgumentoDeBiblioteca = todasLasExpresiones().some((e) => e.etiquetas?.includes('llamada-de-biblioteca') === true && /^[A-Z]\w*\.\w+\($/.test(e.partes[0]!) && e.hijos.some(esValor));
    const comoReceptor = todasLasExpresiones().some((e) => e.partes[0] === '' && (e.partes[1] ?? '').startsWith('.') && e.hijos[0] !== undefined && esValor(e.hijos[0]));
    const comoSelector = muestra.some((p) => [...sentenciasDe(p.sentencias)].some((s) => s.k === 'seleccion' && esValor(s.selector)));
    expect({ comoInicializador, comoCondicion, comoOperando, comoCast, comoAsignacion, comoArgumentoDePrintln, comoArgumentoDeBiblioteca, comoReceptor, comoSelector }).toEqual({
      comoInicializador: true,
      comoCondicion: true,
      comoOperando: true,
      comoCast: true,
      comoAsignacion: true,
      comoArgumentoDePrintln: true,
      comoArgumentoDeBiblioteca: true,
      comoReceptor: true,
      comoSelector: true,
    });
  });

  it('aparece en al menos 100 programas distintos, y también en las formas válidas (Object o = System.in; new Scanner(System.in) no es un error)', () => {
    expect(new Set(valores().map(renderizarExpr)).size).toBeGreaterThanOrEqual(11);
    const programasConValor = muestra.filter((p) => etiquetasDe(p).includes('valor-de-tipo-no-modelado'));
    expect(programasConValor.length).toBeGreaterThanOrEqual(100);
    expect(todasLasDeclaraciones().some((d) => d.tipo === 'Object' && d.inicial !== null && esValor(d.inicial))).toBe(true);
  });
});

describe('cobertura — 1.34 C: la clase del programa se llama como una clase del JDK', () => {
  const deClase = (clase: string) => muestra.filter((p) => p.clase === clase);

  it('uno de cada veinte programas, ESTRATIFICADO (así cada nombre sale cada 220 programas con cualquier semilla), no por azar', () => {
    const conNombre = muestra.filter((p) => p.clase !== undefined && p.clase !== 'P');
    expect(conNombre.length).toBe(CANTIDAD_DE_LA_MUESTRA / 20);
    expect(muestra.every((p, i) => (i % 20 === 7) === (p.clase !== undefined && p.clase !== 'P'))).toBe(true);
  });

  it.each(NOMBRES_DE_CLASE_DEL_JDK)('hay programas cuya clase se llama %s (al menos 15)', (clase) => {
    expect(deClase(clase).length).toBeGreaterThanOrEqual(15);
  });

  it('el programa de clase con nombre del JDK lleva el rasgo clase-con-nombre-del-jdk; uno de clase P, no', () => {
    expect(muestra.filter((p) => p.clase === undefined || p.clase === 'P').every((p) => !etiquetasDe(p).includes('clase-con-nombre-del-jdk'))).toBe(true);
    expect(deClase('System').every((p) => etiquetasDe(p).includes('clase-con-nombre-del-jdk'))).toBe(true);
  });

  it('el cuerpo USA el nombre de la clase (como receptor, como tipo, como campo): no solo la declara', () => {
    for (const clase of NOMBRES_DE_CLASE_DEL_JDK) {
      const programas = deClase(clase);
      const usan = programas.filter((p) => new RegExp(`\\b${clase}\\b`).test(renderizarCuerpo(p).join('\n')));
      expect(usan.length / programas.length, clase).toBeGreaterThan(0.8);
    }
  });

  it('Scanner y Random: a veces con su import exacto (el error «ya está definida») y a veces sin él (la clase propia sin constructor de ese tipo)', () => {
    for (const clase of ['Scanner', 'Random']) {
      const programas = deClase(clase);
      const conImport = programas.filter((p) => p.imports.includes(`import java.util.${clase};`));
      expect(conImport.length, `${clase} con import`).toBeGreaterThan(0);
      expect(conImport.length, `${clase} sin import`).toBeLessThan(programas.length);
    }
  });

  it('y la clase de un programa no cambia cuántos programas se piden (determinista por semilla e índice)', () => {
    expect(generarPrograma(SEMILLA, 7).clase).toBe(generarPrograma(SEMILLA, 7).clase);
    expect(generarProgramas(SEMILLA, 30).map((p) => p.clase)).toEqual(generarProgramas(SEMILLA, 60).slice(0, 30).map((p) => p.clase));
  });
});

describe('cobertura — 1.34 D: una expresión entre paréntesis como sentencia', () => {
  const sentenciasEntreParentesis = () =>
    muestra.flatMap((p) =>
      [...sentenciasDe(p.sentencias)].flatMap((s) => (s.k === 'expresion' && s.expr.etiquetas?.includes('sentencia-entre-parentesis') === true ? [s.expr] : [])),
    );
  const textos = () => sentenciasEntreParentesis().map(renderizarExpr);

  it.each([
    [/^\(\w+ = \S+\)$/, 'una asignación: (x = 2);'],
    [/^\(\w+\+\+\)$|^\(\+\+\w+\)$|^\(\w+--\)$/, 'un incremento: (x++);'],
    [/^\(System\.out\.println\(.*\)\)$/, 'una impresión: (System.out.println(1));'],
    [/^\(\(\w+ = \S+\)\)$/, 'una asignación entre dos pares de paréntesis'],
    [/^\(new Scanner\(System\.in\)\)$/, 'una creación: (new Scanner(System.in));'],
  ])('sortea %s (%s) como sentencia, marcada como error de sintaxis a propósito', (patron) => {
    const encontradas = sentenciasEntreParentesis().filter((e) => patron.test(renderizarExpr(e)));
    expect(encontradas.length, String(patron)).toBeGreaterThan(0);
    expect(encontradas.every((e) => e.sintaxisInvalida === true), String(patron)).toBe(true);
  });

  it('también las formas VÁLIDAS que javac compila: la variable entre paréntesis como destino ((x) = 2; (x)++; (x) += 1;) y como receptor ((s).length(), (System.out).println(1)), sin marcar', () => {
    const validas = todasLasExpresiones().filter((e) => e.etiquetas?.includes('sentencia-entre-parentesis') === true && e.sintaxisInvalida !== true).map(renderizarExpr);
    expect(validas.some((t) => /^\(\w+\) = /.test(t)), '(x) = …').toBe(true);
    expect(validas.some((t) => /^\(\w+\)\+\+$/.test(t)), '(x)++').toBe(true);
    expect(validas.some((t) => /^\(\w+\) [-+*/%]= /.test(t)), '(x) += …').toBe(true);
    expect(validas.some((t) => /^\(\w+\)\.\w+\(\)$/.test(t)), '(s).length()').toBe(true);
    expect(validas.some((t) => t.startsWith('(System.out).println(')), '(System.out).println(…)').toBe(true);
  });

  it('un nombre de clase entre paréntesis como receptor ((Math).abs(1), (System).out.println(1)) también sale: javac dice «illegal parenthesized expression»', () => {
    const conClase = todasLasExpresiones().map(renderizarExpr).filter((t) => /^\((Math|System|String|Integer|Character|Double)\)\./.test(t));
    expect(conClase.length).toBeGreaterThan(0);
  });

  it('en la cabecera de un for: la parte inicial y el paso entre paréntesis', () => {
    const fors = muestra.flatMap((p) => [...sentenciasDe(p.sentencias)].flatMap((s) => (s.k === 'para' ? [s] : [])));
    const conInicial = fors.filter((s) => s.inicial?.k === 'expresion' && s.inicial.expr.etiquetas?.includes('sentencia-entre-parentesis') === true);
    const conPaso = fors.filter((s) => s.paso?.etiquetas?.includes('sentencia-entre-parentesis') === true);
    expect(conInicial.length).toBeGreaterThan(0);
    expect(conPaso.length).toBeGreaterThan(0);
  });

  it('aparece en al menos 80 programas de la muestra y NO es la mayoría de las sentencias', () => {
    expect(muestra.filter((p) => etiquetasDe(p).includes('sentencia-entre-parentesis')).length).toBeGreaterThanOrEqual(80);
    expect(textos().length).toBeLessThan(CANTIDAD_DE_LA_MUESTRA / 4);
  });
});

describe('cobertura — 1.34 E: nombres de propiedades de JavaScript como identificadores (válidos en Java)', () => {
  it.each(NOMBRES_DE_OBJECT_PROTOTYPE)('usa «%s» como nombre de variable (válido en Java), marcado con el rasgo nombre-de-javascript', (nombreDeLaVariable) => {
    const usos = todasLasDeclaraciones().filter((d) => d.nombre === nombreDeLaVariable);
    expect(usos.length, nombreDeLaVariable).toBeGreaterThan(0);
    expect(usos.every((d) => !d.sintaxisInvalida && d.etiquetas.includes('nombre-de-javascript')), nombreDeLaVariable).toBe(true);
  });

  it('un nombre de Object.prototype como MIEMBRO de un valor (System.toString, System.constructor, args.constructor, System.in.__proto__) también lleva el rasgo nombre-de-javascript', () => {
    const miembros = todasLasExpresiones().filter((e) => ['System.toString', 'System.constructor'].includes(renderizarExpr(e)) || /^[\w.]+\.(constructor|__proto__)$/.test(renderizarExpr(e)));
    expect(miembros.length).toBeGreaterThan(10);
    expect(miembros.filter((e) => e.etiquetas?.includes('nombre-de-javascript') !== true).map(renderizarExpr)).toEqual([]);
  });

  it('el programa que usa uno lleva el rasgo, para que una discrepancia (o un fallo interno) no salga «sin rasgos»', () => {
    const conNombre = muestra.filter((p) => declaraciones(p).some((d) => d.nombre === 'constructor'));
    expect(conNombre.length).toBeGreaterThan(0);
    expect(conNombre.every((p) => etiquetasDe(p).includes('nombre-de-javascript'))).toBe(true);
  });
});
