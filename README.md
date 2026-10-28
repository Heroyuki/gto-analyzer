# gto-analyzer

GG PokerのMTT履歴を解析し、ハンド単位でレビューするWebアプリを開発します。
**学習画面のReact／TypeScript移植とAWS dev配信コードを実装済み**です。AWSリソース作成、認証、MTT解析、レビューAPIは未実施です。

## Poker Spot VisualizerのAWS移行

既存の学習サイトをこのリポジトリに取り込み、React／TypeScriptへ移植しました。React版は `npm run dev:web`、比較用の元ソースは `npm run dev:spot` で起動できます。学習画面とレビュー画面は同じWebアプリ／配信基盤へ統合する方針です。[AWS構築・配信・復旧手順](infra/README.md)を実装し、AWSデプロイは設定確定待ちです。[移行設計](docs/architecture/POKER_SPOT_AWS.md)と[受入仕様](docs/specs/SPOT-001-visualizer.md)を参照してください。

## 仕様から開発を始める

[ドキュメント入口](docs/README.md) → [要件](docs/REQUIREMENTS.md) → [設計](docs/architecture/DESIGN.md) → [機能別仕様](docs/specs/README.md) の順に確認します。
[開発手順](CONTRIBUTING.md)に従い、受入条件・テスト・実装を同じ変更で揃えます。

```text
docs/
  REQUIREMENTS.md       要件の正本
  architecture/        全体設計・decisions/に技術判断（ADR）
  specs/               機能別仕様・受入条件
  learning/            Notion学習資料の計画
apps/
  web/                 React SPA・学習画面
  api/                 API Lambdaの配置先
  workers/             非同期Lambdaの配置先
packages/
  contracts/           共通型・学習画面JSON契約／検証
  domain/              学習画面の計算・戦略条件照合
  parser/              MTTパーサーの配置先
infra/                 共通Web配信のAWS CDK
tests/
  acceptance/          横断受入テストの配置先
  fixtures/            匿名化履歴・期待結果の配置先
legacy/python/         既存Streamlit試作・既存テスト
```

各配置先のREADMEに実装範囲と未実施項目を記録しています。認証・API・worker・MTT parserは後続で追加します。

## TypeScript開発基盤

Node.js 22.12以降（Node 22推奨）、npmを使用します。nvmを使う場合は `nvm use` で切り替えます。

```bash
npm ci
npm run check
```

npm workspaces、strict型検査、ロックファイル、CIを導入済みです。
`check` は型検査、依存方向の検査、取込元の構文・6テスト、新規単体16テスト、Reactビルド、Chromium操作6テストを実行します。初回は `npx playwright install chromium` が必要です。
TypeScript統一の理由と移行範囲は[ADR-0001](docs/architecture/decisions/0001-typescript.md)を参照してください。

## Python試作

[試作の実行手順](legacy/python/README.md)を参照してください。元のコード・テストは移動して保存しています。

```bash
python3 -m pytest legacy/python/tests -q
```

## 依存関係の更新

[Dependabot設定](.github/dependabot.yml)でnpm・Python試作・GitHub Actionsを毎週月曜09:00（日本時間）に確認します。
設定をデフォルトブランチへ反映するとバージョン更新PRの対象になります。自動マージは設定していません。
[GitHub公式説明](https://docs.github.com/en/code-security/concepts/supply-chain-security/about-the-dependabot-yml-file)
