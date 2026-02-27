PennController.ResetPrefix(null);
DebugOff();
SetCounter("setcounter");
PreloadZip("https://raw.githubusercontent.com/utkuturk/tense-timing/norming/chunk_includes/pictures.zip")
const PSYCH_SONA_LINK_BASE = "https://umpsychology.sona-systems.com/webstudy_credit.aspx?experiment_id=2052&credit_token=26041bec45c64b83ba65ac7b05b6bd93&survey_code=";
const LING_SONA_LINK_BASE = "https://umlinguistics.sona-systems.com/webstudy_credit.aspx?experiment_id=528&credit_token=0076a3889d544e94a368b38e997e923d&survey_code=";
var psych_sona_link = PSYCH_SONA_LINK_BASE + GetURLParameter("id");
var ling_sona_link = LING_SONA_LINK_BASE + GetURLParameter("id");

const BREAK_EVERY = 20;
const ANSWER_WINDOW_MS = 15000;

function SepWithN(sep, main, n) {
  this.args = [sep, main];
  this.run = function (arrays) {
    assert(arrays.length === 2, "Wrong number of arguments to SepWithN");
    assert(parseInt(n) > 0, "N must be a positive number");
    const sepArray = arrays[0];
    const mainArray = arrays[1];
    if (mainArray.length <= 1) return mainArray;

    const out = [];
    while (mainArray.length) {
      for (let i = 0; i < n && mainArray.length > 0; i++) out.push(mainArray.pop());
      for (let j = 0; j < sepArray.length && mainArray.length > 0; j++) out.push(sepArray[j]);
    }
    return out;
  };
}

function sepWithN(sep, main, n) {
  return new SepWithN(sep, main, n);
}

Sequence(
  "setcounter",
  "intro",
  "consent",
  "demo",
  "instruction",
  "instruction2",
  "practice_intro",
  "practice_1",
  "practice_2",
  "practice_3",
  "practice_4",
  "exp_start",
  sepWithN("break", rshuffle("experiment", "filler"), BREAK_EVERY),
  "sendresults",
  "debrief",
  "senddebrief",
  "exit_sona"
);

Header(
  newVar("TrialN", 0).global(),
  newVar("RT_answer", 0).global(),
  newVar("source", "").global().set(GetURLParameter("source"))
)
  .log("SONA_ID_URL", GetURLParameter("id"))
  .log("source", GetURLParameter("source"))
  .log("trialN_header", getVar("TrialN"))
  .log("RT_answer_header", getVar("RT_answer"));

const bodyCss = {"font-size": "1.1em", "line-height": "1.45", margin: "0 auto", width: "900px"};
const buttonCss = {"background-color": "#1f6feb", color: "white", "font-size": "1.1em", padding: "0.55em 1.1em", border: "none", "border-radius": "8px"};
const demoLabelCss = {"font-weight": "600", display: "inline-block", width: "260px", "margin-top": "10px"};
const demoInputCss = {
  width: "360px",
  padding: "10px 12px",
  border: "1px solid #b6c2cf",
  "border-radius": "8px",
  "font-size": "1em",
  "background-color": "#fbfdff"
};

const normalizeSentenceCase = (s) =>
  s.replace(/^(The )([A-Z][a-z]+)/, (m, det, noun) => det + noun.toLowerCase());

const ratingBlock = (picture, sentence) => [
  newTimer("pre_trial_blank", 400).start().wait(),
  getVar("TrialN").set((v) => v + 1),
  newImage("stim", picture).size(360, 360).center().print(),
  newText("pic_rating_gap", "").css("height", "24px").print(),
  newText("sentence", sentence).center().css("font-size", "1.25em").css("margin-top", "8px").print(),
  newText("question", "How well does this sentence go with the picture? (1-7)")
    .center()
    .css("margin-top", "16px")
    .print(),
  getVar("RT_answer").set((v) => Date.now()),
  newTimer("answer_timer", ANSWER_WINDOW_MS).start(),
  newScale("rating", "1", "2", "3", "4", "5", "6", "7")
    .before(newText("left", "Very poor fit"))
    .after(newText("right", "Very good fit"))
    .labelsPosition("bottom")
    .keys("1", "2", "3", "4", "5", "6", "7")
    .center()
    .callback(getTimer("answer_timer").stop())
    .log()
    .print(),
  getTimer("answer_timer").wait(),
  getVar("RT_answer").set((v) => Date.now() - v),
  getScale("rating").remove(),
  getText("question").remove(),
  getText("sentence").remove(),
  getText("pic_rating_gap").remove(),
  getImage("stim").remove(),
  newTimer("post_trial_blank", 400).start().wait()
];

