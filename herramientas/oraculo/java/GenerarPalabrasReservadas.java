import com.sun.tools.javac.parser.Tokens.TokenKind;
import java.util.TreeSet;
import javax.lang.model.SourceVersion;

/**
 * Vuelca, contra el JDK 17 real, TODAS las palabras reservadas de Java (tarea 1.33, ADR 010): las que el
 * analizador léxico de {@code javac} reconoce como una palabra y no como un identificador — las 50 palabras clave de
 * JLS 3.9 (incluidas {@code const} y {@code goto}, que Java reserva sin usarlas), el guion bajo {@code _} (palabra
 * reservada desde Java 9) y los tres literales {@code true}, {@code false} y {@code null}. Nunca escritas de
 * memoria: al escribirlas a mano el léxico del visualizador dejó fuera 15 de las 54 (`native`, `enum`, `goto`,
 * `_`…) y aceptó `int native;`, que javac rechaza.
 *
 * <p>La fuente es {@code com.sun.tools.javac.parser.Tokens.TokenKind}, la enumeración de fichas de javac: cada ficha
 * con un nombre hecho solo de letras minúsculas y guiones bajos es una palabra reservada (los operadores y los
 * separadores tienen nombres con signos). Ese paquete no es público: se corre con {@code --add-exports
 * jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED}. Como segunda fuente, INDEPENDIENTE, cada palabra se cruza con
 * la API pública {@link SourceVersion#isKeyword(CharSequence, SourceVersion)} del mismo JDK: si las dos no coinciden
 * la sonda falla (código 1) en vez de guardar una lista dudosa.
 *
 * <p>Salida (stdout): dos líneas —
 * <pre>
 *   reservadas|_,abstract,assert,...   (orden alfabético; `_` primero)
 *   #total|54                          (cuántas; `generar-datos.ts` la exige y la cruza con lo que leyó)
 * </pre>
 *
 * <p>Uso: {@code java --add-exports jdk.compiler/com.sun.tools.javac.parser=ALL-UNNAMED GenerarPalabrasReservadas.java}
 */
public class GenerarPalabrasReservadas {
  public static void main(String[] args) {
    TreeSet<String> reservadas = new TreeSet<>();
    for (TokenKind ficha : TokenKind.values()) {
      if (ficha.name != null && ficha.name.matches("[a-z_]+")) reservadas.add(ficha.name);
    }
    for (String palabra : reservadas) {
      if (!SourceVersion.isKeyword(palabra, SourceVersion.RELEASE_17)) {
        System.err.println("Las dos fuentes no coinciden: javac (TokenKind) reserva «" + palabra + "» y SourceVersion.isKeyword(RELEASE_17) dice que no.");
        System.exit(1);
      }
    }
    System.out.println("reservadas|" + String.join(",", reservadas));
    System.out.println("#total|" + reservadas.size());
  }
}
