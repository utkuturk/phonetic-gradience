/* =========================================================
   GENERAL
   ========================================================= */
PennController.ResetPrefix(null);
DebugOff();

const PREAMBLE_LISTS = ["A", "B", "C", "D"];
const PREAMBLE_LIST_URL = (GetURLParameter("list") || "").toUpperCase();
const PREAMBLE_LIST = PREAMBLE_LISTS.includes(PREAMBLE_LIST_URL)
  ? PREAMBLE_LIST_URL
  : PREAMBLE_LISTS[Math.floor(Math.random() * PREAMBLE_LISTS.length)];
const PREAMBLE_ITEMS_FILE = "items_LS_" + PREAMBLE_LIST + ".csv";

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

function buildChoiceTrial(label, row, withFeedback = false) {
  let scoring = getVar("Accuracy").set("NA");
  if (row.correct_key === "F") {
    scoring = getSelector("choice").test.selected(getText("left_opt"))
      .success(getVar("Accuracy").set("1"))
      .failure(getVar("Accuracy").set("0"));
  } else if (row.correct_key === "J") {
    scoring = getSelector("choice").test.selected(getText("right_opt"))
      .success(getVar("Accuracy").set("1"))
      .failure(getVar("Accuracy").set("0"));
  }

  let afterChoice = newTimer("isi", 250).start().wait();
  if (withFeedback && (row.correct_key === "F" || row.correct_key === "J")) {
    afterChoice = getVar("Accuracy").test.is("1")
      .success(
        newText("fb_ok", "Correct").color("green").center().print(),
        newTimer("fb_ok_t", 450).start().wait()
      )
      .failure(
        newText("fb_bad", "Incorrect").color("crimson").center().print(),
        newTimer("fb_bad_t", 700).start().wait()
      );
  }

  const trial = newTrial(label,
    getVar("TrialN").set(v => v + 1),
    newVar("ChoiceSide").set(""),
    newVar("ChoiceKey").set(""),
    newVar("Accuracy").set("NA"),

    newText("listen", "Listen to the preamble, then choose the best follow-up.")
      .css({"font-size":"22px"})
      .center()
      .print(),

    newAudio("preamble_audio", row.preamble_audio),
    getAudio("preamble_audio").play().wait("first"),

    newButton("Replay preamble")
      .center()
      .print()
      .callback(getAudio("preamble_audio").play()),

    newText("prompt", "Choose: <b>F = LEFT</b> and <b>J = RIGHT</b>")
      .css({"font-size":"20px", "margin-top":"1em"})
      .center()
      .print(),

    newText("left_opt", row.option_left)
      .css({"font-size":"22px", "padding":"10px", "border":"1px solid #b8bcc4", "border-radius":"8px", "background":"#f8fafc"}),

    newText("right_opt", row.option_right)
      .css({"font-size":"22px", "padding":"10px", "border":"1px solid #b8bcc4", "border-radius":"8px", "background":"#f8fafc"}),

    newCanvas("opts", 1200, 160)
      .add(60, 40, getText("left_opt"))
      .add(640, 40, getText("right_opt"))
      .center()
      .print(),

    getVar("RT").set(() => Date.now()),

    newSelector("choice")
      .add(getText("left_opt"), getText("right_opt"))
      .keys("F", "J")
      .once()
      .log()
      .wait(),

    getVar("RT").set(v => Date.now() - v),

    getSelector("choice").test.selected(getText("left_opt"))
      .success(
        getVar("ChoiceSide").set("left"),
        getVar("ChoiceKey").set("F")
      )
      .failure(
        getVar("ChoiceSide").set("right"),
        getVar("ChoiceKey").set("J")
      ),

    scoring,
    afterChoice
  )
  .log("item", row.item)
  .log("cond", row.cond)
  .log("item_type", row.item_type)
  .log("preamble_text", row.preamble_text)
  .log("preamble_audio", row.preamble_audio)
  .log("option_left", row.option_left)
  .log("option_right", row.option_right)
  .log("correct_key", row.correct_key)
  .log("expected", row.expected)
  .log("ChoiceSide", getVar("ChoiceSide"))
  .log("ChoiceKey", getVar("ChoiceKey"))
  .log("Accuracy", getVar("Accuracy"))
  .log("RT", getVar("RT"));

  return trial;
}

/* =========================================================
   PAGES
   ========================================================= */
newTrial("intro",
  getVar("SID").set(makeSubjectID()),
  getVar("LIST").set(PREAMBLE_LIST),
  newText(
    "<h3>Welcome</h3>" +
    "<p>You will hear a short preamble and then choose a follow-up continuation.</p>" +
    "<p>Critical items use a 2x2 design: sound cue (1 vs 2) crossed with text-support context (1 vs 2).</p>" +
    "<p>You are assigned to list <b>" + PREAMBLE_LIST + "</b>.</p>" +
    "<p>Respond by pressing <b>F</b> for the left option and <b>J</b> for the right option.</p>"
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
    "<p>You will complete a few practice trials with feedback.</p>"
  ).css({"font-size":"22px"}).center().print(),
  newButton("Start Practice").center().print().wait()
);

Template("practice.csv", row => buildChoiceTrial("practice", row, true));

newTrial("pre_main",
  newText(
    "<h3>Main Experiment</h3>" +
    "<p>The main block starts now. Critical ambiguous items may not have a single correct answer.</p>"
  ).css({"font-size":"22px"}).center().print(),
  newButton("Begin").center().print().wait()
);

Template(PREAMBLE_ITEMS_FILE, row => buildChoiceTrial("trial", row, false));

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
