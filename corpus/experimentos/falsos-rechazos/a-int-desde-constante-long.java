// javac: `incompatible types: possible lossy conversion from long to int` — solo las constantes `byte`, `short`, `char` e `int` se estrechan (JLS 5.2).
public class AIntDesdeConstanteLong {
    public static void main(String[] args) {
        final long B = 5;
        int d = B;
        System.out.println(d);
    }
}
