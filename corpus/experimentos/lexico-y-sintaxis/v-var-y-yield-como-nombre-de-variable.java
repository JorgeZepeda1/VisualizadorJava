// Control (V): `var` y `yield` valen como NOMBRE de variable (JLS 3.9: son palabras contextuales, no reservadas).
public class VVarYYieldComoNombre {
    public static void main(String[] args) {
        int var = 5;
        double yield = 2.5;
        var = var + 1;
        yield = yield * 2;
        System.out.println(var);
        System.out.println(yield);
    }
}
