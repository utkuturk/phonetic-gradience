/* =========================================================
   GENERAL
   ========================================================= */
PennController.ResetPrefix(null);
DebugOff();
PreloadZip("https://raw.githubusercontent.com/utkuturk/phonetic-gradience/main/audio-zips/preamble-followup-choice-audio-audio.zip");
//https://github.com/utkuturk/phonetic-gradience/blob/main/audio-zips/preamble-followup-choice-audio-audio.zip
const PREAMBLE_LISTS = ["A", "B", "C", "D"];
const PREAMBLE_LIST_URL = (GetURLParameter("list") || "").toUpperCase();
const PREAMBLE_LIST = PREAMBLE_LISTS.includes(PREAMBLE_LIST_URL)
  ? PREAMBLE_LIST_URL
  : PREAMBLE_LISTS[Math.floor(Math.random() * PREAMBLE_LISTS.length)];
const PREAMBLE_ITEMS_FILE = "items_LS_" + PREAMBLE_LIST + ".csv";
const LEFT_KEY = Math.random() < 0.5 ? "F" : "J";
const RIGHT_KEY = LEFT_KEY === "F" ? "J" : "F";
const ANSWER_WINDOW_MS = 120000;

/* =========================================================
   HEADER
   ========================================================= */
Header(
  newVar("SID").global(),
  newVar("LIST").global(),
  newVar("LeftKey").global(),
  newVar("RightKey").global(),
  newVar("TrialN", 0).global(),
  newVar("RT").global()
)
  .log("PROLIFIC_ID", GetURLParameter("id"))
  .log("SID", getVar("SID"))
  .log("LIST", getVar("LIST"))
  .log("LeftKey", getVar("LeftKey"))
  .log("RightKey", getVar("RightKey"))
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

function ensurePreambleTheme() {
  if (window.__preambleThemeLoaded) return;
  window.__preambleThemeLoaded = true;
  const style = document.createElement("style");
  style.id = "preamble-theme";
  style.textContent = `
    body {
      font-family: "Avenir Next", "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(160deg, #edf3ff 0%, #f8fbff 45%, #eef7f3 100%);
      color: #13253b;
    }
    .preamble-card {
      max-width: 1120px;
      margin: 10px auto;
      padding: 22px 26px;
      background: rgba(255,255,255,0.94);
      border: 1px solid #d5e1f0;
      border-radius: 16px;
      box-shadow: 0 12px 28px rgba(15, 42, 77, 0.08);
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
  `;
  document.head.appendChild(style);
}
ensurePreambleTheme();

