// SPDX-License-Identifier: GPL-3.0-or-later
// 第三课：多智能体根据上一轮其他人的决策进行理性选择
(function () {
  "use strict";

  // 每位智能体有不同的理性程度（temperature 越低越理性）。
  // initialCoop 只用于第一轮，之后智能体会根据上一轮其他智能体的决策来更新选择。
  var AGENT_SEEDS = [
    { id: "l1", name: "智能体 1", label: "完全理性", temperature: 0.05, initialCoop: 0.50 },
    { id: "l2", name: "智能体 2", label: "高度理性", temperature: 0.20, initialCoop: 0.50 },
    { id: "l3", name: "智能体 3", label: "理性", temperature: 0.50, initialCoop: 0.70 },
    { id: "l4", name: "智能体 4", label: "有限理性", temperature: 0.90, initialCoop: 0.30 },
    { id: "l5", name: "智能体 5", label: "探索型", temperature: 1.50, initialCoop: 0.50 }
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
      temperature: seed.temperature,
      initialCoop: seed.initialCoop,
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

  function cooperationProbability(agent, othersCoopLast) {
    // 假设上一轮其他智能体的选择会重复，计算合作与不合作的收益。
    var uCoop = -state.cost + state.benefit * othersCoopLast;
    var uDefect = state.benefit * othersCoopLast;

    // 理性程度越高（temperature 越小），越接近选择收益更高的动作。
    var maxUtility = Math.max(uCoop, uDefect);
    var expCoop = Math.exp((uCoop - maxUtility) / agent.temperature);
    var expDefect = Math.exp((uDefect - maxUtility) / agent.temperature);
    return expCoop / (expCoop + expDefect);
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

    var changes;
    if (state.history.length === 1) {
      changes = last.agentResults.map(function (r) {
        return r.name + "首次选择：" + choiceText(r.choice);
      }).join("　");
    } else {
      changes = last.agentResults.map(function (r) {
        return r.name + "：" + (r.changed ? "改变为 " : "继续 ") + choiceText(r.choice);
      }).join("　");
    }

    roundResultEl.innerHTML =
      '<h3>第 ' + last.round + ' 轮结果</h3>' +
      '<p>本轮共有 <span class="result-highlight">' + totalCoop + ' / ' + totalAgents + '</span> 位智能体选择合作。</p>' +
      '<p>本轮群体总收益为 <span class="result-highlight">' + sign(groupPayoff) + '</span>。</p>' +
      '<p class="result-detail">' + changes + '</p>' +
      '<p class="result-detail">从第二轮起，智能体会根据上一轮其他智能体的决策，理性判断继续还是改变自己的选择。</p>';

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
        var changeMark = "";
        if (r.changed === true) changeMark = '<span class="change-mark changed">改变</span>';
        if (r.changed === false) changeMark = '<span class="change-mark continued">继续</span>';

        row += '<td class="result-detail">' +
          '<span class="choice-tag ' + choiceClassName(r.choice) + '">' + choiceText(r.choice) + '</span>' +
          '<span class="payoff-num">' + sign(r.payoff) + '</span>' +
          changeMark +
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

    var previous = state.history.length > 0 ? state.history[state.history.length - 1] : null;
    var previousResultsById = {};

    if (previous) {
      previous.agentResults.forEach(function (r) {
        previousResultsById[r.id] = r;
      });
    }

    // 第一轮使用初始合作概率；之后根据上一轮其他智能体的决策理性选择。
    state.agents.forEach(function (agent) {
      if (!previous) {
        agent.choice = Math.random() < agent.initialCoop ? "cooperate" : "defect";
      } else {
        var previousSelf = previousResultsById[agent.id];
        var previousSelfCoop = previousSelf && previousSelf.choice === "cooperate" ? 1 : 0;
        var othersCoopLast = previous.totalCoop - previousSelfCoop;

        var pCoop = cooperationProbability(agent, othersCoopLast);
        agent.choice = Math.random() < pCoop ? "cooperate" : "defect";
      }
      agent.payoff = null;
    });

    var totalCoop = state.agents.reduce(function (sum, agent) {
      return sum + (agent.choice === "cooperate" ? 1 : 0);
    }, 0);

    var groupPayoff = 0;

    state.agents.forEach(function (agent) {
      var otherCoop = totalCoop - (agent.choice === "cooperate" ? 1 : 0);
      var payoff = (agent.choice === "cooperate" ? -state.cost : 0) + state.benefit * otherCoop;
      agent.payoff = payoff;
      agent.cumulativePayoff += payoff;
      groupPayoff += payoff;
    });

    var results = state.agents.map(function (agent) {
      var changed = null;
      if (previous) {
        var previousSelf = previousResultsById[agent.id];
        changed = previousSelf.choice !== agent.choice;
      }

      return {
        id: agent.id,
        name: agent.name,
        choice: agent.choice,
        payoff: agent.payoff,
        changed: changed
      };
    });

    // 记录动作历史，供卡片上的色块展示。
    state.agents.forEach(function (agent) {
      agent.actionHistory.push(agent.choice);
    });

    state.history.push({
      round: state.round,
      totalCoop: totalCoop,
      groupPayoff: groupPayoff,
      agentResults: results
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
