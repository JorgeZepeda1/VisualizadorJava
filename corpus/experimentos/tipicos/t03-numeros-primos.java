public class Primos {
    public static void main(String[] args) {
        System.out.println("Números primos del 2 al 50:");
        for (int candidato = 2; candidato <= 50; candidato++) {
            boolean esPrimo = true;
            for (int divisor = 2; divisor < candidato; divisor++) {
                if (candidato % divisor == 0) {
                    esPrimo = false;
                    break;
                }
            }
            if (esPrimo) {
                System.out.print(candidato + " ");
            }
        }
        System.out.println();
    }
}
