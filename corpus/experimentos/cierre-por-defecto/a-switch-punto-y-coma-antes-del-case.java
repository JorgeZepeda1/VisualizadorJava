// Ni siquiera la sentencia vacía `;` puede ir antes del primer `case`.
public class ASwitchPuntoYComaAntesDelCase {
    public static void main(String[] args) {
        int x = 1;
        switch (x) {
            ;
            case 1:
                break;
        }
    }
}
