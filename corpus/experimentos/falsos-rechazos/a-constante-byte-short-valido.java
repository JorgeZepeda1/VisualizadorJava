// Control (javac compila): lo mismo para `byte` y `short` mientras el valor constante quepa.
public class AConstanteByteShortValido {
    public static void main(String[] args) {
        final int A = 10;
        byte b = A;
        short s = A;
        System.out.println(b + s);
    }
}
