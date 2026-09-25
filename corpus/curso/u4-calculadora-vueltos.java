import java.util.Scanner;

public class CalculadoraVueltos {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);

        System.out.print("¿Cuántos pesos hay que dar de cambio? ");
        int cambio = teclado.nextInt();

        int billetesDe100 = cambio / 100;
        int resto = cambio % 100;

        System.out.println("Billetes de $100: " + billetesDe100);
        System.out.println("Resto: $" + resto);
    }
}
