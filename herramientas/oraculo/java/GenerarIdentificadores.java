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
 * Salida (stdout): tres líneas —
 *   inicio|24,41-5a,5f,...     (rangos en hexadecimal: "41-5a" o un solo punto de código "5f")
 *   parte|0-8,e-1b,24,30-39,...
 *   #total|N,M                 (cantidad de rangos de cada línea; `generar-datos.ts` la exige y la cruza
 *                               con lo que leyó, para que una salida truncada nunca pase por completa)
 *
 * Uso: java GenerarIdentificadores.java (sin argumentos).
 */
public class GenerarIdentificadores {
  private static final int ULTIMO_PUNTO_DE_CODIGO = 0x10FFFF;

  public static void main(String[] args) {
    StringBuilder inicio = new StringBuilder("inicio|");
    StringBuilder parte = new StringBuilder("parte|");
    int rangosDeInicio = escribirRangos(inicio, true);
    int rangosDeParte = escribirRangos(parte, false);
    System.out.println(inicio);
    System.out.println(parte);
    System.out.println("#total|" + rangosDeInicio + "," + rangosDeParte);
  }

  private static int escribirRangos(StringBuilder salida, boolean esInicio) {
    int rangos = 0;
    int puntoDeCodigo = 0;
    while (puntoDeCodigo <= ULTIMO_PUNTO_DE_CODIGO) {
      if (!cumple(puntoDeCodigo, esInicio)) {
        puntoDeCodigo++;
        continue;
      }
      int desde = puntoDeCodigo;
      while (puntoDeCodigo < ULTIMO_PUNTO_DE_CODIGO && cumple(puntoDeCodigo + 1, esInicio)) puntoDeCodigo++;
      if (rangos > 0) salida.append(',');
      salida.append(Integer.toHexString(desde));
      if (puntoDeCodigo != desde) salida.append('-').append(Integer.toHexString(puntoDeCodigo));
      rangos++;
      puntoDeCodigo++;
    }
    return rangos;
  }

  private static boolean cumple(int puntoDeCodigo, boolean esInicio) {
    return esInicio ? Character.isJavaIdentifierStart(puntoDeCodigo) : Character.isJavaIdentifierPart(puntoDeCodigo);
  }
}
