// SPDX-License-Identifier: GPL-3.0-or-later
// 现实情景模式：把囚徒困境包装成 996、寝室、小组作业等故事关卡
(function () {
  "use strict";

  var SCENARIOS = [
    {
      id: "overtime",
      icon: "💼",
      tag: "职场博弈",
      title: "996 加班博弈",
      playerName: "你（员工）",
      resourceName: "项目进度",
      unit: "周",
      rounds: 5,
      cooperateLabel: "加班",
      defectLabel: "准点下班",
      cooperateSub: "我 -1 精力 / 团队 +3 进度",
      defectSub: "我 0 / 团队 0",
      intro: "公司项目进入连续冲刺阶段。每一周，你和三位同事都要决定：加班推进，还是准点下班？加班会消耗你的精力，但能帮团队整体进度。",
      ai: [
        { name: "同事小王", bias: 0.80, desc: "卷王，习惯加班" },
        { name: "同事小李", bias: 0.50, desc: "随大流，看情况" },
        { name: "同事小张", bias: 0.20, desc: "想准点下班" }
      ],
      endings: {
        allCoop: { icon: "🔥", title: "全员爆肝", desc: "大家都选择加班，项目进展飞快，但每个人都筋疲力尽——高收益伴随着高消耗。" },
        allDefect: { icon: "😮‍💨", title: "集体拖延", desc: "没有人愿意先付出，项目陷入停滞，所有人都没有获益。" },
        freeRide: { icon: "🛋️", title: "搭便车者", desc: "你常准点下班，却享受了同事们加班带来的团队进度。短期占优，长期可能失去信任。" },
        betrayed: { icon: "😤", title: "被搭便车的付出者", desc: "你常加班，却总有人准点下班。你的付出被部分人利用，这可能让你感到不公平。" },
        mixed: { icon: "⚖️", title: "分化的工作氛围", desc: "团队里有人拼命、有人观望，收益分配明显不均。" }
      },
      lesson: "996 加班并不只是个人选择，而是群体博弈的结果。当每个人都想“我不加班让别人加”，最终可能集体陷入更差的境地。理解这一点，才能讨论制度如何改变博弈规则。"
    },
    {
      id: "dorm",
      icon: "🧹",
      tag: "宿舍协作",
      title: "寝室大扫除",
      playerName: "你（室友）",
      resourceName: "整洁度",
      unit: "天",
      rounds: 5,
      cooperateLabel: "主动打扫",
      defectLabel: "等别人",
      cooperateSub: "我 -1 精力 / 宿舍 +3 整洁度",
      defectSub: "我 0 / 宿舍 0",
      intro: "宿舍已经有点乱了。每一天，你和三位室友都要决定：主动打扫，还是等别人先动手？主动打扫会花精力，但宿舍会更整洁。",
      ai: [
        { name: "室友阿泽", bias: 0.75, desc: "爱干净，常主动" },
        { name: "室友阿凯", bias: 0.45, desc: "能拖就拖" },
        { name: "室友阿杰", bias: 0.15, desc: "几乎不主动" }
      ],
      endings: {
        allCoop: { icon: "✨", title: "五星宿舍", desc: "大家都主动打扫，宿舍一直很整洁，每个人都付出了精力。" },
        allDefect: { icon: "🦠", title: "垃圾场宿舍", desc: "大家都在等别人先动手，宿舍越来越乱，没有人真正获益。" },
        freeRide: { icon: "😎", title: "偷懒赢家", desc: "你总是等别人打扫，却享受了干净的环境。短期轻松，长期可能被室友嫌弃。" },
        betrayed: { icon: "😓", title: "默默付出的人", desc: "你常常主动打扫，却总有人坐享其成，你的付出没有换来配合。" },
        mixed: { icon: "🧺", title: "时好时坏的宿舍", desc: "有时有人打扫，有时没人动手，整洁度很不稳定。" }
      },
      lesson: "寝室没人先打扫，是典型的“志愿者困境”和“公共物品困境”。每个人都希望享受干净环境，却不想承担成本，于是大家互相等待。"
    },
    {
      id: "group",
      icon: "📚",
      tag: "小组作业",
      title: "小组作业：谁来做PPT",
      playerName: "你（组员）",
      resourceName: "平时分",
      unit: "次",
      rounds: 5,
      cooperateLabel: "主动承担",
      defectLabel: "搭便车",
      cooperateSub: "我 -1 精力 / 小组 +3 成果",
      defectSub: "我 0 / 小组 0",
      intro: "小组作业临近截止。每一次分工，你和两位组员都要选择：主动承担任务，还是等着别人做完？主动承担会消耗精力，但能推进小组成果。",
      ai: [
        { name: "组员小丁", bias: 0.70, desc: "靠谱，主动分担" },
        { name: "组员小陈", bias: 0.30, desc: "习惯搭便车" }
      ],
      endings: {
        allCoop: { icon: "🏆", title: "满分小组", desc: "大家都主动承担，作业质量很高，每个人都付出了精力。" },
        allDefect: { icon: "🕳️", title: "集体翻车", desc: "所有人都在等别人做，作业差点没交上，成绩受损。" },
        freeRide: { icon: "🧃", title: "搭便车达人", desc: "你常常搭便车，却拿到了小组成果。短期轻松，但队友可能不再信任你。" },
        betrayed: { icon: "😫", title: "被白嫖的组长", desc: "你总在承担任务，却有人搭便车，你的付出没有换来公平分配。" },
        mixed: { icon: "📋", title: "分工不均的小组", desc: "有人干活、有人观望，小组成果和收益分配都不均衡。" }
      },
      lesson: "小组作业的搭便车问题：每个人都想拿高分，但不愿付出，结果可能所有人都不动手，最终成绩受损。"
    }
  ];

  var selectEl = document.getElementById("scenario-select");
  var listEl = document.getElementById("scenario-list");
  var playEl = document.getElementById("scenario-play");
  var introEl = document.getElementById("scenario-intro");
  var boardEl = document.getElementById("scenario-board");
  var endingEl = document.getElementById("scenario-ending");

  var eyebrowEl = document.getElementById("scenario-eyebrow");
  var boardTitleEl = document.getElementById("scenario-board-title");
  var roundEl = document.getElementById("scenario-round");
  var playerTotalEl = document.getElementById("scenario-player-total");
  var playerNameEl = document.getElementById("scenario-player-name");
  var playerPayoffEl = document.getElementById("scenario-player-payoff");
  var rolesHintEl = document.getElementById("scenario-roles-hint");
  var aiListEl = document.getElementById("scenario-ai-list");
  var cooperateLabelEl = document.getElementById("scenario-cooperate-label");
  var cooperateSubEl = document.getElementById("scenario-cooperate-sub");
  var defectLabelEl = document.getElementById("scenario-defect-label");
  var defectSubEl = document.getElementById("scenario-defect-sub");
  var cooperateBtn = document.getElementById("scenario-cooperate-btn");
  var defectBtn = document.getElementById("scenario-defect-btn");
  var resultEl = document.getElementById("scenario-result");
  var nextBtn = document.getElementById("scenario-next-btn");
  var finishBtn = document.getElementById("scenario-finish-btn");
  var backBtn = document.getElementById("scenario-back-btn");

  var state = {
    scenario: null,
    stage: "select", // select | intro | play | result | ending
    round: 0,
    playerTotal: 0,
    playerChoice: null,
    playerPayoff: null,
    ai: [],
    history: []
  };

  function findScenario(id) {
    for (var i = 0; i < SCENARIOS.length; i++) {
      if (SCENARIOS[i].id === id) return SCENARIOS[i];
    }
    return null;
  }

  function sign(n) {
    if (n > 0) return "+" + n;
    return String(n);
  }

  function choiceText(choice) {
    if (choice === "cooperate") return state.scenario.cooperateLabel;
    if (choice === "defect") return state.scenario.defectLabel;
    return "等待选择";
  }

  function choiceClassName(choice) {
    if (choice === "cooperate") return "cooperate";
    if (choice === "defect") return "defect";
    return "waiting";
  }

  function makeAi(seed) {
    return {
      name: seed.name,
      bias: seed.bias,
      desc: seed.desc,
      choice: null,
      payoff: null,
      cumulative: 0
    };
  }

  function scenarioCard(s) {
    return '<button class="scenario-card" data-id="' + s.id + '" type="button">' +
      '<span class="scenario-card-icon">' + s.icon + '</span>' +
      '<span class="scenario-card-tag">' + s.tag + '</span>' +
      '<strong class="scenario-card-title">' + s.title + '</strong>' +
      '<span class="scenario-card-sub">' + s.playerName + ' · 共 ' + s.rounds + s.unit + '</span>' +
    '</button>';
  }

  function renderSelect() {
    listEl.innerHTML = SCENARIOS.map(scenarioCard).join("");
    selectEl.classList.remove("is-hidden");
    playEl.classList.add("is-hidden");
  }

  function renderIntro() {
    var s = state.scenario;
    var aiNames = s.ai.map(function (a) { return a.name; }).join("、");

    introEl.innerHTML =
      '<div class="scenario-intro-card">' +
        '<div class="scenario-intro-icon">' + s.icon + '</div>' +
        '<p class="eyebrow">' + s.tag + '</p>' +
        '<h2>' + s.title + '</h2>' +
        '<p class="scenario-intro-text">' + s.intro + '</p>' +
        '<div class="scenario-cast">同局角色：' + aiNames + '</div>' +
        '<div class="scenario-intro-actions">' +
          '<button id="scenario-start-btn" class="secondary-btn" type="button">开始情景</button>' +
          '<button id="scenario-intro-back-btn" class="ghost-btn" type="button">返回选择</button>' +
        '</div>' +
      '</div>';

    document.getElementById("scenario-start-btn").addEventListener("click", beginRounds);
    document.getElementById("scenario-intro-back-btn").addEventListener("click", backToSelect);
  }

  function beginRounds() {
    state.round = 0;
    state.playerTotal = 0;
    state.playerChoice = null;
    state.playerPayoff = null;
    state.ai = state.scenario.ai.map(makeAi);
    state.history = [];
    state.stage = "play";

    introEl.classList.add("is-hidden");
    endingEl.classList.add("is-hidden");
    boardEl.classList.remove("is-hidden");
    render();
  }

  function backToSelect() {
    state.stage = "select";
    renderSelect();
  }

  function renderAiCards() {
    var html = "";
    state.ai.forEach(function (a) {
      var cardStateClass = "";
      if (a.choice === "cooperate") cardStateClass = "is-cooperated";
      if (a.choice === "defect") cardStateClass = "is-defected";

      html +=
        '<article class="opponent-card agent-card ' + cardStateClass + '">' +
          '<div class="opponent-head">' +
            '<div>' +
              '<h3 class="opponent-name">' + a.name + '</h3>' +
              '<span class="agent-label">' + a.desc + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="agent-stats">' +
            '<div class="agent-stat"><span>本轮选择</span><strong class="scenario-choice">' + (a.choice === null ? "—" : choiceText(a.choice)) + '</strong></div>' +
            '<div class="agent-stat"><span>本轮收益</span><strong>' + (a.payoff === null ? "—" : sign(a.payoff)) + '</strong></div>' +
          '</div>' +
        '</article>';
    });
    aiListEl.innerHTML = html;
  }

  function renderResultContent() {
    if (!state.scenario || state.history.length === 0) return;

    var s = state.scenario;
    var last = state.history[state.history.length - 1];
    var aiCooperators = last.aiResults.filter(function (r) { return r.choice === "cooperate"; }).length;
    var feedback = roundFeedback(last.playerChoice, aiCooperators);

    var aiSummary = last.aiResults.map(function (r) {
      return r.name + "：" + choiceText(r.choice) + "（" + sign(r.payoff) + "）";
    }).join("　");

    resultEl.innerHTML =
      '<h3>第 ' + state.round + ' / ' + s.rounds + ' ' + s.unit + '</h3>' +
      '<p class="scenario-feedback">' + feedback + '</p>' +
      '<p>你的本轮收益为 <span class="result-highlight">' + sign(last.playerPayoff) + '</span>。</p>' +
      '<p class="result-detail">' + aiSummary + '</p>';
  }

  function roundFeedback(playerChoice, aiCooperators) {
    var s = state.scenario;
    var totalAi = state.ai.length;

    if (playerChoice === "cooperate" && aiCooperators === totalAi) {
      return "这一轮所有人都选择了“" + s.cooperateLabel + "”，大家共同推进，但也都在消耗自己。";
    }
    if (playerChoice === "defect" && aiCooperators === totalAi) {
      return "你选择了“" + s.defectLabel + "”，但其他人都选择了“" + s.cooperateLabel + "”。你享受了他们的付出。";
    }
    if (playerChoice === "cooperate" && aiCooperators === 0) {
      return "只有你选择了“" + s.cooperateLabel + "”，你的付出暂时没有换来配合。";
    }
    if (playerChoice === "defect" && aiCooperators === 0) {
      return "没有人选择“" + s.cooperateLabel + "”，局面陷入停滞。";
    }
    return "有人付出、有人观望，这一轮的结果出现分化。";
  }

  function endingClassification() {
    var s = state.scenario;
    var playerCoopCount = 0;
    var totalCoopCount = 0;
    var totalActions = state.history.length * (state.ai.length + 1);

    state.history.forEach(function (h) {
      if (h.playerChoice === "cooperate") playerCoopCount += 1;
      totalCoopCount += (h.playerChoice === "cooperate" ? 1 : 0);
      totalCoopCount += h.aiResults.filter(function (r) { return r.choice === "cooperate"; }).length;
    });

    var coopRate = totalActions === 0 ? 0 : totalCoopCount / totalActions;

    if (coopRate >= 0.85) return "allCoop";
    if (coopRate <= 0.15) return "allDefect";
    if (playerCoopCount > state.history.length / 2) return "betrayed";
    if (playerCoopCount < state.history.length / 2) return "freeRide";
    return "mixed";
  }

  function renderEnding() {
    var s = state.scenario;
    var key = endingClassification();
    var ending = s.endings[key];

    var groupTotal = state.playerTotal + state.ai.reduce(function (sum, a) { return sum + a.cumulative; }, 0);

    endingEl.innerHTML =
      '<div class="scenario-ending-card">' +
        '<div class="scenario-ending-icon">' + ending.icon + '</div>' +
        '<p class="eyebrow">结局 · ' + s.tag + '</p>' +
        '<h2>' + ending.title + '</h2>' +
        '<p class="scenario-ending-desc">' + ending.desc + '</p>' +
        '<div class="ending-stats">' +
          '<div class="stat"><span class="stat-label">我的累计收益</span><strong>' + sign(state.playerTotal) + '</strong></div>' +
          '<div class="stat"><span class="stat-label">群体累计收益</span><strong>' + sign(groupTotal) + '</strong></div>' +
        '</div>' +
        '<div class="scenario-lesson">' +
          '<h3>博弈论启示</h3>' +
          '<p>' + s.lesson + '</p>' +
        '</div>' +
        '<div class="scenario-ending-actions">' +
          '<button id="scenario-ending-back-btn" class="secondary-btn" type="button">再玩一次</button>' +
          '<button id="scenario-ending-select-btn" class="ghost-btn" type="button">换一个情景</button>' +
        '</div>' +
      '</div>';

    document.getElementById("scenario-ending-back-btn").addEventListener("click", function () {
      beginRounds();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.getElementById("scenario-ending-select-btn").addEventListener("click", backToSelect);
  }

  function render() {
    if (!state.scenario) return;

    var s = state.scenario;
    eyebrowEl.textContent = s.tag;
    boardTitleEl.textContent = s.title;
    roundEl.textContent = state.round + "/" + s.rounds;
    playerTotalEl.textContent = String(state.playerTotal);
    playerNameEl.textContent = s.playerName;
    playerPayoffEl.textContent = state.playerPayoff === null ? "—" : sign(state.playerPayoff);
    rolesHintEl.textContent = "观察他们的性格，猜测他们会合作还是搭便车。";
    cooperateLabelEl.textContent = "决策 A · " + s.cooperateLabel;
    cooperateSubEl.textContent = s.cooperateSub;
    defectLabelEl.textContent = "决策 B · " + s.defectLabel;
    defectSubEl.textContent = s.defectSub;

    renderAiCards();

    var playing = state.stage === "play";
    cooperateBtn.disabled = !playing;
    defectBtn.disabled = !playing;

    if (state.stage === "result") {
      renderResultContent();
      resultEl.classList.remove("is-hidden");
    } else {
      resultEl.classList.add("is-hidden");
    }

    nextBtn.classList.toggle("is-hidden", !(state.stage === "result" && state.round < s.rounds));
    finishBtn.classList.toggle("is-hidden", !(state.stage === "result" && state.round >= s.rounds));
  }

  function choose(playerChoice) {
    if (state.stage !== "play" || !state.scenario) return;

    state.playerChoice = playerChoice;
    state.ai.forEach(function (a) {
      a.choice = Math.random() < a.bias ? "cooperate" : "defect";
      a.payoff = null;
    });

    var aiCooperators = state.ai.filter(function (a) { return a.choice === "cooperate"; }).length;
    state.playerPayoff = (playerChoice === "cooperate" ? -1 : 0) + 3 * aiCooperators;
    state.playerTotal += state.playerPayoff;

    var aiResults = state.ai.map(function (a) {
      var otherCoop = aiCooperators - (a.choice === "cooperate" ? 1 : 0) + (playerChoice === "cooperate" ? 1 : 0);
      a.payoff = (a.choice === "cooperate" ? -1 : 0) + 3 * otherCoop;
      a.cumulative += a.payoff;
      return { name: a.name, choice: a.choice, payoff: a.payoff };
    });

    state.history.push({
      playerChoice: playerChoice,
      playerPayoff: state.playerPayoff,
      aiResults: aiResults
    });

    state.round += 1;
    state.stage = "result";
    render();
  }

  function nextRound() {
    if (state.stage !== "result") return;
    state.playerChoice = null;
    state.playerPayoff = null;
    state.ai.forEach(function (a) {
      a.choice = null;
      a.payoff = null;
    });
    state.stage = "play";
    render();
  }

  function finish() {
    if (state.stage !== "result") return;
    state.stage = "ending";
    boardEl.classList.add("is-hidden");
    endingEl.classList.remove("is-hidden");
    renderEnding();
  }

  listEl.addEventListener("click", function (event) {
    var card = event.target.closest ? event.target.closest(".scenario-card") : null;
    if (!card) return;
    var scenario = findScenario(card.getAttribute("data-id"));
    if (!scenario) return;

    state.scenario = scenario;
    state.stage = "intro";
    selectEl.classList.add("is-hidden");
    playEl.classList.remove("is-hidden");
    boardEl.classList.add("is-hidden");
    endingEl.classList.add("is-hidden");
    introEl.classList.remove("is-hidden");
    renderIntro();
  });

  cooperateBtn.addEventListener("click", function () { choose("cooperate"); });
  defectBtn.addEventListener("click", function () { choose("defect"); });
  nextBtn.addEventListener("click", nextRound);
  finishBtn.addEventListener("click", finish);
  backBtn.addEventListener("click", backToSelect);

  renderSelect();
})();
