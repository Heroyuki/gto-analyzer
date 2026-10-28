# SPOT-001: 学習用局面ビジュアライザーのGit・AWS移行

- 状態: Implemented（ローカル受入検証済み／AWS受入未実施）
- 関連要件: [要件・学習画面移行](../REQUIREMENTS.md#学習画面のgit管理aws移行)
- 関連設計: [移行設計](../architecture/POKER_SPOT_AWS.md)
- 実装先: legacy/poker-spot、apps/web、packages/domain、packages/contracts、infra、scripts
- テスト先: 各パッケージのtests、tests/acceptance、infra/tests、scripts/tests

## 目的・対象外

既存サイトをGitHubで管理し、同じ主要操作をAWS devで確認できるようにする。GTO計算、エクイティ計算、履歴解析、DB永続化、一般公開、本番切替はこの仕様の対象外。

## 入出力・処理

v1 JSONからボード3〜5枚、Hero2枚、正のポット、非負の残りスタック、ベット率、任意の戦略を取り込む。詳細は移行設計の計算・データ契約に従う。JSON入力上限はUTF-8で1 MiBとし、文字数とは区別する。取込失敗時は現在の状態を維持する。書出しは端末へのJSONダウンロードであり、ネットワーク送信やDB保存を伴わない。

## 受入条件

| ID | 条件・操作 | 期待結果 | 検証先 |
| --- | --- | --- | --- |
| SPOT-001-AC01 | 保存した元ソースを起動、既存試験を実行 | 画面が開き、6テスト・構文検査が成功 | legacy/poker-spot/tests |
| SPOT-001-AC02 | pot=10、BTN=100、BB=20、bet=50% | 実効20、SPR=2、ベット5、必要勝率25%、コール後SPR=0.75 | domain tests |
| SPOT-001-AC03 | 同じ局面でbet=1000%、次に実効stack=0 | ベット20で打切り、コール後SPR=0。stack=0でも有限値、必要勝率表示は「—」 | domain/UI tests |
| SPOT-001-AC04 | カード変更、turn/river追加・削除、重複選択 | 3〜5枚の整合性を維持、重複不可、役分類を更新 | browser tests |
| SPOT-001-AC05 | 有効JSON書出し→取込 | 局面・有効戦略が一致。再読込は初期化 | contracts/browser tests |
| SPOT-001-AC06 | 不正JSON、重複、未知version、頻度不正、上限超過 | 説明を表示して拒否、元状態を保持 | contracts/browser tests |
| SPOT-001-AC07 | ボード・pot・stack変更、BB対面bet変更 | 不一致戦略を非表示、書出しから除外。条件を戻すと再表示 | browser tests |
| SPOT-001-AC08 | サンプルとsolver自己申告JSONを表示 | 説明用と持込データを区別、検証済みGTOと誤表示しない | browser tests |
| SPOT-001-AC09 | 390px/1440px幅、キーボード、文字200% | 操作可能、主要入力・結果の欠落なし、ダイアログから復帰可能 | browser/manual |
| SPOT-001-AC10 | AWS HTTPS、S3直アクセス、未許可IPでアクセス | 許可端末のみ表示、S3直アクセスと未許可IPは拒否 | AWS smoke |
| SPOT-001-AC11 | デプロイ後、直前成果物へ復旧 | 対応SHAを追跡可能、画面とアセット正常、主要操作成功 | deploy/rollback smoke |
| SPOT-001-AC12 | JSON入出力時の通信を確認 | 局面・戦略を外部へ送信しない | browser network |

## 未確定事項

AWSの許可IP・予算・通知先はデプロイ前に確定する。東京リージョンは確認済み。数値精度は移植コードの初期値としてbb小数3桁、ベット率／頻度小数2桁、ベット額0.001 bb未満切捨てを採用した。ユーザー合意済み要件とは区別する。

## 検証記録

2026-10-03: 移行元コミット `5b2f88971d0dd1537b7849ce79d53220e1e6d877` の既存6テストと構文検査成功。取込後・移植後・AWSの受入条件は未実施。

2026-10-04:

- AC01: 元ソースの構文検査・6テスト成功。
- AC02/03: 固定小数計算の単体試験とブラウザー入力・all-in・ゼロstack操作成功。
- AC04: カード選択・重複無効化・turn／river追加削除・役分類・Escape復帰成功。
- AC05/06: v1 roundtrip、不正構文／version／カード／数値／頻度拒否、UTF-8バイト上限、失敗時元局面保持を検証。
- AC07: BB対面bet不一致を表示・書出しから除外（BTNの有効戦略は保持）、条件復帰時再表示を確認。
- AC08: demoとsolver自己申告を区別して表示することを確認。
- AC09: Chromiumで390px／1440px・文字200%の入力とJSONダイアログ操作、横溢れなし、キーボードでカードダイアログ開閉・復帰を検証。全操作の手動監査・他ブラウザーは未実施。
- AC12: JSON取込・ダウンロード中にネットワークリクエストが発生しないことを確認。
- 型検査、既存6、新規単体13、Chromium6、Python19テスト、Webビルド、架空設定のCDK synth成功。
- AC10/11: CDKテンプレート／IP関数／OIDC条件／成果物manifestのローカル試験成功。AWS HTTPS・S3拒否・未許可回線・実復旧は未実施。

`Verified`には変更しない。AWS実設定・デプロイ・smoke・復旧受入が残る。詳しい手順と依存の既知事項は[infra README](../../infra/README.md)参照。
