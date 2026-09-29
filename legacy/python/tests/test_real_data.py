"""Tests using actual GG Poker hand history data."""
import textwrap
from src.gg_history_parser import parse_hand_history


# First hand from the provided file (GG20260312-0639)
SAMPLE_HAND_1 = """\
Poker Hand #RC4360867077: Hold'em No Limit ($0.01/$0.02) - 2026/03/12 15:49:39
Table 'RushAndCash28710615' 6-max Seat #1 is the button
Seat 1: fc7b3213 ($7.38 in chips)
Seat 2: 6d7b5df3 ($2.87 in chips)
Seat 3: Hero ($2.33 in chips)
Seat 4: c0939c6b ($1.92 in chips)
Seat 5: 91a4fff4 ($2 in chips)
Seat 6: 158b66b9 ($3.54 in chips)
6d7b5df3: posts small blind $0.01
Hero: posts big blind $0.02
*** HOLE CARDS ***
Dealt to fc7b3213
Dealt to 6d7b5df3
Dealt to Hero [7h 6d]
Dealt to c0939c6b
Dealt to 91a4fff4
Dealt to 158b66b9
c0939c6b: folds
91a4fff4: folds
158b66b9: folds
fc7b3213: folds
6d7b5df3: raises $0.03 to $0.05
Hero: folds
Uncalled bet ($0.03) returned to 6d7b5df3
*** SHOWDOWN ***
6d7b5df3 collected $0.04 from pot
*** SUMMARY ***
Total pot $0.04 | Rake $0 | Jackpot $0 | Bingo $0 | Fortune $0 | Tax $0
Seat 1: fc7b3213 (button) folded before Flop (didn't bet)
Seat 2: 6d7b5df3 (small blind) collected ($0.04)
Seat 3: Hero (big blind) folded before Flop
Seat 4: c0939c6b folded before Flop (didn't bet)
Seat 5: 91a4fff4 folded before Flop (didn't bet)
Seat 6: 158b66b9 folded before Flop (didn't bet)
"""

# Hand with showdown and board (RC4360866742)
SAMPLE_HAND_WITH_BOARD = """\
Poker Hand #RC4360866742: Hold'em No Limit ($0.01/$0.02) - 2026/03/12 15:48:52
Table 'RushAndCash28710280' 6-max Seat #1 is the button
Seat 1: Hero ($2.38 in chips)
Seat 2: 17233139 ($2.65 in chips)
Seat 3: dbcd416 ($2.46 in chips)
Seat 4: f5c83af0 ($2 in chips)
Seat 5: bf0732cc ($1.95 in chips)
Seat 6: aa94c81 ($2 in chips)
17233139: posts small blind $0.01
dbcd416: posts big blind $0.02
*** HOLE CARDS ***
Dealt to Hero [Kc Jd]
Dealt to 17233139
Dealt to dbcd416
Dealt to f5c83af0
Dealt to bf0732cc
Dealt to aa94c81
f5c83af0: folds
bf0732cc: raises $0.03 to $0.05
aa94c81: folds
Hero: calls $0.05
17233139: calls $0.04
dbcd416: folds
*** FLOP *** [6d Ad 4c]
17233139: checks
bf0732cc: checks
Hero: checks
*** TURN *** [6d Ad 4c] [2s]
17233139: bets $0.09
bf0732cc: calls $0.09
Hero: folds
*** RIVER *** [6d Ad 4c 2s] [Ks]
17233139: checks
bf0732cc: checks
17233139: shows [6s 7c] (a pair of Sixes)
bf0732cc: shows [Qs Qc] (a pair of Queens)
*** SHOWDOWN ***
bf0732cc collected $0.34 from pot
*** SUMMARY ***
Total pot $0.35 | Rake $0.01 | Jackpot $0 | Bingo $0 | Fortune $0 | Tax $0
Board [6d Ad 4c 2s Ks]
Seat 1: Hero (button) folded on the Turn
Seat 2: 17233139 (small blind) showed [6s 7c] and lost with a pair of Sixes
Seat 3: dbcd416 (big blind) folded before Flop
Seat 4: f5c83af0 folded before Flop (didn't bet)
Seat 5: bf0732cc showed [Qs Qc] and won ($0.34) with a pair of Queens
Seat 6: aa94c81 folded before Flop (didn't bet)
"""

