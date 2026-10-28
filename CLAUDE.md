# CLAUDE.md

GG PokerのMTT履歴をハンド単位でレビューするWebアプリ。現在動いているのは学習画面（SPOT-001）とAWS dev配信コードだけ。認証・API・MTT解析・レビューは未実装。全体は[README](README.md)、手順の正本は[CONTRIBUTING.md](CONTRIBUTING.md)。

## 進め方

- 仕様ドリブン。`docs/REQUIREMENTS.md` → `docs/specs/<ID>.md` の受入条件 → テスト → 実装の順に進め、仕様・テスト・実装を同じ変更で更新する。
- テスト名には受入条件ID（例 `AC07:`）を付ける。
- 推測で原因を断定しない。関係するコードを実際に読み、動かして確かめてから結論を書く。
- 確認していないことは「未確認」と書く。CIの成功から、MTT・認可・AWS統合の完了を推定しない。

## コマンド

Node.js 22.12以降（`.nvmrc`）。古いNodeではViteが起動しない。

```bash
npm ci
npm run check        # 型検査・依存方向・単体・Webビルド・Chromium受入テスト
npm run check:deps   # 依存方向だけを検査
npm run dev:web      # http://127.0.0.1:5173/
npm run inspect:web  # 起動中の画面を検査（スクショ・aria・エラー・外部通信）
git diff --check
```

## 機械的に強制しているルール

依存方向は `scripts/check-deps.ts` がCIで検査する。ルールを変えるときは、先にCONTRIBUTING.mdを更新してからチェッカーを直す。違反を避けるためにチェッカーを緩めない。

- `apps/*` 同士をimportしない。`apps` から `infra`・`scripts` をimportしない。
- `packages/contracts` → なし、`packages/domain` → contracts、`packages/parser` → contracts・domain。
- `packages/*` はReact・AWS SDK・CDKに依存しない。
- `legacy/` を新規コードからimportしない。

レビューで同じ指摘を2回したら、文章のルールで済ませず、lint・テスト・`check-deps` のどれかで検出できるようにする。

## 動作確認

UIに関わる変更やバグ報告の再現には `verify-web` スキル（`.claude/skills/verify-web/`）を使う。各機能への辿り着き方は同じ場所の `FEATURE_MAP.md` にある。UIを変えたらfeature mapも同じ変更で更新する。

## データの扱い

実際の履歴をfixtureにする前に、プレイヤー名・個人情報を匿名化する。APIキー・生の履歴・`infra/dev.local.json` はコミットしない。
