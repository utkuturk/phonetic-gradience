/* =========================================================
   GENERAL
   ========================================================= */
PennController.ResetPrefix(null);
DebugOff();
PreloadZip("https://raw.githubusercontent.com/utkuturk/phonetic-gradience/main/audio-zips/four-word-creativity-audio-audio.zip");

const FOURWORD_LISTS = ["A", "B"];
const FOURWORD_LIST_URL = (GetURLParameter("list") || "").toUpperCase();
const FOURWORD_LIST = FOURWORD_LISTS.includes(FOURWORD_LIST_URL)
  ? FOURWORD_LIST_URL
  : FOURWORD_LISTS[Math.floor(Math.random() * FOURWORD_LISTS.length)];
const FOURWORD_ITEMS_FILE = "items_LS_" + FOURWORD_LIST + ".csv";
const WRITE_WINDOW_MS = 180000;

/* =========================================================
   HEADER
   ========================================================= */
Header(
  newVar("SID").global(),
  newVar("LIST").global(),
  newVar("TrialN", 0).global(),
  newVar("RT").global()
)
  .log("PROLIFIC_ID", GetURLParameter("id"))
  .log("SID", getVar("SID"))
  .log("LIST", getVar("LIST"))
  .log("TrialN", getVar("TrialN"));

/* =========================================================
   SEQUENCE
   ========================================================= */
Sequence(
  "intro",
  "consent",
  "demo",
  "instructions",
  "pre_practice",
  randomize("practice"),
  "pre_main",
  sepWithN("break", randomize("trial"), 24),
  SendResults(),
  "bye"
);

/* =========================================================
   HELPERS
   ========================================================= */
