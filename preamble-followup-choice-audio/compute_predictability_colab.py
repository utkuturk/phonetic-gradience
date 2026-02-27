#!/usr/bin/env python3
"""
Colab-ready script to compute predictability metrics for preamble critical items.

Main metric:
- Prefix surprisal (bits) for each alternative target given the left context.
  Example: P("ax" | "In the shed, they inspected the ")
           P("acts" | "In the shed, they inspected the ")

Outputs:
1) predictability_metrics.csv (row-level, one row per critical condition)
2) predictability_summary_by_pair.csv (pair-level means)

Recommended Colab setup:
    !pip -q install transformers torch
    %cd /content/phonetic-ambiguity-package/preamble-followup-choice-audio
    !python compute_predictability_colab.py --input_dir . --model gpt2
"""

from __future__ import annotations

import argparse
import csv
import glob
import math
import os
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer


# Maps condition pair key -> (sound1_text, sound2_text)
PAIR_MAP: Dict[str, Tuple[str, str]] = {
    "ax_acts": ("ax", "acts"),
    "prince_prints": ("prince", "prints"),
    "tense_tents": ("tense", "tents"),
    "presence_presents": ("presence", "presents"),
    "patience_patients": ("patience", "patients"),
    "sense_cents": ("sense", "cents"),
    "dense_dents": ("dense", "dents"),
    "mince_mints": ("mince", "mints"),
    "greatape_graytape": ("great ape", "gray tape"),
    "nitrate_nightrate": ("nitrate", "night rate"),
    "aname_anaim": ("a name", "an aim"),
    "anocean_anotion": ("an ocean", "a notion"),
    "aniceman_aniceman": ("a nice man", "an ice man"),
    "plumpie_plumpeye": ("plum pie", "plump eye"),
    "peacetalks_peastalks": ("peace talks", "pea stalks"),
    "gradea_grayday": ("grade A", "gray day"),
    "graytrain_greatrain": ("gray train", "great rain"),
    "illearn_ilearn": ("I'll earn", "I learn"),
    "keepsticking_keepsticking": ("keep sticking", "keeps ticking"),
    "icecream_iscream": ("ice cream", "I scream"),
}


@dataclass
class ParsedCond:
    pair_num: str
    pair_key: str
    sound_cond: str  # s1 or s2
    text_cond: str   # t1 or t2


def parse_critical_condition(cond: str) -> Optional[ParsedCond]:
    parts = cond.split("_")
    if len(parts) < 5 or parts[0] != "crit":
        return None
    pair_num = parts[1]
    sound_cond = parts[-2]
    text_cond = parts[-1]
    pair_key = "_".join(parts[2:-2])
    if sound_cond not in {"s1", "s2"} or text_cond not in {"t1", "t2"}:
        return None
    return ParsedCond(pair_num=pair_num, pair_key=pair_key, sound_cond=sound_cond, text_cond=text_cond)


def find_phrase_span(sentence: str, phrase: str) -> Optional[Tuple[int, int]]:
    # Word-like boundaries around phrase to avoid partial matches.
    pattern = re.compile(rf"(?i)(?<![A-Za-z]){re.escape(phrase)}(?![A-Za-z])")
    m = pattern.search(sentence)
    if not m:
        return None
    return (m.start(), m.end())


def match_case_style(reference: str, phrase: str) -> str:
    # If reference is lowercase in sentence, lowercase the candidate too,
    # except we preserve "I"/"I'll" at phrase start.
    if reference.islower():
        lower = phrase.lower()
        if lower.startswith("i "):
            return "I " + lower[2:]
        if lower.startswith("i'"):
            return "I" + lower[1:]
        return lower
    return phrase


def conditional_logprob(
    model: AutoModelForCausalLM,
    tokenizer: AutoTokenizer,
    prefix: str,
    continuation: str,
    device: torch.device,
) -> Tuple[float, int]:
    """
    log P(continuation | prefix), using token-level chain rule from a causal LM.
    Returns: (sum_logprob_natlog, number_of_scored_tokens)
    """
    full_text = prefix + continuation
    full_ids = tokenizer(full_text, return_tensors="pt", add_special_tokens=False).input_ids.to(device)
    prefix_ids = tokenizer(prefix, return_tensors="pt", add_special_tokens=False).input_ids.to(device)

    prefix_len = prefix_ids.shape[1]
    total_len = full_ids.shape[1]
    if prefix_len == 0:
        raise ValueError("Prefix has zero tokens; target must be scored with non-empty left context.")
    if prefix_len >= total_len:
        raise ValueError("Continuation produced no additional tokens.")

    with torch.no_grad():
        logits = model(full_ids).logits
        log_probs = torch.log_softmax(logits, dim=-1)

    token_logps: List[float] = []
    for pos in range(prefix_len, total_len):
        prev_pos = pos - 1
        tok_id = int(full_ids[0, pos].item())
        token_logps.append(float(log_probs[0, prev_pos, tok_id].item()))

    return (sum(token_logps), len(token_logps))


