/* =========================================================
   GENERAL
   ========================================================= */
PennController.ResetPrefix(null);
DebugOff();

const FOURWORD_LISTS = ["A", "B"];
const FOURWORD_LIST_URL = (GetURLParameter("list") || "").toUpperCase();
const FOURWORD_LIST = FOURWORD_LISTS.includes(FOURWORD_LIST_URL)
  ? FOURWORD_LIST_URL
  : FOURWORD_LISTS[Math.floor(Math.random() * FOURWORD_LISTS.length)];
const FOURWORD_ITEMS_FILE = "items_LS_" + FOURWORD_LIST + ".csv";

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

function wordsHTML(row) {
  return [row.word1, row.word2, row.word3, row.word4]
    .map(w => `<span style="padding:8px 12px;border:1px solid #b8bcc4;border-radius:8px;background:#f8fafc;font-size:24px;">${w}</span>`)
    .join("&nbsp;&nbsp;");
}

function buildProductionTrial(label, row, withFeedback = false) {
  const trial = newTrial(label,
    getVar("TrialN").set(v => v + 1),

    newText("task",
      "<b>Create one creative sentence</b> using all 4 prompt words. " +
      "One prompt is intentionally phonetic/ambiguous in some items; use the interpretation you hear."
    ).css({"font-size":"22px", "max-width":"1000px", "line-height":"1.4"}).center().print(),

    newText("words", wordsHTML(row)).center().print(),

    newText("auditory_label", "Spoken prompt:")
      .css({"font-size":"19px", "margin-top":"1em"})
      .center()
      .print(),

    newAudio("word_audio", row.audio_file),
    getAudio("word_audio").play(),

    newButton("Replay spoken prompt")
      .center()
      .print()
      .callback(getAudio("word_audio").play()),

    newText("reminder", "Type your sentence below. Minimum length: 15 characters.")
      .css({"font-size":"18px", "margin-top":"1em"})
      .center()
      .print(),

    newTextInput("response")
      .lines(3)
      .size("920px", "120px")
      .css({"font-size":"20px", "padding":"8px"})
      .center()
      .log("validate")
      .print(),

    getVar("RT").set(() => Date.now()),

    newButton("Submit sentence")
      .css({"margin-top":"1em"})
      .center()
      .print()
      .wait(
        getTextInput("response")
          .test.text(/^.{15,700}$/)
          .failure(newText("Please write at least 15 characters.").color("crimson").center().print())
      ),

    getVar("RT").set(v => Date.now() - v),

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
  .log("RT", getVar("RT"));

  return trial;
}

/* =========================================================
   PAGES
   ========================================================= */
newTrial("intro",
  getVar("SID").set(makeSubjectID()),
  getVar("LIST").set(FOURWORD_LIST),
  newText(
    "<h3>Welcome</h3>" +
    "<p>You will get <b>4 prompt words</b> and write one creative English sentence.</p>" +
    "<p>Critical items use two sound conditions (sound 1 vs sound 2) with the same other prompt words.</p>" +
    "<p>You are assigned to list <b>" + FOURWORD_LIST + "</b>.</p>" +
    "<p>Please write natural, grammatical, and original sentences.</p>"
  ).css({"font-size":"22px", "max-width":"1000px", "line-height":"1.45"}).center().print(),
  newButton("Continue").center().print().wait()
);

newTrial("consent",
  newText(
    "<h3>Consent</h3>" +
    "<p>By continuing, you confirm you are 18+ and consent to participate.</p>"
  ).css({"font-size":"22px"}).center().print(),
  newButton("I Agree").center().print().wait()
);

newTrial("pre_practice",
  newText(
    "<h3>Practice</h3>" +
    "<p>You will complete a few practice trials first.</p>"
  ).css({"font-size":"22px"}).center().print(),
  newButton("Start Practice").center().print().wait()
);

Template("practice.csv", row => buildProductionTrial("practice", row, true));

newTrial("pre_main",
  newText(
    "<h3>Main Experiment</h3>" +
    "<p>Now the full experiment starts. Some spoken prompts are deliberately ambiguous.</p>"
  ).css({"font-size":"22px"}).center().print(),
  newButton("Begin").center().print().wait()
);

Template(FOURWORD_ITEMS_FILE, row => buildProductionTrial("trial", row, false));

newTrial("break",
  newText("<h3>Break</h3><p>Take a short break, then press SPACE to continue.</p>")
    .css({"font-size":"22px"})
    .center()
    .print(),
  newKey(" ").wait()
);

newTrial("bye",
  newText("<h3>Done</h3><p>Thank you for participating.</p>")
    .css({"font-size":"22px"})
    .center()
    .print(),
  newButton("Finish").center().print().wait()
);
