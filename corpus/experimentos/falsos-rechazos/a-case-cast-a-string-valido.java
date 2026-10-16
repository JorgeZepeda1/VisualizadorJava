// Control (javac compila): un cast a `String` de un literal es una expresion constante y vale como etiqueta de `case` (JLS 15.29).
public class ACaseCastAStringValido {
    public static void main(String[] args) {
        String s = "a";
        switch (s) {
            case (String) "a":
                System.out.println("es a");
                break;
            default:
                System.out.println("otra");
        }
    }
}
