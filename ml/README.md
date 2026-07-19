# ML

> Ноутбуки и датасет хранятся локально и не публикуются в открытом GitHub-репозитории.

В папке находятся:

- `xiangqi_next_move.ipynb` — модель следующего хода;
- `xiangqi_vision_two_stage.ipynb` — двухэтапная vision-модель;
- `data/onlinexiangqi/` — распакованные `gameinfo.csv` и `moves.csv`;
- `onlinexiangqi.zip` — исходный архив датасета.

Ноутбук `xiangqi_next_move.ipynb` использует относительный путь `data/onlinexiangqi`, поэтому Jupyter следует запускать из этой папки:

```powershell
cd ml
jupyter lab
```
