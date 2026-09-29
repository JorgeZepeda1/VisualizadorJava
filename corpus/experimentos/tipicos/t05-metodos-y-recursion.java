public class Metodos {
    static int factorial(int n) {
        if (n <= 1) {
            return 1;
        }
        return n * factorial(n - 1);
    }

    static int fibonacci(int n) {
        if (n < 2) {
            return n;
        }
        return fibonacci(n - 1) + fibonacci(n - 2);
    }

    static boolean esPar(int n) {
        return n % 2 == 0;
    }

    static int maximo(int a, int b) {
        return a > b ? a : b;
    }

    public static void main(String[] args) {
        System.out.println("5! = " + factorial(5));
        System.out.println("fibonacci(10) = " + fibonacci(10));
        System.out.println("¿8 es par? " + esPar(8));
        System.out.println("máximo de 3 y 9: " + maximo(3, 9));
    }
}
