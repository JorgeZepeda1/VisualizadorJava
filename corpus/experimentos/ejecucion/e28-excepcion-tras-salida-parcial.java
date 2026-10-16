public class MiPrograma {
    public static void main(String[] args) {
        char letra = 'a';
        int vuelta = 0;
        while (vuelta < 5) {
            vuelta++;
            switch (vuelta) {
                case 1:
                    System.out.println("uno");
                    break;
                case 3:
                    System.out.print("tres ");
                    System.out.println(100 / (letra - 'a'));
                    break;
                default:
                    System.out.println("otro");
            }
        }
        System.out.println("fin");
    }
}
