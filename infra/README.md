# 共通Web配信基盤（AWS dev）

学習画面と将来のMTTレビュー画面を同じReact SPA／S3／CloudFrontで配信する。現在のスタックは学習画面の静的配信を実装し、Cognito・API・履歴用S3・DynamoDBは後続で追加する。履歴用S3をこの配信のoriginへ接続しない。

## ローカル検証と設定

Node.js 22.12以降（Node 22推奨）、npm、AWS CLIを使用する。

```bash
npm ci
npx playwright install chromium
npm run check
npm run synth:dev -- -c config=infra/dev.example.json --no-lookups --quiet
```

`dev.example.json`はテンプレート検証用の架空設定で、デプロイに使わない。`infra/dev.local.json`へコピーして次を実値へ変更する。このファイルはGit管理から除外される。

- account: 対象の12桁AWSアカウントID。
- region: `ap-northeast-1`。
- allowedIps: 検証端末の公開IPv4／IPv6を完全一致で列挙。CIDR・空リストは拒否。同じ回線の利用者は区別できない。
- monthlyBudgetUsd / budgetEmail: 月額USD予算と通知先。アカウント全体の実績費用が80%を超えるとメール通知する。課金の強制停止ではない。
- githubOidcProviderArn（任意）: 既存のGitHub OIDC provider ARN。指定時だけdev配信ロールを作成する。

## 初回構築

デプロイ先はpoker用アカウントで、AWS CLIのSSOプロファイル`poker`（操作用）と`poker-readonly`（読み取り確認用）を使う。`default`プロファイルは別用途のアカウントを向いているため、このリポジトリの手順では使わない。`--profile`を省略するとdefaultへ実行されるので、必ず明示する。SSOの期限切れ時は`aws sso login --sso-session personal`で更新する。以下は設定確定・差分確認後に実行する手順であり、構築済みの記録ではない。

実行前に`get-caller-identity`の`Account`が`dev.local.json`の`account`と一致することを確認する。

```bash
aws sts get-caller-identity --profile poker
aws iam create-policy --policy-name GtoAnalyzerCdkExecution --policy-document file://infra/cdk-execution-policy.json --profile poker
npx cdk bootstrap aws://<account>/ap-northeast-1 --profile poker --cloudformation-execution-policies arn:aws:iam::<account>:policy/GtoAnalyzerCdkExecution
npm run synth:dev -- -c config=infra/dev.local.json --no-lookups
npx cdk diff --app cdk.out --profile poker --no-change-set
npx cdk deploy --app cdk.out --profile poker --outputs-file infra/cdk-outputs.json
```

CDK bootstrapのCloudFormation実行ポリシーは、このdev環境のS3・CloudFront・Budgets・CloudWatch・任意IAMロールに必要な権限へ限定した[cdk-execution-policy.json](cdk-execution-policy.json)を使う。スタックに新しいリソース種別を追加したら、このポリシーも更新して`aws iam create-policy-version`で反映する。2026-10-28にpokerアカウントでこのポリシーを使ってbootstrap済み。デフォルトのAdministratorAccessを最小権限として扱わない。bootstrapの変更は他のCDKスタックへ影響し得るため既存構成を確認する。[AWS bootstrapの権限説明](https://docs.aws.amazon.com/cdk/v2/guide/best-practices-security.html)

Web bucketは非公開・TLS必須・Versioning有効・削除時RETAIN。CloudFront REST originはOACを使い、全リクエストのviewer-requestでIP検査する。欠損アセットをindex.htmlへ変換しない。CloudWatch dashboardはCloudFrontの`us-east-1`メトリクス（requests / 5xx）を表示する。CloudFront標準ドメインの証明書を使用し、独自証明書でのTLSポリシー設定はまだ行わない。

## 配信・復旧

配信前に変更をレビュー済みコミットへまとめ、指定SHAのclean checkoutで`npm run check`を実行する。現在の作業ツリーはユーザーの既存変更を含むため、勝手にコミット・pushしない。

```bash
npm run deploy:web -- --outputs infra/cdk-outputs.json --release <40-character-SHA> --profile poker
# 直前の検証済みSHAへ、静的成果物だけを復旧
npm run deploy:web -- --outputs infra/cdk-outputs.json --release <previous-SHA> --profile poker --rollback
npm run smoke:aws -- https://<domain>.cloudfront.net <bucket-name> 200
```

`releases/<SHA>/`へ成果物・SHA-256 manifestを保存し、既存releaseを上書きしない。中断してmanifestを確定できなかったreleaseは復旧に使わない。アセットを先に、index.htmlを最後に配信し、`/`と`/index.html`を無効化して完了を待つ。旧アセットは削除しない。indexはs-maxage=60秒、ハッシュ付きアセットは1年キャッシュ。新しい成果物種別を追加した場合はpublishスクリプトの配信対象も更新する。

同じsmokeを未許可回線から末尾`403`で実行し、全パス拒否を確認する。許可回線からカード・ポット・JSON入出力を操作し、復旧後も同じ操作を確認する。ローカルテストだけでAWS受入を完了扱いしない。許可IPを持たないGitHub runnerからの画面確認には、403拒否確認を使う。

## GitHub Actions / OIDC

`.github/workflows/deploy-spot-dev.yml`は手動実行のみ。初回構築時に既存GitHub OIDC provider ARNを設定すると、`repo:Heroyuki/gto-analyzer:environment:dev`と`aud=sts.amazonaws.com`へ限定したロールを生成する。長期AWSキーは使用しない。[GitHub環境とOIDCの公式説明](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)

GitHubのdev environmentで以下を設定する。

- secret `AWS_DEV_CONFIG_JSON`: dev.local.jsonの内容（provider ARNを含む）。
- variable `AWS_DEPLOY_ROLE_ARN`: CDK outputのGithubDeployRoleArn。
- variable `DEV_DEPLOY_BRANCH`: 配信を許可するブランチ名。
- environmentのdeployment branch制限も同じ承認済みブランチへ設定する。

指定SHAが許可ブランチの履歴にあることを確認し、そのSHAをcheckoutして検証・synthする。通常配信はCDK diff／deploy後に静的配信する。rollbackは現行スタックのoutputを読み取り、IaCを変更せずアーカイブ済み画面だけ戻す。AWS権限はdevに限定するが、CDK bootstrapの実行ロールが広いと権限境界も広くなる点に注意する。GitHub上での実行は未検証。

## 現在の検証範囲

型検査、ドメイン・契約・CDKテンプレート・IP関数・OIDC trust・manifest検証、Webビルド、Chromium操作、架空dev設定でのCDK synthを実行済み。AWSリソース作成・配信・未許可回線・復旧は未実施。

2026-10-04: npm auditはaws-cdk-lib 2.272.0の同梱brace-expansion 5.0.9にhigh 1件を報告する。npm audit fixでは同梱依存を変更できず、現時点の最新CDKにも含まれる。Web成果物へは含まれない。CDKは信頼済みコード・設定のみに使用し、修正版CDKが出た時点で更新する。脆弱性ゼロ・本番運用可とは扱わない。
