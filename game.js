// 囚徒困境：群体版 - 游戏逻辑
(function () {
  "use strict";

  // 每个 AI 决策者拥有不同的合作倾向 bias（0~1）。
  // bias 表示该决策者本轮选择“合作”的概率，不是固定人格。
  var OPPONENT_SEEDS = [
    { id: "a1", name: "小善", bias: 0.85, desc: "习惯合作，偶尔动摇" },
    { id: "a2", name: "小衡", bias: 0.62, desc: "看情况，倾向合作" },
    { id: "a3", name: "小疑", bias: 0.45, desc: "半信半疑，不太稳定" },
    { id: "a4", name: "小独", bias: 0.22, desc: "多数时候不合作" },
    { id: "a5", name: "小冷", bias: 0.08, desc: "几乎不合作" }
  ];

  var PLAYER_ID = "决策者 1";

  // DOM 元素
  var roundNumberEl = document.getElementById("round-number");
  var playerTotalEl = document.getElementById("player-total");
  var opponentsEl = document.getElementById("opponents");
  var playerRoundPayoffEl = document.getElementById("player-round-payoff");
  var roundResultEl = document.getElementById("round-result");
  var nextRoundBtn = document.getElementById("next-round-btn");
  var restartBtn = document.getElementById("restart-btn");
  var cooperateBtn = document.getElementById("cooperate-btn");
  var defectBtn = document.getElementById("defect-btn");
  var historyBodyEl = document.getElementById("history-body");
  var historySummaryEl = document.getElementById("history-summary");

  var state;

  function freshOpponents() {
    return OPPONENT_SEEDS.map(function (seed) {
      return {
        id: seed.id,
        name: seed.name,
        bias: seed.bias,
        desc: seed.desc,
        choice: null, // "cooperate" | "defect" | null
        payoff: null
      };
    });
  }

  function createState() {
    return {
      round: 0, // 已完成的轮数
      phase: "choose", // "choose" | "result"
      playerTotal: 0,
      playerChoice: null,
      playerPayoff: null,
      opponents: freshOpponents(),
      history: []
    };
  }

  state = createState();

  function currentRoundLabel() {
    return state.phase === "result" ? state.round : state.round + 1;
  }

  function sign(n) {
    if (n > 0) return "+" + n;
    return String(n);
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

  function renderOpponents() {
    var html = "";
    state.opponents.forEach(function (o) {
      var percent = Math.round(o.bias * 100);
      var cardStateClass = "";
      if (o.choice === "cooperate") cardStateClass = "is-cooperated";
      if (o.choice === "defect") cardStateClass = "is-defected";

      html +=
        '<article class="opponent-card ' + cardStateClass + '">' +
          '<div class="opponent-head">' +
            '<h3 class="opponent-name">' + o.name + '</h3>' +
            '<span class="opponent-id">' + o.id.toUpperCase() + '</span>' +
          '</div>' +
          '<p class="opponent-desc">' + o.desc + '</p>' +
          '<div class="bias-row">' +
            '<span>合作倾向</span>' +
            '<span>' + percent + '%</span>' +
          '</div>' +
          '<div class="bias-track"><div class="bias-fill" style="width:' + percent + '%"></div></div>' +
          '<div class="opponent-choice">' +
            '<span class="choice-pill ' + choiceClassName(o.choice) + '">' + choiceText(o.choice) + '</span>' +
            '<span class="opponent-payoff">' + (o.payoff === null ? "—" : sign(o.payoff)) + '</span>' +
          '</div>' +
        '</article>';
    });
    opponentsEl.innerHTML = html;
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
    var totalPlayers = state.opponents.length + 1;
    var aiCooperators = state.opponents.filter(function (o) {
      return o.choice === "cooperate";
    }).length;
    var totalCooperators = aiCooperators + (state.playerChoice === "cooperate" ? 1 : 0);

    var insight = "";
    if (totalCooperators === totalPlayers) {
      insight = "所有人都选择了合作，群体总收益达到最高。";
    } else if (state.playerChoice === "defect" && aiCooperators > 0) {
      insight = "你选择不合作，却从其他合作者身上获得了收益，这就是搭便车。";
    } else if (state.playerChoice === "cooperate" && aiCooperators < state.opponents.length) {
      insight = "你选择了合作，但有人不合作；合作者的付出可能被不合作者利用。";
    } else if (totalCooperators === 0) {
      insight = "没有人合作，所有人的收益都停在 0。";
    } else {
      insight = "本轮有人合作、有人不合作，收益出现了分化。";
    }

    roundResultEl.innerHTML =
      '<h3>第 ' + state.round + ' 轮结果</h3>' +
      '<p>你选择了<strong>' + playerText + '</strong>；本轮共有 <span class="result-highlight">' + totalCooperators + ' / ' + totalPlayers + '</span> 位决策者合作。</p>' +
      '<p>你的本轮收益为 <span class="result-highlight">' + sign(state.playerPayoff) + '</span>。</p>' +
      '<p class="result-detail">' + insight + '</p>';

    roundResultEl.classList.remove("is-hidden");
  }

  function renderHistory() {
    if (state.history.length === 0) {
      historySummaryEl.textContent = "还没有记录。";
      historyBodyEl.innerHTML = '<tr><td colspan="5" class="result-detail">完成第一轮后，这里会显示每一轮的选择与收益。</td></tr>';
      return;
    }

    historySummaryEl.textContent = "已记录 " + state.history.length + " 轮。";

    var rows = state.history.slice().reverse().map(function (h) {
      var detail = h.opponentResults.map(function (r) {
        return r.name + "：" + choiceText(r.choice) + "（" + sign(r.payoff) + "）";
      }).join("　");

      return (
        '<tr>' +
          '<td>' + h.round + '</td>' +
          '<td><span class="choice-tag ' + choiceClassName(h.playerChoice) + '">' + choiceText(h.playerChoice) + '</span></td>' +
          '<td>' + h.totalCooperators + ' / ' + (state.opponents.length + 1) + '</td>' +
          '<td>' + sign(h.playerPayoff) + '</td>' +
          '<td class="result-detail">' + detail + '</td>' +
        '</tr>'
      );
    }).join("");

    historyBodyEl.innerHTML = rows;
  }

  function render() {
    renderOpponents();
    renderPlayer();
    renderRoundResult();
    renderHistory();
  }

  function choose(playerChoice) {
    if (state.phase !== "choose") return;

    state.phase = "result";
    state.round += 1;
    state.playerChoice = playerChoice;

    state.opponents.forEach(function (o) {
      o.choice = Math.random() < o.bias ? "cooperate" : "defect";
      o.payoff = null;
    });

    var aiCooperators = state.opponents.filter(function (o) {
      return o.choice === "cooperate";
    }).length;
    var totalCooperators = aiCooperators + (playerChoice === "cooperate" ? 1 : 0);

    state.playerPayoff =
      (playerChoice === "cooperate" ? -1 : 0) + 3 * aiCooperators;
    state.playerTotal += state.playerPayoff;

    var opponentResults = state.opponents.map(function (o) {
      var otherCooperators = state.opponents.reduce(function (sum, other) {
        if (other.id === o.id) return sum;
        return sum + (other.choice === "cooperate" ? 1 : 0);
      }, 0);
      otherCooperators += playerChoice === "cooperate" ? 1 : 0;

      o.payoff = (o.choice === "cooperate" ? -1 : 0) + 3 * otherCooperators;

      return {
        name: o.name,
        choice: o.choice,
        payoff: o.payoff
      };
    });

    state.history.push({
      round: state.round,
      playerChoice: playerChoice,
      playerPayoff: state.playerPayoff,
      totalCooperators: totalCooperators,
      opponentResults: opponentResults
    });

    render();
  }

  function nextRound() {
    if (state.phase !== "result") return;

    state.phase = "choose";
    state.playerChoice = null;
    state.playerPayoff = null;
    state.opponents.forEach(function (o) {
      o.choice = null;
      o.payoff = null;
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
