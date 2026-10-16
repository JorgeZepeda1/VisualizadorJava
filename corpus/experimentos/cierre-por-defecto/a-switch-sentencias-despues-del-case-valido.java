// Control (javac compila): después de un `case` o de `default` sí van sentencias y declaraciones; un `switch` vacío también es válido.
public class ASwitchSentenciasDespuesDelCaseValido {
    public static void main(String[] args) {
        int x = 1;
        switch (x) {
            case 1:
            case 2:
                int y = x + 1;
                System.out.println(y);
                break;
            default:
                ;
        }
        switch (x) {
        }
        switch (x) {
            default:
        }
    }
}
