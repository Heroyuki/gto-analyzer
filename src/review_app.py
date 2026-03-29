import json
import os
from dataclasses import asdict

import streamlit as st
from openai import OpenAI

from gg_history_parser import parse_hand_history


SYSTEM_PROMPT = """You are a poker coach.
You receive parsed GG Poker hand history JSON.
Review each hand and provide:
1) Biggest mistake (if any)
2) Better line suggestion
3) Short exploitative adjustment against likely pool tendencies
4) One actionable training task
Return in Japanese.
"""


def review_with_gpt(parsed_hands: list[dict], model: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY が設定されていません。")

    client = OpenAI(api_key=api_key)
    response = client.responses.create(
        model=model,
        input=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": "以下をレビューしてください:\n" + json.dumps(parsed_hands, ensure_ascii=False, indent=2),
            },
        ],
    )
    return response.output_text


st.set_page_config(page_title="GG Poker GPT Review", layout="wide")
st.title("GG Poker 履歴パーサー & GPTレビュー")

model = st.text_input("Model", value="gpt-4.1-mini")
uploaded = st.file_uploader("GG Poker hand history (.txt)", type=["txt"])

if uploaded:
    raw = uploaded.read().decode("utf-8", errors="ignore")
    hands = parse_hand_history(raw)
    as_json = [asdict(h) for h in hands]

    st.subheader("Parsed Hands")
    st.json(as_json)

    if st.button("GPTでレビューする"):
        with st.spinner("レビュー中..."):
            try:
                result = review_with_gpt(as_json, model=model)
                st.subheader("GPTレビュー")
                st.write(result)
            except Exception as exc:
                st.error(str(exc))
