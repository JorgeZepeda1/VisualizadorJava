import java.util.Arrays;

public class Notas {
    public static void main(String[] args) {
        int[] notas = {8, 9, 7, 10, 6};
        int suma = 0;
        for (int nota : notas) {
            suma += nota;
        }
        double promedio = (double) suma / notas.length;
        System.out.println("Notas: " + Arrays.toString(notas));
        System.out.println("Promedio: " + promedio);

        int mayor = notas[0];
        for (int i = 1; i < notas.length; i++) {
            if (notas[i] > mayor) {
                mayor = notas[i];
            }
        }
        System.out.println("La nota más alta es " + mayor);
    }
}
