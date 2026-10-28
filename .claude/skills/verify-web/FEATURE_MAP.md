# Feature map: apps/web

エージェントが各機能に辿り着くための地図。セレクターは `tests/acceptance` と同じく、ロール・ラベル・`data-testid` を優先する。ラベルはすべて `{ exact: true }` で指定する。

現在の画面は学習画面（SPOT-001）のみ。実装は `apps/web/src/features/spot/SpotApp.tsx`、計算は `packages/domain/src/spot`、JSON契約・検証は `packages/contracts/src/spot`。初期状態は `packages/contracts/src/spot/sample.ts` の `SAMPLE`（pot 5.5、両者97.5bb、ボード Jh 8d 5h、Hero As 8s、bet 33%）。状態はメモリーのみで、再読み込みで初期化される。

## ヘッダー

| 機能 | 操作・セレクター | 結果 |
| --- | --- | --- |
| 初期状態に戻す | `getByRole('button', { name: '初期スポット' })` | SAMPLEに戻り、toast「初期スポットに戻しました。」 |
| JSON入出力を開く | `getByRole('button', { name: 'JSON 入出力' })` | JSONダイアログ（下記） |

## 卓と計算結果（region「ポーカー卓と計算結果」）

| 表示 | セレクター | 意味 |
| --- | --- | --- |
| 現在のSPR | `getByTestId('spr')` | 実効スタック ÷ ポット |
| 実効スタック | `getByTestId('effective')` | 両者の残りの小さい方 |
| 役分類 | `getByTestId('hand-category')` | Heroとボードの分類（例「セカンドペア」） |
| ボードのカード | `getByRole('button', { name: 'ボード 1 Jhを変更' })` | 名前は「ボード {1-5} {コード}を変更」 |
| ターン・リバー追加 | `getByRole('button', { name: 'ターンを追加' })` / `'リバーを追加'` | リバーはターン追加まで無効 |
| Heroのカード | `getByRole('button', { name: 'BTN 1 Asを変更' })` | 名前は「BTN {1-2} {コード}を変更」 |
| フロップに戻す | `getByRole('button', { name: 'フロップに戻す' })` | ボード4枚以上のときだけ表示 |

## カード選択ダイアログ

カードのボタンを押すと `getByRole('dialog')` が開く。タイトルは「フロップ 1」「ターン」「リバー」「BTNのカード 1」など。

- カードを選ぶ: `dialog.getByRole('button', { name: 'Q♣' })`（ランク＋スート記号 ♠♥♦♣）。使用中のカードは無効。
- `このストリート以降を削除`: ターン・リバーを開いたときだけ表示。
- 閉じる: `閉じる` ボタン、Escape、または背景クリック。閉じると元のボタンへフォーカスが戻る（AC09）。

## スポット設定（右パネル）

| 機能 | セレクター | 備考 |
| --- | --- | --- |
| ポット | `getByLabel('ベット前のポット')` | 0.1〜100000、小数3桁。不正値は `role=status` で警告し、blurで元に戻る |
| 残りスタック | `getByLabel('BTN 残り')` / `getByLabel('BB 残り')` | 0〜100000 |
| 両者の残りプリセット | `getByRole('button', { name: '20 bb' })`、`'40 bb'`、`'97.5 bb'` | |
| ベットサイズ | `getByLabel('ベットサイズ（ポット比率%）')`（スライダー）、`getByRole('button', { name: '50%' })`、`'33%'`、`'67%'`、`'100%'`、`'All-in'` | 実効スタックを超えると打ち切り |
| 実効ベット額 | `getByTestId('bet-amount')` | |
| 必要勝率 | `getByTestId('required-equity')` | bet 0のときは「—」 |
| コール後 | `getByTestId('after-pot')` / `getByTestId('after-spr')` | |
| 計算式 | `getByText('計算式と前提')`（details） | |

## 戦略（section「レンジとアクション」）

| 機能 | セレクター | 備考 |
| --- | --- | --- |
| 戦略の状態 | `getByTestId('strategy-note')` | 「説明用」「自己申告」「条件が変わりました」など。条件が変わると保留表示（AC07/08） |
| プレイヤー切替 | `getByRole('button', { name: 'BTN' })` / `'BB'` | `aria-pressed` で選択状態がわかる |
| ハンドを選ぶ | `getByRole('button', { name: 'AKs アクション頻度を表示' })` | データなしのセルは「{hand} データなし」 |
| 全体に戻す | `getByRole('button', { name: '全体に戻す' })` | ハンド選択中だけ表示 |

## JSONダイアログ（「JSON 入出力」）

| 機能 | セレクター |
| --- | --- |
| JSON本文 | `getByLabel('JSON データ')`（開いた時点で現在の局面の書出し内容が入る） |
| 取り込む | `getByRole('button', { name: '取り込む' })`。失敗時はダイアログを開いたまま `#json-message` に理由を表示し、局面は変えない |
| ダウンロード | `getByRole('button', { name: '現在の局面を保存' })` → `poker-spot.json` |
| サンプル表示 | `getByRole('button', { name: 'サンプルを表示' })` |
| ファイル読込 | `getByLabel('JSONファイル')`（`setInputFiles`、上限1 MiB） |
| 閉じる | `getByRole('button', { name: '閉じる' })` |

## その他

- toast: 画面下の `role=status`。3秒で消える。
- JSONの取込・書出しは通信を伴わない。外部へのリクエストが発生したらバグ（AC12）。

## 未実装

履歴一覧・ハンド詳細・レビュー・認証・API。報告がこれらに関するものなら、未実装であることを伝える。
