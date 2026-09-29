// Guarda PERMANENTE (hallazgo de sdd-verify, lote 1): cada muestra de `corpus/compilacion/avisos/`
// representa una construcción FUERA del subconjunto interpretado (D2, ADR 003) — por definición
// debe ser Java VÁLIDO para el JDK 17 real (REQ-SUB-006/REQ-SUB-007), nunca un programa que javac
// también rechazaría por su cuenta. Si una muestra no compila, no prueba "no soportado": prueba
// "corpus mal armado", y `pruebas/compilacion/catalogo.test.ts` pasaría por la razón equivocada.
//
// Reusa el mismo helper de compilación que el resto del oráculo (`ejecutarPrograma`, ADR 011): el
// mismo renombrado del archivo a su clase pública, en una carpeta temporal propia, que ya usa
// `generar-goldens.ts` — nunca una segunda implementación de "compilar contra el JDK real".
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { localizarJdk } from './jdk.ts';
import { ejecutarPrograma } from './ejecutar.ts';

const RUTA_AVISOS = resolve('corpus/compilacion/avisos');

function archivosJava(ruta: string): string[] {
  return readdirSync(ruta)
    .filter((nombre) => nombre.endsWith('.java'))
    .sort();
}

describe('corpus/compilacion/avisos — cada muestra de "no soportado" compila contra el JDK 17 real', () => {
  const jdk = localizarJdk();
  const archivos = archivosJava(RUTA_AVISOS);

  it('el corpus de avisos no está vacío (guarda contra un directorio mal armado)', () => {
    expect(archivos.length).toBeGreaterThanOrEqual(37);
  });

  it.each(archivos)('%s: compila limpio con javac 17 real (es Java válido fuera del subconjunto)', async (nombre) => {
    const fuente = readFileSync(resolve(RUTA_AVISOS, nombre), 'utf-8');
    const resultado = await ejecutarPrograma(jdk, { fuente });

    expect(resultado.compilo).toBe(true);
  });
});
