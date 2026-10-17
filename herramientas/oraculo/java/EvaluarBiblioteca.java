import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.Scanner;

/**
 * Sonda del oráculo para los conjuntos de la biblioteca (hito 1, parte A; ADR 010): un solo programa con una
 * "orden" por conjunto. NO decide nada: recibe los casos que genera `generar-conjuntos.ts` (archivo de entrada,
 * una línea por caso) y escribe en stdout lo que hace el JDK real con cada uno. Se corre en modo de archivo
 * fuente (`java EvaluarBiblioteca.java <orden> <archivo-de-entrada>`) con los mismos indicadores regionales que
 * el resto del oráculo (`-Duser.language=es -Duser.country=MX|ES -Dfile.encoding=UTF-8`), así que el locale por
 * omisión de `String.format` y de `Scanner` es el de la JVM, igual que en NetBeans.
 *
 * Campos de texto: los escapes son barra invertida doble, `\t`, `\n`, `\r` y barra-u con cuatro hexadecimales (para cualquier carácter de control o
 * unidad de código suelta), de modo que cada caso cabe en una línea con campos separados por tabulador.
 *
 * Órdenes:
 *   dobles      entrada: una línea por caso con 16 dígitos hexadecimales (los bits del double).
 *               salida:  `bits<TAB>Double.toString`.
 *   formatos    entrada: `formato<TAB>arg1<TAB>arg2…` con argumentos tipados: `d:123` (Integer), `l:123` (Long),
 *               `D:bitsHex` (Double), `s:texto` (String), `c:65` (Character), `b:true` (Boolean), `n:` (null).
 *               salida:  `OK<TAB>resultado` o `EX<TAB>clase<TAB>mensaje`.
 *   analisis    entrada: `operacion<TAB>texto` con operacion en {parseInt, parseDouble, nextInt, nextDouble,
 *               nextBoolean, next, nextLine} (las `next*` sobre un `Scanner` nuevo del texto).
 *               salida:  `OK<TAB>valor` (los double como bits hexadecimales) o `EX<TAB>clase<TAB>mensaje`.
 *   scanner     entrada: `texto<TAB>op1,op2,…` (operaciones sobre UN MISMO `Scanner`: nextInt, nextDouble,
 *               nextBoolean, next, nextLine, hasNext, hasNextInt, hasNextDouble, hasNextLine, close).
 *               salida:  una línea con un campo por operación: `OK:valor` o `EX:clase:mensaje`.
 *   aleatorios  entrada: una semilla por línea. salida: líneas `semilla<TAB>metodo<TAB>argumento<TAB>v1,v2,…`.
 *   caracteres  sin entrada. salida: una línea por `char` 0–65535: `codigo,banderas,mayuscula,minuscula,valorDeDigito` (`Character.digit(c, 10)`, -1 si no es dígito).
 *   matematicas entrada: `operacion<TAB>arg1<TAB>arg2` (absInt/Long/Double, maxXxx, minXxx, sqrt, floor, ceil, roundDouble, roundInt, roundLong, roundChar).
 *               salida: `OK<TAB>valor` (double como bits) o `EX<TAB>clase<TAB>mensaje`.
 *   cadenas     entrada: `operacion<TAB>texto<TAB>args…` (length, charAt, substring1/2, indexOf…, equals, compareTo, toUpperCase, trim, replace…, y las variantes `…Mismo` que
 *               dicen si el resultado ES el mismo objeto). `s` entra como `new String(texto)`. Las órdenes `codePointUpper`/`codePointLower` toman el PUNTO DE CÓDIGO en el campo 1.
 *               salida: `OK<TAB>resultado` o `EX<TAB>clase<TAB>mensaje`.
 */
public class EvaluarBiblioteca {

    public static void main(String[] args) throws IOException {
        String orden = args[0];
        List<String> entrada = args.length > 1 ? Files.readAllLines(Path.of(args[1]), StandardCharsets.UTF_8) : List.of();
        StringBuilder salida = new StringBuilder();
        switch (orden) {
            case "dobles" -> dobles(entrada, salida);
            case "formatos" -> formatos(entrada, salida);
            case "analisis" -> analisis(entrada, salida);
            case "scanner" -> scanner(entrada, salida);
            case "aleatorios" -> aleatorios(entrada, salida);
            case "caracteres" -> caracteres(salida);
            case "cadenas" -> cadenas(entrada, salida);
            case "matematicas" -> matematicas(entrada, salida);
            default -> throw new IllegalArgumentException("orden desconocida: " + orden);
        }
        System.out.print(salida);
        System.out.flush();
    }

    // ---- escapes ----

