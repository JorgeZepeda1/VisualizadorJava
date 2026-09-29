import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeMap;
import java.util.TreeSet;

/**
 * Vuelca, por reflexión sobre el JDK 17 real, los SUPERTIPOS de cada tipo de referencia que el
 * subconjunto puede pasar como argumento (tarea 1.29, ADR 010) — nunca escritos a mano: el
 * ensanchamiento de referencia (JLS 5.1.5, `String` → `CharSequence`/`Comparable`/…) y el "más
 * específico" (JLS 15.12.2.5) de la resolución de sobrecargas se construyen sobre estos hechos
 * observados. Antes de esta tarea el único ensanchamiento de referencia era `String` → `Object`,
 * escrito a mano, y `s.contains("ol")` (`contains(CharSequence)`) no resolvía.
 *
 * Arrancan en {@code RAICES} (las clases que un argumento puede tener: los tipos de referencia del
 * subconjunto, {@code System.in}/{@code System.out} y los envoltorios en los que boxea un
 * primitivo, JLS 5.1.7) y se cierra transitivamente: cada supertipo encontrado también trae su
 * propia línea, para poder comparar dos parámetros entre sí ("¿{@code CharSequence} es más
 * específico que {@code Object}?"). Una interfaz también tiene a {@code Object} como supertipo
 * (JLS 4.10.2) aunque {@code getSuperclass()} devuelva null.
 *
 * Salida (stdout), una línea por tipo, ordenada: {@code tipo|super1,super2,...} con
 * {@code Class#getTypeName()} (p. ej. "java.lang.String") — los mismos nombres que trae
 * {@code GenerarFirmasApi.java} en los parámetros, así que comparar es una igualdad de texto.
 *
 * Uso: java GenerarSupertipos.java (sin argumentos; la lista de raíces está fija abajo).
 */
public class GenerarSupertipos {
  private static final Class<?>[] RAICES = {
    String.class,
    java.util.Scanner.class,
    java.util.Random.class,
    java.io.InputStream.class,
    java.io.PrintStream.class,
    Integer.class,
    Double.class,
    Character.class,
    Boolean.class,
    Long.class,
  };

  public static void main(String[] args) {
    Map<String, SortedSet<String>> tabla = new TreeMap<>();
    Deque<Class<?>> pendientes = new ArrayDeque<>(Arrays.asList(RAICES));
    while (!pendientes.isEmpty()) {
      Class<?> tipo = pendientes.pop();
      if (tabla.containsKey(tipo.getTypeName())) continue;
      Set<Class<?>> supertipos = new LinkedHashSet<>();
      reunirSupertipos(tipo, supertipos);
      SortedSet<String> nombres = new TreeSet<>();
      for (Class<?> supertipo : supertipos) {
        nombres.add(supertipo.getTypeName());
        pendientes.push(supertipo);
      }
      tabla.put(tipo.getTypeName(), nombres);
    }
    for (Map.Entry<String, SortedSet<String>> entrada : tabla.entrySet()) {
      System.out.println(entrada.getKey() + "|" + String.join(",", entrada.getValue()));
    }
  }

  private static void reunirSupertipos(Class<?> tipo, Set<Class<?>> salida) {
    Class<?> superclase = tipo.getSuperclass();
    if (superclase != null) {
      salida.add(superclase);
      reunirSupertipos(superclase, salida);
    }
    for (Class<?> interfaz : tipo.getInterfaces()) {
      salida.add(interfaz);
      reunirSupertipos(interfaz, salida);
    }
    if (tipo.isInterface()) salida.add(Object.class);
  }
}