function makeSubjectID(n = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function SepWithN(sep, main, n) {
  this.args = [sep, main];
  this.run = function (arrays) {
    assert(arrays.length === 2, "Wrong number of arguments to SepWithN");
    assert(parseInt(n) > 0, "N must be positive");
    const sepArr = arrays[0];
    const mainArr = arrays[1];
    if (mainArr.length <= 1) return mainArr;
    const out = [];
    while (mainArr.length) {
      for (let i = 0; i < n && mainArr.length > 0; i++) out.push(mainArr.pop());
      for (let j = 0; j < sepArr.length && mainArr.length > 0; j++) out.push(sepArr[j]);
    }
    return out;
  };
}
function sepWithN(sep, main, n) { return new SepWithN(sep, main, n); }

function ensureFourWordTheme() {
  if (window.__fourWordThemeLoaded) return;
  window.__fourWordThemeLoaded = true;
  const style = document.createElement("style");
  style.id = "fourword-theme";
  style.textContent = `
    body {
      font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(155deg, #edf5ff 0%, #f7fbff 46%, #ecf7f1 100%);
      color: #162941;
    }
    .fw-card {
      max-width: 1120px;
      margin: 12px auto;
      padding: 20px 24px;
      background: rgba(255,255,255,0.94);
      border: 1px solid #d2dfef;
      border-radius: 16px;
      box-shadow: 0 12px 28px rgba(17, 44, 82, 0.08);
    }
    button {
      background: #1d4e8f;
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-size: 18px;
      box-shadow: 0 6px 16px rgba(20, 52, 94, 0.2);
      cursor: pointer;
    }
    button:hover { background: #173f73; }
    button:disabled { opacity: 0.65; cursor: default; }
    textarea {
      border: 1px solid #b9cadf;
      border-radius: 10px;
      background: #ffffff;
    }
  `;
  document.head.appendChild(style);
}
ensureFourWordTheme();

function shuffleArray(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

function slugWord(word) {
  return String(word)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function wordAudioFile(word) {
  return "e1_word_" + slugWord(word) + ".mp3";
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function tokenPattern(token) {
  const t = String(token).toLowerCase().replace(/[’]/g, "'");
  if (t === "i'll") return "i(?:'|’)?ll";
  return escapeRegex(t).replace(/'/g, "(?:'|’)");
}

function buildRequiredTokens(row) {
  const heard = [row.word1, row.word2, row.word3, row.auditory_word]
    .map(x => String(x || "").toLowerCase().replace(/[’]/g, "'"))
    .join(" ");

  const all = heard.match(/[a-z0-9']+/g) || [];
  const skipAlways = new Set(["a", "an", "the"]);
  const isCritical = String(row.item_type || "").toLowerCase().indexOf("critical") >= 0;
  const out = [];

  for (const tok of all) {
    if (skipAlways.has(tok)) continue;
    if (isCritical && tok === "does") continue;
    if (!out.includes(tok)) out.push(tok);
  }
  return out;
}

function buildResponseRegex(requiredTokens) {
  const parts = requiredTokens.map(tok => `(?=.*\\b${tokenPattern(tok)}\\b)`).join("");
  return new RegExp(`^(?=.{15,700}$)${parts}.*$`, "i");
}

function buildProductionTrial(label, row, withFeedback = false) {
  const ambiguousAudio = (row.audio_file || "").replace(/^audio\//, "");
  const requiredTokens = buildRequiredTokens(row);
  const responseRegex = buildResponseRegex(requiredTokens);
  const spoken = shuffleArray([
    { word: row.word1, file: wordAudioFile(row.word1) },
    { word: row.word2, file: wordAudioFile(row.word2) },
    { word: row.word3, file: wordAudioFile(row.word3) },
    { word: row.auditory_word, file: ambiguousAudio }
  ]);
  const spokenWordOrderStr = spoken.map(x => x.word).join(" | ");
  const spokenFileOrderStr = spoken.map(x => x.file).join(" | ");
  const a1 = "word_audio_1_" + row.item;
  const a2 = "word_audio_2_" + row.item;
  const a3 = "word_audio_3_" + row.item;
  const a4 = "word_audio_4_" + row.item;

  const trial = newTrial(label,
    getVar("TrialN").set(v => v + 1),
    newVar("Timeout").set("0"),
    newVar("WordOrder").set(spokenWordOrderStr),
    newVar("SpokenFiles").set(spokenFileOrderStr),
    newVar("RequiredTokens").set(requiredTokens.join(" | ")),

    newText("task",
      "<div class='fw-card'><b>Task:</b> Listen to four spoken prompts. Then write one creative English sentence using all four prompts.</div>"
    ).css({"font-size":"22px", "max-width":"1120px", "line-height":"1.4"}).center().print(),

    newText("auditory_label", "Listen carefully. The writing box will appear after all four prompts are played.")
      .css({"font-size":"19px", "margin-top":"0.7em", "color":"#334a66"})
      .center()
      .print(),

    newAudio(a1, spoken[0].file),
    getAudio(a1).play().wait("first"),
    newTimer("w_gap_1", 170).start().wait(),
    newAudio(a2, spoken[1].file),
    getAudio(a2).play().wait("first"),
    newTimer("w_gap_2", 170).start().wait(),
    newAudio(a3, spoken[2].file),
    getAudio(a3).play().wait("first"),
    newTimer("w_gap_3", 170).start().wait(),
    newAudio(a4, spoken[3].file),
    getAudio(a4).play().wait("first"),
    newTimer("w_gate_tail", 230).start().wait(),

    newText("reminder", "Type your sentence below. Minimum length: 15 characters.")
      .css({"font-size":"18px", "margin-top":"0.8em"})
      .center()
      .print(),

    newTextInput("response")
      .lines(3)
      .size("920px", "120px")
      .css({"font-size":"20px", "padding":"8px"})
      .center()
      .log("validate")
      .print(),

    newText("enter_hint", "Press Enter to submit.")
      .css({"font-size":"17px", "margin-top":"0.5em", "color":"#3d526d"})
      .center()
      .print(),

    getVar("RT").set(() => Date.now()),

    newButton("submit_sentence"),
    newTimer("write_timer", WRITE_WINDOW_MS)
      .callback(
        getVar("Timeout").set("1"),
        getButton("submit_sentence").click()
      )
      .start(),
    newKey("submit_enter", "Enter")
      .log()
      .callback(getButton("submit_sentence").click()),
    getButton("submit_sentence").wait(
      getVar("Timeout").test.is("1")
        .or(getTextInput("response").test.text(responseRegex))
        .failure(
          newText("enter_error", "Please write at least 15 characters and include all spoken prompts.")
            .color("crimson")
            .center()
            .print()
        )
    ),
    getTimer("write_timer").stop(),

    getVar("RT").set(v => Date.now() - v),

    getVar("Timeout").test.is("1")
      .success(
        newText("timeout_note", "Time is up. Moving to the next item.")
          .css({"font-size":"17px", "margin-top":"0.6em", "color":"#4b5563"})
          .center()
          .print(),
        newTimer("timeout_note_t", 500).start().wait()
      ),

    withFeedback
      ? newText("fb", "Saved.").color("green").center().print()
      : newTimer("isi", 250).start().wait(),

    newTimer("tail", 180).start().wait()
  )
  .log("item", row.item)
  .log("cond", row.cond)
  .log("item_type", row.item_type)
  .log("word1", row.word1)
  .log("word2", row.word2)
  .log("word3", row.word3)
  .log("word4", row.word4)
  .log("auditory_word", row.auditory_word)
  .log("audio_file", row.audio_file)
  .log("word_order_spoken", getVar("WordOrder"))
  .log("spoken_files", getVar("SpokenFiles"))
  .log("required_tokens", getVar("RequiredTokens"))
  .log("Timeout", getVar("Timeout"))
  .log("RT", getVar("RT"))
  .log("DecisionRT_ms", getVar("RT"));

  return trial;
}

/* =========================================================
   PAGES
   ========================================================= */
newTrial("intro",
  getVar("SID").set(makeSubjectID()),
  getVar("LIST").set(FOURWORD_LIST),
  newText(
    "<div class='fw-card'><h3>Welcome</h3>" +
    "<p>In this study, you will hear four spoken prompts on each item.</p>" +
    "<p>Your task is to write one creative English sentence using all four prompts.</p>" +
    "<p>You have up to <b>3 minutes</b> to submit each sentence.</p>" +
    "<p>Please complete the study on a computer in a quiet setting.</p></div>"
  ).css({"font-size":"22px", "max-width":"1120px", "line-height":"1.45"}).center().print(),
  newButton("Continue").center().print().wait()
);

newTrial("consent",
  newText(
    "<div class='fw-card'><h3>Consent</h3>" +
    "<p>By continuing, you confirm that you are 18 or older and agree to participate in this research study.</p>" +
    "<p>Researchers: <b>Utku Turk</b> and <b>Kate Mooney</b>.</p></div>"
  ).css({"font-size":"22px"}).center().print(),
  newButton("I Agree").center().print().wait()
);

newTrial("demo",
  newText(
    "<div class='fw-card'><h3>Demographics</h3>" +
    "<p>Please complete the following fields before continuing.</p></div>"
  ).css({"font-size":"22px"}).center().print(),

  newText("age_label", "Age").css({"font-size":"18px","font-weight":"600","margin-top":"8px"}).center().print(),
  newTextInput("age")
    .size("420px","44px")
    .css({"font-size":"18px","padding":"8px 10px"})
    .center()
    .log()
    .print(),

  newText("gender_label", "Gender").css({"font-size":"18px","font-weight":"600","margin-top":"8px"}).center().print(),
  newTextInput("gender")
    .size("420px","44px")
    .css({"font-size":"18px","padding":"8px 10px"})
    .center()
    .log()
    .print(),

  newText("location_label", "Location (state/country)").css({"font-size":"18px","font-weight":"600","margin-top":"8px"}).center().print(),
  newTextInput("location")
    .size("420px","44px")
    .css({"font-size":"18px","padding":"8px 10px"})
    .center()
    .log()
    .print(),

  newText("lang_label", "Native language").css({"font-size":"18px","font-weight":"600","margin-top":"8px"}).center().print(),
  newTextInput("native_language")
    .size("420px","44px")
    .css({"font-size":"18px","padding":"8px 10px"})
    .center()
    .log()
    .print(),

  newButton("demo_continue", "Continue")
    .center()
    .print()
    .wait(
      getTextInput("age").test.text(/^\d+$/)
        .and(getTextInput("gender").test.text(/\S/))
        .and(getTextInput("location").test.text(/\S/))
        .and(getTextInput("native_language").test.text(/\S/))
        .failure(
          newText("demo_error", "Please complete all fields. Age must be numeric.")
            .color("crimson")
            .center()
            .print()
        )
    )
);

newTrial("instructions",
  newText(
    "<div class='fw-card'><h3>Instructions</h3>" +
    "<p>On each item:</p>" +
    "<p>1) Listen to the four prompt words (spoken in random order).</p>" +
    "<p>2) Write one creative sentence that includes all four prompts.</p>" +
    "<p>3) Press <b>Enter</b> to submit.</p>" +
    "<p>You have up to <b>3 minutes</b> per item.</p></div>"
  ).css({"font-size":"22px", "max-width":"1120px", "line-height":"1.45"}).center().print(),
  newButton("Start Practice").center().print().wait()
);

newTrial("pre_practice",
  newText(
    "<div class='fw-card'><h3>Practice</h3>" +
    "<p>You will complete a short practice block first.</p></div>"
  ).css({"font-size":"22px"}).center().print(),
  newButton("Start Practice").center().print().wait()
);

Template("practice.csv", row => buildProductionTrial("practice", row, true));

newTrial("pre_main",
  newText(
    "<div class='fw-card'><h3>Main Experiment</h3>" +
    "<p>The main block starts now. Please write clear, creative, and natural sentences.</p></div>"
  ).css({"font-size":"22px"}).center().print(),
  newButton("Begin").center().print().wait()
);

Template(FOURWORD_ITEMS_FILE, row => buildProductionTrial("trial", row, false));

newTrial("break",
  newText("<div class='fw-card'><h3>Break</h3><p>Take a short break, then press SPACE to continue.</p></div>")
    .css({"font-size":"22px"})
    .center()
    .print(),
  newKey(" ").wait()
);

newTrial("bye",
  newText("<div class='fw-card'><h3>Done</h3><p>Thank you for participating in this study.</p></div>")
    .css({"font-size":"22px"})
    .center()
    .print(),
  newButton("Finish").center().print().wait()
);
