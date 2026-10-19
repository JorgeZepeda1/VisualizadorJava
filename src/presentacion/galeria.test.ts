// RED de la tarea R0.11 (REQ-AULA-001, ADR 017): la galería «Ejemplos», armada desde el TEXTO CRUDO de los programas (la presentación no toca Vite ni el disco: el `import.meta.glob` vive en
// `interfaz/datos/`). Secciones por unidad (U3 a U7) y «Ejercicio de la clase» (el ejercicio del PO), cada programa con su código y su entrada preparada tal como la usó el oráculo —cada renglón con su salto de
// línea—, y la máquina de snacks como UNA entrada con cinco datos de ejemplo. Puro, sin DOM.
import { describe, expect, it } from 'vitest';
import { armarGaleria, datosDeLaEntrada, etiquetaDeLaEntrada } from './galeria.ts';

const CODIGO = (nombre: string) => `// código de ${nombre}`;

const ARCHIVOS: Readonly<Record<string, string>> = {
  'u3-hola-mundo.java': CODIGO('hola'),
  'u3-saludo-con-scanner.java': CODIGO('saludo'),
  'u3-saludo-con-scanner.entrada.txt': 'Carlos\n',
  'u4-verificar-acceso.java': CODIGO('acceso'),
  'u4-verificar-acceso.entrada.txt': '110\ntrue\n',
  'u6-error-por-uno.java': CODIGO('error por uno'),
  'maquina-snacks-a1-2-50.java': CODIGO('snacks'),
  'maquina-snacks-a1-2-50.entrada.txt': 'a1\n2\n50\n',
  'maquina-snacks-b2-3-40.java': CODIGO('snacks'),
  'maquina-snacks-b2-3-40.entrada.txt': 'b2\n3\n40\n',
  'maquina-snacks-b3.java': CODIGO('snacks'),
  'maquina-snacks-b3.entrada.txt': 'b3\n',
  'maquina-snacks-z9.java': CODIGO('snacks'),
  'maquina-snacks-z9.entrada.txt': 'z9\n',
  'maquina-snacks-a2-5.java': CODIGO('snacks'),
  'maquina-snacks-a2-5.entrada.txt': 'a2\n5\n',
};

function seccionDe(unidad: number | null) {
  const seccion = armarGaleria(ARCHIVOS).secciones.find((candidata) => candidata.unidad === unidad);
  if (seccion === undefined) throw new Error(`no hay sección ${String(unidad)}`);
  return seccion;
}

describe('armarGaleria: secciones', () => {
  it('«Ejercicio de la clase» va primero y luego las unidades que tienen programas, en orden', () => {
    expect(armarGaleria(ARCHIVOS).secciones.map((seccion) => seccion.unidad)).toEqual([null, 3, 4, 6]);
  });

  it('una unidad sin ningún programa disponible no aparece (nunca una sección vacía)', () => {
    expect(armarGaleria({ 'u3-hola-mundo.java': CODIGO('hola') }).secciones.map((seccion) => seccion.unidad)).toEqual([3]);
    expect(armarGaleria({}).secciones).toEqual([]);
  });

  it('cada sección lleva su título del catálogo', () => {
    expect(seccionDe(null).titulo).toBe('Ejercicio de la clase');
    expect(seccionDe(3).titulo.startsWith('Unidad 3')).toBe(true);
    expect(seccionDe(6).titulo.startsWith('Unidad 6')).toBe(true);
  });
});

describe('armarGaleria: un programa del curso', () => {
  it('lleva su id, su título y «Qué observar» del catálogo, su origen y su código tal cual', () => {
    const programa = seccionDe(3).programas.find((candidato) => candidato.id === 'u3-hola-mundo');
    expect(programa).toMatchObject({ id: 'u3-hola-mundo', titulo: '«Hola, mundo»', origen: 'curricular', codigo: CODIGO('hola'), demostracion: false, unidad: 3 });
    expect(programa?.queObservar.length).toBeGreaterThan(30);
  });

  it('sin `.entrada.txt` no hay entrada preparada: el alumno no escribe datos', () => {
    const programa = seccionDe(3).programas.find((candidato) => candidato.id === 'u3-hola-mundo');
    expect(programa?.entradaPreparada).toBe('');
    expect(programa?.muestras).toEqual([]);
  });

  it('con `.entrada.txt` la entrada preparada es idéntica, byte a byte, a la que usó el oráculo (cada renglón con su salto de línea)', () => {
    const saludo = seccionDe(3).programas.find((candidato) => candidato.id === 'u3-saludo-con-scanner');
    expect(saludo?.entradaPreparada).toBe('Carlos\n');
    const acceso = seccionDe(4).programas.find((candidato) => candidato.id === 'u4-verificar-acceso');
    expect(acceso?.entradaPreparada).toBe('110\ntrue\n');
  });

  it('los programas se ordenan como el catálogo, no como llegan los archivos', () => {
    const al_reves = Object.fromEntries(Object.entries(ARCHIVOS).reverse());
    expect(armarGaleria(al_reves).secciones.map((seccion) => seccion.programas.map((programa) => programa.id))).toEqual(
      armarGaleria(ARCHIVOS).secciones.map((seccion) => seccion.programas.map((programa) => programa.id)),
    );
  });

  it('un programa de demostración queda marcado (abre con el aviso del revisor en «después»)', () => {
    const demostracion = seccionDe(6).programas.find((candidato) => candidato.id === 'u6-error-por-uno');
    expect(demostracion?.demostracion).toBe(true);
    expect(seccionDe(3).programas.every((programa) => !programa.demostracion)).toBe(true);
  });

  it('un archivo de la carpeta que el catálogo no conoce no se cuela en la galería (el catálogo manda)', () => {
    const conDeMas = { ...ARCHIVOS, 'u9-algo-nuevo.java': CODIGO('nuevo') };
    expect(JSON.stringify(armarGaleria(conDeMas))).not.toContain('u9-algo-nuevo');
  });
});

