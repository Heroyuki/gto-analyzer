---
name: verify-web
description: apps/webの変更を実際にブラウザーで動かして確認する。UI・計算表示・JSON入出力・レイアウトを変更したとき、バグ報告を再現するとき、「動作確認して」と頼まれたときに使う。推測で「直った」と報告する前に必ず使う。
---

# Webアプリの動作確認

型検査や単体テストの成功は、画面が正しく動くことを意味しない。UIに関わる変更は、実際に起動して自分の目で確認してから報告する。

## 1. 起動する

Node.js 22.12以降が必要（`node -v`で確認）。満たさない場合はViteが起動しないため、その旨を報告して止まる。

```bash
npm run dev:web            # http://127.0.0.1:5173/（開発。変更が即時反映）
# または本番ビルドで確認する場合
npm run build:web && npm run preview --workspace @gto-analyzer/web -- --port 4173
```

サーバーはバックグラウンドで起動し、確認後に停止する。

## 2. 全体を検査する

```bash
npm run inspect:web -- --width 1440
npm run inspect:web -- --width 390      # スマホ幅（SPOT-001-AC09）
# preview の場合は --url http://127.0.0.1:4173/
```

出力JSONを確認する。いずれかがあれば終了コード1になる。

- `consoleErrors` / `pageErrors`: 実行時エラー
- `failedRequests`: 読めなかったアセット
- `externalRequests`: 外部送信（SPOT-001-AC12に反する）
- `horizontalOverflow`: 横スクロール発生（AC09に反する）

`screenshot`（PNG）は画像として読んで見た目を確認する。`aria`（YAML）は画面のアクセシビリティツリーで、ボタン名・入力ラベル・表示値をテキストで確認できる。

## 3. 操作して確かめる

操作対象の探し方と、各機能への辿り着き方は [FEATURE_MAP.md](FEATURE_MAP.md) を参照する。曖昧な報告（「BBのレンジが出ない」「スクショだけ」など）も、まずfeature mapで該当機能と操作手順を特定する。

- 受入条件に関わる挙動は `tests/acceptance/*.test.ts` にPlaywrightテストとして追加し、`npm run test:web` で確認する。これが恒久的な検証になる。
- 一時的な確認だけなら、`tests/acceptance` の書き方（`getByRole` / `getByLabel` / `getByTestId`）に倣った使い捨てスクリプトをリポジトリ外に書いて実行する。

## 4. 報告する

- 何を起動し、どの幅・どの操作で、何を確認したかを書く。スクリーンショットのパスも添える。
- 確認できなかったこと（Nodeのバージョン不足、AWS環境が必要など）は「未確認」と明記する。CIの成功から推定しない。

## feature mapを保守する

UIの機能・ラベル・`data-testid`・操作手順を追加・変更したら、同じ変更でFEATURE_MAP.mdも更新する。古いfeature mapは、無いよりも悪い。
