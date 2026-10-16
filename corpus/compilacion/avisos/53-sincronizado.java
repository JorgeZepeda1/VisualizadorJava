public class Aviso {
    public static void main(String[] args) {
        synchronized (Aviso.class) {
            System.out.println("dentro");
        }
    }
}
