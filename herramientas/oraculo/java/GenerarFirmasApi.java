import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;

/**
 * Vuelca, por reflexión sobre el JDK 17 real, las firmas públicas de las clases de
 * {@code java.lang}/{@code java.util}/{@code java.io} que REQ-SUB-005 reconoce (tarea 1.9,
 * ADR 010) — nunca escritas a mano: la resolución de sobrecargas (tarea 1.8, JLS 15.12.2) y la
 * distinción "soportado / existe en Java pero no soportado / no existe" (REQ-SUB-007) se
 * construyen sobre estos hechos observados, no sobre una lista transcrita por una persona.
 *
 * Métodos y campos: TODOS los públicos de la clase, heredados incluidos ({@code getMethods}/
 * {@code getFields}), porque javac resuelve una llamada sobre los miembros públicos de la clase Y
 * los de sus supertipos (JLS 8.4.8): en el JDK 17 {@code Random} implementa {@code RandomGenerator},
 * cuyos métodos por defecto {@code nextInt(int, int)}, {@code nextDouble(double)}… son miembros de
 * {@code Random} sin estar declarados en ella, y toda clase hereda los públicos de {@code Object}
 * (tarea 1.29; antes solo {@code getDeclared*}, y {@code r.nextInt(1, 7)} se rechazaba). Los
 * constructores nunca se heredan: solo {@code getDeclaredConstructors}. Sin los métodos PUENTE ni
 * sintéticos (los inventa el compilador; javac no los ve, tarea 1.29).
 *
 * El orden es DETERMINISTA (constructores, métodos por nombre y parámetros, campos por nombre): el
 * CI regenera este catálogo y compara bytes (ADR 010 punto 3), y {@code getMethods} no promete
 * ningún orden.
 *
 * Salida (stdout), una firma por línea, campos separados por "|":
 *   Clase|genero|nombre|esEstatico|tipoParam1,tipoParam2,...|tipoRetorno|esVarargs
 * "genero" es "constructor" (nombre "&lt;init&gt;", retorno "void" ignorado), "metodo" o "campo"
 * (sin parámetros ni "esVarargs", que quedan vacíos/"false"). Los tipos usan
 * {@code Class#getTypeName()} (p. ej. "int", "java.lang.String", "char[]") — exactamente lo que
 * necesita `generar-datos.ts` para decidir viabilidad de conversión sin adivinar.
 *
 * Uso: java GenerarFirmasApi.java (sin argumentos; la lista de clases está fija abajo).
 */
public class GenerarFirmasApi {
  // REQ-SUB-005 (superficie reconocida) + REQ-SUB-007 (miembros existentes-no-soportados, p. ej.
  // s.split/Math.sin/sc.hasNextInt): se reflexiona la clase COMPLETA, nunca solo los miembros
  // soportados, para que "existe pero no está en nuestra lista" sea un hecho verificable contra
  // el JDK real, no una lista aparte que alguien tendría que mantener sincronizada a mano.
  private static final Class<?>[] CLASES = {
    Math.class,
    java.io.PrintStream.class,
    java.util.Scanner.class,
    java.util.Random.class,
    String.class,
    Character.class,
    Integer.class,
    Double.class,
    Long.class,
    System.class,
  };

  public static void main(String[] args) {
    for (Class<?> clase : CLASES) {
      List<Constructor<?>> constructores = new ArrayList<>();
      for (Constructor<?> constructor : clase.getDeclaredConstructors()) {
        if (Modifier.isPublic(constructor.getModifiers())) constructores.add(constructor);
      }
      constructores.sort(Comparator.comparing((Constructor<?> c) -> tiposDe(c.getParameterTypes())));
      for (Constructor<?> constructor : constructores) {
        System.out.println(formatearMetodo(clase, "<init>", constructor.getModifiers(),
            constructor.getParameterTypes(), void.class, constructor.isVarArgs()));
      }

      List<Method> metodos = new ArrayList<>();
      for (Method metodo : clase.getMethods()) {
        if (!Modifier.isPublic(metodo.getModifiers())) continue;
        // Tarea 1.29: un método PUENTE (o cualquier otro sintético) lo genera el compilador —
        // p. ej. `Scanner implements Iterator<String>` produce `next():Object` además del real
        // `next():String`; `String.compareTo(Object)` puente de `Comparable`. javac resuelve sobre lo
        // DECLARADO en el fuente (JLS 15.12), así que para él estos métodos no existen: con ellos
        // el catálogo traía dos `next()` idénticos sin desempate posible y aceptaba `compareTo(5)`.
        if (metodo.isBridge() || metodo.isSynthetic()) continue;
        metodos.add(metodo);
      }
      metodos.sort(Comparator.comparing(Method::getName)
          .thenComparing((Method m) -> tiposDe(m.getParameterTypes()))
          .thenComparing((Method m) -> m.getReturnType().getTypeName()));
      for (Method metodo : metodos) {
        System.out.println(formatearMetodo(clase, metodo.getName(), metodo.getModifiers(),
            metodo.getParameterTypes(), metodo.getReturnType(), metodo.isVarArgs()));
      }

      List<Field> campos = new ArrayList<>(Arrays.asList(clase.getFields()));
      campos.sort(Comparator.comparing(Field::getName));
      for (Field campo : campos) {
        if (!Modifier.isPublic(campo.getModifiers())) continue;
        System.out.println(formatearCampo(clase, campo));
      }
    }
  }

  private static String tiposDe(Class<?>[] parametros) {
    StringBuilder tipos = new StringBuilder();
    for (int i = 0; i < parametros.length; i++) {
      if (i > 0) tipos.append(',');
      tipos.append(parametros[i].getTypeName());
    }
    return tipos.toString();
  }

  private static String formatearMetodo(
      Class<?> clase, String nombre, int modificadores, Class<?>[] parametros, Class<?> retorno, boolean esVarargs) {
    String genero = "<init>".equals(nombre) ? "constructor" : "metodo";
    return clase.getSimpleName() + "|" + genero + "|" + nombre + "|" + Modifier.isStatic(modificadores)
        + "|" + tiposDe(parametros) + "|" + retorno.getTypeName() + "|" + esVarargs;
  }

  private static String formatearCampo(Class<?> clase, Field campo) {
    return clase.getSimpleName() + "|campo|" + campo.getName() + "|" + Modifier.isStatic(campo.getModifiers())
        + "||" + campo.getType().getTypeName() + "|false";
  }
}
