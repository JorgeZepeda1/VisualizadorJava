import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

/**
 * Vuelca, por reflexión sobre el JDK 17 real, las firmas públicas de las clases de
 * {@code java.lang}/{@code java.util}/{@code java.io} que REQ-SUB-005 reconoce (tarea 1.9,
 * ADR 010) — nunca escritas a mano: la resolución de sobrecargas (tarea 1.8, JLS 15.12.2) y la
 * distinción "soportado / existe en Java pero no soportado / no existe" (REQ-SUB-007) se
 * construyen sobre estos hechos observados, no sobre una lista transcrita por una persona.
 *
 * Solo {@code getDeclared*} (nunca {@code get*}, que además trae miembros HEREDADOS de
 * {@code Object}/interfaces — ruido que no aporta nada a un subconjunto que no soporta herencia).
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
      for (Constructor<?> constructor : clase.getDeclaredConstructors()) {
        if (!Modifier.isPublic(constructor.getModifiers())) continue;
        System.out.println(formatearMetodo(clase, "<init>", constructor.getModifiers(),
            constructor.getParameterTypes(), void.class, constructor.isVarArgs()));
      }
      for (Method metodo : clase.getDeclaredMethods()) {
        if (!Modifier.isPublic(metodo.getModifiers())) continue;
        System.out.println(formatearMetodo(clase, metodo.getName(), metodo.getModifiers(),
            metodo.getParameterTypes(), metodo.getReturnType(), metodo.isVarArgs()));
      }
      for (Field campo : clase.getDeclaredFields()) {
        if (!Modifier.isPublic(campo.getModifiers())) continue;
        System.out.println(formatearCampo(clase, campo));
      }
    }
  }

  private static String formatearMetodo(
      Class<?> clase, String nombre, int modificadores, Class<?>[] parametros, Class<?> retorno, boolean esVarargs) {
    StringBuilder tipos = new StringBuilder();
    for (int i = 0; i < parametros.length; i++) {
      if (i > 0) tipos.append(',');
      tipos.append(parametros[i].getTypeName());
    }
    String genero = "<init>".equals(nombre) ? "constructor" : "metodo";
    return clase.getSimpleName() + "|" + genero + "|" + nombre + "|" + Modifier.isStatic(modificadores)
        + "|" + tipos + "|" + retorno.getTypeName() + "|" + esVarargs;
  }

  private static String formatearCampo(Class<?> clase, Field campo) {
    return clase.getSimpleName() + "|campo|" + campo.getName() + "|" + Modifier.isStatic(campo.getModifiers())
        + "||" + campo.getType().getTypeName() + "|false";
  }
}
