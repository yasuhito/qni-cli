Feature: qni bloch コマンド
  qni-cli のユーザとして
  1 qubit の状態を幾何学的に理解するために
  qni bloch でブロッホ球の PNG や APNG や inline 表示を使いたい

  Scenario: qni bloch は z 軸ラベルと |0> ラベルを重ならない位置に配置する
    Given "qni add H --qubit 0 --step 0" を実行
    When "qni bloch --png --light --output bloch-layout.png" を実行
    Then コマンドは成功
    And ブロッホ球のラベル "z" の表示は z 軸の先端より上にある
    And ブロッホ球のラベル "|0>" の表示は z 軸の先端より上にある
    And ブロッホ球のラベル "z" と "|0>" の表示領域は重ならない
    And ブロッホ球のラベル "x" の表示は x 軸の先端より右にある
    And ブロッホ球のラベル "|+>" の表示は x 軸の先端より右にある
    And ブロッホ球のラベル "x" と "|+>" の表示領域は重ならない
    And ブロッホ球のラベル "|+i>" が表示される
    And ブロッホ球のラベル "|-i>" が表示される
    And ブロッホ球のラベル "|+i>" の表示は y 軸の先端より右にある
    And ブロッホ球のラベル "|+i>" の表示は y 軸の先端より上にある
    And ブロッホ球のラベル "y" と "|+i>" の表示領域は重ならない
