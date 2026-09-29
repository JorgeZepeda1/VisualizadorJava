import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.StandardLocation;
import javax.tools.ToolProvider;

/**
 * Compila MILES de mutantes de un solo token (tarea 1.16, REQ-DIFF-006, criterio C7, ADR 010) en
 * UNA SOLA JVM — arrancar una JVM nueva por mutante (javac por línea de comandos, el patrón de
 * `ejecutar.ts`) costaría el arranque completo de la JVM por archivo; aquí, {@code
 * javax.tools.JavaCompiler} compila cada fuente EN MEMORIA reusando la misma JVM (y el mismo
 * {@link StandardJavaFileManager}) para todas las compilaciones — el ahorro real que design.md
 * §7.4 anticipa ("javac tarda ≈ 0.25 s por archivo").
 *
 * <p>Protocolo de texto plano UTF-8 (mismo estilo delimitado que {@code GenerarFirmasApi.java}),
 * un mutante por línea:
 * <pre>
 *   ENTRADA (stdin):  id + "\t" + base64(fuente-utf8)
 *   SALIDA  (stdout): id + "\t" + compila("true"/"false") + "\t" + linea(entero, "-1" si compila)
 *                      + "\t" + codigoJavac (vacío si compila)
 *                      + "\t" + mensaje (inglés, "\n"/"\t" reales escapados a "\\n"/"\\t"; vacío si compila)
 * </pre>
 *
 * <p>Se reporta el CÓDIGO del primer diagnóstico {@code ERROR} vía {@link Diagnostic#getCode()} —
 * la clave ESTABLE del recurso de javac (p. ej. {@code compiler.err.expected}), independiente de
 * idioma — a propósito, nunca el mensaje con el locale POR OMISIÓN de la JVM: ese SÍ es sensible al
 * gotcha de arranque en frío documentado en {@code generar-datos.ts}
 * (`pareceLanzadorEnEspanol`/`verificarMarcoEnEspanol`). El campo "mensaje" de abajo evita el mismo
 * gotcha pidiendo EXPLÍCITAMENTE {@link Locale#ROOT} (el bundle BASE de javac, en inglés,
 * determinista, nunca el default de la JVM) — varias claves reales (p. ej. la familia
 * "compiler.err.expected*") necesitan el TEXTO para distinguir de qué token faltante se trata
 * (";" vs ")" vs otro), información que {@link Diagnostic#getCode()} por sí solo no da (la clave
 * es la misma para las 4 variantes "expected"/"expected2/3/4", que solo difieren en cuántos
 * argumentos formatea el mensaje).
 *
 * <p>Los {@code .class} de cada compilación se descartan — nunca se necesitan, solo los
 * diagnósticos — en un único directorio temporal reusado para TODAS las compilaciones y borrado al
 * final (o si el proceso se interrumpe, vía shutdown hook).
 *
 * <p>Uso: {@code java CompiladorEnLote.java < manifiesto.tsv > veredictos.tsv}
 */
