// Control (javac compila): el tipo del `for` mejorado puede ser un arreglo.
public class HForMejoradoArregloDeArreglosValido {
    public static void main(String[] args) {
        int[][] m = { { 1 }, { 2 } };
        for (int[] fila : m) {
            System.out.println(fila[0]);
        }
    }
}
