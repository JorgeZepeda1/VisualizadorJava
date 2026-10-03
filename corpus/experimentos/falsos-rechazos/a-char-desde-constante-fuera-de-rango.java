// javac: `incompatible types: possible lossy conversion from int to char` — la constante 70000 no cabe en `char`.
public class ACharDesdeConstanteFueraDeRango {
    public static void main(String[] args) {
        final int A = 70000;
        char c = A;
        System.out.println(c);
    }
}