function buildChoiceTrial(label, row, withFeedback = false) {
  const preambleFile = (row.preamble_audio || "").replace(/^audio\//, "");
  const correctSide = row.correct_key === "F"
    ? "left"
    : (row.correct_key === "J" ? "right" : "NA");

  let scoring = getVar("Accuracy").set("NA");
  if (correctSide === "left" || correctSide === "right") {
    scoring = getVar("ChoiceSide").test.is(correctSide)
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
    newVar("Timeout").set("0"),

    newText("listen", "<div class='preamble-card'><b>Listen</b> to the preamble, then choose the best continuation.</div>")
      .css({"font-size":"22px", "line-height":"1.45"})
      .cssContainer({"max-width":"1120px","margin":"0 auto"})
      .center()
      .print(),

    newAudio("preamble_audio", preambleFile),
    getAudio("preamble_audio").play().wait("first"),

    newButton("Replay preamble")
      .center()
      .print()
      .callback(getAudio("preamble_audio").play()),

    newText("left_opt", row.option_left)
      .css({
        "font-size":"22px",
        "padding":"16px 18px",
        "border":"1px solid #c4d2e4",
        "border-radius":"12px",
        "background":"#f6f9ff",
        "line-height":"1.35",
        "min-height":"72px",
        "width":"430px",
        "box-sizing":"border-box",
        "text-align":"left",
        "margin":"0"
      }),

    newText("right_opt", row.option_right)
      .css({
        "font-size":"22px",
        "padding":"16px 18px",
        "border":"1px solid #c4d2e4",
        "border-radius":"12px",
        "background":"#f6f9ff",
        "line-height":"1.35",
        "min-height":"72px",
        "width":"430px",
        "box-sizing":"border-box",
        "text-align":"left",
        "margin":"0"
      }),

    newCanvas("opts", 884, 96)
      .cssContainer({"max-width":"920px","margin":"2px auto 0 auto"})
      .add(0, 0, getText("left_opt"))
      .add(454, 0, getText("right_opt"))
      .center()
      .print(),

    getVar("RT").set(() => Date.now()),

    newTimer("answer_timer", ANSWER_WINDOW_MS).start(),
    newKey("choice_key", "FJ")
      .log()
      .callback(getTimer("answer_timer").stop()),

    getTimer("answer_timer").wait(),

    getVar("RT").set(v => Date.now() - v),

    getKey("choice_key").test.pressed(LEFT_KEY)
      .success(
        getVar("ChoiceSide").set("left"),
        getVar("ChoiceKey").set(LEFT_KEY)
      )
      .failure(
        getKey("choice_key").test.pressed(RIGHT_KEY)
          .success(
            getVar("ChoiceSide").set("right"),
            getVar("ChoiceKey").set(RIGHT_KEY)
          )
          .failure(
            getVar("ChoiceSide").set("NA"),
            getVar("ChoiceKey").set("TIMEOUT"),
            getVar("Timeout").set("1")
          )
      ),

    getVar("Timeout").test.is("1")
      .success(
        newText("timeout_note", "Time is up. Moving to the next item.")
          .css({"font-size":"17px","margin-top":"0.6em","color":"#4b5563"})
          .center()
          .print(),
        newTimer("timeout_note_t", 500).start().wait()
      ),

    scoring,
    afterChoice
  )
  .log("item", row.item)
  .log("cond", row.cond)
  .log("item_type", row.item_type)
  .log("preamble_text", row.preamble_text)
  .log("preamble_audio", row.preamble_audio)
  .log("preamble_audio_resolved", preambleFile)
  .log("option_left", row.option_left)
  .log("option_right", row.option_right)
  .log("correct_key", row.correct_key)
  .log("expected", row.expected)
  .log("LeftKey", LEFT_KEY)
  .log("RightKey", RIGHT_KEY)
  .log("ChoiceSide", getVar("ChoiceSide"))
  .log("ChoiceKey", getVar("ChoiceKey"))
  .log("Accuracy", getVar("Accuracy"))
  .log("RT", getVar("RT"))
  .log("DecisionRT_ms", getVar("RT"))
  .log("Timeout", getVar("Timeout"));

  return trial;
}

/* =========================================================
   PAGES
   ========================================================= */
newTrial("intro",
  getVar("SID").set(makeSubjectID()),
  getVar("LIST").set(PREAMBLE_LIST),
  getVar("LeftKey").set(LEFT_KEY),
  getVar("RightKey").set(RIGHT_KEY),
  newText(
    "<div class='preamble-card'><h3>Welcome</h3>" +
    "<p>In this study, you will hear short spoken preambles and choose which written continuation fits best.</p>" +
    "<p>Please use headphones and complete the study in a quiet setting.</p>" +
    "<p>Your keys: <b>" + LEFT_KEY + " = LEFT</b> and <b>" + RIGHT_KEY + " = RIGHT</b>.</p>" +
    "<p>You have up to <b>2 minutes</b> to respond on each item.</p></div>"
  ).css({"font-size":"22px", "max-width":"1120px", "line-height":"1.45"}).center().print(),
  newButton("Continue").center().print().wait()
);

newTrial("consent",
  newText(
    "<div class='preamble-card'><h3>Consent</h3>" +
    "<p>By continuing, you confirm that you are 18 or older and that you agree to participate in this research study.</p>" +
    "<p>Researchers: <b>Utku Turk</b> and <b>Kate Mooney</b>.</p></div>"
  ).css({"font-size":"22px"}).center().print(),
  newButton("I Agree").center().print().wait()
);

newTrial("demo",
  newText(
    "<div class='preamble-card'><h3>Demographics</h3>" +
    "<p>Please complete the following fields before continuing.</p></div>"
  ).css({"font-size":"22px"}).center().print(),

  newText("age_label", "Age").css({"font-size":"18px","font-weight":"600","margin-top":"8px"}).center().print(),
  newTextInput("age").size("420px","44px").css({"font-size":"18px","padding":"8px 10px"}).center().log().print(),

  newText("gender_label", "Gender").css({"font-size":"18px","font-weight":"600","margin-top":"8px"}).center().print(),
  newTextInput("gender").size("420px","44px").css({"font-size":"18px","padding":"8px 10px"}).center().log().print(),

  newText("location_label", "Location (state/country)").css({"font-size":"18px","font-weight":"600","margin-top":"8px"}).center().print(),
  newTextInput("location").size("420px","44px").css({"font-size":"18px","padding":"8px 10px"}).center().log().print(),

  newText("lang_label", "Native language").css({"font-size":"18px","font-weight":"600","margin-top":"8px"}).center().print(),
  newTextInput("native_language").size("420px","44px").css({"font-size":"18px","padding":"8px 10px"}).center().log().print(),

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
    "<div class='preamble-card'><h3>Instructions</h3>" +
    "<p>On each item, you will hear a short preamble and then choose the continuation that fits best.</p>" +
    "<p>Use the <b>F</b> and <b>J</b> keys to select a continuation.</p>" +
    "<p>Your key mapping in this session is: <b>" + LEFT_KEY + " = LEFT</b> and <b>" + RIGHT_KEY + " = RIGHT</b>.</p>" +
    "<p>If needed, you can replay the preamble before choosing.</p></div>"
  ).css({"font-size":"22px", "max-width":"1120px", "line-height":"1.45"}).center().print(),
  newButton("Start Practice").center().print().wait()
);

newTrial("pre_practice",
  newText(
    "<div class='preamble-card'><h3>Practice</h3>" +
    "<p>You will complete a short practice block first. Feedback is shown only in practice.</p></div>"
  ).css({"font-size":"22px"}).center().print(),
  newButton("Start Practice").center().print().wait()
);

Template("practice.csv", row => buildChoiceTrial("practice", row, true));

newTrial("pre_main",
  newText(
    "<div class='preamble-card'><h3>Main Experiment</h3>" +
    "<p>The main block starts now. Please answer as naturally and accurately as you can.</p></div>"
  ).css({"font-size":"22px"}).center().print(),
  newButton("Begin").center().print().wait()
);

Template(PREAMBLE_ITEMS_FILE, row => buildChoiceTrial("trial", row, false));

newTrial("break",
  newText("<div class='preamble-card'><h3>Break</h3><p>Take a short break, then press SPACE to continue.</p></div>")
    .css({"font-size":"22px"})
    .center()
    .print(),
  newKey(" ").wait()
);

newTrial("bye",
  newText("<div class='preamble-card'><h3>Done</h3><p>Thank you for participating in this study.</p></div>")
    .css({"font-size":"22px"})
    .center()
    .print(),
  newButton("Finish").center().print().wait()
);