def sentence_logprob(
    model: AutoModelForCausalLM,
    tokenizer: AutoTokenizer,
    sentence: str,
    device: torch.device,
) -> Tuple[float, int]:
    """
    Full sentence logprob under causal LM (excluding first token prediction).
    Returns: (sum_logprob_natlog, number_of_scored_tokens)
    """
    ids = tokenizer(sentence, return_tensors="pt", add_special_tokens=False).input_ids.to(device)
    if ids.shape[1] < 2:
        return (float("nan"), 0)
    with torch.no_grad():
        logits = model(ids).logits
        log_probs = torch.log_softmax(logits, dim=-1)

    score = 0.0
    count = 0
    for pos in range(1, ids.shape[1]):
        tok_id = int(ids[0, pos].item())
        score += float(log_probs[0, pos - 1, tok_id].item())
        count += 1
    return (score, count)


def natlog_to_bits(x: float) -> float:
    return x / math.log(2.0)


def softmax2(loga: float, logb: float) -> Tuple[float, float]:
    m = max(loga, logb)
    ea = math.exp(loga - m)
    eb = math.exp(logb - m)
    z = ea + eb
    return (ea / z, eb / z)


def read_critical_rows(input_dir: str, list_pattern: str) -> List[dict]:
    paths = sorted(glob.glob(os.path.join(input_dir, list_pattern)))
    if not paths:
        raise FileNotFoundError(f"No files matched pattern: {os.path.join(input_dir, list_pattern)}")

    rows: List[dict] = []
    seen_cond = set()
    for p in paths:
        with open(p, "r", newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                cond = row.get("cond", "").strip()
                if not cond.startswith("crit_"):
                    continue
                if cond in seen_cond:
                    continue
                seen_cond.add(cond)
                row["_source_file"] = os.path.basename(p)
                rows.append(row)
    return rows


def write_csv(path: str, rows: Sequence[dict]) -> None:
    if not rows:
        raise ValueError(f"No rows to write: {path}")
    fieldnames = list(rows[0].keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def summarize_by_pair(rows: Sequence[dict]) -> List[dict]:
    # Mean summary over the 4 conditions per pair.
    grouped: Dict[str, List[dict]] = {}
    for r in rows:
        grouped.setdefault(r["pair_key"], []).append(r)

    summary: List[dict] = []
    numeric_keys = [
        "surprisal_s1_bits",
        "surprisal_s2_bits",
        "p_s1_prefix",
        "p_s2_prefix",
        "p_expected_text_prefix",
        "surprisal_expected_text_bits",
        "support_gap_expected_minus_other_bits",
        "p_s1_full_sentence",
        "p_s2_full_sentence",
    ]

    for pair_key, grows in sorted(grouped.items()):
        out = {
            "pair_key": pair_key,
            "n_conditions": len(grows),
        }
        for k in numeric_keys:
            vals = []
            for r in grows:
                v = r.get(k, "")
                if v == "":
                    continue
                try:
                    vals.append(float(v))
                except ValueError:
                    continue
            out[f"mean_{k}"] = (sum(vals) / len(vals)) if vals else ""
        summary.append(out)
    return summary


def main() -> None:
    ap = argparse.ArgumentParser(description="Compute preamble predictability metrics via LM surprisal.")
    ap.add_argument("--input_dir", default=".", help="Directory with items_LS_*.csv files")
    ap.add_argument("--list_pattern", default="items_LS_*.csv", help="Glob pattern for list files")
    ap.add_argument("--model", default="gpt2", help="HF causal LM name")
    ap.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"], help="Torch device")
    ap.add_argument("--output_csv", default="predictability_metrics.csv", help="Row-level output CSV")
    ap.add_argument(
        "--summary_csv",
        default="predictability_summary_by_pair.csv",
        help="Pair-level summary output CSV",
    )
    args = ap.parse_args()

    if args.device == "auto":
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    else:
        device = torch.device(args.device)

    print(f"[info] loading model: {args.model} on {device}")
    tokenizer = AutoTokenizer.from_pretrained(args.model)
    model = AutoModelForCausalLM.from_pretrained(args.model).to(device)
    model.eval()

    critical_rows = read_critical_rows(args.input_dir, args.list_pattern)
    print(f"[info] loaded {len(critical_rows)} unique critical conditions")

    out_rows: List[dict] = []
    skipped = 0

    for row in critical_rows:
        cond = row["cond"].strip()
        parsed = parse_critical_condition(cond)
        if not parsed:
            skipped += 1
            continue

        pair = PAIR_MAP.get(parsed.pair_key)
        if pair is None:
            skipped += 1
            print(f"[warn] missing pair map for key={parsed.pair_key} cond={cond}")
            continue

        s1_text, s2_text = pair
        sentence = row["preamble_text"].strip()

        # Anchor target location in the existing sentence.
        expected_text = s1_text if parsed.text_cond == "t1" else s2_text
        alt_text = s2_text if parsed.text_cond == "t1" else s1_text

        span = find_phrase_span(sentence, expected_text)
        if span is None:
            # Fallback: locate whichever target is present.
            span1 = find_phrase_span(sentence, s1_text)
            span2 = find_phrase_span(sentence, s2_text)
            span = span1 or span2
            if span is None:
                skipped += 1
                print(f"[warn] target phrase not found in sentence for cond={cond}")
                continue

        start, end = span
        prefix = sentence[:start]
        found_surface = sentence[start:end]

        # Match surface style to the sentence position for fair comparison.
        s1_surface = match_case_style(found_surface, s1_text)
        s2_surface = match_case_style(found_surface, s2_text)

        lp_s1, n_tok_s1 = conditional_logprob(model, tokenizer, prefix, s1_surface, device)
        lp_s2, n_tok_s2 = conditional_logprob(model, tokenizer, prefix, s2_surface, device)
        p_s1, p_s2 = softmax2(lp_s1, lp_s2)

        # Expected text support from the 2x2 label (t1 vs t2).
        p_expected = p_s1 if parsed.text_cond == "t1" else p_s2
        p_other = p_s2 if parsed.text_cond == "t1" else p_s1

        # Build full-sentence counterfactuals with the same context tail.
        sent_s1 = sentence[:start] + s1_surface + sentence[end:]
        sent_s2 = sentence[:start] + s2_surface + sentence[end:]
        lp_sent_s1, n_sent_s1 = sentence_logprob(model, tokenizer, sent_s1, device)
        lp_sent_s2, n_sent_s2 = sentence_logprob(model, tokenizer, sent_s2, device)
        p_sent_s1, p_sent_s2 = softmax2(lp_sent_s1, lp_sent_s2)

        out_rows.append(
            {
                "cond": cond,
                "source_file": row.get("_source_file", ""),
                "pair_num": parsed.pair_num,
                "pair_key": parsed.pair_key,
                "sound_cond": parsed.sound_cond,
                "text_cond": parsed.text_cond,
                "preamble_text": sentence,
                "prefix_text": prefix,
                "anchor_surface_in_sentence": found_surface,
                "target_s1": s1_surface,
                "target_s2": s2_surface,
                "n_target_tokens_s1": n_tok_s1,
                "n_target_tokens_s2": n_tok_s2,
                "logprob_s1_prefix": lp_s1,
                "logprob_s2_prefix": lp_s2,
                "surprisal_s1_bits": -natlog_to_bits(lp_s1),
                "surprisal_s2_bits": -natlog_to_bits(lp_s2),
                "p_s1_prefix": p_s1,
                "p_s2_prefix": p_s2,
                "expected_text_target": "s1" if parsed.text_cond == "t1" else "s2",
                "p_expected_text_prefix": p_expected,
                "surprisal_expected_text_bits": -math.log2(max(p_expected, 1e-12)),
                "support_gap_expected_minus_other_bits": (-math.log2(max(p_other, 1e-12)))
                - (-math.log2(max(p_expected, 1e-12))),
                "sentence_s1": sent_s1,
                "sentence_s2": sent_s2,
                "n_sentence_tokens_s1": n_sent_s1,
                "n_sentence_tokens_s2": n_sent_s2,
                "logprob_s1_full_sentence": lp_sent_s1,
                "logprob_s2_full_sentence": lp_sent_s2,
                "p_s1_full_sentence": p_sent_s1,
                "p_s2_full_sentence": p_sent_s2,
            }
        )

    if not out_rows:
        raise RuntimeError("No rows were scored. Check condition format and pair mapping.")

    output_csv = os.path.join(args.input_dir, args.output_csv)
    summary_csv = os.path.join(args.input_dir, args.summary_csv)
    write_csv(output_csv, out_rows)
    write_csv(summary_csv, summarize_by_pair(out_rows))

    print(f"[done] wrote row-level metrics: {output_csv}")
    print(f"[done] wrote pair summary: {summary_csv}")
    print(f"[done] scored={len(out_rows)} skipped={skipped}")


if __name__ == "__main__":
    main()
