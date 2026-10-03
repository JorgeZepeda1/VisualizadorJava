// Control (javac compila): un cast a `int` de un literal `int` es una expresion constante.
public class ACaseCastAIntValido {
    public static void main(String[] args) {
        int n = 1;
        switch (n) {
            case (int) 1:
                System.out.println("uno");
                break;
            default:
                System.out.println("otro");
        }
    }
}
