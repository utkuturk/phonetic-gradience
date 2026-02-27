# Phonetic Ambiguity Experiment Package

This repo contains two PCIbex experiments and zipped audio assets.

## Logic

The critical contrasts in this items are designed to be phonetic, not purely phonological.

- There are cases when speakers rely on gradient phonetic cues rather than a clean categorical segment difference.
- The key cues are mainly:
  - duration of fricatives/nasals
  - short closure gaps before final /s/
  - aspiration and release timing at word boundaries
  - juncture timing (where listeners place the boundary between words)

Examples:

- `ax` vs `acts`
  - Both can be perceived near `[æks] ~ [æk(t)s]`
  - The /t/ in `acts` may be reduced or unreleased, so perception can depend on subtle temporal alignment.
- `prince` vs `prints`, `sense` vs `cents`, `tense` vs `tents`
  - Epenthetic/timing effects in coda clusters make listeners depend on fine duration patterns.
- `great ape` vs `gray tape`, `a name` vs `an aim`, `ice cream` vs `I scream`
  - The segment string can be similar, and interpretation is supported by boundary-dependent acoustic detail.

So the core manipulation includes a small phonetic detail shifting lexical interpretation, especially when context is controlled.

## Included Experiments

- `preamble-followup-choice-audio`
  - 2x2 critical design (`sound1/sound2` x `text1/text2`) with Latin-square lists `A/B/C/D`
  - 40 fillers (20 matching, 20 mismatching)
  - Demo: https://farm.pcibex.net/r/uslRnl/
- `four-word-creativity-audio`
  - 2-condition critical design (`sound1` vs `sound2`) with same other words
  - Latin-square lists `A/B`
  - Demo: https://farm.pcibex.net/r/kneWUO/

## Design Summary

- `preamble-followup-choice-audio`
  - Participants are given an audio preamble and being asked to complete the sentence according to what they hear.
  - Critical: 20 pairs x 4 conditions (`sound1/text1`, `sound1/text2`, `sound2/text1`, `sound2/text2`)
  - Fillers: 40 total (20 clearly matching, 20 clearly mismatching)
  - Latin square: lists `A/B/C/D`
- `four-word-creativity-audio`
  - Participants are given 4 words and asked to create 1-2 sentences in a creative manner.
  - Critical: 20 pairs x 2 sound conditions (`sound1`, `sound2`)
  - The other three prompt words are matched across sound conditions
  - Latin square: lists `A/B`

## Audio ZIP Files (<= 30 MB each)

- `preamble-followup-choice-audio-audio.zip` — 1.37 MB (126 files)
- `four-word-creativity-audio-audio.zip` — 0.18 MB (46 files)

All zip files are located in `audio-zips/`.
