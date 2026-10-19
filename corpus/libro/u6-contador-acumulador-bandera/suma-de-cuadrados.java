public class SumaDeCuadrados {
    public static void main(String[] args) {
        int numero = 1;
        int suma = 0;
        while (numero <= 4) {
            suma = suma + numero * numero;
            numero = numero + 1;
        }
        System.out.println("Suma de cuadrados: " + suma);
    }
}
