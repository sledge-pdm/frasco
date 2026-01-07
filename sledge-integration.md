# sledge integration

- Anvilを廃止してfrasco/layer/gripを導入
- 原則Uint8Arrayはプロジェクトファイルからの入出力にのみ使用する
- 主要機能(Pen/Eraser > Layer > Composite > View)の流れをまず確認できるようにすることを目標とする

## レイヤー(Anvil)

- Layerの該当メンバはCompositeLayerで置き換える(implements?)
- AnvilManagerはLayerManagerに置き換え、frascoのlayerを出す
- AnvilHistoryActionはLayerHistoryActionに置き換え　単純にfrasco>layerに履歴処理が移植されたので、layerのundo/redoのラッパー(他のactionとの時系列を保つための挿入)となる　LayerからonHistoryAddedみたいなリスナを生やしてもいいがとりあえず自前でPenToolのend時などにaddした方がいい

## Tools

- PenTool/EraserToolをGripに切り替え
- ShapeはとりあえずCircleとSquareを単純に持つ
- shift押しで~Lineを打つようにするが、これは後の実装でいい
- Pipetteはとりあえず機能を停止？(layerにローコストに色取得が実装できそうならそうすべきかも)

## 選択範囲 / move

- floatingBufferの扱いをSurfaceMaskに移す
- getPartialBufferはつまり部分SurfaceMask切り出しに相当　複雑な形状の場合の切り出し方について要検討　現段階では複雑形状でも全体のbbox矩形で切り出すのでもいい気がする

## WebGLCanvas / WebGLRenderer

- frascoに切り替え　WebGLRendererは消える公算

## Clipboard

- exportRawがあるので問題ない気もするが難しそうなら一旦外してもいい

## Effects

- 現状あるエフェクト4種だけで一旦再構成(コンポーネント管理は整理されており追加は簡単なので以前のものは消す)
