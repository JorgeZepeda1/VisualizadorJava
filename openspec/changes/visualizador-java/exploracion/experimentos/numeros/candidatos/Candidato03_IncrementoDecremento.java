public class Candidato03_IncrementoDecremento {
    public static void main(String[] args) {
        int x = 5;
        x = x++;
        System.out.println(x);
        int y = 5;
        y = y++ + ++y;
        System.out.println(y);
        int cx = 5;
        cx += 1.7;
        System.out.println(cx);
    }
}
