public class Test08Printf {
    static void safe(String fmt, Object... args) {
        try {
            System.out.printf(fmt + "%n", args);
        } catch (Exception e) {
            System.out.println("fmt=[" + fmt + "] EXCEPCION " + e.getClass().getName() + ": " + e.getMessage());
        }
    }
    public static void main(String[] args) {
        safe("%d", 42);
        safe("%d", 42L);
        safe("%f", 3.14);
        safe("%f", 1.0);
        safe(".2f de 0.125 -> %.2f", 0.125);
        safe(".2f de 0.135 -> %.2f", 0.135);
        safe(".2f de 1.005 -> %.2f", 1.005);
        safe(".2f de 2.675 -> %.2f", 2.675);
        safe(".2f de 1.115 -> %.2f", 1.115);
        safe(".2f de 10.555 -> %.2f", 10.555);
        safe(".2f de 0.045 -> %.2f", 0.045);
        safe(".0f de 0.5 -> %.0f", 0.5);
        safe(".0f de 1.5 -> %.0f", 1.5);
        safe(".0f de 2.5 -> %.0f", 2.5);
        safe(".0f de -0.5 -> %.0f", -0.5);
        safe(".0f de -1.5 -> %.0f", -1.5);
        safe("%s", "hola");
        safe("%c", 'A');
        safe("%c con int -> %c", 66);
        safe("%b", true);
        safe("%b con null -> %b", (Object)null);
        safe("%b con objeto -> %b", "cualquiera");
        safe("ancho [%5d]", 42);
        safe("ancho neg [%-10s]|", "hi");
        safe("ceros [%05d]", 42);
        safe("ceros neg [%05d]", -42);
        safe("float ancho [%8.2f]", 3.14159);
        safe("%,d", 1234567);
        safe("%,.2f", 1234567.891);
        safe("%e", 12345.6789);
        safe("%.3e", 0.0001234);
        safe("%x", 255);
        safe("%X", 255);
        safe("%#x", 255);
        safe("%%%d", 50);
        safe("%+d", 42);
        safe("%+d", -42);
        // errores
        safe("%d", 3.14); // IllegalFormatConversionException
        safe("%y", 5); // UnknownFormatConversionException
        safe("%d %d", 5); // MissingFormatArgumentException
        safe("%d", "texto"); // IllegalFormatConversionException
        System.out.println("--- locale explicito en el formato ---");
        System.out.println(String.format(java.util.Locale.forLanguageTag("es-MX"), "%,.2f", 1234567.891));
        System.out.println(String.format(java.util.Locale.forLanguageTag("es-ES"), "%,.2f", 1234567.891));
        System.out.println(String.format(java.util.Locale.US, "%,.2f", 1234567.891));
        System.out.println(String.format(java.util.Locale.forLanguageTag("es-MX"), "%,d", 1234567));
        System.out.println(String.format(java.util.Locale.forLanguageTag("es-ES"), "%,d", 1234567));
    }
}
