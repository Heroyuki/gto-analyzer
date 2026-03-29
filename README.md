# gto-analyzer

GG Pokerのハンド履歴テキストを解析し、GPTでレビューするための最小構成アプリです。

## セットアップ

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## 1) 履歴解析スクリプト

```bash
python src/gg_history_parser.py ./your_history.txt --output hands.json
```

- GG Pokerハンド履歴テキストを読み込み、JSONに変換します。
- 出力JSONには以下を含みます。
  - hand_id
  - game
  - sb / bb
  - hero / hero_cards
  - board
  - actions（street, player, action, amount）

## 2) GPTレビューアプリ (Streamlit)

```bash
export OPENAI_API_KEY="your_api_key"
streamlit run src/review_app.py
```

- .txtファイルをアップロードすると、自動で履歴をパース。
- 「GPTでレビューする」を押すと、パース済みJSONをOpenAI APIへ渡してレビューを生成。
- デフォルトモデルは `gpt-4.1-mini`（UIから変更可）。

## テスト

```bash
pytest -q
```
