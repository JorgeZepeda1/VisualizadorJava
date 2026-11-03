public class SumaDePares {
    public static void main(String[] args) {
        int suma = 0;
        for (int i = 2; i <= 10; i = i + 2) {
            suma = suma + i;
        }
        System.out.println("Suma: " + suma);
    }
}
