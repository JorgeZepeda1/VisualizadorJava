public class flow07_switch_expresion_yield {
    public static void main(String[] args) {
        int dia = 3;
        String nombre = switch (dia) {
            case 1 -> "lunes";
            case 2 -> "martes";
            case 3 -> {
                String s = "miercoles";
                yield s;
            }
            default -> "desconocido";
        };
        System.out.println("nombre=" + nombre);
    }
}