newTrial(
  "intro",
  newText(
    "intro_text",
    "<center><b>Welcome!</b></center>" +
      "<p>In this study, you will see pictures depicting simple everyday events. Each picture will be paired with a sentence, and your task is to judge how well the sentence goes with the picture.</p>" +
      "<p>This will help us understand how people connect visual scenes with descriptions of events.</p>" +
      "<p>The study takes approximately <b>30 minutes</b> and consists of a short demographics survey, detailed instructions, four practice trials, and the main experiment.</p>" +
      "<p>Please complete the study on a <b>computer</b> in a quiet environment with minimal distractions.</p>"
  ).css(bodyCss),
  getText("intro_text").print(),
  newButton("intro_continue", "CONTINUE").css(buttonCss).center().print().wait()
).setOption("hideProgressBar", true);

newTrial(
  "consent",
  newText(
    "consent-text",
    "<center><b>Consent Form</b></center>" +
      "<p>Please click <a target='_blank' rel='noopener noreferrer' href='https://utkuturk.com/files/web_consent.pdf'> here</a> to download the consent form for this study. If you read it and agree to participate in this study, click 'I Agree' below. If you do not agree to participate in this study, you can leave this study by closing the tab. You can leave the experiment at any time by closing the tab during the experiment. If you leave the experiment before completion of both parts, you will not be compensated for your time. If you encounter any problems, do not hesitate to reach either of us  via " +
      "SONA or e-mail." +
      // "email. " +
      "<br><br><b> Researchers:</b> <br>Utku Turk, University of Maryland, College Park <i> (utkuturk@umd.edu)</i>,<br>Prof. Shota Momma, University of Massachusetts Amherst, Department of Linguistics"
  ).css(bodyCss),
  getText("consent-text").print(),
  newScale("consent_choice", "I agree to participate")
    .radio()
    .labelsPosition("right")
    .center()
    .print(),
  newButton("consent_continue", "I AGREE")
    .css(buttonCss)
    .center()
    .print()
    .wait(
      getScale("consent_choice")
        .test.selected("I agree to participate")
        .failure(newText("consent_error", "Please confirm consent to continue.").color("red").center().print())
    )
).setOption("hideProgressBar", true);

newTrial(
  "demo",
  newText("demo_title", "Demographics").css("font-size", "1.35em").center().print(),
  newText("demo_hint", "Please fill all required fields (*).").css("margin-bottom", "8px").print(),
//   newTextInput("pid").before(newText("pid_label", "SONA Participant ID*: ")).size("18em", "1.4em").log().print(),
  newTextInput("age")
    .before(newText("age_label", "Age*: ").css(demoLabelCss))
    .log()
    .css(demoInputCss)
    .print(),
  newTextInput("gender")
    .before(newText("gender_label", "Gender*: ").css(demoLabelCss))
    .log()
    .css(demoInputCss)
    .print(),
  newTextInput("location")
    .before(newText("loc_label", "Location (state/country)*: ").css(demoLabelCss))
    .log()
    .css(demoInputCss)
    .print(),
  newTextInput("native_language")
    .before(newText("lang_label", "Native language*: ").css(demoLabelCss))
    .log()
    .css(demoInputCss)
    .print(),
  newButton("demo_continue", "CONTINUE")
    .css(buttonCss)
    .center()
    .print()
    .wait(
      getTextInput("age")
        .test.text(/^\d+$/)
        .and(getTextInput("native_language").testNot.text(""))
        .failure(
          newText("demo_error", "Please fill required fields. Age must be numeric.")
            .color("red")
            .center()
            .print()
        )
    )
).setOption("hideProgressBar", true);

