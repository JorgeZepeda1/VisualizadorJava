import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Mide si Math.pow difiere de StrictMath.pow (fdlibm) para cada par (base, exponente) de un CSV
 * de entrada — ADR 009, design.md §8. HotSpot podría escoger una implementación intrínseca
 * distinta de pow() en x86_64 frente a la máquina de referencia (arm64); este programa no decide
 * nada, solo mide y reporta.
 *
 * Uso: java MedirPow.java <ruta-csv-de-pares>
 *   Entrada:  "base,exponente" por línea (con o sin cabecera "base,exponente").
 *   Salida (stdout): "base,exponente,mathPow,strictMathPow,coinciden" — una fila por par,
 *   "coinciden" compara los 64 bits IEEE-754 completos (Double.doubleToLongBits), no solo si
 *   "se ven iguales" al imprimirse.
 *
 * Archivo de una sola clase, sin dependencias fuera de java.base — se lanza directo con
 * `java MedirPow.java <csv>` (JEP 330, disponible desde JDK 11) tanto localmente como dentro de
 * `eclipse-temurin:17` (Docker) y en la matriz de `.github/workflows/plataforma.yml`.
 */
public class MedirPow {
    public static void main(String[] args) throws IOException {
        if (args.length < 1) {
            System.err.println("Uso: java MedirPow.java <ruta-csv-de-pares>");
            System.exit(2);
            return;
        }

        List<String> lineas = Files.readAllLines(Path.of(args[0]));
        StringBuilder salida = new StringBuilder();
        salida.append("base,exponente,mathPow,strictMathPow,coinciden\n");

        for (String lineaCruda : lineas) {
            String linea = lineaCruda.trim();
            if (linea.isEmpty()) continue;
            if (linea.toLowerCase().startsWith("base")) continue; // cabecera opcional

            String[] partes = linea.split(",");
            double base = Double.parseDouble(partes[0].trim());
            double exponente = Double.parseDouble(partes[1].trim());

            double mathPow = Math.pow(base, exponente);
            double strictMathPow = StrictMath.pow(base, exponente);
            boolean coinciden = Double.doubleToLongBits(mathPow) == Double.doubleToLongBits(strictMathPow);

            salida.append(Double.toString(base)).append(',')
                  .append(Double.toString(exponente)).append(',')
                  .append(Double.toString(mathPow)).append(',')
                  .append(Double.toString(strictMathPow)).append(',')
                  .append(coinciden)
                  .append('\n');
        }

        System.out.print(salida);
    }
}
