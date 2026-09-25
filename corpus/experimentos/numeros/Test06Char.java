public class Test06Char {
    public static void main(String[] args) {
        System.out.println("'A'+1 -> " + ('A'+1));
        System.out.println("(char)('A'+1) -> " + (char)('A'+1));
        char c = 'A'; c++;
        System.out.println("char c='A'; c++ -> " + c);
        char c2 = 65;
        System.out.println("char c2=65; -> " + c2);
        char c3 = 'z'; c3--;
        System.out.println("char c3='z'; c3-- -> " + c3);
        System.out.println("'a'+'b'+\"\" -> " + ('a'+'b'+""));
        System.out.println("\"\"+'a'+'b' -> " + (""+'a'+'b'));
        System.out.println("Character.isDigit('5') -> " + Character.isDigit('5'));
        System.out.println("Character.isDigit('a') -> " + Character.isDigit('a'));
        System.out.println("Character.isLetter('a') -> " + Character.isLetter('a'));
        System.out.println("Character.isLetter('5') -> " + Character.isLetter('5'));
        System.out.println("Character.isLetterOrDigit('_') -> " + Character.isLetterOrDigit('_'));
        System.out.println("Character.isWhitespace(' ') -> " + Character.isWhitespace(' '));
        System.out.println("Character.isUpperCase('A') -> " + Character.isUpperCase('A'));
        System.out.println("Character.toUpperCase('a') -> " + Character.toUpperCase('a'));
        System.out.println("Character.toLowerCase('A') -> " + Character.toLowerCase('A'));
        char cneg = (char)-1;
        System.out.println("(char)-1 como entero -> " + (int)cneg);
        char cmax = (char)65536;
        System.out.println("(char)65536 (=(char)0) como entero -> " + (int)cmax);
        char cw = (char)0; cw--;
        System.out.println("char 0; cw-- -> (int) " + (int)cw);
        System.out.println("Character.MAX_VALUE como int -> " + (int)Character.MAX_VALUE);
        System.out.println("'0'+5 (trampa comun) -> " + ('0'+5));
        System.out.println("(char)('0'+5) -> " + (char)('0'+5));
        System.out.println("Character.getNumericValue('7') -> " + Character.getNumericValue('7'));
        char ch = 'A';
        int chAsInt = ch;
        System.out.println("int chAsInt = ch (sin cast, char->int es ensanchamiento) -> " + chAsInt);
    }
}
