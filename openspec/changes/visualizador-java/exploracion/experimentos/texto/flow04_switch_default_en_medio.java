public class flow04_switch_default_en_medio {
    public static void main(String[] args) {
        int x = 9;
        switch (x) {
            case 1:
                System.out.println("uno");
                break;
            default:
                System.out.println("default (en medio)");
            case 2:
                System.out.println("dos (cae desde default)");
                break;
            case 3:
                System.out.println("tres");
        }
    }
}
