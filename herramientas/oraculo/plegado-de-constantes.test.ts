// Tarea 1.36 (S-9 de la verificación final del lote 1): la tabla del plegado de constantes (`pruebas/compilacion/tablas-de-plegado.ts`, una fila por operador y por tipo de JLS 15.29) son DATOS que salieron
// de javac 17.0.18. Esta prueba, con el JDK real (proyecto `oraculo`), arma con las MISMAS filas un programa de Java, lo compila y lo corre, y compara lo que imprime con la columna `resultado`: javac pliega
// cada expresión al compilar y el programa imprime el valor plegado (los `double` como los 64 bits de `Double.doubleToLongBits`, así que ni `-0.0` ni el último dígito se pierden). La prueba del motor contra la
// misma tabla SIN JDK (`pruebas/compilacion/plegado-de-constantes.test.ts`, `npm test`) descansa en que estos resultados sigan siendo ciertos: si otro JDK cambiara alguno, falla aquí antes de que el motor se
// calibre contra un dato viejo.
//
// Para REGENERAR un resultado (por ejemplo al agregar una fila): se deja su `resultado` vacío (`''`), se corre esta prueba, que falla imprimiendo lo que Java dio, y se pega en el archivo de datos.
import { describe, expect, it } from 'vitest';
import { FILAS_DE_PLEGADO, programaDeJavaDelPlegado } from '../../pruebas/compilacion/tablas-de-plegado.ts';
import { ejecutarPrograma } from './ejecutar.ts';
import { localizarJdk, verificarVersionJdk } from './jdk.ts';
import { LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS } from './limites-de-pruebas.ts';

describe('javac 17 real — el plegado de expresiones constantes', () => {
  it(
    `imprime, para cada una de las ${FILAS_DE_PLEGADO.length} filas de la tabla, el resultado que la tabla guarda`,
    async () => {
      const jdk = localizarJdk();
      verificarVersionJdk(jdk);
      const resultado = await ejecutarPrograma(jdk, { fuente: programaDeJavaDelPlegado(FILAS_DE_PLEGADO) });
      expect(resultado.compilo, resultado.erroresCompilacion.toString('utf-8').slice(0, 2000)).toBe(true);
      expect(resultado.codigoSalida).toBe(0);

      const impreso = new Map<string, string>();
      for (const linea of resultado.stdout.toString('utf-8').split('\n')) {
        if (linea === '') continue;
        const separador = linea.indexOf(' ');
        impreso.set(linea.slice(0, separador), linea.slice(separador + 1));
      }
      expect(impreso.size).toBe(FILAS_DE_PLEGADO.length);

      const desacuerdos = FILAS_DE_PLEGADO.filter((fila) => impreso.get(fila.id) !== fila.resultado).map(
        (fila) => `${fila.id}: ${fila.expresion} → Java imprimió ${JSON.stringify(impreso.get(fila.id))}, la tabla dice ${JSON.stringify(fila.resultado)}`,
      );
      expect(desacuerdos).toEqual([]);
    },
    LIMITE_DE_LAS_PRUEBAS_CON_JDK_MS,
  );
});
