// SPDX-License-Identifier: GPL-3.0-or-later
// 第三课：多智能体以自身 payoffs 为目标进行学习
(function () {
  "use strict";

  var AGENT_SEEDS = [
    { id: "l1", name: "智能体 1", label: "快速学习者", alpha: 0.50, temperature: 0.6, qA: 0.0, qB: 0.0 },
    { id: "l2", name: "智能体 2", label: "平衡学习者", alpha: 0.30, temperature: 0.6, qA: 0.0, qB: 0.0 },
    { id: "l3", name: "智能体 3", label: "谨慎学习者", alpha: 0.20, temperature: 0.9, qA: 0.6, qB: 0.0 },
    { id: "l4", name: "智能体 4", label: "收益敏感型", alpha: 0.40, temperature: 0.4, qA: -0.5, qB: 0.5 },
    { id: "l5", name: "智能体 5", label: "探索型", alpha: 0.35, temperature: 1.0, qA: 0.5, qB: -0.5 }
  ];

  var DEFAULT_BENEFIT = 3;
  var DEFAULT_COST = 1;
  var DEFAULT_ROUNDS = 20;

  var roundNumberEl = document.getElementById("lesson3-round-number");
  var totalPayoffEl = document.getElementById("lesson3-total-payoff");
  var agentsEl = document.getElementById("lesson3-agents");
  var roundResultEl = document.getElementById("lesson3-round-result");
  var runBtn = document.getElementById("lesson3-run-btn");
  var stepBtn = document.getElementById("lesson3-step-btn");
  var resetBtn = document.getElementById("lesson3-reset-btn");
  var benefitSlider = document.getElementById("benefit-slider");
  var costSlider = document.getElementById("cost-slider");
  var roundsSlider = document.getElementById("rounds-slider");
  var benefitValueEl = document.getElementById("benefit-value");
  var costValueEl = document.getElementById("cost-value");
  var roundsValueEl = document.getElementById("rounds-value");
  var costRuleTextEl = document.getElementById("cost-rule-text");
  var benefitRuleTextEl = document.getElementById("benefit-rule-text");
  var historyHeadEl = document.getElementById("lesson3-history-head");
  var historyBodyEl = document.getElementById("lesson3-history-body");
  var historySummaryEl = document.getElementById("lesson3-history-summary");

  var state;

  function makeAgent(seed) {
    return {
      id: seed.id,
      name: seed.name,
      label: seed.label,
      alpha: seed.alpha,
      temperature: seed.temperature,
      qA: seed.qA,
      qB: seed.qB,
      choice: null,
      payoff: null,
      cumulativePayoff: 0,
      actionHistory: []
    };
  }

  function createState() {
    return {
      round: 0,
      benefit: DEFAULT_BENEFIT,
      cost: DEFAULT_COST,
      rounds: DEFAULT_ROUNDS,
      agents: AGENT_SEEDS.map(makeAgent),
      history: []
    };
  }

  state = createState();

  function sign(n) {
    if (n > 0) return "+" + n;
    return String(n);
  }

  function choiceText(choice) {
    if (choice === "cooperate") return "合作";
    if (choice === "defect") return "不合作";
    return "—";
  }

  function choiceClassName(choice) {
    if (choice === "cooperate") return "cooperate";
    if (choice === "defect") return "defect";
    return "waiting";
  }

  function softmaxProbability(agent) {
    var expA = Math.exp(agent.qA / agent.temperature);
    var expB = Math.exp(agent.qB / agent.temperature);
    return expA / (expA + expB);
  }

  function makeDots(history) {
    var recent = history.slice(-24);
    if (recent.length === 0) {
      return '<span class="dots-placeholder">等待模拟</span>';
    }

    var dots = recent.map(function (choice) {
      return '<span class="dot ' + choiceClassName(choice) + '" title="' + choiceText(choice) + '"></span>';
    }).join("");

    return '<div class="action-dots">' + dots + '</div>';
  }

  function renderAgents() {
    var html = "";

    state.agents.forEach(function (agent) {
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
          '<div class="agent-stats">' +
            '<div class="agent-stat">' +
              '<span>累计收益</span>' +
              '<strong>' + sign(agent.cumulativePayoff) + '</strong>' +
            '</div>' +
            '<div class="agent-stat">' +
              '<span>本轮收益</span>' +
              '<strong>' + (agent.payoff === null ? "—" : sign(agent.payoff)) + '</strong>' +
            '</div>' +
          '</div>' +
          makeDots(agent.actionHistory) +
        '</article>';
    });

    agentsEl.innerHTML = html;
  }

  function renderRoundResult() {
    if (state.history.length === 0) {
      roundResultEl.classList.add("is-hidden");
      return;
    }

    var last = state.history[state.history.length - 1];
    var totalCoop = last.totalCoop;
    var totalAgents = state.agents.length;
    var groupPayoff = last.groupPayoff;

    roundResultEl.innerHTML =
      '<h3>第 ' + last.round + ' 轮结果</h3>' +
      '<p>本轮共有 <span class="result-highlight">' + totalCoop + ' / ' + totalAgents + '</span> 位智能体选择合作。</p>' +
      '<p>本轮群体总收益为 <span class="result-highlight">' + sign(groupPayoff) + '</span>。</p>' +
      '<p class="result-detail">智能体会根据本轮获得的收益更新自己的策略；它们的具体合作概率不会显示。</p>';

    roundResultEl.classList.remove("is-hidden");
  }

  function renderHistory() {
    if (state.history.length === 0) {
      historySummaryEl.textContent = "还没有记录。";
      historyHeadEl.innerHTML = '<th>轮次</th><th>合作人数</th><th>群体总收益</th>';
      historyBodyEl.innerHTML = '<tr><td colspan="' + (state.agents.length + 3) + '" class="result-detail">开始模拟后，这里会显示每一轮每位智能体的选择与收益。</td></tr>';
      return;
    }

    historySummaryEl.textContent = "已模拟 " + state.history.length + " 轮。";

    var head = '<th>轮次</th><th>合作人数</th><th>群体总收益</th>';
    state.agents.forEach(function (agent) {
      head += '<th>' + agent.name + '</th>';
    });
    historyHeadEl.innerHTML = head;

    var rows = state.history.slice().reverse().map(function (h) {
      var row = '<td>' + h.round + '</td>' +
        '<td>' + h.totalCoop + ' / ' + state.agents.length + '</td>' +
        '<td>' + sign(h.groupPayoff) + '</td>';

      h.agentResults.forEach(function (r) {
        row += '<td class="result-detail">' +
          '<span class="choice-tag ' + choiceClassName(r.choice) + '">' + choiceText(r.choice) + '</span>' +
          '<span class="payoff-num">' + sign(r.payoff) + '</span>' +
        '</td>';
      });

      return '<tr>' + row + '</tr>';
    }).join("");

    historyBodyEl.innerHTML = rows;
  }

  function renderSettings() {
    benefitValueEl.textContent = String(state.benefit);
    costValueEl.textContent = String(state.cost);
    roundsValueEl.textContent = String(state.rounds);
    costRuleTextEl.textContent = String(state.cost);
    benefitRuleTextEl.textContent = String(state.benefit);

    costSlider.max = String(Math.max(1, state.benefit - 1));
    benefitSlider.value = String(state.benefit);
    costSlider.value = String(state.cost);
    roundsSlider.value = String(state.rounds);

    runBtn.textContent = "开始模拟 " + state.rounds + " 轮";
  }

  function render() {
    roundNumberEl.textContent = String(state.round);
    var totalPayoff = state.agents.reduce(function (sum, agent) {
      return sum + agent.cumulativePayoff;
    }, 0);
    totalPayoffEl.textContent = String(totalPayoff);

    renderSettings();
    renderAgents();
    renderRoundResult();
    renderHistory();
  }

  function playOneRound() {
    state.round += 1;

    // 每位智能体根据自己的隐藏策略（softmax 概率）选择合作或不合作。
    state.agents.forEach(function (agent) {
      var p = softmaxProbability(agent);
      agent.choice = Math.random() < p ? "cooperate" : "defect";
      agent.payoff = null;
    });

    var totalCoop = state.agents.reduce(function (sum, agent) {
      return sum + (agent.choice === "cooperate" ? 1 : 0);
    }, 0);

    var groupPayoff = 0;

    // 计算每位智能体的收益。
    state.agents.forEach(function (agent) {
      var otherCoop = totalCoop - (agent.choice === "cooperate" ? 1 : 0);
      var payoff = (agent.choice === "cooperate" ? -state.cost : 0) + state.benefit * otherCoop;
      agent.payoff = payoff;
      agent.cumulativePayoff += payoff;
      groupPayoff += payoff;
    });

    // 根据获得的收益更新自己的 Q 值（收益越高，越可能重复该动作）。
    state.agents.forEach(function (agent) {
      if (agent.choice === "cooperate") {
        agent.qA = agent.qA + agent.alpha * (agent.payoff - agent.qA);
      } else {
        agent.qB = agent.qB + agent.alpha * (agent.payoff - agent.qB);
      }
      agent.actionHistory.push(agent.choice);
    });

    state.history.push({
      round: state.round,
      totalCoop: totalCoop,
      groupPayoff: groupPayoff,
      agentResults: state.agents.map(function (agent) {
        return {
          name: agent.name,
          choice: agent.choice,
          payoff: agent.payoff
        };
      })
    });
  }

  function runSimulation() {
    var n = Math.max(1, state.rounds);
    for (var i = 0; i < n; i++) {
      playOneRound();
    }
    render();
  }

  function stepSimulation() {
    playOneRound();
    render();
  }

  function resetSimulation() {
    state.round = 0;
    state.agents = AGENT_SEEDS.map(makeAgent);
    state.history = [];
    render();
  }

  benefitSlider.addEventListener("input", function () {
    var value = Number(benefitSlider.value);
    value = Math.max(2, Math.min(10, value));
    state.benefit = value;

    if (state.cost >= state.benefit) {
      state.cost = Math.max(1, state.benefit - 1);
    }

    renderSettings();
  });

  costSlider.addEventListener("input", function () {
    var value = Number(costSlider.value);
    var maxCost = Math.max(1, state.benefit - 1);
    value = Math.max(1, Math.min(maxCost, value));
    state.cost = value;
    renderSettings();
  });

  roundsSlider.addEventListener("input", function () {
    state.rounds = Math.max(1, Math.min(100, Number(roundsSlider.value)));
    renderSettings();
  });

  runBtn.addEventListener("click", runSimulation);
  stepBtn.addEventListener("click", stepSimulation);
  resetBtn.addEventListener("click", resetSimulation);

  render();
})();
