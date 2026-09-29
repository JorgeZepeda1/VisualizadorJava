public class Aviso {
    public static void main(String[] args) {
        int dia = 2;
        switch (dia) {
            case 1, 2:
                System.out.println("inicio de semana");
                break;
            default:
                System.out.println("otro dia");
        }
    }
}
