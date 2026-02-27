# preamble-followup-choice-audio

PCIbex template for an audio preamble + forced-choice continuation task.

- Participants hear a preamble and choose one follow-up option (`F` left / `J` right)
- Critical items use phonetic ambiguity (`ax~acts`, `clause~claws`)
- Controls and fillers provide clearly disambiguated answers

## Files

- `main.js`: experiment logic
- `practice.csv`: practice stimuli with clear answers
- `items.csv`: main stimuli with critical, control, filler items
- `audio_manifest.csv`: batch manifest for ElevenLabs generation
- `audio/`: output folder for MP3 files
