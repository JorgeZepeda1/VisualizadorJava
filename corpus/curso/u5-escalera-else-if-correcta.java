public class EscaleraElseIfCorrecta {
    public static void main(String[] args) {
        int calificacion = 85;

        if (calificacion >= 90) {
            System.out.println("A");
        } else if (calificacion >= 80) {
            System.out.println("B");
        } else if (calificacion >= 70) {
            System.out.println("C");
        } else {
            System.out.println("D");
        }
    }
}
