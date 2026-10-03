// Control (javac compila): `String[]::new` es una referencia a un constructor de arreglo.
public class PReferenciaAMetodoDeArregloValida {
    public static void main(String[] args) {
        java.util.Arrays.stream(args).toArray(String[]::new);
    }
}
