public class MiPrograma {
    public static void main(String[] args) {
        int i = 0;
        boolean r1 = i++ > 0 && i++ > 0;
        System.out.println("&& falsa: i = " + i + " r1 = " + r1);
        int j = 0;
        boolean r2 = j++ >= 0 && j++ >= 0;
        System.out.println("&& verdadera: j = " + j + " r2 = " + r2);
        int k = 0;
        boolean r3 = k++ >= 0 || k++ >= 0;
        System.out.println("|| verdadera: k = " + k + " r3 = " + r3);
        int m = 0;
        boolean r4 = m++ > 0 || m++ > 0;
        System.out.println("|| falsa: m = " + m + " r4 = " + r4);
        int cero = 0;
        boolean seguro = cero != 0 && 10 / cero > 1;
        System.out.println("division evitada: " + seguro);
        boolean seguro2 = cero == 0 || 10 / cero > 1;
        System.out.println("division evitada 2: " + seguro2);
        int n = 5;
        boolean cadena = n > 1 && n < 10 && n % 2 == 1 && n != 7;
        System.out.println(cadena);
        boolean cadena2 = n < 1 || n > 10 || n % 2 == 0 || n == 5;
        System.out.println(cadena2);
        int visitas = 0;
        boolean mezcla = (visitas++ == 0 || visitas++ == 0) && (visitas++ == 1 || visitas++ == 1);
        System.out.println("visitas = " + visitas + " mezcla = " + mezcla);
        boolean p = true;
        boolean q = false;
        System.out.println(p && q);
        System.out.println(p || q);
        System.out.println(!p || !q);
        System.out.println(!(p && q));
        System.out.println(p == q);
        System.out.println(p != q);
        System.out.println(!p == q);
        boolean r = p && !q || q && !p;
        System.out.println(r);
        System.out.println(true && false || true);
        System.out.println(true || false && false);
    }
}
