// javac: el operador unario `+` no se aplica a un `InputStream`.
import java.util.Scanner;
public class BSystemInConSignoEnElScanner {
    public static void main(String[] args) {
        Scanner sc = new Scanner(+System.in);
    }
}
