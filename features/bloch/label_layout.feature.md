# Feature: qni bloch label layout

qni-cli のユーザとして
ブロッホ球の軸ラベルと状態ラベルを読み分けられるように
qni bloch のラベルを重ならない位置に配置してほしい。

## Scenario: qni bloch は z 軸ラベルを z 軸の先端より上に表示する

- Then ブロッホ球のラベル "z" の表示は z 軸の先端より上にある

## Scenario: qni bloch は |0> ラベルを z 軸の先端より上に表示する

- Then ブロッホ球のラベル "|0>" の表示は z 軸の先端より上にある

## Scenario: qni bloch は z 軸ラベルと |0> ラベルを重ならない位置に配置する

- Then ブロッホ球のラベル "z" と "|0>" の表示領域は重ならない

## Scenario: qni bloch は x 軸ラベルを x 軸の先端より右に表示する

- Then ブロッホ球のラベル "x" の表示は x 軸の先端より右にある

## Scenario: qni bloch は |+> ラベルを x 軸の先端より右に表示する

- Then ブロッホ球のラベル "|+>" の表示は x 軸の先端より右にある

## Scenario: qni bloch は x 軸ラベルと |+> ラベルを重ならない位置に配置する

- Then ブロッホ球のラベル "x" と "|+>" の表示領域は重ならない

## Scenario: qni bloch は |+i> ラベルを表示する

- Then ブロッホ球のラベル "|+i>" が表示される

## Scenario: qni bloch は |-i> ラベルを表示する

- Then ブロッホ球のラベル "|-i>" が表示される

## Scenario: qni bloch は |+i> ラベルを y 軸の先端より右に表示する

- Then ブロッホ球のラベル "|+i>" の表示は y 軸の先端より右にある

## Scenario: qni bloch は |+i> ラベルを y 軸の先端より上に表示する

- Then ブロッホ球のラベル "|+i>" の表示は y 軸の先端より上にある

## Scenario: qni bloch は y 軸ラベルと |+i> ラベルを重ならない位置に配置する

- Then ブロッホ球のラベル "y" と "|+i>" の表示領域は重ならない