newTrial(
  "instruction",
  newText(
    "instruction_text",
    "<center><b>Instructions</b></center>" +
      "<p>On each trial, you will see a picture and a sentence below it. Your task is to rate <b>how well the sentence goes with the picture</b>.</p>" +
      "<p>Here are two examples to illustrate:</p>" +
      "<ul>" +
      "<li><b>Good fit:</b> A picture of a boy kicking a ball + <i>'The boy kicked a ball.'</i> — The sentence describes the same event as the picture, so this would be a <b>high</b> rating.</li>" +
      "<li><b>Poor fit:</b> A picture of a boy kicking a ball + <i>'The boy will read a book.'</i> — The sentence describes a completely different event, so this would be a <b>low</b> rating.</li>" +
      "</ul>" +
      "<p>You will use a <b>1–7</b> scale, where <b>1</b> means 'Very poor fit' and <b>7</b> means 'Very good fit.'</p>" +
      "<p>Some sentences will be a better fit for their pictures than others — that is expected. There are no right or wrong answers; just go with your first, natural impression.</p>" +
      "<p>You have up to <b>15 seconds</b> per trial to respond. Use the <b>number keys 1–7</b> on your keyboard or click on the scale directly. You will get short breaks periodically throughout the experiment.</p>"
  ).css(bodyCss),
  getText("instruction_text").print(),
  newButton("instruction_continue", "CONTINUE")
    .css(buttonCss)
    .center()
    .print()
    .wait()
).setOption("hideProgressBar", true);

newTrial(
  "instruction2",
  newText(
    "instruction2_text",
    "<center><b>Instructions (continued)</b></center>" +
      "<p>You will see sentences in both <b>past</b> and <b>future</b> tense.</p>" +
      "<ul>" +
      "<li><b>Good fit (past):</b> A picture of a girl planting a flower + <i>'The girl planted a flower.'</i> — Same event, so this would be a <b>high</b> rating.</li>" +
      "<li><b>Good fit (future):</b> A picture of a girl planting a flower + <i>'The girl will plant a flower.'</i> — Same event, so this would also be a <b>high</b> rating.</li>" +
      "<li><b>Poor fit (past):</b> A picture of a girl planting a flower + <i>'The girl rode a bicycle.'</i> — Different event, so this would be a <b>low</b> rating.</li>" +
      "<li><b>Poor fit (future):</b> A picture of a girl planting a flower + <i>'The girl will ride a bicycle.'</i> — Different event, so this would also be a <b>low</b> rating.</li>" +
      "</ul>" +
      "<p>In short, consider both <b>when</b> the sentence places the event (past/future) and <b>what event</b> it describes.</p>"
  ).css(bodyCss),
  getText("instruction2_text").print(),
  newButton("instruction2_continue", "See practice items")
    .css(buttonCss)
    .center()
    .print()
    .wait()
).setOption("hideProgressBar", true);

newTrial(
  "practice_intro",
  newText(
    "practice_intro_text",
    "You will now complete <b>four practice trials</b>. After each trial, you will see feedback explaining the expected rating."
  ).css(bodyCss).center().print(),
  newButton("practice_intro_continue", "START PRACTICE").css(buttonCss).center().print().wait()
).setOption("hideProgressBar", true);

