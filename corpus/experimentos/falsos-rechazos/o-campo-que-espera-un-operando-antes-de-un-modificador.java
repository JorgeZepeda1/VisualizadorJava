// javac: `illegal start of expression` en la linea 4 — tras el `=` la expresion todavia espera un valor, asi que `public` no puede ser el siguiente miembro.
public class OCampoQueEsperaUnOperandoAntesDeUnModificador {
    int x =
    public static void main(String[] args) {
        System.out.println("hola");
    }
}
