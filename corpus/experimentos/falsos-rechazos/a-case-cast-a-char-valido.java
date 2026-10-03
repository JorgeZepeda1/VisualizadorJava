// Control (javac compila): un cast a `char` de un literal `int` es una expresion constante y encaja con un selector `char`.
public class ACaseCastACharValido {
    public static void main(String[] args) {
        char c = 'a';
        switch (c) {
            case (char) 97:
                System.out.println("a");
                break;
            default:
                System.out.println("otra");
        }
    }
}