// Practice 1: Past tense, same event — expected GOOD fit (6-7)
newTrial(
  "practice_1",
  newTimer("pre_trial_blank", 400).start().wait(),
  getVar("TrialN").set((v) => v + 1),
  newImage("stim", "pirate_build_tower_v3.png").size(360, 360).center().print(),
  newText("pic_rating_gap", "").css("height", "24px").print(),
  newText("sentence", "The pirate built a tower.")
    .center().css("font-size", "1.25em").css("margin-top", "8px").print(),
  newText("question", "How well does this sentence go with the picture? (1-7)")
    .center().css("margin-top", "16px").print(),
  getVar("RT_answer").set((v) => Date.now()),
  newTimer("answer_timer", ANSWER_WINDOW_MS).start(),
  newScale("rating", "1", "2", "3", "4", "5", "6", "7")
    .before(newText("left", "Very poor fit"))
    .after(newText("right", "Very good fit"))
    .labelsPosition("bottom")
    .keys("1", "2", "3", "4", "5", "6", "7")
    .center()
    .callback(getTimer("answer_timer").stop())
    .log()
    .print(),
  getTimer("answer_timer").wait(),
  getVar("RT_answer").set((v) => Date.now() - v),
  newText("feedback",
    "<b>Feedback:</b> This is a <b>good fit</b>. The sentence describes exactly what is happening in the picture. " +
    "Typically rated toward the <b>higher end</b> of the scale (e.g., 6–7)."
  ).center()
    .css("margin-top", "20px").css("padding", "12px 16px")
    .css("background-color", "#f0f7ff").css("border-radius", "8px")
    .css("border-left", "4px solid #1f6feb")
    .print(),
  newButton("practice_continue", "CONTINUE").css(buttonCss).center().print().wait()
)
  .log("trialN", getVar("TrialN"))
  .log("RT-answer", getVar("RT_answer"))
  .setOption("hideProgressBar", true);

// Practice 2: Past tense, different event — expected POOR fit (1-2)
newTrial(
  "practice_2",
  newTimer("pre_trial_blank", 400).start().wait(),
  getVar("TrialN").set((v) => v + 1),
  newImage("stim", "chef_paint_canvas_v3.png").size(360, 360).center().print(),
  newText("pic_rating_gap", "").css("height", "24px").print(),
  newText("sentence", "The chef dug a hole.")
    .center().css("font-size", "1.25em").css("margin-top", "8px").print(),
  newText("question", "How well does this sentence go with the picture? (1-7)")
    .center().css("margin-top", "16px").print(),
  getVar("RT_answer").set((v) => Date.now()),
  newTimer("answer_timer", ANSWER_WINDOW_MS).start(),
  newScale("rating", "1", "2", "3", "4", "5", "6", "7")
    .before(newText("left", "Very poor fit"))
    .after(newText("right", "Very good fit"))
    .labelsPosition("bottom")
    .keys("1", "2", "3", "4", "5", "6", "7")
    .center()
    .callback(getTimer("answer_timer").stop())
    .log()
    .print(),
  getTimer("answer_timer").wait(),
  getVar("RT_answer").set((v) => Date.now() - v),
  newText("feedback",
    "<b>Feedback:</b> This is a <b>poor fit</b>. The picture shows a chef painting, but the sentence is about digging a hole — a completely different event. " +
    "Typically rated toward the <b>lower end</b> of the scale (e.g., 1–2)."
  ).center()
    .css("margin-top", "20px").css("padding", "12px 16px")
    .css("background-color", "#fff5f5").css("border-radius", "8px")
    .css("border-left", "4px solid #cf222e")
    .print(),
  newButton("practice_continue", "CONTINUE").css(buttonCss).center().print().wait()
)
  .log("trialN", getVar("TrialN"))
  .log("RT-answer", getVar("RT_answer"))
  .setOption("hideProgressBar", true);

