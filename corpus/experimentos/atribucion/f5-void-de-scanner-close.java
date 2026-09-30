import java.util.Scanner;

// close() no devuelve ningún valor.
public class F5VoidDeScannerClose {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int r = teclado.close();
    }
}
