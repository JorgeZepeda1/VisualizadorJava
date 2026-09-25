import java.math.BigDecimal;
public class Test08bFormatterAlgoritmo {
    public static void main(String[] args) {
        System.out.println("=== correccion caracter y booleano con un solo argumento ===");
        System.out.printf("caracter desde int 66 -> %c%n", 66);
        System.out.printf("booleano con null -> %b%n", (Object)null);
        System.out.printf("booleano con objeto no boolean -> %b%n", "cualquiera");
        System.out.printf("booleano con Boolean.FALSE -> %b%n", Boolean.FALSE);

        System.out.println("=== EXPERIMENTO: %f usa digitos mas cortos (shortest round-trip), NO el valor binario exacto ===");
        double[] vals = {2.675, 1.005, 8.005, 35.855, 0.1, 1.0/3.0, 100.25, 1.615, 5.015, 2.0000000000000004};
        for (double v : vals) {
            String shortest = Double.toString(v);
            String exacto = new BigDecimal(v).toPlainString();
            String printf2 = String.format("%.2f", v);
            System.out.println("v=" + v + " | Double.toString=" + shortest + " | BigDecimal EXACTO=" + exacto + " | %.2f=" + printf2);
        }

        System.out.println("=== EXPERIMENTO: pedir mas decimales que los que tiene la representacion mas corta -> rellena con CEROS, no revela el valor binario exacto ===");
        System.out.println("0.1 con 20 decimales -> " + String.format("%.20f", 0.1));
        System.out.println("BigDecimal exacto de 0.1 -> " + new BigDecimal(0.1).toPlainString());
        System.out.println("1.0 con 25 decimales -> " + String.format("%.25f", 1.0));
        System.out.println("2.675 con 20 decimales -> " + String.format("%.20f", 2.675));
        System.out.println("1.0/3.0 con 30 decimales -> " + String.format("%.30f", 1.0/3.0));

        System.out.println("=== mas casos de redondeo .2f para confirmar HALF_UP sobre digitos cortos ===");
        double[] vals2 = {0.005, 0.015, 0.025, 0.035, 0.045, 0.055, 0.065, 0.075, 0.085, 0.095};
        for (double v : vals2) {
            System.out.println("v=" + v + " shortest=" + Double.toString(v) + " con2decimales=" + String.format("%.2f", v));
        }
    }
}
