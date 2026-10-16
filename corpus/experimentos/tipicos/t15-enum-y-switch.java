enum Dia {
    LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO
}

public class SemanaLaboral {
    public static void main(String[] args) {
        Dia hoy = Dia.MIERCOLES;
        switch (hoy) {
            case SABADO:
            case DOMINGO:
                System.out.println("Fin de semana");
                break;
            default:
                System.out.println("Día laboral: " + hoy);
        }
        for (Dia dia : Dia.values()) {
            System.out.print(dia.ordinal() + 1 + " ");
        }
        System.out.println();
    }
}
