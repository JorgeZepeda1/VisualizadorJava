// Control (V): `yield++;`, `yield += 3;` y compañía son sentencias de expresión (javac decide por el token que sigue a `yield`).
public class VYieldConIncremento {
    public static void main(String[] args) {
        int yield = 0;
        yield++;
        yield--;
        ++yield;
        --yield;
        yield += 3;
        yield -= 1;
        System.out.println(yield);
    }
}
