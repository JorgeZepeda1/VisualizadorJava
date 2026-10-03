// Tarea 1.35 (SUGGESTION-3 de la re-verificación del lote 1 y un falso acepto): `import nombre.*;` (JLS 7.5.2) solo vale si `nombre` es un paquete con tipos visibles o un tipo. El motor decide
// con `existePaqueteOTipoDelJdk` (la lista de clases que generó el oráculo); esta prueba, con el JDK real (proyecto `oraculo`), le pregunta a javac por CADA paquete de CADA módulo del sistema
// (exportado o no: internos, incubadoras…), más nombres de arriba (`java`), con errores de escritura, de bibliotecas ajenas y tipos (`java.util.Map`), y exige que el motor acepte
// exactamente lo que javac acepta. Si otro JDK cambiara qué paquetes se ven, falla aquí antes de que `compilar()` rechace un import válido o acepte uno inventado.
import { beforeAll, describe, expect, it } from 'vitest';
import { existePaqueteOTipoDelJdk } from '../../src/motor/semantica/catalogo-clases.ts';
import { compilarEnLote, type RespuestaJava } from './compilar-en-lote.ts';
import { ejecutarPrograma } from './ejecutar.ts';
import { localizarJdk, verificarVersionJdk } from './jdk.ts';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS } from './limites-de-pruebas.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));

// Nombres que no son paquetes del sistema y que un alumno (o un mutante) puede escribir: de arriba, con un typo, ajenos al JDK, tipos de los que se importan los miembros.
const NOMBRES_ADICIONALES = [
  'java', 'javax', 'jdk', 'sun', 'com', 'org', 'foo', 'java.sqrt', 'java.Util', 'java.util2', 'java.lang.Matth', 'org.junit', 'com.google.gson',
  'java.util.Map', 'java.util.Map.Entry', 'java.lang.Math', 'java.lang.String', 'java.util.Scanner',
];

let respuestas: Map<string, RespuestaJava>;
let candidatos: string[];

beforeAll(async () => {
  const jdk = localizarJdk();
  verificarVersionJdk(jdk);
  const sonda = await ejecutarPrograma(jdk, { fuente: readFileSync(resolve(AQUI, 'java', 'ListarPaquetes.java'), 'utf-8'), limiteMs: 60_000 });
  expect(sonda.compilo, sonda.erroresCompilacion.toString('utf-8')).toBe(true);
  const delSistema = sonda.stdout.toString('utf-8').split('\n').map((linea) => linea.trim()).filter((linea) => linea.length > 0);
  candidatos = [...new Set([...delSistema, ...NOMBRES_ADICIONALES])];
  respuestas = await compilarEnLote(jdk, candidatos.map((nombre) => ({ id: nombre, fuente: `import ${nombre}.*;\npublic class P { }\n` })));
}, LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS);

describe('javac 17 real — `import nombre.*;` frente a `existePaqueteOTipoDelJdk`', () => {
  it('la sonda trae los paquetes de todos los módulos del sistema (más de 800) y javac contestó por todos los candidatos', () => {
    expect(candidatos.length).toBeGreaterThan(800);
    expect(respuestas.size).toBe(candidatos.length);
    expect(candidatos).toContain('java.util');
    expect(candidatos).toContain('jdk.internal.misc');
  });

  it('el motor acepta EXACTAMENTE los nombres que javac acepta, y rechaza los que javac rechaza', () => {
    const desacuerdos = candidatos
      .filter((nombre) => respuestas.get(nombre)?.compila !== existePaqueteOTipoDelJdk(nombre))
      .map((nombre) => `${nombre}: javac ${respuestas.get(nombre)?.compila === true ? 'compila' : 'rechaza'}, el motor ${existePaqueteOTipoDelJdk(nombre) ? 'acepta' : 'rechaza'}`);
    expect(desacuerdos).toEqual([]);
  });

  it('triangulación: javac acepta paquetes reales, un tipo y sus miembros, y rechaza los inventados, el de solo subpaquetes y los internos', () => {
    for (const aceptado of ['java.util', 'java.util.concurrent', 'javax.swing', 'java.util.Map', 'java.util.Map.Entry']) expect(respuestas.get(aceptado)?.compila, aceptado).toBe(true);
    for (const rechazado of ['java', 'javax', 'java.sqrt', 'java.Util', 'org.junit', 'jdk.internal.misc']) expect(respuestas.get(rechazado)?.compila, rechazado).toBe(false);
  });
});
