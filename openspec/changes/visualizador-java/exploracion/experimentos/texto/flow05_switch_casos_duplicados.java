public class flow05_switch_casos_duplicados {
    public static void main(String[] args) {
        int x = 1;
        switch (x) {
            case 1:
                System.out.println("uno");
                break;
            case 1:
                System.out.println("uno otra vez");
                break;
        }
    }
}
