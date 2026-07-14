# 🎮 Algorytm Matchmakingu - Konfiguracja

Algorytm opiera się na **systemie punktów karnych**. Kiedy szuka optymalnego składu (4 graczy z listy obecności), generuje wszystkie możliwe warianty, a następnie ocenia je na podstawie poniższych parametrów. **Wygrywa wariant z najniższym (lub najbardziej ujemnym) wynikiem punktowym.**

## 1. Wagi główne (`matchmaking.weights`)

| Zmienna | Cel i Działanie |
| :--- | :--- |
| `global-match-difference-penalty` | Pilnuje sprawiedliwości rozegranych meczów na przestrzeni całego turnieju. Kara jest mnożona przez różnicę meczów między graczami. |
| `same-team-penalty` | Wymusza rotację *wewnątrz* drużyny. Kara dodawana, jeśli proponowana dwójka zagrała już dzisiaj ramię w ramię. |
| `same-opponent-penalty` | Wymusza rotację *przeciwników*. Kara za każdą osobę z drużyny przeciwnej, z którą dany gracz już dziś rywalizował. |
| `elo.difference-weight` | Balansuje siły. Kara to: `(Średnie ELO Drużyny A - Średnie ELO Drużyny B) * difference-weight`. Zapobiega meczom typu "Prosi vs Amatorzy". |

## 2. Zmęczenie i Głód gry (`matchmaking.streaks`)

System "poziomów" (levels) kontrolujący płynność zmian na kanapie. Działa bezpośrednio na konkretnego gracza.

* **Zmęczenie (`played-consecutive`) - Punkty Dodatnie (Kary)**
    * `level-1`: Pierwszy mecz. Zazwyczaj `0` (brak kar).
    * `level-2`: Drugi mecz z rzędu. System próbuje posadzić gracza na ławce.
    * `level-3`: Trzeci mecz z rzędu. Ostre ostrzeżenie, wymaga odpoczynku.
    * `level-4`: Czwarty mecz z rzędu. Ekstremalna wartość działająca jak blokada wejścia na boisko.
* **Głód gry (`benched-consecutive`) - Punkty Ujemne (Bonusy)**
    * `level-1`: Pierwszy mecz pauzy. Odejmuje punkty, premiując warianty, w których ten gracz wraca na boisko.
    * `level-2`: Drugi mecz pauzy. Ekstremalny minus (np. `-1000`), wymuszający natychmiastowe wejście do gry.