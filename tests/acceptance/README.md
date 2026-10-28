# tests/acceptance

現在は学習画面のChromium操作テストを実装。入力・all-in、カード重複・street操作、JSON roundtrip・拒否時保持・外部送信なし、戦略条件照合、390px／1440px・文字200%・ダイアログのキーボード復帰を検証する。

```bash
npx playwright install chromium
npm run build:web
npm run test:web
```

アカウント分離、履歴アップロードからレビュー・削除、AWS実環境受入は未実装／未検証。AWS静的配信smokeは`npm run smoke:aws`、手順は`infra/README.md`を参照。
