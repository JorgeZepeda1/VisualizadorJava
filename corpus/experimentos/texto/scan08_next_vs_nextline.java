import java.util.Scanner;
public class scan08_next_vs_nextline {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String palabra = sc.next();
        String resto = sc.nextLine();
        System.out.println("palabra=[" + palabra + "]");
        System.out.println("resto de la linea=[" + resto + "]");
    }
}
