# 開発手順

## 仕様書ドリブン開発

1. `docs/REQUIREMENTS.md` で目的と必須条件を確認する。要件変更がある場合は先に更新する。
2. `docs/specs/_template.md` をコピーして機能ID・範囲・入出力・失敗条件・受入条件を定義する。未確定値は提案として明示する。
3. 設計への影響を `docs/architecture/DESIGN.md` に反映する。技術判断は `docs/architecture/decisions/` にADRとして理由を残す。
4. 受入条件のIDに対応するテストを作成し、機能を実装する。パーサーは匿名化した実MTT fixtureと期待値を先に確定する。
5. 型検査・該当テストを実行し、仕様に実装先と検証結果を記録する。仕様・実装・テストを同じPRで更新する。

要件を正本とし、設計案や旧試作の動作を自動的に要件へ昇格させない。不整合があれば仕様を解消してから実装する。
仕様の状態は `Draft → Ready → Implemented → Verified`。Readyは実装に必要な未確定事項を解消済み、Verifiedは受入条件を検証済みとする。READMEだけの配置先や型定義の存在は機能実装済みを意味しない。

## コードの配置と依存方向

- `apps/web`、`apps/api`、`apps/workers`: 実行単位。アプリ同士を直接importしない。
- `packages/contracts`: API/ジョブの共通契約。アプリやAWS SDKに依存させない。現在は型のみ。外部入力の実行時検証は実装時に追加する。
- `packages/domain`: 局面・整数チップ計算。AWSやUIに依存させない。
- `packages/parser`: 履歴の形式検証と正規化。contracts/domainを利用できる。
- `infra`: TypeScript CDK。スタック・IAM・デプロイ設定を配置する。
- `legacy/python`: 参照用試作。新規本番コードからimportしない。

各配置先で実装を始める際にprivateなpackage.jsonと必要なsrc/testsを追加する。ルートnpm workspacesで依存を管理し、package-lock.jsonも更新する。
単体テストは各パッケージの `tests/`、複数アプリをまたぐ受入テストはルート `tests/acceptance/` に置く。

## 検証

```bash
npm ci
npm run check
python3 -m pytest legacy/python/tests -q
git diff --check
```

CIはTypeScript型検査とPython試作テストを実行する。新規機能を追加したら対応するテストコマンドをCIにも追加する。MTT・認可・AWS統合試験の完了を現在のCI成功から推定しない。
実データをfixtureにする前にプレイヤー名・個人情報を匿名化し、APIキーや生の履歴をコミットしない。
