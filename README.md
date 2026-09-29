# gto-analyzer

GG PokerのMTT履歴を解析し、ハンド単位でレビューするWebアプリを開発します。
**現在は設計とTypeScript開発基盤の段階**です。認証、AWS、MTT解析、本番UIは未実装です。

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
  web/                 React SPAの配置先
  api/                 API Lambdaの配置先
  workers/             非同期Lambdaの配置先
packages/
  contracts/           共有型（現在は状態・根拠種別のみ）
  domain/              局面再構成・計算の配置先
  parser/              MTTパーサーの配置先
infra/                 AWS CDKの配置先
tests/
  acceptance/          横断受入テストの配置先
  fixtures/            匿名化履歴・期待結果の配置先
legacy/python/         既存Streamlit試作・既存テスト
```

配置先には責務を説明するREADMEを置いています。実装・依存パッケージは機能ごとに追加します。

## TypeScript開発基盤

Node.js 22、npmを使用します。nvmを使う場合は `nvm use` で切り替えます。

```bash
npm ci
npm run check
```

npm workspaces、strict型検査、ロックファイル、CIを導入済みです。
現在の `check` は型検査のみです。アプリの起動・ビルド・機能テストは各機能の実装時に追加します。
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
