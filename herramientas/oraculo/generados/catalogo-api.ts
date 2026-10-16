// Catálogo de biblioteca del generador diferencial (tarea 1.31). Lee las firmas REALES del JDK que ya
// generó el oráculo (`corpus/datos/api/firmas.jsonl`, ADR 010) y se queda con las que el generador
// sabe armar con los tipos del subconjunto. A propósito NO usa el catálogo que el motor reconoce como
// «soportado» (`MIEMBROS_SOPORTADOS`): si el generador dependiera de él, sus puntos ciegos serían los
// mismos del compilador que se quiere vigilar.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ_PROYECTO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RUTA_FIRMAS = resolve(RAIZ_PROYECTO, 'corpus', 'datos', 'api', 'firmas.jsonl');

// Las clases con que un alumno de U3–U7 llama métodos y lee constantes, más `Long` (solo sus
// constantes están en el subconjunto) y `System`.
const CLASES_DEL_CATALOGO: readonly string[] = ['String', 'Scanner', 'Math', 'Integer', 'Double', 'Character', 'Random', 'Long', 'System'];

export interface MetodoApi {
  readonly clase: string;
  readonly nombre: string;
  readonly esEstatico: boolean;
  readonly parametros: readonly string[];
  readonly retorno: string;
}

export interface CampoApi {
  readonly clase: string;
  readonly nombre: string;
  readonly esEstatico: boolean;
  readonly tipo: string;
}

export interface CatalogoApi {
  readonly clases: readonly string[];
  metodos(clase: string): readonly MetodoApi[];
  metodosPorRetorno(tipo: string): readonly MetodoApi[];
  metodosVoid(): readonly MetodoApi[];
  campos(clase: string): readonly CampoApi[];
}

const TIPOS_DE_API: Readonly<Record<string, string>> = {
  int: 'int',
  long: 'long',
  double: 'double',
  boolean: 'boolean',
  char: 'char',
  void: 'void',
  'java.lang.String': 'String',
  'java.util.Scanner': 'Scanner',
  'java.util.Random': 'Random',
  // Tipos que solo aparecen como PARÁMETRO: se llenan con cualquier valor (`Object`) o con un `String`.
  'java.lang.Object': 'Object',
  'java.lang.CharSequence': 'CharSequence',
};

/** Pura: el nombre reflejado del JDK como tipo del generador, o `null` si no sabe armarlo. */
export function tipoDeApi(nombreReflejado: string): string | null {
  return Object.hasOwn(TIPOS_DE_API, nombreReflejado) ? TIPOS_DE_API[nombreReflejado]! : null;
}

interface FirmaCruda {
  readonly clase: string;
  readonly genero: 'constructor' | 'metodo' | 'campo';
  readonly nombre: string;
  readonly esEstatico: boolean;
  readonly parametros: readonly string[];
  readonly retorno: string;
  readonly esVarargs: boolean;
}

// Los métodos de hilos que toda clase hereda de `Object`: fuera del currículo y siempre un error por la
// excepción comprobada (`InterruptedException`), que taparía la regla que la llamada quiere ejercer.
const METODOS_EXCLUIDOS = new Set(['wait', 'notify', 'notifyAll']);

const TIPOS_QUE_NO_SON_PARAMETRO = new Set(['void']);
const TIPOS_QUE_SOLO_SON_PARAMETRO = new Set(['Object', 'CharSequence']);

function metodoDeFirma(firma: FirmaCruda): MetodoApi | null {
  if (firma.genero !== 'metodo' || firma.esVarargs || METODOS_EXCLUIDOS.has(firma.nombre)) return null;
  const retorno = tipoDeApi(firma.retorno);
  if (retorno === null || TIPOS_QUE_SOLO_SON_PARAMETRO.has(retorno)) return null;
  const parametros = firma.parametros.map(tipoDeApi);
  if (parametros.some((p) => p === null || TIPOS_QUE_NO_SON_PARAMETRO.has(p))) return null;
  return { clase: firma.clase, nombre: firma.nombre, esEstatico: firma.esEstatico, parametros: parametros as string[], retorno };
}

function campoDeFirma(firma: FirmaCruda): CampoApi | null {
  if (firma.genero !== 'campo') return null;
  const tipo = tipoDeApi(firma.retorno);
  if (tipo === null || TIPOS_QUE_SOLO_SON_PARAMETRO.has(tipo)) return null;
  return { clase: firma.clase, nombre: firma.nombre, esEstatico: firma.esEstatico, tipo };
}

export function cargarCatalogoApi(rutaFirmas: string = RUTA_FIRMAS): CatalogoApi {
  const firmas = readFileSync(rutaFirmas, 'utf-8')
    .split('\n')
    .filter((linea) => linea.trim() !== '')
    .map((linea) => JSON.parse(linea) as FirmaCruda)
    .filter((firma) => CLASES_DEL_CATALOGO.includes(firma.clase));

  const metodos = firmas.flatMap((firma) => metodoDeFirma(firma) ?? []);
  const campos = firmas.flatMap((firma) => campoDeFirma(firma) ?? []);

  return {
    clases: CLASES_DEL_CATALOGO.filter((clase) => metodos.some((m) => m.clase === clase) || campos.some((c) => c.clase === clase)),
    metodos: (clase) => metodos.filter((m) => m.clase === clase),
    metodosPorRetorno: (tipo) => metodos.filter((m) => m.retorno === tipo),
    metodosVoid: () => metodos.filter((m) => m.retorno === 'void'),
    campos: (clase) => campos.filter((c) => c.clase === clase),
  };
}
