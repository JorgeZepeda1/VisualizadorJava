// El caso típico de un alumno: un título del menú escrito justo después de la llave del `switch`.
public class ASwitchPrintlnAntesDelCase {
    public static void main(String[] args) {
        int opcion = 2;
        switch (opcion) {
            System.out.println("Elige una opcion:");
            case 1:
                System.out.println("uno");
                break;
            default:
                System.out.println("otra");
        }
    }
}
