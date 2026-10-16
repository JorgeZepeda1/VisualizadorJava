// Control (N4): `case s ->` con una variable constante es válido; el `switch` con flecha queda fuera del subconjunto: aviso.
public class N4SwitchFlechaConConstante {
    public static void main(String[] args) {
        final int s = 3;
        switch (s) {
            case s -> { }
        }
    }
}
