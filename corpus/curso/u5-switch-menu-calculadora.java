import java.util.Scanner;

public class MenuCalculadora {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);

        System.out.print("Elige una operación (1=suma, 2=resta, 3=multiplicación): ");
        int opcion = teclado.nextInt();

        System.out.print("Primer número: ");
        double a = teclado.nextDouble();
        System.out.print("Segundo número: ");
        double b = teclado.nextDouble();

        switch (opcion) {
            case 1:
                System.out.println("Resultado: " + (a + b));
                break;
            case 2:
                System.out.println("Resultado: " + (a - b));
                break;
            case 3:
                System.out.println("Resultado: " + (a * b));
                break;
            default:
                System.out.println("Opción no válida.");
        }
    }
}
