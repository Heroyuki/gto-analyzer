# 共通Webアプリ

React／TypeScript／ViteのSPA。現在は`src/features/spot`の学習画面を実装。カード変更、SPR／ポットオッズ、169分類レンジ、JSON取込／ダウンロードを提供する。学習データはメモリーに保持し、再読み込みで初期化する。

```bash
npm run dev:web
npm run build:web
npm run test:web
```

Node.js 22.12以降。`npm run dev:web`でlocalhost:5173へアクセスする。計算と入力検証はdomain／contractsへ分離してあり、DOM・AWSへ依存しない。JSONは端末内で処理し、ネットワークへ送信しない。

将来の履歴一覧・ハンド詳細・レビューは同じアプリへ追加する。認証・APIはまだない。レビュー機能の完了を学習画面の稼働から推定しない。[共通配信基盤](../../infra/README.md)
