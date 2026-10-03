# Poker Spot Visualizer

ポーカー学習用のブラウザーアプリ。依存ライブラリなしのHTML / CSS / JavaScriptで、Sitesの非公開URLへ配置します。GTOソルバーや外部APIの接続はありません。

## 起動

`npm run dev` を実行し、http://localhost:8000 を開きます。Node.jsはテスト用、Python 3はローカル配信用です。アプリの実行自体は静的ホスティングだけで動きます。

## 機能

- フロップ3枚、ターン、リバー、BTNのホールカードを変更（重複カードを禁止）
- ポットと両者の残りスタックからSPRを計算
- BTNのベットにBBがコールする場合の必要勝率、コール後SPRを計算
- 169ハンド分類のレンジ表とアクション頻度を表示
- 共通JSON形式の取込・保存、入力検証
- ボード・ポット・スタック変更時に、条件の合わない戦略表示を保留
- BBの戦略は取込データのベットサイズとも照合

初期の戦略頻度はUI説明用サンプルです。実際のソルバー出力ではありません。エクイティ計算・GTO再計算・ICM・レーキ計算は含みません。必要勝率は追加投資がない場合のchipEV損益分岐点です。読み込み状態はメモリー上だけに保持し、ブラウザーの再読み込みで初期化します。保持したい局面はJSONから保存してください。

## Codex / 既存リポジトリへの統合

- `dist/core.js`: DOMに依存しない計算、カード評価、JSON検証、データ定義。Reactからそのままimport可能。
- `dist/app.js`: UI描画とイベント制御。React統合時はここをコンポーネントに置き換える。
- `dist/style.css`: レスポンシブな卓・カード・レンジ表示。
- `dist/index.html`: 画面構造。
- `tests/core.test.js`: 計算と入力検証のテスト。`npm test`で実行。

既存のプロジェクトへ取り込む場合は、新規ブランチに上記コードをコピーまたはこのリポジトリから移植してください。`.openai/hosting.json`はこのSitesの識別情報なので、別のSiteへそのままコピーしないでください。これはSites管理のGitリポジトリで、ユーザーの既存GitHubとは自動同期していません。

## JSON形式

アプリの「JSON 入出力」→「サンプルを表示」で完全な例を確認できます。`dist/core.js`の`SAMPLE`も同じ形式です。

`schemaVersion: 1`、`spot: { board, hero, pot, stacks: { BTN, BB }, betPercent }`が必須。strategyは任意です。カードは`Jh`, `8d`, `As`の形式です。

`strategy.source: { kind: 'demo' | 'solver', label: string }`

`strategy.players.BTN / BB: { node, actions, hands, facingBetPercent? }`

actionsは`{id,label,type,frequency}`の配列。typeはcheck / call / bet / raise / fold。frequencyはパーセントで合計100。handsは`{ A8s: { frequencies: [60,35,5] } }`の形で、actionsと同じ順序で合計100の配列。BBは`facingBetPercent`が必須です。全体頻度は入力された値であり、掲載されたハンドの単純平均ではありません。コンボ別頻度・レンジ重み・EVはこの初版の形式に含みません。

外部ソルバーごとに形式が異なるため、生のエクスポートを直接読み込むものではありません。対象ソルバーの出力例から、この共通形式へ変換するアダプターを追加できます。取込時の条件と現在の局面が異なる場合、エクスポートに戦略は含めません。

## 計算

- 実効スタック = min(BTN残り, BB残り)
- SPR = 実効スタック / ベット前ポット
- 実効ベット = min(ポット × betPercent / 100, 実効スタック)
- 必要勝率 = 実効ベット / (ポット + 2 × 実効ベット)
- コール後SPR = (実効スタック − 実効ベット) / (ポット + 2 × 実効ベット)

## 確認

`npm run check`で構文、`npm test`で計算・検証・カード分類を確認できます。
