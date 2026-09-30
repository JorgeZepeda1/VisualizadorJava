import java.util.Scanner;

// La variable System existe desde su propio inicializador (JLS 6.3): System.in ya es un miembro de Scanner.
public class N6ScannerLlamadoSystem {
    public static void main(String[] args) {
        Scanner System = new Scanner(System.in);
    }
}
