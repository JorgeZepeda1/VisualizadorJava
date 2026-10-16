public class MiPrograma {
    public static void main(String[] args) {
        for (int i = 0; i < 6; i++) {
            switch (i) {
                case 0:
                    System.out.println("cero");
                    break;
                case 1:
                    continue;
                case 2:
                    System.out.println("dos");
                case 3:
                    System.out.println("tres");
                    break;
                case 4:
                    if (i == 4) {
                        break;
                    }
                    System.out.println("no llega");
                default:
                    System.out.println("otro " + i);
            }
            System.out.println("fin vuelta " + i);
        }
        int n = 0;
        while (true) {
            n++;
            switch (n) {
                case 3:
                    System.out.println("salgo");
                    break;
                default:
                    continue;
            }
            if (n >= 3) {
                break;
            }
        }
        System.out.println("n = " + n);
        int total = 0;
        int k = 0;
        do {
            k++;
            switch (k % 3) {
                case 0:
                    total += 100;
                    break;
                case 1:
                    total += 10;
                    break;
                case 2:
                    total += 1;
                    continue;
            }
            total += 1000;
        } while (k < 7);
        System.out.println("total = " + total);
        for (int a = 0; a < 3; a++) {
            for (int b = 0; b < 3; b++) {
                switch (a * 3 + b) {
                    case 4:
                        break;
                    case 5:
                        continue;
                    default:
                        System.out.print(a * 3 + b + " ");
                }
            }
        }
        System.out.println();
    }
}
