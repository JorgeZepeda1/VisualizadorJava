public class Aviso {
    public static void main(String[] args) {
        Runnable tarea = new Runnable() {
            public void run() {
                System.out.println("hola");
            }
        };
        tarea.run();
    }
}
