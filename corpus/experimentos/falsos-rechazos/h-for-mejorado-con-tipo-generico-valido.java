// Control (javac compila): el tipo del `for` mejorado puede ser calificado y generico.
public class HForMejoradoConTipoGenericoValido {
    public static void main(String[] args) {
        java.util.Map<String, Integer> mapa = new java.util.HashMap<String, Integer>();
        mapa.put("a", 1);
        for (java.util.Map.Entry<String, Integer> e : mapa.entrySet()) {
            System.out.println(e.getKey() + e.getValue());
        }
    }
}
