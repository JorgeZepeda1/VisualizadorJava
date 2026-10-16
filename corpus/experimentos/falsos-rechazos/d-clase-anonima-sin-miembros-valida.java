// Control (javac compila): una clase anonima con el cuerpo vacio.
public class DClaseAnonimaSinMiembrosValida {
    public static void main(String[] args) {
        Object o = new Object() { };
        System.out.println(o != null);
    }
}
