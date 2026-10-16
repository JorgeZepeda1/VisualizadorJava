// Una declaración tampoco puede ir antes del primer `case`.
public class ASwitchDeclaracionAntesDelCase {
    public static void main(String[] args) {
        int x = 1;
        switch (x) {
            int y = 2;
            case 1:
                break;
        }
    }
}
