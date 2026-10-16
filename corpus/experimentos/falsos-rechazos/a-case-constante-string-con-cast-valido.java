// Control (javac compila): una constante `String` definida con un cast se usa como etiqueta de `case`.
public class ACaseConstanteStringConCastValido {
    public static void main(String[] args) {
        final String S = (String) "a";
        String s = "a";
        switch (s) {
            case S:
                System.out.println("es a");
                break;
            default:
                System.out.println("otra");
        }
    }
}
