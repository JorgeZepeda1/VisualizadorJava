import java.util.Scanner;
public class scan07_hasnextint {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        while (sc.hasNextInt()) {
            System.out.println("numero: " + sc.nextInt());
        }
        if (sc.hasNext()) {
            System.out.println("no numerico, sobra: " + sc.next());
        } else {
            System.out.println("no hay mas datos");
        }
    }
}
