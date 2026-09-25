public class flow06_switch_flecha {
    public static void main(String[] args) {
        int dia = 6;
        switch (dia) {
            case 1, 2, 3, 4, 5 -> System.out.println("entre semana");
            case 6, 7 -> System.out.println("fin de semana");
            default -> System.out.println("invalido");
        }
    }
}
