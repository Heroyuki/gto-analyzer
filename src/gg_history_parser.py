import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable


HAND_SEPARATOR = re.compile(r"\n(?=Poker Hand #)")


@dataclass
class Action:
    street: str
    player: str
    action: str
    amount: float | None = None


@dataclass
class Hand:
    hand_id: str
    game: str
    sb: float
    bb: float
    hero: str | None = None
    hero_cards: list[str] = field(default_factory=list)
    board: list[str] = field(default_factory=list)
    actions: list[Action] = field(default_factory=list)


def _parse_stakes(line: str) -> tuple[float, float]:
    match = re.search(r"\(\$(\d+(?:\.\d+)?)\/\$(\d+(?:\.\d+)?)", line)
    if not match:
        return 0.0, 0.0
    return float(match.group(1)), float(match.group(2))


def _parse_hero_and_cards(lines: Iterable[str]) -> tuple[str | None, list[str]]:
    hero = None
    cards: list[str] = []
    for line in lines:
        if line.startswith("Dealt to "):
            m = re.search(r"Dealt to (.+?) \[(.+)\]", line)
            if m:
                hero = m.group(1)
                cards = m.group(2).split()
    return hero, cards


def _parse_board(lines: Iterable[str]) -> list[str]:
    board: list[str] = []
    for line in lines:
        if line.startswith("Board "):
            m = re.search(r"\[(.+)\]", line)
            if m:
                board = m.group(1).split()
    return board


def _parse_actions(lines: Iterable[str]) -> list[Action]:
    actions: list[Action] = []
    street = "PREFLOP"
    street_markers = {
        "*** FLOP ***": "FLOP",
        "*** TURN ***": "TURN",
        "*** RIVER ***": "RIVER",
    }

    for line in lines:
        marker = next((k for k in street_markers if line.startswith(k)), None)
        if marker:
            street = street_markers[marker]
            continue

        m = re.match(
            r"^(?P<player>[^:]+): (?P<action>bets|calls|raises to|checks|folds)(?: \$(?P<amount>\d+(?:\.\d+)?))?",
            line,
        )
        if not m:
            continue
        amount_str = m.group("amount")
        actions.append(
            Action(
                street=street,
                player=m.group("player"),
                action=m.group("action"),
                amount=float(amount_str) if amount_str else None,
            )
        )
    return actions


def parse_hand_history(text: str) -> list[Hand]:
    raw_hands = [h.strip() for h in HAND_SEPARATOR.split(text.strip()) if h.strip()]
    parsed: list[Hand] = []

    for raw in raw_hands:
        lines = raw.splitlines()
        header = lines[0]
        hand_id_match = re.search(r"Poker Hand #(\d+)", header)
        game_match = re.search(r": (.+?) \(\$", header)

        hand_id = hand_id_match.group(1) if hand_id_match else "unknown"
        game = game_match.group(1) if game_match else "unknown"
        sb, bb = _parse_stakes(header)
        hero, hero_cards = _parse_hero_and_cards(lines)
        board = _parse_board(lines)
        actions = _parse_actions(lines)

        parsed.append(
            Hand(
                hand_id=hand_id,
                game=game,
                sb=sb,
                bb=bb,
                hero=hero,
                hero_cards=hero_cards,
                board=board,
                actions=actions,
            )
        )

    return parsed


def parse_file(input_path: str | Path, output_path: str | Path | None = None) -> list[Hand]:
    input_path = Path(input_path)
    hands = parse_hand_history(input_path.read_text(encoding="utf-8"))
    if output_path:
        output = [asdict(hand) for hand in hands]
        Path(output_path).write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    return hands


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Parse GG Poker hand history")
    parser.add_argument("input", help="Path to GG Poker hand history text file")
    parser.add_argument("--output", help="Path to output JSON file", default="hands.json")
    args = parser.parse_args()

    parsed_hands = parse_file(args.input, args.output)
    print(f"Parsed {len(parsed_hands)} hands -> {args.output}")