describe('armarGaleria: la máquina de snacks del PO, con sus cinco datos de ejemplo', () => {
  const snacks = () => {
    const programa = seccionDe(null).programas[0];
    if (programa === undefined) throw new Error('no hay máquina de snacks');
    return programa;
  };

  it('es UNA entrada, marcada como ejercicio del PO, con el código de los cinco archivos (que es el mismo)', () => {
    expect(seccionDe(null).programas).toHaveLength(1);
    expect(snacks()).toMatchObject({ id: 'maquina-snacks', origen: 'del-po', unidad: null, codigo: CODIGO('snacks') });
  });

  it('ofrece cinco datos de ejemplo, el primero es a1 2 50, y cada uno trae su entrada idéntica al `.entrada.txt`', () => {
    expect(snacks().muestras.map((muestra) => muestra.etiqueta)).toEqual(['a1 · 2 · 50', 'b2 · 3 · 40', 'b3', 'z9', 'a2 · 5']);
    expect(snacks().muestras.map((muestra) => muestra.entradaPreparada)).toEqual(['a1\n2\n50\n', 'b2\n3\n40\n', 'b3\n', 'z9\n', 'a2\n5\n']);
    expect(snacks().entradaPreparada).toBe('a1\n2\n50\n');
  });

  it('cada dato de ejemplo dice qué pasa con él, con las palabras del catálogo', () => {
    expect(snacks().muestras.map((muestra) => muestra.descripcion)).toEqual([
      'Código a1, 2 piezas, paga con $50',
      'Código b2, 3 piezas, paga con $40',
      'Código b3',
      'Código z9',
      'Código a2 y 5 piezas',
    ]);
  });

  it('si falta uno de los archivos de datos, ese dato no se ofrece (nunca un dato inventado)', () => {
    const sinB3 = Object.fromEntries(Object.entries(ARCHIVOS).filter(([nombre]) => !nombre.startsWith('maquina-snacks-b3')));
    const programa = armarGaleria(sinB3).secciones[0]?.programas[0];
    expect(programa?.muestras.map((muestra) => muestra.etiqueta)).toEqual(['a1 · 2 · 50', 'b2 · 3 · 40', 'z9', 'a2 · 5']);
  });
});

// V7 del maestro (panel R0): el robot del paso 0 nombra los datos que el programa va a leer; salen de la entrada preparada, un dato por renglón, sin el salto final.
describe('datosDeLaEntrada', () => {
  it('un dato por renglón, sin el renglón vacío que deja el salto de línea final', () => {
    expect(datosDeLaEntrada('-3\n0\n7\n')).toEqual(['-3', '0', '7']);
    expect(datosDeLaEntrada('Carlos\n')).toEqual(['Carlos']);
    expect(datosDeLaEntrada('a1\n2\n50')).toEqual(['a1', '2', '50']);
  });

  it('una entrada vacía no tiene datos (el alumno escribe los suyos)', () => {
    expect(datosDeLaEntrada('')).toEqual([]);
  });

  it('los renglones en blanco no se nombran como datos (una lista «Ana, , 7» no se entendería): igual que en la etiqueta de la galería', () => {
    expect(datosDeLaEntrada('Ana\n\n7\n')).toEqual(['Ana', '7']);
  });

  it('la etiqueta de la galería une los mismos datos con « · »', () => {
    expect(etiquetaDeLaEntrada('a1\n2\n50\n')).toBe('a1 · 2 · 50');
  });
});
