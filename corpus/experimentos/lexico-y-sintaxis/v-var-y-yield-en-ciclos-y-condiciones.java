// Control (V): `var` como contador de un `for` y `yield` como condición de un `while` y de un `if`.
public class VVarYYieldEnCiclos {
    public static void main(String[] args) {
        for (int var = 0; var < 3; var++) {
            System.out.println(var);
        }
        boolean yield = true;
        while (yield) {
            yield = false;
        }
        if (yield) {
            System.out.println("nunca");
        }
    }
}
