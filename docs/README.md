# ドキュメント入口

| 文書 | 役割 |
| --- | --- |
| [要件](REQUIREMENTS.md) | 目的・必須条件の正本 |
| [全体設計](architecture/DESIGN.md) | 画面・AWS・認可・データ・API・受入方針 |
| [学習画面のGit・AWS移行](architecture/POKER_SPOT_AWS.md) | 現行Sitesの取り込み・段階移行・検証環境 |
| [TypeScript採用判断](architecture/decisions/0001-typescript.md) | 言語と移行境界 |
| [Git取り込み仕様・構成図](specs/SPOT-002-git-import.md) | 初回取り込みの境界・アーキテクチャ図・受入条件 |
| [機能別仕様](specs/README.md) | 実装単位の仕様と進捗 |
| [学習資料計画](learning/LEARNING_DOCUMENTATION_PLAN.md) | Notion資料の別成果物 |
| [開発手順](../CONTRIBUTING.md) | 仕様→テスト→実装→検証 |

全体設計を機能ごとに複製せず、機能別仕様から該当節へ参照する。仕様には追加の具体的な入出力・受入条件を書く。
