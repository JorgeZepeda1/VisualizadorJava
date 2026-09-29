// Compilación de MUCHAS fuentes en una sola JVM (`CompiladorEnLote.java`, `javax.tools`, tarea 1.16,
// design.md §7.4): arrancar un `javac` por línea de comandos por cada fuente costaría el arranque
// completo de la JVM por archivo. Extraído de `mutantes.ts` en la tarea 1.29 (sin cambios de
// comportamiento) para que lo reutilice también la verificación de la lista de clases del JDK
// (`generar-datos.test.ts`), que necesita el veredicto de miles de `import` por separado (dos
// imports con el mismo nombre simple, p. ej. `java.util.List` y `java.awt.List`, no caben en un
// mismo archivo: javac los rechaza entre sí).
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { InfoJdk } from './jdk.ts';

const AQUI = dirname(fileURLToPath(import.meta.url));

/** Una fuente por compilar: `id` no puede llevar tabuladores ni saltos de línea (protocolo de texto). */
export interface FuenteParaCompilar {
  readonly id: string;
  readonly fuente: string;
}

/** Veredicto de javac para una fuente (protocolo de la cabecera de `CompiladorEnLote.java`). */
export interface RespuestaJava {
  readonly compila: boolean;
  readonly linea: number;
  readonly codigoJavac: string;
  // Mensaje REAL de javac en inglés (Locale.ROOT, determinista -- ver CompiladorEnLote.java):
  // necesario para distinguir la familia "compiler.err.expected*" (¿faltó ";"? ¿")"? ¿otra cosa?),
  // que `codigoJavac` por sí solo no distingue (misma clave, distinto número de argumentos).
  readonly mensajeJavac: string;
}

/** Inverso de `CompiladorEnLote.java:escaparParaUnaLinea` -- ver su javadoc. */
function desescaparUnaLinea(texto: string): string {
  return texto.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r').replace(/\\\\/g, '\\');
}

/** Ejecuta `CompiladorEnLote.java` UNA sola vez (una JVM) contra TODAS las `fuentes`, vía el
 * protocolo de texto de la cabecera del archivo Java (stdin: "id\tbase64(fuente)" por línea;
 * stdout: "id\tcompila\tlinea\tcodigoJavac\tmensaje" por línea). */
export function compilarEnLote(jdk: InfoJdk, fuentes: readonly FuenteParaCompilar[]): Promise<Map<string, RespuestaJava>> {
  return new Promise((resolverPromesa, rechazarPromesa) => {
    const rutaJava = resolve(AQUI, 'java', 'CompiladorEnLote.java');
    const proceso = spawn(jdk.rutaJava, [rutaJava], { stdio: ['pipe', 'pipe', 'pipe'] });

    let salidaAcumulada = '';
    let errorAcumulado = '';
    // Generoso: miles de compilaciones reales en una sola JVM (ver el informe de la sesión para
    // el tiempo medido real) -- nunca el límite de 5s de `ejecutar.ts` (pensado para UN programa).
    const limiteMs = 10 * 60 * 1000;
    const temporizador = setTimeout(() => {
      proceso.kill('SIGKILL');
      rechazarPromesa(new Error(`CompiladorEnLote.java no terminó en ${limiteMs} ms (¿colgado?) -- salida parcial:\n${salidaAcumulada.slice(-2000)}`));
    }, limiteMs);

    proceso.stdout.on('data', (fragmento: Buffer) => {
      salidaAcumulada += fragmento.toString('utf-8');
    });
    proceso.stderr.on('data', (fragmento: Buffer) => {
      errorAcumulado += fragmento.toString('utf-8');
    });

    proceso.on('close', (codigo) => {
      clearTimeout(temporizador);
      if (codigo !== 0) {
        rechazarPromesa(new Error(`CompiladorEnLote.java terminó con código ${codigo}. stderr:\n${errorAcumulado}`));
        return;
      }
      const resultados = new Map<string, RespuestaJava>();
      for (const linea of salidaAcumulada.split('\n')) {
        if (linea.trim() === '') continue;
        const [id, compilaTexto, lineaTexto, codigoJavac, mensajeEscapado] = linea.split('\t');
        if (id === undefined || compilaTexto === undefined || lineaTexto === undefined) continue;
        resultados.set(id, {
          compila: compilaTexto === 'true',
          linea: Number(lineaTexto),
          codigoJavac: codigoJavac ?? '',
          mensajeJavac: mensajeEscapado !== undefined ? desescaparUnaLinea(mensajeEscapado) : '',
        });
      }
      resolverPromesa(resultados);
    });

    proceso.on('error', (error) => {
      clearTimeout(temporizador);
      rechazarPromesa(error);
    });

    // Manifiesto completo -- UNA escritura, cerramos stdin para que el bucle `readLine` del lado
    // Java termine en EOF real (mismo patrón que `ejecutar.ts`: nunca deja el hijo esperando).
    const manifiesto = fuentes.map((f) => `${f.id}\t${Buffer.from(f.fuente, 'utf-8').toString('base64')}`).join('\n');
    proceso.stdin.end(`${manifiesto}\n`, 'utf-8');
  });
}

/**
 * ¿javac real acepta `import <nombre>;` como única declaración de un programa vacío? Un veredicto
 * por nombre canónico (`java.util.Map.Entry`), cada uno en su propia compilación: así ningún choque
 * entre nombres simples repetidos (`java.util.List`/`java.awt.List`) falsea el resultado.
 */
export async function compilarImportaciones(jdk: InfoJdk, nombres: readonly string[]): Promise<Map<string, boolean>> {
  const fuentes = nombres.map((nombre) => ({
    id: nombre,
    fuente: `import ${nombre};\npublic class Sonda { public static void main(String[] args) { } }\n`,
  }));
  const respuestas = await compilarEnLote(jdk, fuentes);
  return new Map(nombres.map((nombre) => [nombre, respuestas.get(nombre)?.compila ?? false]));
}
