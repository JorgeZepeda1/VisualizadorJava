import java.util.ArrayList;

public class ListaDeNumeros {
    public static void main(String[] args) {
        ArrayList<Integer> numeros = new ArrayList<>();
        numeros.add(4);
        numeros.add(8);
        numeros.add(15);
        int suma = 0;
        for (int numero : numeros) {
            suma += numero;
        }
        System.out.println("Elementos: " + numeros.size());
        System.out.println("Suma: " + suma);
    }
}
