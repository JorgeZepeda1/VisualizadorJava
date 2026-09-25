public class SwitchSinBreakFallthrough {
    public static void main(String[] args) {
        int diaSemana = 2;

        switch (diaSemana) {
            case 1:
                System.out.println("Lunes");
            case 2:
                System.out.println("Martes");   // se ejecuta (coincide)
            case 3:
                System.out.println("Miércoles"); // ¡también se ejecuta! (fall-through, sin break)
            default:
                System.out.println("Día fuera de rango"); // ¡y esto también!
        }
    }
}
