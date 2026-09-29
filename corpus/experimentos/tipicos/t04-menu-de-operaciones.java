import java.util.Scanner;

public class MenuOperaciones {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        int opcion;
        do {
            System.out.println("1) Sumar  2) Restar  3) Multiplicar  4) Dividir  0) Salir");
            System.out.print("Elige una opción: ");
            opcion = teclado.nextInt();
            if (opcion >= 1 && opcion <= 4) {
                System.out.print("Primer número: ");
                int a = teclado.nextInt();
                System.out.print("Segundo número: ");
                int b = teclado.nextInt();
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
                    case 4:
                        if (b == 0) {
                            System.out.println("No se puede dividir entre cero");
                        } else {
                            System.out.println("Resultado: " + (double) a / b);
                        }
                        break;
                }
            } else if (opcion != 0) {
                System.out.println("Opción no válida");
            }
        } while (opcion != 0);
        System.out.println("Hasta luego");
    }
}
