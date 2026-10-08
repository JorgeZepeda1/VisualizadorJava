import java.lang.module.ModuleFinder;
import java.lang.module.ModuleReference;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Stream;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.StandardJavaFileManager;
import javax.tools.ToolProvider;

/**
 * Compila, contra el JDK 17 real, un programa mínimo en CADA paquete de los módulos del sistema (tarea 1.39, W-16 de la tarea 1.38; ADR 010): nunca escritos a mano. {@code package jdk.internal.misc;}
 * lo compila javac —el paquete existe en un módulo del JDK, pero ese módulo no lo exporta, así que no hay «package exists in another module»— y el lanzador {@code java} no encuentra la clase
 * ({@code ClassNotFoundException}: el cargador de aplicaciones busca el paquete en su módulo y no mira el classpath). Esta sonda solo hace la mitad de {@code javac}; arrancar cada clase con el
 * {@code java} real lo hace {@code generar-datos.ts}, que es quien clasifica el desenlace (hay que lanzar un proceso por paquete, y eso no cabe en el tiempo de una sonda si lo hace la propia JVM).
 *
 * <p>Qué mide. Los candidatos son los paquetes de TODOS los módulos del sistema ({@link ModuleFinder#ofSystem()}, no solo los del arranque: los de las incubadoras y los de las herramientas también
 * cuentan), exportados o no. Para cada uno compila {@code package <p>; public class Saludo { main escribe "hola" }} en la forma de un programa del alumno (módulo sin nombre, sin opciones de módulos).
 * La primera tanda compila TODOS juntos en una sola tarea de javac: el único error posible es {@code compiler.err.package.in.other.module} (el módulo exporta el paquete: {@code javac-rechaza}), que
 * javac informa al ENTRAR cada fuente, así que no depende de las demás; cualquier otro error aborta la sonda, porque quiere decir que algo de la propia sonda está mal. Como javac no genera clases
 * cuando hay errores, la segunda tanda compila los que NO rechazó, también juntos, al directorio que recibe como argumento, y exige cero errores y una {@code Saludo.class} por paquete.
 *
 * <p>Salida (stdout), una línea por paquete, ordenada: {@code paquete|javac-rechaza} o {@code paquete|compila}, y una última línea {@code #total|N} con la cantidad de paquetes listados:
 * {@code generar-datos.ts} la exige y la cruza con lo que leyó, para que una salida truncada NUNCA se guarde en silencio como si fuera la lista completa. Por stderr, un resumen de lo medido.
 *
 * <p>Uso: java GenerarPaquetesDeModulos.java &lt;directorio donde dejar las clases de los paquetes que javac compila&gt;.
 */
public class GenerarPaquetesDeModulos {
  private static final String CLAVE_DE_JAVAC = "compiler.err.package.in.other.module";

  public static void main(String[] args) throws Exception {
    if (args.length != 1) {
      System.err.println("Uso: java GenerarPaquetesDeModulos.java <directorio de salida de las clases>");
      System.exit(2);
    }
    Path salida = Path.of(args[0]);
    TreeSet<String> paquetes = paquetesDeTodosLosModulosDelSistema();
    JavaCompiler compilador = ToolProvider.getSystemJavaCompiler();
    StandardJavaFileManager gestor = compilador.getStandardFileManager(null, Locale.ROOT, StandardCharsets.UTF_8);
    Path descartable = Files.createTempDirectory("paquetes-de-modulos-");
    try {
      // Primera tanda: todos juntos. Con errores javac no genera clases; el directorio es de usar y tirar.
      Set<String> rechazados = compilar(compilador, gestor, new ArrayList<>(paquetes), descartable);
      List<String> aceptados = new ArrayList<>();
      for (String paquete : paquetes) {
        if (!rechazados.contains(paquete)) aceptados.add(paquete);
      }
      // Segunda tanda: los que javac no rechazó, a su directorio. Deben compilar limpios.
      Set<String> sinCompilar = compilar(compilador, gestor, aceptados, salida);
      if (!sinCompilar.isEmpty()) {
        throw new IllegalStateException("la segunda tanda rechazó " + sinCompilar.size() + " paquetes que la primera aceptó: " + sinCompilar);
      }
      for (String paquete : aceptados) {
        if (!Files.exists(salida.resolve(paquete.replace('.', '/')).resolve("Saludo.class"))) {
          throw new IllegalStateException("javac no dejó la clase de " + paquete + " en " + salida);
        }
      }
      for (String paquete : paquetes) {
        System.out.println(paquete + "|" + (rechazados.contains(paquete) ? "javac-rechaza" : "compila"));
      }
      System.out.println("#total|" + paquetes.size());
      System.err.println("paquetes: " + paquetes.size() + ", javac rechaza: " + rechazados.size() + ", javac compila: " + aceptados.size());
    } finally {
      borrarMejorEsfuerzo(descartable);
    }
  }

