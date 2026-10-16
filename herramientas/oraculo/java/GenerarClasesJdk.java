import java.lang.module.Configuration;
import java.lang.module.ModuleDescriptor;
import java.lang.module.ModuleFinder;
import java.lang.module.ModuleReference;
import java.lang.module.ResolvedModule;
import java.lang.reflect.Modifier;
import java.net.URI;
import java.nio.file.DirectoryStream;
import java.nio.file.FileSystem;
import java.nio.file.FileSystems;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeMap;
import java.util.TreeSet;
import javax.tools.Diagnostic;
import javax.tools.DiagnosticCollector;
import javax.tools.JavaCompiler;
import javax.tools.JavaFileObject;
import javax.tools.SimpleJavaFileObject;
import javax.tools.ToolProvider;

/**
 * Vuelca, contra el JDK 17 real, los tipos públicos que un programa SIN módulo ve por omisión
 * (tarea 1.29, ADR 010) — nunca escritos a mano: es lo que distingue «esta clase existe pero el
 * visualizador todavía no la simula» (aviso, design.md §2.3/§2.6: `import java.util.Locale;`,
 * `javax.swing.JOptionPane`, `StringBuilder`…) de «esta clase no existe» (error de compilación:
 * `import java.util.Scaner;`). Antes de esta tarea el motor solo conocía las 10 clases de su
 * catálogo y rechazaba con el MISMO error un import correcto y uno con una falta de ortografía.
 *
 * Alcance: los módulos que javac 17 resuelve por omisión para un programa del módulo anónimo — todo
 * módulo del sistema que exporta al menos un paquete SIN calificar, sea {@code java.*} o {@code jdk.*}
 * ({@code Target#allApiModulesAreRoots}, desde el JDK 11: de ahí que {@code java.smartcardio}, que
 * {@code java.se} no incluye, también se vea), salvo los incubadores (JEP 11: no se resuelven por
 * omisión) — más lo que ellos requieren, calculado con {@link Configuration#resolve} SIN enlazar
 * servicios, igual que javac. De cada módulo solo cuentan sus paquetes exportados SIN calificar (un
 * paquete interno como {@code jdk.internal.misc} javac lo rechaza): se listan los archivos {@code
 * .class} del sistema de archivos {@code jrt:} y se conservan solo los tipos importables: públicos,
 * con todos sus tipos envolventes públicos (un {@code import java.util.HashMap.TreeNode;} javac lo
 * rechaza), sin los sintéticos, anónimos ni locales. Los tipos anidados llevan su nombre CANÓNICO
 * ({@code Map.Entry}), que es el único que acepta un {@code import}.
 *
 * La reflexión no lo sabe todo: las APIs en vista previa (p. ej. {@code
 * java.lang.runtime.SwitchBootstraps} en el JDK 17) existen y son públicas, pero javac las rechaza
 * mientras no se active {@code --enable-preview}. Por eso el último filtro es el propio javac: se
 * compila UNA vez una clase con un campo por candidato, escrito con su nombre completo (sin choques
 * entre nombres simples repetidos, {@code java.util.List}/{@code java.awt.List}), y se descarta cada
 * nombre cuya línea recibe un error. La verificación INDEPENDIENTE contra javac (cada nombre como
 * {@code import}, una compilación por nombre) vive en {@code generar-datos.test.ts}.
 *
 * Salida (stdout), una línea por paquete, ordenada: {@code paquete|Clase1,Clase2,Map.Entry,...}, y una
 * última línea {@code #total|N} con la cantidad de clases listadas: `generar-datos.ts` la exige y la
 * cruza con lo que leyó, para que una salida truncada (el oráculo acota lo que captura de stdout)
 * NUNCA se guarde en silencio como si fuera la lista completa — una clase que falte se le mostraría
 * al alumno como «no existe» (un error de compilación falso).
 *
 * Uso: java GenerarClasesJdk.java (sin argumentos).
 */
