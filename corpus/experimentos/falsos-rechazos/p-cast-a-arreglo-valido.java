// Control (javac compila): un cast a un tipo de arreglo; el visualizador no maneja arreglos todavia: aviso honesto.
public class PCastAArregloValido {
    public static void main(String[] args) {
        Object o = new int[2];
        int[] a = (int[]) o;
        System.out.println(a.length);
    }
}