# Hero wins hand (KK vs QQ, RC4360864747)
SAMPLE_HERO_WINS = """\
Poker Hand #RC4360864747: Hold'em No Limit ($0.01/$0.02) - 2026/03/12 15:44:16
Table 'RushAndCash28708285' 6-max Seat #1 is the button
Seat 1: 8cd22e6c ($2 in chips)
Seat 2: 17ffe55c ($2 in chips)
Seat 3: 28d5eb44 ($2.03 in chips)
Seat 4: d3678d5a ($1.48 in chips)
Seat 5: Hero ($1.32 in chips)
Seat 6: 897da482 ($1.97 in chips)
17ffe55c: posts small blind $0.01
28d5eb44: posts big blind $0.02
*** HOLE CARDS ***
Dealt to 8cd22e6c
Dealt to 17ffe55c
Dealt to 28d5eb44
Dealt to d3678d5a
Dealt to Hero [Ks Kh]
Dealt to 897da482
d3678d5a: folds
Hero: raises $0.02 to $0.04
897da482: folds
8cd22e6c: folds
17ffe55c: raises $0.12 to $0.16
28d5eb44: folds
Hero: raises $0.34 to $0.5
17ffe55c: raises $1.5 to $2 and is all-in
Hero: calls $0.82 and is all-in
Uncalled bet ($0.68) returned to 17ffe55c
17ffe55c: shows [Qd Qs]
Hero: shows [Ks Kh]
*** FLOP *** [9s 7s Td]
*** TURN *** [9s 7s Td] [Tc]
*** RIVER *** [9s 7s Td Tc] [Kd]
*** SHOWDOWN ***
Hero collected $2.57 from pot
*** SUMMARY ***
Total pot $2.66 | Rake $0.06 | Jackpot $0.03 | Bingo $0 | Fortune $0 | Tax $0
Board [9s 7s Td Tc Kd]
Seat 1: 8cd22e6c (button) folded before Flop (didn't bet)
Seat 2: 17ffe55c (small blind) showed [Qd Qs] and lost with two pair, Queens and Tens
Seat 3: 28d5eb44 (big blind) folded before Flop
Seat 4: d3678d5a folded before Flop (didn't bet)
Seat 5: Hero showed [Ks Kh] and won ($2.57) with a full house, Kings full of Tens
Seat 6: 897da482 folded before Flop (didn't bet)
"""


# ---- hand_id parsing ----

def test_hand_id_with_rc_prefix():
    """Hand IDs in GG Poker Rush & Cash start with 'RC'."""
    hands = parse_hand_history(SAMPLE_HAND_1)
    assert len(hands) == 1
    # Should capture full hand ID including RC prefix
    assert hands[0].hand_id == "RC4360867077", (
        f"Expected 'RC4360867077', got '{hands[0].hand_id}'"
    )


# ---- hero and hole cards ----

def test_hero_identification():
    hands = parse_hand_history(SAMPLE_HAND_1)
    assert hands[0].hero == "Hero"


def test_hero_hole_cards():
    hands = parse_hand_history(SAMPLE_HAND_1)
    assert hands[0].hero_cards == ["7h", "6d"]


def test_hero_hole_cards_kk():
    hands = parse_hand_history(SAMPLE_HERO_WINS)
    assert hands[0].hero_cards == ["Ks", "Kh"]


# ---- stakes ----

def test_stakes_parsed():
    hands = parse_hand_history(SAMPLE_HAND_1)
    assert hands[0].sb == 0.01
    assert hands[0].bb == 0.02


# ---- board ----

def test_board_parsed():
    hands = parse_hand_history(SAMPLE_HAND_WITH_BOARD)
    assert hands[0].board == ["6d", "Ad", "4c", "2s", "Ks"]


def test_board_empty_when_no_showdown():
    hands = parse_hand_history(SAMPLE_HAND_1)
    assert hands[0].board == []


# ---- actions ----

def test_fold_action_parsed():
    hands = parse_hand_history(SAMPLE_HAND_1)
    fold_actions = [a for a in hands[0].actions if a.action == "folds"]
    assert len(fold_actions) > 0


def test_raises_action_parsed():
    """'raises $X to $Y' format should be captured as a raise action."""
    hands = parse_hand_history(SAMPLE_HAND_1)
    raise_actions = [a for a in hands[0].actions if "raise" in a.action]
    assert len(raise_actions) > 0, (
        f"No raise actions found. Actions: {[(a.player, a.action) for a in hands[0].actions]}"
    )


def test_raises_action_amount():
    """The final raise amount ($0.05) should be captured."""
    hands = parse_hand_history(SAMPLE_HAND_1)
    raise_actions = [a for a in hands[0].actions if "raise" in a.action]
    assert len(raise_actions) > 0
    assert raise_actions[0].amount == 0.05, (
        f"Expected 0.05, got {raise_actions[0].amount}"
    )


def test_call_action_parsed():
    hands = parse_hand_history(SAMPLE_HAND_WITH_BOARD)
    call_actions = [a for a in hands[0].actions if a.action == "calls"]
    assert len(call_actions) > 0


def test_bet_action_parsed():
    hands = parse_hand_history(SAMPLE_HAND_WITH_BOARD)
    bet_actions = [a for a in hands[0].actions if a.action == "bets"]
    assert len(bet_actions) > 0


def test_check_action_parsed():
    hands = parse_hand_history(SAMPLE_HAND_WITH_BOARD)
    check_actions = [a for a in hands[0].actions if a.action == "checks"]
    assert len(check_actions) > 0


# ---- street tracking ----

def test_preflop_actions_have_correct_street():
    hands = parse_hand_history(SAMPLE_HAND_1)
    for action in hands[0].actions:
        assert action.street == "PREFLOP"


def test_street_progression():
    hands = parse_hand_history(SAMPLE_HAND_WITH_BOARD)
    streets = [a.street for a in hands[0].actions]
    assert "PREFLOP" in streets
    assert "FLOP" in streets
    assert "TURN" in streets


# ---- multi-hand parsing ----

def test_parse_multiple_hands():
    text = SAMPLE_HAND_1 + "\n" + SAMPLE_HAND_WITH_BOARD
    hands = parse_hand_history(text)
    assert len(hands) == 2


def test_game_type_parsed():
    hands = parse_hand_history(SAMPLE_HAND_1)
    assert "Hold'em No Limit" in hands[0].game
