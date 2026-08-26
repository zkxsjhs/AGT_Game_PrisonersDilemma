// 囚徒困境：群体版 - 游戏逻辑
(function () {
  "use strict";

  var MIN_TOTAL = 2;     // 至少 2 位决策者（含玩家）
  var MAX_TOTAL = 12;    // 最多 12 位决策者（含玩家）
  var DEFAULT_TOTAL = 6; // 默认 1 位玩家 + 5 位 AI

  var PLAYER_NAME = "决策者 1";

  var DEFAULT_BIASES = [0.85, 0.62, 0.45, 0.22, 0.08];

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
  var totalPlayersEl = document.getElementById("total-players");
  var decreasePlayersBtn = document.getElementById("decrease-players-btn");
  var increasePlayersBtn = document.getElementById("increase-players-btn");

  var state;

  function defaultBias(n) {
    if (n >= 1 && n <= DEFAULT_BIASES.length) {
      return DEFAULT_BIASES[n - 1];
    }
    return 0.5;
  }

  function makeOpponent(n) {
    return {
      id: "a" + n,
      name: "a" + n,
      bias: defaultBias(n),
      choice: null, // "cooperate" | "defect" | null
      payoff: null
    };
  }

  function createState() {
    var opponents = [];
    for (var i = 1; i < DEFAULT_TOTAL; i++) {
      opponents.push(makeOpponent(i));
    }

    return {
      round: 0, // 已完成的轮数
      phase: "choose", // "choose" | "result"
      playerTotal: 0,
      playerChoice: null,
      playerPayoff: null,
      totalPlayers: DEFAULT_TOTAL,
      opponents: opponents,
      history: []
    };
  }

  state = createState();

  function findOpponent(id) {
    for (var i = 0; i < state.opponents.length; i++) {
      if (state.opponents[i].id === id) return state.opponents[i];
    }
    return null;
  }

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
    var disabled = state.phase !== "choose" ? " disabled" : "";

    state.opponents.forEach(function (o) {
      var percent = Math.round(o.bias * 100);
      var cardStateClass = "";
      if (o.choice === "cooperate") cardStateClass = "is-cooperated";
      if (o.choice === "defect") cardStateClass = "is-defected";

      html +=
        '<article class="opponent-card ' + cardStateClass + '" data-id="' + o.id + '">' +
          '<div class="opponent-head">' +
            '<h3 class="opponent-name">' + o.name + '</h3>' +
            '<span class="opponent-id">AI 决策者</span>' +
          '</div>' +
          '<p class="opponent-desc">拖动滑块调整合作倾向</p>' +
          '<div class="bias-control">' +
            '<div class="bias-row">' +
              '<span>合作倾向</span>' +
              '<span class="bias-value">' + percent + '%</span>' +
            '</div>' +
            '<input class="bias-slider" type="range" min="0" max="100" step="1" value="' + percent + '" data-id="' + o.id + '" aria-label="调整 ' + o.name + ' 的合作倾向"' + disabled + '>' +
            '<div class="bias-track"><div class="bias-fill" style="width:' + percent + '%"></div></div>' +
          '</div>' +
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
    decreasePlayersBtn.disabled = !choosing || state.totalPlayers <= MIN_TOTAL;
    increasePlayersBtn.disabled = !choosing || state.totalPlayers >= MAX_TOTAL;
  }

  function renderRoundResult() {
    if (state.phase !== "result") {
      roundResultEl.classList.add("is-hidden");
      return;
    }

    var playerText = choiceText(state.playerChoice);
    var totalPlayers = state.totalPlayers;
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
          '<td>' + h.totalCooperators + ' / ' + h.totalPlayers + '</td>' +
          '<td>' + sign(h.playerPayoff) + '</td>' +
          '<td class="result-detail">' + detail + '</td>' +
        '</tr>'
      );
    }).join("");

    historyBodyEl.innerHTML = rows;
  }

  function render() {
    totalPlayersEl.textContent = String(state.totalPlayers);
    renderOpponents();
    renderPlayer();
    renderRoundResult();
    renderHistory();
  }

  function updateBiasCard(id) {
    var opponent = findOpponent(id);
    if (!opponent) return;

    var card = opponentsEl.querySelector('.opponent-card[data-id="' + id + '"]');
    if (!card) return;

    var percent = Math.round(opponent.bias * 100);
    var valueEl = card.querySelector(".bias-value");
    var fillEl = card.querySelector(".bias-fill");
    if (valueEl) valueEl.textContent = percent + "%";
    if (fillEl) fillEl.style.width = percent + "%";
  }

  function changeBias(id, value) {
    var opponent = findOpponent(id);
    if (!opponent) return;
    opponent.bias = value / 100;
    updateBiasCard(id);
  }

  function setTotalPlayers(value) {
    value = Number(value);
    value = Math.max(MIN_TOTAL, Math.min(MAX_TOTAL, value));

    if (value === state.totalPlayers) {
      renderPlayer();
      return;
    }

    state.totalPlayers = value;
    var targetAiCount = value - 1;

    while (state.opponents.length < targetAiCount) {
      state.opponents.push(makeOpponent(state.opponents.length + 1));
    }

    while (state.opponents.length > targetAiCount) {
      state.opponents.pop();
    }

    render();
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
      totalPlayers: state.totalPlayers,
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

  decreasePlayersBtn.addEventListener("click", function () {
    setTotalPlayers(state.totalPlayers - 1);
  });

  increasePlayersBtn.addEventListener("click", function () {
    setTotalPlayers(state.totalPlayers + 1);
  });

  opponentsEl.addEventListener("input", function (event) {
    var target = event.target;
    if (target.classList && target.classList.contains("bias-slider")) {
      changeBias(target.getAttribute("data-id"), Number(target.value));
    }
  });

  render();
})();
