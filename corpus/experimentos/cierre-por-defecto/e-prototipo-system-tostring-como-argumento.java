// javac: cannot find symbol — `toString` no es un campo de `System` (el motor nunca debe lanzar con ese nombre).
import java.util.Scanner;
public class EPrototipoSystemToStringComoArgumento {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.toString);
    }
}