// Practice 3: Future tense, same event — expected GOOD fit (5-7)
newTrial(
  "practice_3",
  newTimer("pre_trial_blank", 400).start().wait(),
  getVar("TrialN").set((v) => v + 1),
  newImage("stim", "wizard_stir_pot_v2.png").size(360, 360).center().print(),
  newText("pic_rating_gap", "").css("height", "24px").print(),
  newText("sentence", "The wizard will stir a pot.")
    .center().css("font-size", "1.25em").css("margin-top", "8px").print(),
  newText("question", "How well does this sentence go with the picture? (1-7)")
    .center().css("margin-top", "16px").print(),
  getVar("RT_answer").set((v) => Date.now()),
  newTimer("answer_timer", ANSWER_WINDOW_MS).start(),
  newScale("rating", "1", "2", "3", "4", "5", "6", "7")
    .before(newText("left", "Very poor fit"))
    .after(newText("right", "Very good fit"))
    .labelsPosition("bottom")
    .keys("1", "2", "3", "4", "5", "6", "7")
    .center()
    .callback(getTimer("answer_timer").stop())
    .log()
    .print(),
  getTimer("answer_timer").wait(),
  getVar("RT_answer").set((v) => Date.now() - v),
  newText("feedback",
    "<b>Feedback:</b> This is a <b>good fit</b>. The sentence describes the same event as the picture. " +
    "Typically rated toward the <b>higher end</b> of the scale (e.g., 5–7)."
  ).center()
    .css("margin-top", "20px").css("padding", "12px 16px")
    .css("background-color", "#f0f7ff").css("border-radius", "8px")
    .css("border-left", "4px solid #1f6feb")
    .print(),
  newButton("practice_continue", "CONTINUE").css(buttonCss).center().print().wait()
)
  .log("trialN", getVar("TrialN"))
  .log("RT-answer", getVar("RT_answer"))
  .setOption("hideProgressBar", true);

// Practice 4: Future tense, different event — expected POOR fit (1-2)
newTrial(
  "practice_4",
  newTimer("pre_trial_blank", 400).start().wait(),
  getVar("TrialN").set((v) => v + 1),
  newImage("stim", "wizard_sweep_floor_v3.png").size(360, 360).center().print(),
  newText("pic_rating_gap", "").css("height", "24px").print(),
  newText("sentence", "The wizard will read a book.")
    .center().css("font-size", "1.25em").css("margin-top", "8px").print(),
  newText("question", "How well does this sentence go with the picture? (1-7)")
    .center().css("margin-top", "16px").print(),
  getVar("RT_answer").set((v) => Date.now()),
  newTimer("answer_timer", ANSWER_WINDOW_MS).start(),
  newScale("rating", "1", "2", "3", "4", "5", "6", "7")
    .before(newText("left", "Very poor fit"))
    .after(newText("right", "Very good fit"))
    .labelsPosition("bottom")
    .keys("1", "2", "3", "4", "5", "6", "7")
    .center()
    .callback(getTimer("answer_timer").stop())
    .log()
    .print(),
  getTimer("answer_timer").wait(),
  getVar("RT_answer").set((v) => Date.now() - v),
  newText("feedback",
    "<b>Feedback:</b> This is a <b>poor fit</b>. The picture shows a wizard sweeping, but the sentence is about reading a book — a different event. " +
    "Typically rated toward the <b>lower end</b> of the scale (e.g., 1–2)."
  ).center()
    .css("margin-top", "20px").css("padding", "12px 16px")
    .css("background-color", "#fff5f5").css("border-radius", "8px")
    .css("border-left", "4px solid #cf222e")
    .print(),
  newButton("practice_continue", "CONTINUE").css(buttonCss).center().print().wait()
)
  .log("trialN", getVar("TrialN"))
  .log("RT-answer", getVar("RT_answer"))
  .setOption("hideProgressBar", true);

newTrial(
  "exp_start",
  newText(
    "exp_start_text",
    "<center><b>Main experiment starts now</b></center>" +
      "<p>Please keep your attention on the screen and respond on every trial.</p>" +
      "<p>You will get short breaks during the task.</p>"
  ).css(bodyCss),
  getText("exp_start_text").print(),
  newButton("exp_start_continue", "CONTINUE")
    .css(buttonCss)
    .center()
    .print()
    .wait()
).setOption("hideProgressBar", true);

newTrial(
  "break",
  newText("break_text", "Short break. Press space to continue anytime (break auto-ends after couple minutes).")
    .center()
    .css("font-size", "1.2em")
    .print(),
  newTimer("break_timer", 300000).start(),
  newKey(" ")
    .callback(getTimer("break_timer").stop()),
  getTimer("break_timer").wait()
);

