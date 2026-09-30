// Control: etiquetas que sí encajan con el selector (char en int, constante en char, constante String).
public class F4SwitchEtiquetasValidas {
    public static void main(String[] args) {
        int n = 97;
        switch (n) {
            case 'a':
                System.out.println("a");
                break;
            case 70000:
                break;
            case 1 + 1:
                break;
        }
        char c = 'b';
        switch (c) {
            case 65:
                break;
            case 'b':
                break;
        }
        final String CLAVE = "x";
        String s = "x";
        switch (s) {
            case CLAVE:
                System.out.println(s);
                break;
            case "y":
                break;
        }
    }
}
