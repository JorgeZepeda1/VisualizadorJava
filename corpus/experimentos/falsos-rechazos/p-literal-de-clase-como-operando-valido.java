// Control (javac compila): un literal de clase se compara y se convierte como cualquier valor.
public class PLiteralDeClaseComoOperandoValido {
    public static void main(String[] args) {
        Object o = (Object) String.class;
        boolean b = o == String.class;
        System.out.println(b);
    }
}
