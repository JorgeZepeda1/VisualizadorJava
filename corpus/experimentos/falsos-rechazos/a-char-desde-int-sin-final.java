// javac: `incompatible types: possible lossy conversion from int to char` — sin `final` la variable no es una constante.
public class ACharDesdeIntSinFinal {
    public static void main(String[] args) {
        int a = 'a';
        char c = a;
        System.out.println(c);
    }
}
