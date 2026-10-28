# Pythonローカル試作

構成整理前のsrc・tests・requirements.txtを内容を変えず保存しています。Cash形式中心の解析とStreamlitレビューの参照用です。本番MTT仕様を満たしておらず、既存プロンプトのGTO/数値評価を計算済みの根拠として扱わないでください。

リポジトリルートから:

```bash
cd legacy/python
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python src/gg_history_parser.py ./your_history.txt --output hands.json
export OPENAI_API_KEY="your_api_key"
streamlit run src/review_app.py
python -m pytest -q
```

ルートからのテストは `python3 -m pytest legacy/python/tests -q`。新規本番実装はルートのTypeScript構成で進めます。
