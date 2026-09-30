// javac reporta en orden de aparición: primero la línea del final (atribución), no la del tipo.
public class F3FinalReasignadaAntesDeOtroError {
    public static void main(String[] args) {
        final int maximo = 10;
        maximo = 20;
        int total = "diez";
        System.out.println(total + maximo);
    }
}
