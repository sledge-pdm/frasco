# sledge integration

- Anvilを廃止してfrasco/layer/gripを導入
- 原則Uint8Arrayはプロジェクトファイルからの入出力にのみ使用する
- ~~主要機能(Pen/Eraser > Layer > Composite > View)の流れをまず確認できるようにすることを目標とする~~ > 完了

## TODO

### 放置中（未移行/互換維持）
- Tools/Selection/Effects: 選択/移動/塗り/ピペット/エフェクトはAnvil依存のまま。Frasco描画と同期しないので画面と処理がズレる。
- ~~WebGL/LayerMerge: レイヤー結合は旧WebGLRenderer + Anvil前提。Frasco描画結果が反映されない。~~ > 完了
- ~~UI/Thumbnail: サムネイル生成はAnvil依存。更新が遅れる/古い可能性がある。~~ > 完了
- IO/Project/History: 保存/エクスポート/履歴スナップショットはAnvilバッファ参照。Frasco描画と不一致の可能性がある。
- Canvas/Resize: キャンバスサイズ変更はFrasco側が内容保持しない。リサイズ時に消える前提。
- Tools/Pen: Shift直線のプレビューは未対応。end時のみ描画。

### 改善余地（Frasco移行で設計を簡素化できる箇所）
- Canvas/Render: CanvasToolOperatorの`onlyDirty`は実質不要。Frascoはタイル管理が無いので常時フル更新で良い。
- Tools/History: 更新/履歴登録の責務はTool側に寄せられる。現在はCanvasToolOperatorが仲介しているが整理可能。
- Tools/Pen: dotMagnificationやpressure補正は未移植。GripPoint生成時に再導入が必要。



## strategy (旧)

- 方向性は同じだが完了済みのものが混在しているので主にはTODOを参照

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
