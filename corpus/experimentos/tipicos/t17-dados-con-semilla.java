import java.util.Random;

public class Dados {
    public static void main(String[] args) {
        Random dado = new Random(2024);
        int suma = 0;
        for (int tirada = 1; tirada <= 5; tirada++) {
            int valor = dado.nextInt(6) + 1;
            suma += valor;
            System.out.println("Tirada " + tirada + ": " + valor);
        }
        System.out.println("Suma de las cinco tiradas: " + suma);
    }
}
