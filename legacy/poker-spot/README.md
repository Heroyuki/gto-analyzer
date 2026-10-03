# Poker Spot Visualizer（移行元）

既存Sitesの比較用ソースです。[取り込み仕様](../../docs/specs/SPOT-002-git-import.md)と[SOURCE.json](SOURCE.json)に出典・ハッシュを記録しています。原文READMEは[UPSTREAM.md](UPSTREAM.md)に保存しています。原文のdist・Sites公開手順は取得元の説明です。このコピーはpublicから配信します。

リポジトリのルートで実行します。

```bash
npm run dev:spot
npm run check:spot
npm run test:spot
```

起動後は http://127.0.0.1:8000 を開きます。Python 3が必要です。検証にはNode.js 22を使用します。追加パッケージは不要です。

局面操作・SPR・必要勝率・レンジ表示・JSON入出力を備えます。初期戦略は説明用サンプルです。GTO計算やAWS保存は行いません。再読み込みで局面は初期化されます。

GitHubからSitesへの自動同期・AWS配信はまだありません。本番TypeScriptからこの試作を直接importしません。
