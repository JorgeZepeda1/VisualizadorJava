import java.util.*;

// Control: con el comodín de java.util, Scanner y Random se ven.
public class N5ImportsConComodinValidos {
    public static void main(String[] args) {
        Scanner teclado = (Scanner) new Scanner(System.in);
        Random azar = new Random(7);
        System.out.println(azar.nextInt(6));
        teclado.close();
    }
}
