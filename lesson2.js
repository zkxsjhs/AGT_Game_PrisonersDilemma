// 第二课：多智能体通过玩家的决策进行学习
(function () {
  "use strict";

  var PLAYER_NAME = "决策者 1";

  // 每位智能体有不同的初始信任值和学习率。
  var AGENT_SEEDS = [
    { id: "m1", name: "智能体 1", label: "快速学习者", learningRate: 0.60, trust: 0.50 },
    { id: "m2", name: "智能体 2", label: "平衡学习者", learningRate: 0.30, trust: 0.50 },
    { id: "m3", name: "智能体 3", label: "慢热学习者", learningRate: 0.12, trust: 0.50 },
    { id: "m4", name: "智能体 4", label: "怀疑者", learningRate: 0.25, trust: 0.20 },
    { id: "m5", name: "智能体 5", label: "乐天派", learningRate: 0.25, trust: 0.80 }
  ];

  var roundNumberEl = document.getElementById("lesson2-round-number");
  var playerTotalEl = document.getElementById("lesson2-player-total");
  var agentsEl = document.getElementById("lesson2-agents");
  var playerRoundPayoffEl = document.getElementById("lesson2-player-round-payoff");
  var roundResultEl = document.getElementById("lesson2-round-result");
  var nextRoundBtn = document.getElementById("lesson2-next-round-btn");
  var restartBtn = document.getElementById("lesson2-restart-btn");
  var cooperateBtn = document.getElementById("lesson2-cooperate-btn");
  var defectBtn = document.getElementById("lesson2-defect-btn");
  var historyBodyEl = document.getElementById("lesson2-history-body");
  var historySummaryEl = document.getElementById("lesson2-history-summary");

  var state;

  function makeAgent(seed) {
    return {
      id: seed.id,
      name: seed.name,
      label: seed.label,
      learningRate: seed.learningRate,
      trust: seed.trust,
      choice: null,
      payoff: null,
      oldTrust: null,
      newTrust: null,
      trustHistory: [seed.trust]
    };
  }

  function createState() {
    return {
      round: 0,
      phase: "choose",
      playerTotal: 0,
      playerChoice: null,
      playerPayoff: null,
      agents: AGENT_SEEDS.map(makeAgent),
      history: []
    };
  }

  state = createState();

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function currentRoundLabel() {
    return state.phase === "result" ? state.round : state.round + 1;
  }

  function sign(n) {
    if (n > 0) return "+" + n;
    return String(n);
  }

  function percent(n) {
    return Math.round(n * 100);
  }

  function choiceText(choice) {
    if (choice === "cooperate") return "合作";
    if (choice === "defect") return "不合作";
    return "等待选择";
  }

  function choiceClassName(choice) {
    if (choice === "cooperate") return "cooperate";
    if (choice === "defect") return "defect";
    return "waiting";
  }

  function makeSparkline(values) {
    var recent = values.slice(-24);
    if (recent.length === 1) recent = [recent[0], recent[0]];

    var w = 100;
    var h = 30;
    var pad = 3;
    var min = 0;
    var max = 1;
    var stepX = recent.length === 1 ? 0 : (w - pad * 2) / (recent.length - 1);

    var points = recent.map(function (value, index) {
      var x = pad + stepX * index;
      var y = h - pad - (h - pad * 2) * ((value - min) / (max - min));
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");

    return '<svg class="sparkline" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">' +
      '<polyline points="' + points + '" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"></polyline>' +
    '</svg>';
  }

  function renderAgents() {
    var html = "";

    state.agents.forEach(function (agent) {
      var trustPercent = percent(agent.trust);
      var cardStateClass = "";
      if (agent.choice === "cooperate") cardStateClass = "is-cooperated";
      if (agent.choice === "defect") cardStateClass = "is-defected";

      html +=
        '<article class="opponent-card agent-card ' + cardStateClass + '" data-id="' + agent.id + '">' +
          '<div class="opponent-head">' +
            '<div>' +
              '<h3 class="opponent-name">' + agent.name + '</h3>' +
              '<span class="agent-label">' + agent.label + '</span>' +
            '</div>' +
            '<span class="opponent-id">AI</span>' +
          '</div>' +
          '<div class="trust-row">' +
            '<span>当前信任</span>' +
            '<strong class="trust-value">' + trustPercent + '%</strong>' +
          '</div>' +
          '<div class="bias-track"><div class="bias-fill trust-fill" style="width:' + trustPercent + '%"></div></div>' +
          '<div class="sparkline-wrap">' + makeSparkline(agent.trustHistory) + '</div>' +
          '<div class="opponent-choice">' +
            '<span class="choice-pill ' + choiceClassName(agent.choice) + '">' + choiceText(agent.choice) + '</span>' +
            '<span class="opponent-payoff">' + (agent.payoff === null ? "—" : sign(agent.payoff)) + '</span>' +
          '</div>' +
        '</article>';
    });

    agentsEl.innerHTML = html;
  }

  function renderPlayer() {
    roundNumberEl.textContent = String(currentRoundLabel());
    playerTotalEl.textContent = String(state.playerTotal);
    playerRoundPayoffEl.textContent = state.playerPayoff === null ? "—" : sign(state.playerPayoff);

    var choosing = state.phase === "choose";
    cooperateBtn.disabled = !choosing;
    defectBtn.disabled = !choosing;
    nextRoundBtn.classList.toggle("is-hidden", choosing);
  }

  function renderRoundResult() {
    if (state.phase !== "result") {
      roundResultEl.classList.add("is-hidden");
      return;
    }

    var playerText = choiceText(state.playerChoice);
    var totalPlayers = state.agents.length + 1;
    var aiCooperators = state.agents.filter(function (a) {
      return a.choice === "cooperate";
    }).length;
    var totalCooperators = aiCooperators + (state.playerChoice === "cooperate" ? 1 : 0);

    var changes = state.agents.map(function (a) {
      return a.name + "：" + percent(a.oldTrust) + '% → ' + percent(a.newTrust) + '%';
    }).join("　");

    var insight = state.playerChoice === "cooperate"
      ? "你选择了合作，所有智能体都提高了对你的信任。"
      : "你选择了不合作，所有智能体都降低了对你的信任。";

    roundResultEl.innerHTML =
      '<h3>第 ' + state.round + ' 轮结果</h3>' +
      '<p>你选择了<strong>' + playerText + '</strong>；本轮共有 <span class="result-highlight">' + totalCooperators + ' / ' + totalPlayers + '</span> 位决策者合作。</p>' +
      '<p>你的本轮收益为 <span class="result-highlight">' + sign(state.playerPayoff) + '</span>。</p>' +
      '<p class="result-detail">' + insight + '</p>' +
      '<p class="result-detail">信任变化：' + changes + '</p>';

    roundResultEl.classList.remove("is-hidden");
  }

  function renderHistory() {
    if (state.history.length === 0) {
      historySummaryEl.textContent = "还没有记录。";
      historyBodyEl.innerHTML = '<tr><td colspan="4" class="result-detail">完成第一轮后，这里会显示智能体如何根据你的选择学习。</td></tr>';
      return;
    }

    historySummaryEl.textContent = "已记录 " + state.history.length + " 轮。";

    var rows = state.history.slice().reverse().map(function (h) {
      var detail = h.agentResults.map(function (r) {
        return r.name + '（' + r.label + '）：' + choiceText(r.choice) + '（' + sign(r.payoff) + '），信任 ' + percent(r.oldTrust) + '% → ' + percent(r.newTrust) + '%';
      }).join('；');

      return (
        '<tr>' +
          '<td>' + h.round + '</td>' +
          '<td><span class="choice-tag ' + choiceClassName(h.playerChoice) + '">' + choiceText(h.playerChoice) + '</span></td>' +
          '<td>' + sign(h.playerPayoff) + '</td>' +
          '<td class="result-detail">' + detail + '</td>' +
        '</tr>'
      );
    }).join("");

    historyBodyEl.innerHTML = rows;
  }

  function render() {
    renderAgents();
    renderPlayer();
    renderRoundResult();
    renderHistory();
  }

  function choose(playerChoice) {
    if (state.phase !== "choose") return;

    state.phase = "result";
    state.round += 1;
    state.playerChoice = playerChoice;

    // 智能体按当前信任值作为合作概率做出选择。
    state.agents.forEach(function (agent) {
      agent.oldTrust = agent.trust;
      agent.choice = Math.random() < agent.trust ? "cooperate" : "defect";
      agent.payoff = null;
    });

    var aiCooperators = state.agents.filter(function (a) {
      return a.choice === "cooperate";
    }).length;

    state.playerPayoff =
      (playerChoice === "cooperate" ? -1 : 0) + 3 * aiCooperators;
    state.playerTotal += state.playerPayoff;

    // 计算每位智能体的收益。
    state.agents.forEach(function (agent) {
      var otherCooperators = state.agents.reduce(function (sum, other) {
        if (other.id === agent.id) return sum;
        return sum + (other.choice === "cooperate" ? 1 : 0);
      }, 0);
      otherCooperators += playerChoice === "cooperate" ? 1 : 0;
      agent.payoff = (agent.choice === "cooperate" ? -1 : 0) + 3 * otherCooperators;
    });

    // 观察玩家的决策，更新信任值。
    var target = playerChoice === "cooperate" ? 1 : 0;
    state.agents.forEach(function (agent) {
      var newTrust = agent.trust + agent.learningRate * (target - agent.trust);
      agent.trust = clamp(newTrust, 0, 1);
      agent.newTrust = agent.trust;
      agent.trustHistory.push(agent.trust);
    });

    state.history.push({
      round: state.round,
      playerChoice: playerChoice,
      playerPayoff: state.playerPayoff,
      agentResults: state.agents.map(function (agent) {
        return {
          name: agent.name,
          label: agent.label,
          choice: agent.choice,
          payoff: agent.payoff,
          oldTrust: agent.oldTrust,
          newTrust: agent.newTrust
        };
      })
    });

    render();
  }

  function nextRound() {
    if (state.phase !== "result") return;

    state.phase = "choose";
    state.playerChoice = null;
    state.playerPayoff = null;
    state.agents.forEach(function (agent) {
      agent.choice = null;
      agent.payoff = null;
      agent.oldTrust = null;
      agent.newTrust = null;
    });

    render();
  }

  function restart() {
    state = createState();
    render();
  }

  cooperateBtn.addEventListener("click", function () {
    choose("cooperate");
  });

  defectBtn.addEventListener("click", function () {
    choose("defect");
  });

  nextRoundBtn.addEventListener("click", nextRound);
  restartBtn.addEventListener("click", restart);

  render();
})();