  /** El nombre de cada paquete de cada módulo del sistema, exportado o no, sin repetidos y ordenado. */
  private static TreeSet<String> paquetesDeTodosLosModulosDelSistema() {
    TreeSet<String> paquetes = new TreeSet<>();
    for (ModuleReference referencia : ModuleFinder.ofSystem().findAll()) {
      paquetes.addAll(referencia.descriptor().packages());
    }
    return paquetes;
  }

  /**
   * Compila el programa mínimo de cada paquete en UNA tarea de javac, con las clases en {@code salida}. Devuelve los paquetes que javac rechazó con la clave de «package exists in another module»;
   * cualquier otro error de javac lanza.
   */
  private static Set<String> compilar(JavaCompiler compilador, StandardJavaFileManager gestor, List<String> paquetes, Path salida) {
    List<JavaFileObject> fuentes = new ArrayList<>();
    Map<String, String> paquetePorUri = new HashMap<>();
    for (int i = 0; i < paquetes.size(); i++) {
      String uri = "string:///u" + i + "/Saludo.java";
      String texto = "package " + paquetes.get(i) + ";\n\npublic class Saludo {\n    public static void main(String[] args) {\n        System.out.println(\"hola\");\n    }\n}\n";
      paquetePorUri.put(uri, paquetes.get(i));
      fuentes.add(new SimpleJavaFileObject(URI.create(uri), JavaFileObject.Kind.SOURCE) {
        @Override
        public CharSequence getCharContent(boolean ignorarErroresDeCodificacion) {
          return texto;
        }
      });
    }
    DiagnosticCollector<JavaFileObject> diagnosticos = new DiagnosticCollector<>();
    List<String> opciones = List.of("-proc:none", "-Xmaxerrs", "1000000", "-encoding", "UTF-8", "-g", "-d", salida.toString());
    compilador.getTask(null, gestor, diagnosticos, opciones, null, fuentes).call();
    Set<String> rechazados = new TreeSet<>();
    for (Diagnostic<? extends JavaFileObject> diagnostico : diagnosticos.getDiagnostics()) {
      if (diagnostico.getKind() != Diagnostic.Kind.ERROR) continue;
      if (!CLAVE_DE_JAVAC.equals(diagnostico.getCode())) {
        throw new IllegalStateException("error inesperado de javac (" + diagnostico.getCode() + "): " + diagnostico.getMessage(Locale.ROOT));
      }
      rechazados.add(paquetePorUri.get(diagnostico.getSource().toUri().toString()));
    }
    return rechazados;
  }

  private static void borrarMejorEsfuerzo(Path directorio) {
    try (Stream<Path> flujo = Files.walk(directorio)) {
      flujo.sorted(Comparator.reverseOrder()).forEach(ruta -> ruta.toFile().delete());
    } catch (Exception ignorada) {
      // un directorio temporal que no se pudo borrar no cambia el dato
    }
  }
}
