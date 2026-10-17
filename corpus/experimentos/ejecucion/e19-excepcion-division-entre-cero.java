public class MiPrograma {
    public static void main(String[] args) {
        int total = 100;
        int partes = 4;
        System.out.println("cada parte: " + total / partes);
        partes = partes - 4;
        System.out.println("antes de dividir");
        int resultado = total / partes;
        System.out.println("nunca se imprime " + resultado);
    }
}
