# 機能別仕様

[テンプレート](_template.md)から機能単位で作成する。下表は実装予定の対応表であり、各機能の仕様確定・実装完了を意味しない。

| ID | 機能 | 設計節 | 実装予定先 | 状態 |
| --- | --- | --- | --- | --- |
| [SPOT-001](SPOT-001-visualizer.md) | 学習画面のGit・AWS移行 | 移行設計 | legacy/poker-spot、apps/web、packages/domain、infra | Draft・AWS設定と数値精度未確定 |
| [SPOT-002](SPOT-002-git-import.md) | 既存サイトのGit取り込み | 移行設計 | legacy/poker-spot | Verified |
| PARSE-001 | MTT解析・局面再構成 | §5–6、13 | packages/parser、packages/domain | Draft・実MTT fixture待ち |
| AUTH-001 | 認証・アカウント分離 | §4、7、9 | apps/api、infra | 未着手 |
| UPLOAD-001 | 固定版アップロード・取得 | §5、9 | apps/api、apps/workers | 未着手 |
| JOB-001 | Outbox・冪等性・非同期処理 | §7–8 | apps/workers | 未着手 |
| REVIEW-001 | 定性的レビュー・根拠表示 | §6、10 | apps/workers、packages/contracts | 未着手 |
| DELETE-001 | 削除・復旧時の再適用 | §11 | apps/api、apps/workers、infra | 未着手 |
| WEB-001 | ログイン・一覧・詳細・設定 | §2、9 | apps/web | 未着手 |

参照先: [全体設計](../architecture/DESIGN.md)。共通型の一部が存在しても、上記機能は未実装。
まず[PARSE-001](PARSE-001-mtt-parser.md)の入力形式とfixtureを確定する。

学習画面の先行確認は[SPOT-001](SPOT-001-visualizer.md)に従い、実MTT fixtureの確定と独立して進める。
