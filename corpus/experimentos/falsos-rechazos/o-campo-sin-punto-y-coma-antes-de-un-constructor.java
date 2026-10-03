// javac: `';' expected` en el fin del campo, no en el constructor.
public class OCampoSinPuntoYComaAntesDeUnConstructor {
    private String nombre
    OCampoSinPuntoYComaAntesDeUnConstructor(String n) {
        nombre = n;
    }
    public static void main(String[] args) {
        System.out.println("hola");
    }
}
