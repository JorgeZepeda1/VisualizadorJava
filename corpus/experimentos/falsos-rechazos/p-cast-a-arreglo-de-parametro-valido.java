// Control (javac compila): `(String[]) args` convierte un arreglo de cadenas a si mismo.
public class PCastAArregloDeParametroValido {
    public static void main(String[] args) {
        Object o = (String[]) args;
        System.out.println(((String[]) o).length);
    }
}
