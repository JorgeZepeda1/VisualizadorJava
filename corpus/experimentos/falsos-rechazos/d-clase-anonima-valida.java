// Control (javac compila): una clase anonima que implementa `Runnable`.
public class DClaseAnonimaValida {
    public static void main(String[] args) {
        Runnable r = new Runnable() {
            public void run() {
                System.out.println("corriendo");
            }
        };
        r.run();
    }
}
