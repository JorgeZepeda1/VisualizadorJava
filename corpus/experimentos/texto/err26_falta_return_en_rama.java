public class err26_falta_return_en_rama {
    static int signo(int n) {
        if (n > 0) {
            return 1;
        } else if (n < 0) {
            return -1;
        }
    }
    public static void main(String[] args) {
        System.out.println(signo(5));
    }
}
