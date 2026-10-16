// javac: `';' expected` en el fin del campo.
public class OCampoSinPuntoYComaAntesDeUnaClaseAnidada {
    int x = 5
    class Interna { }
    public static void main(String[] args) {
        System.out.println("hola");
    }
}
