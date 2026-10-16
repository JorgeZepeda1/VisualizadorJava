import java.util.Random;

// Scanner sin import también falla como destino de un cast.
public class N5ScannerSinImportEnCast {
    public static void main(String[] args) {
        Random azar = new Random();
        System.out.println((Scanner) azar);
    }
}
