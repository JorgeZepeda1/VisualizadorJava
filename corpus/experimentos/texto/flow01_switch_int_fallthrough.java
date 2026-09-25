public class flow01_switch_int_fallthrough {
    public static void main(String[] args) {
        int dia = 3;
        switch (dia) {
            case 1:
                System.out.println("lunes");
            case 2:
                System.out.println("martes");
            case 3:
                System.out.println("miercoles");
            case 4:
                System.out.println("jueves");
                break;
            case 5:
                System.out.println("viernes");
            default:
                System.out.println("default");
        }
        System.out.println("fin");
    }
}
