// javac: `case, default, or '}' expected` — antes del primer `case` no puede ir una sentencia.
public class ASwitchBreakAntesDelCase {
    public static void main(String[] args) {
        int x = 1;
        switch (x) {
            break;
            case 1:
                break;
        }
    }
}
