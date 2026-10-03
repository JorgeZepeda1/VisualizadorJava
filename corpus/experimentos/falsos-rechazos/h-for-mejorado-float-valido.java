// Control (javac compila): `for` mejorado con un tipo primitivo fuera del subconjunto.
public class HForMejoradoFloatValido {
    public static void main(String[] args) {
        float[] datos = { 1.5f, 2.5f };
        for (float x : datos) {
            System.out.println(x);
        }
    }
}