    static String escapar(String texto) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < texto.length(); i++) {
            char c = texto.charAt(i);
            switch (c) {
                case '\\' -> sb.append("\\\\");
                case '\t' -> sb.append("\\t");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                default -> {
                    if (c < 0x20 || c == 0x7f || Character.isSurrogate(c) || c == 0x2028 || c == 0x2029 || c == 0x85) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }

    static String desescapar(String texto) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < texto.length(); i++) {
            char c = texto.charAt(i);
            if (c != '\\') {
                sb.append(c);
                continue;
            }
            char siguiente = texto.charAt(++i);
            switch (siguiente) {
                case '\\' -> sb.append('\\');
                case 't' -> sb.append('\t');
                case 'n' -> sb.append('\n');
                case 'r' -> sb.append('\r');
                case 'u' -> {
                    sb.append((char) Integer.parseInt(texto.substring(i + 1, i + 5), 16));
                    i += 4;
                }
                default -> throw new IllegalArgumentException("escape desconocido: \\" + siguiente);
            }
        }
        return sb.toString();
    }

    static String bitsHex(double d) {
        return String.format("%016x", Double.doubleToRawLongBits(d));
    }

    static String excepcion(Throwable t) {
        return "EX\t" + t.getClass().getName() + "\t" + escapar(String.valueOf(t.getMessage()));
    }

    // ---- dobles ----

    static void dobles(List<String> entrada, StringBuilder salida) {
        for (String linea : entrada) {
            if (linea.isEmpty()) continue;
            double d = Double.longBitsToDouble(Long.parseUnsignedLong(linea, 16));
            salida.append(linea).append('\t').append(Double.toString(d)).append('\n');
        }
    }

    // ---- formatos ----

    static Object argumentoTipado(String campo) {
        char tipo = campo.charAt(0);
        String valor = campo.substring(2);
        return switch (tipo) {
            case 'd' -> Integer.valueOf(valor);
            case 'l' -> Long.valueOf(valor);
            case 'D' -> Double.longBitsToDouble(Long.parseUnsignedLong(valor, 16));
            case 's' -> desescapar(valor);
            case 'c' -> Character.valueOf((char) Integer.parseInt(valor));
            case 'b' -> Boolean.valueOf(valor);
            case 'n' -> null;
            default -> throw new IllegalArgumentException("tipo de argumento desconocido: " + tipo);
        };
    }

    static void formatos(List<String> entrada, StringBuilder salida) {
        for (String linea : entrada) {
            // Una línea vacía es el patrón "" sin argumentos: también es un caso.
            String[] campos = linea.split("\t", -1);
            String formato = desescapar(campos[0]);
            Object[] argumentos = new Object[campos.length - 1];
            for (int i = 1; i < campos.length; i++) argumentos[i - 1] = argumentoTipado(campos[i]);
            try {
                String resultado = String.format(formato, argumentos);
                salida.append("OK\t").append(escapar(resultado)).append('\n');
            } catch (Exception e) {
                salida.append(excepcion(e)).append('\n');
            }
        }
    }

    // ---- analisis ----

    static String resultado(Object valor) {
        if (valor instanceof Double d) return bitsHex(d);
        return escapar(String.valueOf(valor));
    }

    static void analisis(List<String> entrada, StringBuilder salida) {
        for (String linea : entrada) {
            if (linea.isEmpty()) continue;
            int tab = linea.indexOf('\t');
            String operacion = linea.substring(0, tab);
            String texto = desescapar(linea.substring(tab + 1));
            try {
                Object valor = switch (operacion) {
                    case "parseInt" -> Integer.parseInt(texto);
                    case "parseDouble" -> Double.parseDouble(texto);
                    case "nextInt" -> new Scanner(texto).nextInt();
                    case "nextDouble" -> new Scanner(texto).nextDouble();
                    case "nextBoolean" -> new Scanner(texto).nextBoolean();
                    case "next" -> new Scanner(texto).next();
                    case "nextLine" -> new Scanner(texto).nextLine();
                    default -> throw new IllegalArgumentException("operacion desconocida: " + operacion);
                };
                salida.append("OK\t").append(resultado(valor)).append('\n');
            } catch (Exception e) {
                salida.append(excepcion(e)).append('\n');
            }
        }
    }

    // ---- scanner ----

    static void scanner(List<String> entrada, StringBuilder salida) {
        for (String linea : entrada) {
            if (linea.isEmpty()) continue;
            int tab = linea.indexOf('\t');
            String texto = desescapar(linea.substring(0, tab));
            String[] operaciones = linea.substring(tab + 1).split(",");
            Scanner sc = new Scanner(texto);
            List<String> resultados = new ArrayList<>();
            for (String operacion : operaciones) {
                try {
                    Object valor = switch (operacion) {
                        case "nextInt" -> sc.nextInt();
                        case "nextDouble" -> sc.nextDouble();
                        case "nextBoolean" -> sc.nextBoolean();
                        case "next" -> sc.next();
                        case "nextLine" -> sc.nextLine();
                        case "hasNext" -> sc.hasNext();
                        case "hasNextInt" -> sc.hasNextInt();
                        case "hasNextDouble" -> sc.hasNextDouble();
                        case "hasNextLine" -> sc.hasNextLine();
                        case "close" -> { sc.close(); yield "cerrado"; }
                        default -> throw new IllegalArgumentException("operacion desconocida: " + operacion);
                    };
                    resultados.add("OK:" + resultado(valor));
                } catch (Exception e) {
                    resultados.add("EX:" + e.getClass().getName() + ":" + escapar(String.valueOf(e.getMessage())));
                }
            }
            salida.append(String.join("\t", resultados)).append('\n');
        }
    }

    // ---- aleatorios ----

    static final int[] COTAS = {1, 2, 3, 5, 6, 7, 10, 16, 100, 1000, 65536, 1000000, 1073741825, 2147483647};
    static final int VALORES = 100;

    static void linea(StringBuilder salida, long semilla, String metodo, String argumento, List<String> valores) {
        salida.append(semilla).append('\t').append(metodo).append('\t').append(argumento).append('\t').append(String.join(",", valores)).append('\n');
    }

    static void aleatorios(List<String> entrada, StringBuilder salida) {
        for (String lineaDeEntrada : entrada) {
            if (lineaDeEntrada.isEmpty()) continue;
            long semilla = Long.parseLong(lineaDeEntrada.trim());
            List<String> valores = new ArrayList<>();
            Random r = new Random(semilla);
            for (int i = 0; i < VALORES; i++) valores.add(Integer.toString(r.nextInt()));
            linea(salida, semilla, "nextInt", "", valores);
            for (int cota : COTAS) {
                valores = new ArrayList<>();
                r = new Random(semilla);
                for (int i = 0; i < VALORES; i++) valores.add(Integer.toString(r.nextInt(cota)));
                linea(salida, semilla, "nextInt", Integer.toString(cota), valores);
            }
            valores = new ArrayList<>();
            r = new Random(semilla);
            for (int i = 0; i < VALORES; i++) valores.add(Long.toString(r.nextLong()));
            linea(salida, semilla, "nextLong", "", valores);
            valores = new ArrayList<>();
            r = new Random(semilla);
            for (int i = 0; i < VALORES; i++) valores.add(bitsHex(r.nextDouble()));
            linea(salida, semilla, "nextDouble", "", valores);
            valores = new ArrayList<>();
            r = new Random(semilla);
            for (int i = 0; i < VALORES; i++) valores.add(Boolean.toString(r.nextBoolean()));
            linea(salida, semilla, "nextBoolean", "", valores);
            // Mezcla: el estado se comparte entre métodos (nextInt(6) lanzando un dado, luego nextDouble, luego nextBoolean…).
            valores = new ArrayList<>();
            r = new Random(semilla);
            for (int i = 0; i < VALORES; i++) {
                switch (i % 4) {
                    case 0 -> valores.add(Integer.toString(r.nextInt(6) + 1));
                    case 1 -> valores.add(bitsHex(r.nextDouble()));
                    case 2 -> valores.add(Boolean.toString(r.nextBoolean()));
                    default -> valores.add(Long.toString(r.nextLong()));
                }
            }
            linea(salida, semilla, "mezcla", "", valores);
        }
    }

    // ---- caracteres ----

    static void caracteres(StringBuilder salida) {
        for (int c = 0; c <= 0xFFFF; c++) {
            char ch = (char) c;
            int banderas = 0;
            if (Character.isDigit(ch)) banderas |= 1;
            if (Character.isLetter(ch)) banderas |= 2;
            if (Character.isLetterOrDigit(ch)) banderas |= 4;
            if (Character.isUpperCase(ch)) banderas |= 8;
            if (Character.isLowerCase(ch)) banderas |= 16;
            if (Character.isWhitespace(ch)) banderas |= 32;
            salida.append(c).append(',').append(banderas).append(',').append((int) Character.toUpperCase(ch)).append(',').append((int) Character.toLowerCase(ch)).append(',').append(Character.digit(ch, 10)).append('\n');
        }
    }

    // ---- matematicas ----

    /** `operacion<TAB>arg1<TAB>arg2`: argumentos tipados (`d:` int, `l:` long, `D:` bits de un double, `c:` char). Los double salen como bits; los demás con `String.valueOf`. */
    static void matematicas(List<String> entrada, StringBuilder salida) {
        for (String linea : entrada) {
            if (linea.isEmpty()) continue;
            String[] campos = linea.split("\t", -1);
            String operacion = campos[0];
            try {
                Object a = campos.length > 1 ? argumentoTipado(campos[1]) : null;
                Object b = campos.length > 2 ? argumentoTipado(campos[2]) : null;
                Object valor = switch (operacion) {
                    case "absInt" -> Math.abs((int) (Integer) a);
                    case "absLong" -> Math.abs((long) (Long) a);
                    case "absDouble" -> Math.abs((double) (Double) a);
                    case "maxInt" -> Math.max((int) (Integer) a, (int) (Integer) b);
                    case "maxLong" -> Math.max((long) (Long) a, (long) (Long) b);
                    case "maxDouble" -> Math.max((double) (Double) a, (double) (Double) b);
                    case "minInt" -> Math.min((int) (Integer) a, (int) (Integer) b);
                    case "minLong" -> Math.min((long) (Long) a, (long) (Long) b);
                    case "minDouble" -> Math.min((double) (Double) a, (double) (Double) b);
                    case "sqrt" -> Math.sqrt((double) (Double) a);
                    case "floor" -> Math.floor((double) (Double) a);
                    case "ceil" -> Math.ceil((double) (Double) a);
                    case "roundDouble" -> Math.round((double) (Double) a);
                    case "roundInt" -> Math.round((int) (Integer) a);
                    case "roundLong" -> Math.round((long) (Long) a);
                    case "roundChar" -> Math.round((char) (Character) a);
                    default -> throw new IllegalArgumentException("operacion desconocida: " + operacion);
                };
                salida.append("OK\t").append(resultado(valor)).append('\n');
            } catch (Exception e) {
                salida.append(excepcion(e)).append('\n');
            }
        }
    }

    // ---- cadenas ----

    static int entero(String texto) {
        return Integer.parseInt(texto);
    }

    static String cadenaDe(String[] campos, int posicion) {
        return desescapar(campos[posicion]);
    }

    /** Cada operación recibe `s` como una instancia NUEVA (`new String`), para que `==` distinga "es el mismo objeto" de "tiene el mismo texto". */
    static void cadenas(List<String> entrada, StringBuilder salida) {
        for (String linea : entrada) {
            if (linea.isEmpty()) continue;
            String[] campos = linea.split("\t", -1);
            String operacion = campos[0];
            String s = new String(cadenaDe(campos, 1));
            try {
                Object valor = switch (operacion) {
                    case "length" -> s.length();
                    case "charAt" -> (int) s.charAt(entero(campos[2]));
                    case "substring1" -> s.substring(entero(campos[2]));
                    case "substring2" -> s.substring(entero(campos[2]), entero(campos[3]));
                    case "substring1Mismo" -> s.substring(entero(campos[2])) == s;
                    case "substring2Mismo" -> s.substring(entero(campos[2]), entero(campos[3])) == s;
                    case "indexOf" -> s.indexOf(cadenaDe(campos, 2));
                    case "indexOfDesde" -> s.indexOf(cadenaDe(campos, 2), entero(campos[3]));
                    case "indexOfChar" -> s.indexOf(entero(campos[2]));
                    case "equals" -> s.equals(cadenaDe(campos, 2));
                    case "equalsIgnoreCase" -> s.equalsIgnoreCase(cadenaDe(campos, 2));
                    case "compareTo" -> s.compareTo(cadenaDe(campos, 2));
                    case "toUpperCase" -> s.toUpperCase();
                    case "toLowerCase" -> s.toLowerCase();
                    case "toUpperCaseMismo" -> s.toUpperCase() == s;
                    case "toLowerCaseMismo" -> s.toLowerCase() == s;
                    case "trim" -> s.trim();
                    case "trimMismo" -> s.trim() == s;
                    case "isEmpty" -> s.isEmpty();
                    case "contains" -> s.contains(cadenaDe(campos, 2));
                    case "startsWith" -> s.startsWith(cadenaDe(campos, 2));
                    case "endsWith" -> s.endsWith(cadenaDe(campos, 2));
                    case "replace" -> s.replace(cadenaDe(campos, 2), cadenaDe(campos, 3));
                    case "replaceMismo" -> s.replace(cadenaDe(campos, 2), cadenaDe(campos, 3)) == s;
                    case "replaceChar" -> s.replace((char) entero(campos[2]), (char) entero(campos[3]));
                    case "replaceCharMismo" -> s.replace((char) entero(campos[2]), (char) entero(campos[3])) == s;
                    case "codePointUpper" -> new String(Character.toChars(entero(campos[1]))).toUpperCase();
                    case "codePointLower" -> new String(Character.toChars(entero(campos[1]))).toLowerCase();
                    default -> throw new IllegalArgumentException("operacion desconocida: " + operacion);
                };
                salida.append("OK\t").append(escapar(String.valueOf(valor))).append('\n');
            } catch (Exception e) {
                salida.append(excepcion(e)).append('\n');
            }
        }
    }
}
