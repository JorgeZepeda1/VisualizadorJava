// Control (javac compila): una llamada con los argumentos de tipo escritos (`Clase.<String>metodo(...)`).
public class ILlamadaGenericaExplicitaValida {
    static <T> T id(T t) {
        return t;
    }
    public static void main(String[] args) {
        String s = ILlamadaGenericaExplicitaValida.<String>id("a");
        System.out.println(s);
    }
}
