// SPDX-License-Identifier: GPL-3.0-or-later
// 主线：公司加班模拟，完成后解锁沙盒游戏
(function () {
  "use strict";

  var TOTAL_ROUNDS = 40;
  var OVERTIME_THRESHOLD = 4;
  var CULTURE_STREAK = 2;
  var OVERTIME_SALARY = 12;
  var LEAVE_SALARY = 8;
  var SPECIAL_ADD_FIRST_ROUND = 10;
  var SPECIAL_ADD_CHANCE = 0.4;
  var LEAVE_REPORT_THRESHOLD = 3;
  var REPORT_SALARY_PENALTY = 20;
  var FIRE_REPORT_THRESHOLD = 2;
  var A_INFLUENCE = 0.14;
  var A_TARGET_INFLUENCE = 0.22;
  var B_INFLUENCE = 0.14;

  var COWORKERS = [
    { name: "老张", bias: 0.75, desc: "老员工，习惯加班", rationality: 0.40 },
    { name: "小李", bias: 0.55, desc: "看情况，随大流", rationality: 0.60 },
    { name: "小王", bias: 0.35, desc: "想准点下班", rationality: 0.80 },
    { name: "小周", bias: 0.25, desc: "能溜就溜", rationality: 0.90 },
    { name: "阿杰", bias: 0.10, desc: "几乎不加班", rationality: 0.70 }
  ];

  var SPECIALS = {
    A: { name: "员工A", tag: "工贼", desc: "主动加班，劝大家加班，并告发不加班的同事", type: "A" },
    B: { name: "员工B", tag: "组织者", desc: "主张集体不加班，把理念分享给大家", type: "B" },
    C: { name: "员工C", tag: "墙头草", desc: "每轮跟随上一轮多数人的选择", type: "C" }
  };

  var startScreen = document.getElementById("start-screen");
  var startBtn = document.getElementById("start-game-btn");
  var companyScreen = document.getElementById("company-screen");
  var companyRoundEl = document.getElementById("company-round");
  var companyPlayerEnergyEl = document.getElementById("company-player-energy");
  var companyPlayerSalaryEl = document.getElementById("company-player-salary");
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
      rationality: seed.rationality || 0,
      type: "normal",
      tag: null,
      choice: null,
      payoff: null,
      salary: 0,
      cumulative: 0,
      leaveCount: 0,
      reportCount: 0,
      lastChoice: null,
      fired: false
    };
  }

  function makeSpecial(type) {
    var seed = SPECIALS[type];
    return {
      name: seed.name,
      bias: 0.5,
      desc: seed.desc,
      rationality: 0,
      type: seed.type,
      tag: seed.tag,
      choice: null,
      payoff: null,
      salary: 0,
      cumulative: 0,
      leaveCount: 0,
      reportCount: 0,
      lastChoice: null,
      fired: false
    };
  }

  function resetSimulation() {
    state = {
      round: 0,
      playerEnergy: 0,
      playerSalary: 0,
      playerRoundSalary: 0,
      companyOutput: 0,
      playerChoice: null,
      playerPayoff: null,
      forced: false,
      streak: 0,
      overtimeCount: 0,
      lastOvertimeCount: null,
      lastWorkerCount: null,
      coworkers: COWORKERS.map(makeCoworker),
      pendingSpecialTypes: ["A", "B", "C"],
      done: false
    };
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function sign(n) {
    if (n > 0) return "+" + n;
    return String(n);
  }

  function workerCount() {
    return state.coworkers.filter(function (c) { return !c.fired; }).length + 1;
  }

  function hasType(type) {
    return state.coworkers.some(function (c) {
      return c.type === type && !c.fired;
    });
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

  function addSpecialIfDue() {
    var currentRound = state.round + 1;
    if (currentRound < SPECIAL_ADD_FIRST_ROUND || state.pendingSpecialTypes.length === 0) {
      return null;
    }

    var shouldAdd = currentRound === SPECIAL_ADD_FIRST_ROUND || Math.random() < SPECIAL_ADD_CHANCE;
    if (!shouldAdd) return null;

    var index = Math.floor(Math.random() * state.pendingSpecialTypes.length);
    var type = state.pendingSpecialTypes.splice(index, 1)[0];
    var employee = makeSpecial(type);
    state.coworkers.push(employee);
    return employee;
  }

  function chooseForCoworker(c) {
    if (c.fired) return null;

    if (c.type === "A") return "overtime";
    if (c.type === "B") return "leave";

    if (c.type === "C") {
      if (state.lastOvertimeCount === null || state.lastWorkerCount === null) {
        return Math.random() < 0.5 ? "overtime" : "leave";
      }
      if (state.lastOvertimeCount > state.lastWorkerCount / 2) return "overtime";
      if (state.lastOvertimeCount < state.lastWorkerCount / 2) return "leave";
      return Math.random() < 0.5 ? "overtime" : "leave";
    }

    var p = c.bias;
    if (hasType("A")) {
      p += A_INFLUENCE * (1 - c.rationality);
      if (c.lastChoice === "leave") {
        p += A_TARGET_INFLUENCE * (1 - c.rationality);
      }
    }
    if (hasType("B")) {
      p -= B_INFLUENCE * (1 - c.rationality);
    }
    p = clamp(p, 0, 1);
    return Math.random() < p ? "overtime" : "leave";
  }

  function renderCoworkers() {
    var html = "";
    state.coworkers.forEach(function (c) {
      if (c.fired) return;

      var cardStateClass = "";
      if (c.choice === "overtime") cardStateClass = "is-cooperated";
      if (c.choice === "leave") cardStateClass = "is-defected";

      var tagHtml = c.tag ? '<span class="employee-tag type-' + c.type + '">' + c.tag + '</span>' : "";

      html +=
        '<article class="opponent-card agent-card ' + cardStateClass + '">' +
          '<div class="opponent-head">' +
            '<div>' +
              '<h3 class="opponent-name">' + c.name + ' ' + tagHtml + '</h3>' +
              '<span class="agent-label">' + c.desc + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="agent-stats">' +
            '<div class="agent-stat"><span>本轮选择</span><strong class="scenario-choice">' + (c.choice === null ? "—" : choiceText(c.choice)) + '</strong></div>' +
            '<div class="agent-stat"><span>累计工资</span><strong>' + c.salary + '</strong></div>' +
            '<div class="agent-stat"><span>本轮精力</span><strong>' + (c.payoff === null ? "—" : sign(c.payoff)) + '</strong></div>' +
          '</div>' +
        '</article>';
    });
    companyCoworkersEl.innerHTML = html;
  }

  function render() {
    companyRoundEl.textContent = state.round + "/" + TOTAL_ROUNDS;
    companyPlayerEnergyEl.textContent = String(state.playerEnergy);
    companyPlayerSalaryEl.textContent = String(state.playerSalary);
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

  function showResult(title, detail, image) {
    var imageHtml = image ? '<div class="result-image"><img src="' + image + '" alt=""></div>' : "";
    companyResultEl.innerHTML =
      imageHtml +
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

  function applyAReporting() {
    var reports = [];
    var fired = [];

    if (!hasType("A")) return { reports: reports, fired: fired };

    state.coworkers.forEach(function (c) {
      if (c.fired || c.type === "A") return;

      if (c.choice === "leave") {
        c.leaveCount += 1;
      }

      while (c.leaveCount >= LEAVE_REPORT_THRESHOLD) {
        c.leaveCount -= LEAVE_REPORT_THRESHOLD;
        c.reportCount += 1;
        c.salary = Math.max(0, c.salary - REPORT_SALARY_PENALTY);
        reports.push(c.name + " 被工贼告发，工资 -" + REPORT_SALARY_PENALTY);
      }

      if (c.reportCount >= FIRE_REPORT_THRESHOLD) {
        c.fired = true;
        fired.push(c.name + " 被开除");
      }
    });

    if (fired.length > 0) {
      state.coworkers = state.coworkers.filter(function (c) { return !c.fired; });
    }

    return { reports: reports, fired: fired };
  }

  function playForcedRound() {
    var added = addSpecialIfDue();
    var totalWorkers = workerCount();

    state.playerChoice = "overtime";
    state.playerPayoff = -2;
    state.playerEnergy += state.playerPayoff;
    state.playerRoundSalary = OVERTIME_SALARY;
    state.playerSalary += state.playerRoundSalary;

    state.coworkers.forEach(function (c) {
      if (c.fired) return;
      c.choice = "overtime";
      c.payoff = -2;
      c.cumulative += c.payoff;
      c.salary += OVERTIME_SALARY;
      c.lastChoice = "overtime";
    });

    state.overtimeCount = totalWorkers;
    state.companyOutput += totalWorkers * 4;
    state.lastOvertimeCount = totalWorkers;
    state.lastWorkerCount = totalWorkers;

    var messages = [];
    if (added) messages.push(added.name + "（" + added.tag + "）加入了公司。");
    messages.push("每个人收益 -2，但公司产出增加 " + (totalWorkers * 4) + "。你的工资 +" + state.playerRoundSalary + "。");

    showResult("第 " + (state.round + 1) + " 轮：全员强制加班", messages.join("<br>"), "Resources/tired.png");
    advance();
  }

  function playRound(playerChoice) {
    var added = addSpecialIfDue();

    state.playerChoice = playerChoice;
    state.playerPayoff = playerChoice === "overtime" ? -1 : 0;
    state.playerEnergy += state.playerPayoff;
    state.playerRoundSalary = playerChoice === "overtime" ? OVERTIME_SALARY : LEAVE_SALARY;
    state.playerSalary += state.playerRoundSalary;

    var coworkerOvertime = 0;
    state.coworkers.forEach(function (c) {
      if (c.fired) return;
      c.choice = chooseForCoworker(c);
      c.payoff = c.choice === "overtime" ? -1 : 0;
      c.cumulative += c.payoff;
      c.salary += c.choice === "overtime" ? OVERTIME_SALARY : LEAVE_SALARY;
      c.lastChoice = c.choice;
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

    state.lastOvertimeCount = totalOvertime;
    state.lastWorkerCount = workerCount();

    var report = applyAReporting();

    var messages = [];
    if (added) messages.push(added.name + "（" + added.tag + "）加入了公司。");
    messages.push("本轮共有 " + totalOvertime + " / " + state.lastWorkerCount + " 人加班。你的工资 +" + state.playerRoundSalary + "。");
    if (totalOvertime >= OVERTIME_THRESHOLD) {
      messages.push("加班人数已经足够多，连续达标 " + state.streak + " 轮。");
    }
    report.reports.forEach(function (m) { messages.push(m); });
    report.fired.forEach(function (m) { messages.push(m); });

    var image = playerChoice === "overtime" ? "Resources/work.png" : "Resources/afterwork.png";
    showResult("第 " + (state.round + 1) + " 轮结果", messages.join("<br>"), image);

    if (state.streak >= CULTURE_STREAK) {
      state.forced = true;
      showResult("加班文化形成", "因为加班人数足够多且持续了 " + CULTURE_STREAK + " 轮，从下一轮开始全员强制加班。", "Resources/overwork.png");
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
