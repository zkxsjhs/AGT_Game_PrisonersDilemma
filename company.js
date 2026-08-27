// SPDX-License-Identifier: GPL-3.0-or-later
// 主线：公司加班模拟，完成后解锁沙盒游戏
(function () {
  "use strict";

  var TOTAL_ROUNDS = 6;
  var OVERTIME_THRESHOLD = 4; // 加班人数达到该值时开始累积“加班文化”
  var CULTURE_STREAK = 2;     // 连续达到阈值的轮数
  var WORKER_COUNT = 6;       // 含玩家

  var COWORKERS = [
    { name: "老张", bias: 0.75, desc: "老员工，习惯加班" },
    { name: "小李", bias: 0.55, desc: "看情况，随大流" },
    { name: "小王", bias: 0.35, desc: "想准点下班" },
    { name: "小周", bias: 0.25, desc: "能溜就溜" },
    { name: "阿杰", bias: 0.10, desc: "几乎不加班" }
  ];

  var startScreen = document.getElementById("start-screen");
  var startBtn = document.getElementById("start-game-btn");
  var companyScreen = document.getElementById("company-screen");
  var companyRoundEl = document.getElementById("company-round");
  var companyPlayerEnergyEl = document.getElementById("company-player-energy");
  var companyOutputEl = document.getElementById("company-output");
  var companyStatusTextEl = document.getElementById("company-status-text");
  var companyCoworkersEl = document.getElementById("company-coworkers");
  var companyActionsEl = document.getElementById("company-actions");
  var companyPlayerPayoffEl = document.getElementById("company-player-payoff");
  var companyResultEl = document.getElementById("company-result");
  var companyUnlockEl = document.getElementById("company-unlock");
  var overtimeBtn = document.getElementById("company-overtime-btn");
  var leaveBtn = document.getElementById("company-leave-btn");
  var enterBtn = document.getElementById("company-enter-btn");
  var lessonNav = document.querySelector(".lesson-nav");

  var state = {};

  function makeCoworker(seed) {
    return {
      name: seed.name,
      bias: seed.bias,
      desc: seed.desc,
      choice: null,
      payoff: null,
      cumulative: 0
    };
  }

  function resetSimulation() {
    state = {
      round: 0,
      playerEnergy: 0,
      companyOutput: 0,
      playerChoice: null,
      playerPayoff: null,
      forced: false,
      streak: 0,
      overtimeCount: 0,
      coworkers: COWORKERS.map(makeCoworker),
      done: false
    };
  }

  function sign(n) {
    if (n > 0) return "+" + n;
    return String(n);
  }

  function choiceText(choice) {
    if (choice === "overtime") return "加班";
    if (choice === "leave") return "不加班";
    return "—";
  }

  function choiceClassName(choice) {
    if (choice === "overtime") return "cooperate";
    if (choice === "leave") return "defect";
    return "waiting";
  }

  function renderCoworkers() {
    var html = "";
    state.coworkers.forEach(function (c) {
      var cardStateClass = "";
      if (c.choice === "overtime") cardStateClass = "is-cooperated";
      if (c.choice === "leave") cardStateClass = "is-defected";

      html +=
        '<article class="opponent-card agent-card ' + cardStateClass + '">' +
          '<div class="opponent-head">' +
            '<div>' +
              '<h3 class="opponent-name">' + c.name + '</h3>' +
              '<span class="agent-label">' + c.desc + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="agent-stats">' +
            '<div class="agent-stat"><span>本轮选择</span><strong class="scenario-choice">' + (c.choice === null ? "—" : choiceText(c.choice)) + '</strong></div>' +
            '<div class="agent-stat"><span>本轮精力</span><strong>' + (c.payoff === null ? "—" : sign(c.payoff)) + '</strong></div>' +
          '</div>' +
        '</article>';
    });
    companyCoworkersEl.innerHTML = html;
  }

  function render() {
    companyRoundEl.textContent = state.round + "/" + TOTAL_ROUNDS;
    companyPlayerEnergyEl.textContent = String(state.playerEnergy);
    companyOutputEl.textContent = String(state.companyOutput);
    companyPlayerPayoffEl.textContent = state.playerPayoff === null ? "—" : sign(state.playerPayoff);

    if (state.forced) {
      companyStatusTextEl.textContent = "加班文化已经形成：本轮全员强制加班，个人精力损失更大，但公司产出略微增加。";
    } else {
      companyStatusTextEl.textContent = "选择这一轮是否加班。";
    }

    renderCoworkers();

    if (state.done) {
      companyActionsEl.classList.add("is-hidden");
      companyResultEl.classList.add("is-hidden");
      companyUnlockEl.classList.remove("is-hidden");
    } else {
      companyUnlockEl.classList.add("is-hidden");
      var canChoose = !state.forced;
      overtimeBtn.disabled = !canChoose;
      leaveBtn.disabled = !canChoose;
    }
  }

  function showResult(title, detail) {
    companyResultEl.innerHTML =
      '<h3>' + title + '</h3>' +
      '<p>' + detail + '</p>';
    companyResultEl.classList.remove("is-hidden");
  }

  function finish() {
    state.done = true;
    try { localStorage.setItem("prisoners-dilemma-sandbox-unlocked", "1"); } catch (e) {}
    render();
  }

  function advance() {
    state.round += 1;
    if (state.round >= TOTAL_ROUNDS) {
      finish();
    } else {
      render();
    }
  }

  function playForcedRound() {
    var n = WORKER_COUNT;

    state.playerChoice = "overtime";
    state.playerPayoff = -2;
    state.playerEnergy += state.playerPayoff;

    state.coworkers.forEach(function (c) {
      c.choice = "overtime";
      c.payoff = -2;
      c.cumulative += c.payoff;
    });

    state.overtimeCount = n;
    state.companyOutput += n * 4;

    showResult("第 " + (state.round + 1) + " 轮：全员强制加班",
      "每个人收益 -2（比普通加班更差），但公司产出增加 " + n * 4 + "。个体的付出换来了公司略微增长的收益。");

    advance();
  }

  function playRound(playerChoice) {
    state.playerChoice = playerChoice;
    state.playerPayoff = playerChoice === "overtime" ? -1 : 0;
    state.playerEnergy += state.playerPayoff;

    var coworkerOvertime = 0;
    state.coworkers.forEach(function (c) {
      c.choice = Math.random() < c.bias ? "overtime" : "leave";
      c.payoff = c.choice === "overtime" ? -1 : 0;
      c.cumulative += c.payoff;
      if (c.choice === "overtime") coworkerOvertime += 1;
    });

    var totalOvertime = (playerChoice === "overtime" ? 1 : 0) + coworkerOvertime;
    state.overtimeCount = totalOvertime;
    state.companyOutput += totalOvertime * 3;

    if (totalOvertime >= OVERTIME_THRESHOLD) {
      state.streak += 1;
    } else {
      state.streak = 0;
    }

    var summary = "本轮共有 " + totalOvertime + " / " + WORKER_COUNT + " 人加班。";
    if (totalOvertime >= OVERTIME_THRESHOLD) {
      summary += " 加班人数已经足够多，连续达标 " + state.streak + " 轮。";
    }

    showResult("第 " + (state.round + 1) + " 轮结果", summary);

    if (state.streak >= CULTURE_STREAK) {
      state.forced = true;
      showResult("加班文化形成", "因为加班人数足够多且持续了 " + CULTURE_STREAK + " 轮，从下一轮开始全员强制加班。");
    }

    advance();
  }

  function choose(playerChoice) {
    if (state.done || state.forced) return;
    playRound(playerChoice);
  }

  function startGame() {
    resetSimulation();
    startScreen.classList.add("is-hidden");
    companyScreen.classList.remove("is-hidden");
    companyUnlockEl.classList.add("is-hidden");
    companyActionsEl.classList.remove("is-hidden");
    companyResultEl.classList.add("is-hidden");
    render();
  }

  function enterSandbox() {
    companyScreen.classList.add("is-hidden");
    if (lessonNav) lessonNav.classList.remove("is-hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function alreadyUnlocked() {
    startScreen.classList.add("is-hidden");
    companyScreen.classList.add("is-hidden");
    if (lessonNav) lessonNav.classList.remove("is-hidden");
  }

  startBtn.addEventListener("click", startGame);
  overtimeBtn.addEventListener("click", function () { choose("overtime"); });
  leaveBtn.addEventListener("click", function () { choose("leave"); });
  enterBtn.addEventListener("click", enterSandbox);

  // 如果已解锁过，直接进入沙盒。
  var unlocked = false;
  try { unlocked = localStorage.getItem("prisoners-dilemma-sandbox-unlocked") === "1"; } catch (e) {}
  if (unlocked) {
    alreadyUnlocked();
  } else {
    resetSimulation();
    startScreen.classList.remove("is-hidden");
    companyScreen.classList.add("is-hidden");
    if (lessonNav) lessonNav.classList.add("is-hidden");
  }
})();
