/**
 * Vuelca, contra el JDK 17 real, qué puntos de código puede llevar un identificador de Java (tarea
 * 1.29, ADR 010) — los rangos EXACTOS de {@code Character.isJavaIdentifierStart} (letras Unicode,
 * números-letra, símbolos de moneda, conectores: JLS 3.8) y de {@code Character.isJavaIdentifierPart}
 * (además dígitos, marcas combinantes y los caracteres «ignorables», que javac admite DENTRO de un
 * identificador). Nunca escritos a mano ni sacados de las propiedades Unicode de JavaScript: la versión
 * de Unicode del JDK 17 (13) no es la del motor de JavaScript del navegador o de Node (15-17), y con
 * las propiedades del motor el visualizador aceptaría ~14 000 letras que javac 17 rechaza
 * («illegal character»).
 *
 * Tarea 1.36 (W-1 de la verificación final del lote 1): una tercera tabla, los caracteres que javac SALTA dentro de un
 * nombre. `JavaTokenizer.scanIdent` no los suma al nombre (`int a<U+200B>b` es la variable `ab`): son los de
 * {@code Character.isIdentifierIgnorable(char)}, que mira UNA unidad UTF-16 — por eso solo el plano básico (los
 * caracteres suplementarios de la misma categoría, como U+E0001, javac los toma como parte del nombre).
 *
 * Salida (stdout): cuatro líneas —
 *   inicio|24,41-5a,5f,...     (rangos en hexadecimal: "41-5a" o un solo punto de código "5f")
 *   parte|0-8,e-1b,24,30-39,...
 *   ignorable|0-8,e-1b,7f-9f,ad,...
 *   #total|N,M,K               (cantidad de rangos de cada línea; `generar-datos.ts` la exige y la cruza
 *                               con lo que leyó, para que una salida truncada nunca pase por completa)
 *
 * Uso: java GenerarIdentificadores.java (sin argumentos).
 */
public class GenerarIdentificadores {
  private static final int ULTIMO_PUNTO_DE_CODIGO = 0x10FFFF;
  private static final int ULTIMA_UNIDAD_UTF16 = 0xFFFF;

  private enum Tabla { INICIO, PARTE, IGNORABLE }

  public static void main(String[] args) {
    StringBuilder inicio = new StringBuilder("inicio|");
    StringBuilder parte = new StringBuilder("parte|");
    StringBuilder ignorable = new StringBuilder("ignorable|");
    int rangosDeInicio = escribirRangos(inicio, Tabla.INICIO, ULTIMO_PUNTO_DE_CODIGO);
    int rangosDeParte = escribirRangos(parte, Tabla.PARTE, ULTIMO_PUNTO_DE_CODIGO);
    int rangosDeIgnorable = escribirRangos(ignorable, Tabla.IGNORABLE, ULTIMA_UNIDAD_UTF16);
    System.out.println(inicio);
    System.out.println(parte);
    System.out.println(ignorable);
    System.out.println("#total|" + rangosDeInicio + "," + rangosDeParte + "," + rangosDeIgnorable);
  }

  private static int escribirRangos(StringBuilder salida, Tabla tabla, int ultimo) {
    int rangos = 0;
    int puntoDeCodigo = 0;
    while (puntoDeCodigo <= ultimo) {
      if (!cumple(puntoDeCodigo, tabla)) {
        puntoDeCodigo++;
        continue;
      }
      int desde = puntoDeCodigo;
      while (puntoDeCodigo < ultimo && cumple(puntoDeCodigo + 1, tabla)) puntoDeCodigo++;
      if (rangos > 0) salida.append(',');
      salida.append(Integer.toHexString(desde));
      if (puntoDeCodigo != desde) salida.append('-').append(Integer.toHexString(puntoDeCodigo));
      rangos++;
      puntoDeCodigo++;
    }
    return rangos;
  }

  private static boolean cumple(int puntoDeCodigo, Tabla tabla) {
    switch (tabla) {
      case INICIO:
        return Character.isJavaIdentifierStart(puntoDeCodigo);
      case PARTE:
        return Character.isJavaIdentifierPart(puntoDeCodigo);
      default:
        // `scanIdent` de javac pregunta por UNA unidad UTF-16 (`Character.isIdentifierIgnorable(char)`).
        return Character.isIdentifierIgnorable((char) puntoDeCodigo);
    }
  }
}