public class CompiladorEnLote {
  public static void main(String[] args) throws IOException {
    JavaCompiler compilador = ToolProvider.getSystemJavaCompiler();
    if (compilador == null) {
      System.err.println("No hay un javax.tools.JavaCompiler disponible en este runtime -- ¿es un JRE, no un JDK?");
      System.exit(1);
      return;
    }

    Path salidaTemporal = Files.createTempDirectory("compilador-en-lote-");
    Runtime.getRuntime().addShutdownHook(new Thread(() -> borrarRecursivoMejorEsfuerzo(salidaTemporal)));

    StandardJavaFileManager fileManagerBase =
        compilador.getStandardFileManager(null, Locale.ROOT, StandardCharsets.UTF_8);
    fileManagerBase.setLocation(StandardLocation.CLASS_OUTPUT, List.of(salidaTemporal.toFile()));

    try (PrintStream salida = new PrintStream(System.out, false, StandardCharsets.UTF_8);
        BufferedReader entrada = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8))) {
      String linea;
      int total = 0;
      while ((linea = entrada.readLine()) != null) {
        if (linea.isEmpty()) continue;
        int separador = linea.indexOf('\t');
        String id = linea.substring(0, separador);
        String fuente = new String(Base64.getDecoder().decode(linea.substring(separador + 1)), StandardCharsets.UTF_8);

        Veredicto veredicto = compilarUno(compilador, fileManagerBase, id, fuente);
        salida.println(
            veredicto.id
                + "\t"
                + veredicto.compila
                + "\t"
                + veredicto.linea
                + "\t"
                + veredicto.codigoJavac
                + "\t"
                + escaparParaUnaLinea(veredicto.mensaje));

        total++;
        if (total % 200 == 0) salida.flush();
      }
      salida.flush();
    } finally {
      fileManagerBase.close();
      borrarRecursivoMejorEsfuerzo(salidaTemporal);
    }
  }

  private static final class Veredicto {
    final String id;
    final boolean compila;
    final long linea;
    final String codigoJavac;
    final String mensaje;

    Veredicto(String id, boolean compila, long linea, String codigoJavac, String mensaje) {
      this.id = id;
      this.compila = compila;
      this.linea = linea;
      this.codigoJavac = codigoJavac;
      this.mensaje = mensaje;
    }
  }

  private static String escaparParaUnaLinea(String texto) {
    return texto.replace("\\", "\\\\").replace("\n", "\\n").replace("\t", "\\t").replace("\r", "\\r");
  }

  private static Veredicto compilarUno(
      JavaCompiler compilador, StandardJavaFileManager fileManagerBase, String id, String fuente) {
    String nombreClase = extraerNombreClase(fuente);
    JavaFileObject fuenteEnMemoria = new FuenteEnMemoria(nombreClase, fuente);
    DiagnosticCollector<JavaFileObject> diagnosticos = new DiagnosticCollector<>();

    JavaCompiler.CompilationTask tarea =
        compilador.getTask(
            null,
            fileManagerBase,
            diagnosticos,
            List.of("-encoding", "UTF-8", "-proc:none"),
            null,
            List.of(fuenteEnMemoria));

    Boolean exito;
    try {
      exito = tarea.call();
    } catch (RuntimeException excepcionDelCompilador) {
      // Un mutante puede dejar una fuente tan rota que el propio compilador LANCE en vez de
      // reportar un Diagnostic normal (p. ej. un token roto en un punto que confunde al parser
      // interno de javac) -- D2: sigue siendo "no compila", nunca se descarta el mutante ni se
      // deja sin veredicto.
      return new Veredicto(
          id, false, -1, "excepcion-del-compilador:" + excepcionDelCompilador.getClass().getSimpleName(), "");
    }

    Diagnostic<? extends JavaFileObject> primerError = null;
    for (Diagnostic<? extends JavaFileObject> diagnostico : diagnosticos.getDiagnostics()) {
      if (diagnostico.getKind() == Diagnostic.Kind.ERROR) {
        primerError = diagnostico;
        break;
      }
    }

    if (Boolean.TRUE.equals(exito) && primerError == null) {
      return new Veredicto(id, true, -1, "", "");
    }
    long lineaDelError = primerError != null ? primerError.getLineNumber() : -1;
    String codigo = primerError != null ? primerError.getCode() : "sin-diagnostico-error";
    // Locale.ROOT (bundle BASE de javac, inglés, determinista) -- NUNCA el locale por omisión de
    // la JVM (ver el javadoc de la clase): necesario para distinguir la familia "expected*" (ver
    // arriba). Si el propio getMessage lanzara (no debería, pero D2: nunca dejar caer el mutante
    // completo por esto), el mensaje queda vacío -- el código y la línea siguen siendo válidos.
    String mensaje;
    try {
      mensaje = primerError != null ? primerError.getMessage(Locale.ROOT) : "";
    } catch (RuntimeException ignorada) {
      mensaje = "";
    }
    return new Veredicto(id, false, lineaDelError, codigo == null ? "sin-codigo" : codigo, mensaje);
  }

  // "class Nombre" (con o sin "public" antes) -- el mismo criterio de "cuál es la clase real" que
  // ya usa `ejecutar.ts:derivarNombreDeArchivo` del lado TypeScript, pero sobre la fuente YA
  // MUTADA (nunca la original): si la mutación cambió el nombre de la clase, el archivo en memoria
  // debe llamarse COMO QUEDÓ, para que "public class X debe declararse en X.java" nunca dispare un
  // error ARTIFICIAL que la mutación misma no pidió. "Mutante" es el nombre de reserva cuando la
  // mutación borró el identificador (p. ej. "public class  {") -- javac de todos modos reporta el
  // error de sintaxis real (falta el identificador); el nombre de reserva no lo cambia.
  private static String extraerNombreClase(String fuente) {
    Matcher coincidencia = PATRON_NOMBRE_CLASE.matcher(fuente);
    return coincidencia.find() ? coincidencia.group(1) : "Mutante";
  }

  private static final Pattern PATRON_NOMBRE_CLASE = Pattern.compile("\\bclass\\s+([A-Za-z_$][A-Za-z0-9_$]*)");

  private static void borrarRecursivoMejorEsfuerzo(Path raiz) {
    try {
      if (!Files.exists(raiz)) return;
      try (var flujo = Files.walk(raiz)) {
        flujo.sorted(Comparator.reverseOrder())
            .forEach(
                ruta -> {
                  try {
                    Files.delete(ruta);
                  } catch (IOException ignorada) {
                    // Mejor esfuerzo -- el directorio temporal del SO se limpia solo eventualmente.
                  }
                });
      }
    } catch (IOException ignorada) {
      // Mejor esfuerzo, ver arriba.
    }
  }

  private static final class FuenteEnMemoria extends SimpleJavaFileObject {
    private final String fuente;

    FuenteEnMemoria(String nombreClase, String fuente) {
      super(URI.create("string:///" + nombreClase + ".java"), Kind.SOURCE);
      this.fuente = fuente;
    }

    @Override
    public CharSequence getCharContent(boolean ignoreEncodingErrors) {
      return fuente;
    }
  }
}
