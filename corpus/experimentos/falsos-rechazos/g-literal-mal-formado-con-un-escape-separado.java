// javac: `malformed floating-point literal` — el escape va despues de un espacio, no es parte del literal, que sigue mal escrito.
public class GLiteralMalFormadoConUnEscapeSeparado {
    public static void main(String[] args) {
        double d = 0x1.8 \u0041;
    }
}