public class GenerarClasesJdk {
  public static void main(String[] args) throws Exception {
    FileSystem jrt = FileSystems.getFileSystem(URI.create("jrt:/"));
    Map<String, SortedSet<String>> porPaquete = new TreeMap<>();
    for (ResolvedModule resuelto : modulosPorOmision().modules()) {
      ModuleDescriptor descriptor = resuelto.reference().descriptor();
      for (ModuleDescriptor.Exports exportacion : descriptor.exports()) {
        if (exportacion.isQualified()) continue;
        String paquete = exportacion.source();
        Path directorio = jrt.getPath("/modules", descriptor.name(), paquete.replace('.', '/'));
        if (!Files.isDirectory(directorio)) continue;
        try (DirectoryStream<Path> archivos = Files.newDirectoryStream(directorio, "*.class")) {
          for (Path archivo : archivos) {
            String nombreArchivo = archivo.getFileName().toString();
            String simple = nombreArchivo.substring(0, nombreArchivo.length() - ".class".length());
            String canonico = nombreCanonicoSiEsImportable(paquete + "." + simple);
            if (canonico == null) continue;
            porPaquete.computeIfAbsent(paquete, clave -> new TreeSet<>()).add(canonico.substring(paquete.length() + 1));
          }
        }
      }
    }
    quitarLosQueJavacRechaza(porPaquete);
    int total = 0;
    for (Map.Entry<String, SortedSet<String>> entrada : porPaquete.entrySet()) {
      if (entrada.getValue().isEmpty()) continue;
      System.out.println(entrada.getKey() + "|" + String.join(",", entrada.getValue()));
      total += entrada.getValue().size();
    }
    System.out.println("#total|" + total);
  }

  /** Descarta de {@code porPaquete} los tipos que javac no acepta (vista previa, ver la cabecera). */
  private static void quitarLosQueJavacRechaza(Map<String, SortedSet<String>> porPaquete) throws IOException {
    List<String> paquetes = new ArrayList<>();
    List<String> nombres = new ArrayList<>();
    StringBuilder fuente = new StringBuilder("class Sonda {\n");
    for (Map.Entry<String, SortedSet<String>> entrada : porPaquete.entrySet()) {
      for (String clase : entrada.getValue()) {
        // La línea del campo i es i + 2 (la 1 es la cabecera de la clase).
        fuente.append("  ").append(entrada.getKey()).append('.').append(clase).append(" c").append(paquetes.size()).append(";\n");
        paquetes.add(entrada.getKey());
        nombres.add(clase);
      }
    }
    fuente.append("}\n");

    JavaCompiler compilador = ToolProvider.getSystemJavaCompiler();
    DiagnosticCollector<JavaFileObject> diagnosticos = new DiagnosticCollector<>();
    JavaFileObject archivo = new SimpleJavaFileObject(java.net.URI.create("string:///Sonda.java"), JavaFileObject.Kind.SOURCE) {
      @Override
      public CharSequence getCharContent(boolean ignorarErroresDeCodificacion) {
        return fuente;
      }
    };
    Path salida = Files.createTempDirectory("clases-jdk-sonda-");
    try {
      compilador.getTask(null, null, diagnosticos, List.of("-proc:none", "-Xmaxerrs", "1000000", "-d", salida.toString()), null, List.of(archivo)).call();
    } finally {
      try (var flujo = Files.walk(salida)) {
        flujo.sorted(java.util.Comparator.reverseOrder()).forEach(ruta -> ruta.toFile().delete());
      }
    }
    for (Diagnostic<? extends JavaFileObject> diagnostico : diagnosticos.getDiagnostics()) {
      if (diagnostico.getKind() != Diagnostic.Kind.ERROR) continue;
      long linea = diagnostico.getLineNumber();
      if (linea < 2 || linea - 2 >= nombres.size()) {
        throw new IllegalStateException("Error de javac fuera de los campos de la sonda: " + diagnostico.getMessage(Locale.ROOT));
      }
      int indice = (int) (linea - 2);
      porPaquete.get(paquetes.get(indice)).remove(nombres.get(indice));
    }
  }

  /** Los módulos que javac resuelve por omisión, con sus dependencias y SIN enlazar servicios (ver la cabecera). */
  private static Configuration modulosPorOmision() {
    ModuleFinder buscador = ModuleFinder.ofSystem();
    Set<String> raices = new TreeSet<>();
    for (ModuleReference referencia : buscador.findAll()) {
      ModuleDescriptor descriptor = referencia.descriptor();
      if (descriptor.name().startsWith("jdk.incubator.")) continue;
      if (descriptor.exports().stream().anyMatch(exportacion -> !exportacion.isQualified())) raices.add(descriptor.name());
    }
    return Configuration.empty().resolve(buscador, ModuleFinder.of(), raices);
  }

  private static String nombreCanonicoSiEsImportable(String nombreBinario) {
    Class<?> clase;
    try {
      clase = Class.forName(nombreBinario, false, ClassLoader.getSystemClassLoader());
    } catch (Throwable noSeCargo) {
      return null;
    }
    if (clase.isSynthetic() || clase.isAnonymousClass() || clase.isLocalClass()) return null;
    for (Class<?> tipo = clase; tipo != null; tipo = tipo.getEnclosingClass()) {
      if (!Modifier.isPublic(tipo.getModifiers())) return null;
    }
    return clase.getCanonicalName();
  }
}
