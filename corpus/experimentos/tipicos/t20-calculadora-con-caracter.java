import java.util.Scanner;

public class CalculadoraSimple {
    public static void main(String[] args) {
        Scanner teclado = new Scanner(System.in);
        System.out.print("Primer número: ");
        double a = teclado.nextDouble();
        System.out.print("Operador (+, -, *, /): ");
        String operador = teclado.next();
        System.out.print("Segundo número: ");
        double b = teclado.nextDouble();

        char simbolo = operador.charAt(0);
        double resultado = 0;
        boolean valido = true;
        switch (simbolo) {
            case '+':
                resultado = a + b;
                break;
            case '-':
                resultado = a - b;
                break;
            case '*':
                resultado = a * b;
                break;
            case '/':
                if (b != 0) {
                    resultado = a / b;
                } else {
                    valido = false;
                    System.out.println("No se puede dividir entre cero");
                }
                break;
            default:
                valido = false;
                System.out.println("Operador desconocido");
        }
        if (valido) {
            System.out.println(a + " " + simbolo + " " + b + " = " + resultado);
        }
    }
}
