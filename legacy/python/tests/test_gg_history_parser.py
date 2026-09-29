from src.gg_history_parser import parse_hand_history


SAMPLE = """Poker Hand #123456789: Hold'em No Limit ($0.5/$1) - 2026/03/20 20:00:00
Table 'A' 6-max Seat #1 is the button
Dealt to hero123 [Ah Kd]
hero123: raises $1 to $3
villain1: calls $3
*** FLOP *** [Ac 7d 2h]
hero123: bets $2
villain1: folds
Board [Ac 7d 2h]

Poker Hand #987654321: Hold'em No Limit ($1/$2) - 2026/03/20 20:05:00
Dealt to hero123 [Qs Qh]
hero123: raises $2 to $6
villain2: calls $6
*** FLOP *** [As Kd 2c]
hero123: checks
villain2: bets $4
hero123: folds
Board [As Kd 2c]
"""


def test_parse_multiple_hands() -> None:
    hands = parse_hand_history(SAMPLE)
    assert len(hands) == 2

    first = hands[0]
    assert first.hand_id == "123456789"
    assert first.hero == "hero123"
    assert first.hero_cards == ["Ah", "Kd"]
    assert first.board == ["Ac", "7d", "2h"]
    assert first.actions[0].action == "raises"


def test_parse_stakes() -> None:
    hands = parse_hand_history(SAMPLE)
    assert hands[0].sb == 0.5
    assert hands[0].bb == 1.0
    assert hands[1].sb == 1.0
    assert hands[1].bb == 2.0
