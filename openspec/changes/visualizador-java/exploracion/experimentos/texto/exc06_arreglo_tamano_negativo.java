public class exc06_arreglo_tamano_negativo {
    public static void main(String[] args) {
        System.out.println("antes");
        int[] arr = new int[-5];
        System.out.println("no debe llegar: " + arr.length);
    }
}