Template(GetTable("items.csv").setGroupColumn("group"), row =>
  newTrial(
    "experiment",
    ...ratingBlock(row.picture, normalizeSentenceCase(row.sentence))
  )
    .log("trialN", getVar("TrialN"))
    .log("RT-answer", getVar("RT_answer"))
    .log("item_id", row.item_id)
    .log("group", row.group)
    .log("character", row.character)
    .log("verb", row.verb)
    .log("past_form", row.past_form)
    .log("type", row.type)
    .log("picture", row.picture)
    .log("tense", row.tense)
    .log("sentence", row.sentence)
);

Template(GetTable("fillers.csv").setGroupColumn("group"), row =>
  newTrial(
    "filler",
    ...ratingBlock(row.picture, normalizeSentenceCase(row.sentence))
  )
    .log("trialN", getVar("TrialN"))
    .log("RT-answer", getVar("RT_answer"))
    .log("item_id", row.item_id)
    .log("group", row.group)
    .log("character", row.character)
    .log("verb", row.verb)
    .log("past_form", row.past_form)
    .log("type", row.type)
    .log("picture", row.picture)
    .log("tense", row.tense)
    .log("sentence", row.sentence)
);

SendResults("sendresults");
SendResults("senddebrief");

newTrial(
  "debrief",
  newText(
    "debrief_text",
    "<center><b>Debrief</b></center>" +
      "<p>This study examines how people plan tense information during real-time language production.</p>" +
      "<p>We are testing when tense is planned at different levels of representation:</p>" +
      "<p>1) <b>Conceptual planning</b> (event-time meaning),</p>" +
      "<p>2) <b>Syntactic planning</b> (grammatical tense features), and</p>" +
      "<p>3) <b>Morphophonological planning</b> (the form used to express tense).</p>" +
      "<p>In these experiments we are going to use certain images that you have seen here. Your responses help us create a baseline for understanding how good of a fit these images are for the sentences.</p>" +
      "<p>Thank you for helping with this research.</p>" +
      "<p>If you have any questions or interest in this project, feel free to contact the researcher at <a href='mailto:utkuturk@umd.edu'>utkuturk@umd.edu</a>.</p>"
  ).css(bodyCss).print(),
  newText("d_q1", "Did you experience any technical issues during the study?").print(),
  newScale("tech_issues", "No", "Yes")
    .radio()
    .labelsPosition("right")
    .log()
    .print(),
  newText("d_q2", "How clear were the instructions overall?").css("margin-top", "12px").print(),
  newScale("instruction_clarity", "1", "2", "3", "4", "5")
    .labelsPosition("bottom")
    .keys("1", "2", "3", "4", "5")
    .log()
    .print(),
  newText("feedback_label", "Optional feedback: anything confusing, unclear, or notable?").css("margin-top", "12px").print(),
  newTextInput("feedback")
    .lines(4)
    .size("900px", "120px")
    .log()
    .print(),
  newButton("debrief_continue", "Continue")
    .css(buttonCss)
    .center()
    .print()
    .wait(),
).setOption("hideProgressBar", true);

newTrial(
  "exit_sona",
  newText("exit_thanks",
    "<center><b>Thank you for participating!</b></center>"
  ).css(bodyCss).print(),
  newText("exit_sona_msg",
    "<p>You can confirm your participation on SONA by clicking the link below:</p>"
  ).css(bodyCss),
  newText("psych_link",
    "<p><a href='" + psych_sona_link + "'>Confirm your participation.</a></p>"
  ).css(bodyCss),
  newText("ling_link",
    "<p><a href='" + ling_sona_link + "'>Confirm your participation.</a></p>"
  ).css(bodyCss),
  newText("fallback_msg",
    "<p>Thank you for your participation. Your credit will be approved within 3 days after the due date of the experiment.</p>"
  ).css(bodyCss),
  getVar("source").test.is("psych")
    .success(
      getText("exit_sona_msg").print(),
      getText("psych_link").print()
    )
    .failure(
      getVar("source").test.is("ling")
        .success(
          getText("exit_sona_msg").print(),
          getText("ling_link").print()
        )
        .failure(getText("fallback_msg").print())
    ),
  newText("exit_close",
    "<p>When you are finished, you may close this tab.</p>"
  ).css(bodyCss).print(),
  newButton().wait()
).setOption("hideProgressBar", true);
