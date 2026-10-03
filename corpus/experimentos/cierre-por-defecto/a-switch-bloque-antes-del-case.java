// Un bloque `{ }` antes del primer `case`.
public class ASwitchBloqueAntesDelCase {
    public static void main(String[] args) {
        int x = 1;
        switch (x) {
            { x = 2; }
            case 1:
                break;
        }
    }
}
