import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeMap;
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
 * Vuelca, contra el JDK 17 real, los nombres de clase que javac rechaza cuando se escriben como NOMBRE DE PAQUETE (tarea 1.37, C-6 de la verificación del delta del lote 1; ADR 010): nunca
 * escritos a mano. {@code package java.lang.Shutdown;} es «package java.lang.Shutdown clashes with class of same name» (clave {@code compiler.err.pkg.clashes.with.class.of.same.name}) aunque
 * {@code Shutdown} no sea una clase pública, y el motor solo conocía los tipos públicos importables.
 *
 * <p>Qué mide. El chequeo es {@code TypeEnter.ImportsPhase.checkClassPackageClash}: corre ANTES de resolver los {@code import} y antes de leer ningún tipo del programa, así que el cuerpo del
 * programa no cambia el veredicto (la prueba de {@code generar-datos.test.ts} lo comprueba con varios cuerpos). Para cada prefijo del nombre del paquete (de dos segmentos en adelante) pregunta
 * si el compilador YA conoce una clase con ese nombre plano ({@code Symtab.getClass}). Lo que ya conoce al arrancar es: todos los archivos {@code .class} de {@code java.lang} (que importa
 * implícitamente: públicos o no, anidados como {@code Thread$State} o anónimos como {@code Class$1}) y las pocas clases que el propio compilador crea de antemano ({@code java.io.Serializable},
 * {@code java.util.Iterator}, {@code java.lang.invoke.MethodHandle}, {@code java.lang.runtime.SwitchBootstraps}…). El resto de las clases del JDK se cargan solo si el programa las usa, ya con el
 * chequeo hecho, y por eso {@code package java.util.Map;} compila.
 *
 * <p>Cómo lo mide. Candidatos: el nombre plano ({@code a.b.C$D}) de CADA archivo {@code .class} de todos los módulos del sistema ({@code jrt:/}), exportados o no, públicos o no. Se compilan por
 * lotes de {@value #TAMANO_DEL_LOTE} archivos {@code package <candidato>; class C { }} en una sola tarea de javac: es una cota segura para los que NO chocan (en un lote el compilador conoce lo
 * mismo o MÁS que con un programa solo, así que si ahí no choca, tampoco choca solo) y rápida (unos 10 s en vez de unos 2 minutos). Cada candidato que chocó en un lote se CONFIRMA compilándolo
 * solo, y se descarta si no choca (que el lote lo contaminara con una clase cargada por otro archivo).
 *
 * <p>Salida (stdout), una línea por paquete, ordenada: {@code paquete|Nombre1,Nombre2$Anidada,...} y una última línea {@code #total|N} con la cantidad de nombres listados:
 * {@code generar-datos.ts} la exige y la cruza con lo que leyó, para que una salida truncada NUNCA se guarde en silencio como si fuera la lista completa. Por stderr, un resumen de lo medido.
 *
 * <p>Uso: java GenerarClasesQueChocan.java (sin argumentos).
 */
public class GenerarClasesQueChocan {
  private static final String CLAVE_DE_JAVAC = "compiler.err.pkg.clashes.with.class.of.same.name";
  static final int TAMANO_DEL_LOTE = 400;

  public static void main(String[] args) throws Exception {
    TreeSet<String> candidatos = nombresPlanosDeTodasLasClasesDelSistema();
    JavaCompiler compilador = ToolProvider.getSystemJavaCompiler();
    StandardJavaFileManager gestor = compilador.getStandardFileManager(null, Locale.ROOT, StandardCharsets.UTF_8);
    Path salida = Files.createTempDirectory("clases-que-chocan-");
    try {
      List<String> lista = new ArrayList<>(candidatos);
      TreeSet<String> deLosLotes = new TreeSet<>();
      for (int desde = 0; desde < lista.size(); desde += TAMANO_DEL_LOTE) {
        deLosLotes.addAll(losQueChocan(compilador, gestor, salida, lista.subList(desde, Math.min(lista.size(), desde + TAMANO_DEL_LOTE))));
      }
      TreeMap<String, SortedSet<String>> porPaquete = new TreeMap<>();
      int total = 0;
      for (String candidato : deLosLotes) {
        if (!losQueChocan(compilador, gestor, salida, List.of(candidato)).contains(candidato)) continue; // lo contaminó el lote: solo, compila
        int ultimoPunto = candidato.lastIndexOf('.');
        porPaquete.computeIfAbsent(candidato.substring(0, ultimoPunto), clave -> new TreeSet<>()).add(candidato.substring(ultimoPunto + 1));
        total += 1;
      }
      for (Map.Entry<String, SortedSet<String>> entrada : porPaquete.entrySet()) {
        System.out.println(entrada.getKey() + "|" + String.join(",", entrada.getValue()));
      }
      System.out.println("#total|" + total);
      System.err.println("candidatos: " + candidatos.size() + ", chocaron en lote: " + deLosLotes.size() + ", confirmados solos: " + total);
    } finally {
      borrarMejorEsfuerzo(salida);
    }
  }

  /** El nombre plano ({@code java.lang.Thread$State}) de cada {@code .class} con paquete de todos los módulos del sistema, sin {@code module-info} ni {@code package-info}. */
  private static TreeSet<String> nombresPlanosDeTodasLasClasesDelSistema() throws Exception {
    FileSystem jrt = FileSystems.getFileSystem(URI.create("jrt:/"));
    TreeSet<String> nombres = new TreeSet<>();
    try (DirectoryStream<Path> modulos = Files.newDirectoryStream(jrt.getPath("/modules"))) {
      for (Path modulo : modulos) {
        try (Stream<Path> archivos = Files.walk(modulo)) {
          archivos.filter(ruta -> ruta.toString().endsWith(".class")).forEach(ruta -> {
            String relativa = modulo.relativize(ruta).toString();
            String sinExtension = relativa.substring(0, relativa.length() - ".class".length());
            if (sinExtension.equals("module-info") || sinExtension.endsWith("/package-info")) return;
            String plano = sinExtension.replace('/', '.');
            if (plano.indexOf('.') >= 0) nombres.add(plano);
          });
        }
      }
    }
    return nombres;
  }

  /** De {@code candidatos}, los que javac rechaza como paquete con la clave de «choca con una clase del mismo nombre», compilándolos juntos en UNA tarea. */
  private static Set<String> losQueChocan(JavaCompiler compilador, StandardJavaFileManager gestor, Path salida, List<String> candidatos) {
    List<JavaFileObject> fuentes = new ArrayList<>();
    Map<String, String> candidatoPorUri = new HashMap<>();
    for (int i = 0; i < candidatos.size(); i++) {
      String uri = "string:///u" + i + "/C.java";
      String texto = "package " + candidatos.get(i) + ";\nclass C { }\n";
      candidatoPorUri.put(uri, candidatos.get(i));
      fuentes.add(new SimpleJavaFileObject(URI.create(uri), JavaFileObject.Kind.SOURCE) {
        @Override
        public CharSequence getCharContent(boolean ignorarErroresDeCodificacion) {
          return texto;
        }
      });
    }
    DiagnosticCollector<JavaFileObject> diagnosticos = new DiagnosticCollector<>();
    compilador.getTask(null, gestor, diagnosticos, List.of("-proc:none", "-Xmaxerrs", "1000000", "-d", salida.toString()), null, fuentes).call();
    Set<String> chocan = new TreeSet<>();
    for (Diagnostic<? extends JavaFileObject> diagnostico : diagnosticos.getDiagnostics()) {
      if (diagnostico.getKind() != Diagnostic.Kind.ERROR || !CLAVE_DE_JAVAC.equals(diagnostico.getCode())) continue;
      String candidato = candidatoPorUri.get(diagnostico.getSource().toUri().toString());
      if (candidato != null) chocan.add(candidato);
    }
    return chocan;
  }

  private static void borrarMejorEsfuerzo(Path directorio) {
    try (Stream<Path> flujo = Files.walk(directorio)) {
      flujo.sorted(Comparator.reverseOrder()).forEach(ruta -> ruta.toFile().delete());
    } catch (Exception ignorada) {
      // un directorio temporal que no se pudo borrar no cambia el dato
    }
  }
}
