// Un println no es una condición.
public class F5VoidEnCondicion {
    public static void main(String[] args) {
        if (System.out.println("hola")) {
            System.out.println("entra");
        }
    }
}
