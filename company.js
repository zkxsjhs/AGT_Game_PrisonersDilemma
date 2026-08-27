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
  var LOW_ENERGY_THRESHOLD = -8;
  var SICK_SALARY_PENALTY = 10;
  var RESISTANCE_THRESHOLD = 4;
  var RESISTANCE_BLOCK_CHANCE = 0.6;
  var FAMILIARITY_GAIN = 0.15;

  var COWORKERS = [
    { name: "老张", bias: 0.75, desc: "老员工，习惯加班", rationality: 0.40, familiarity: 0.40 },
    { name: "小李", bias: 0.55, desc: "看情况，随大流", rationality: 0.60, familiarity: 0.30 },
    { name: "小王", bias: 0.35, desc: "想准点下班", rationality: 0.80, familiarity: 0.50 },
    { name: "小周", bias: 0.25, desc: "能溜就溜", rationality: 0.90, familiarity: 0.20 },
    { name: "阿杰", bias: 0.10, desc: "几乎不加班", rationality: 0.70, familiarity: 0.30 }
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
  var companyTalkTargetEl = document.getElementById("company-talk-target");
  var talkOvertimeBtn = document.getElementById("talk-overtime-btn");
  var talkLeaveBtn = document.getElementById("talk-leave-btn");
  var companyTalkResultEl = document.getElementById("company-talk-result");
  var returnCompanyBtn = document.getElementById("return-company-btn");
  var companyBackSandboxBtn = document.getElementById("company-back-sandbox-btn");
  var lessonNav = document.querySelector(".lesson-nav");

  var unlocked = false;
  var state = {};

  function makeCoworker(seed) {
    return {
      name: seed.name,
      bias: seed.bias,
      desc: seed.desc,
      rationality: seed.rationality || 0,
      familiarity: seed.familiarity || 0.3,
      type: "normal",
      tag: null,
      choice: null,
      payoff: null,
      salary: 0,
      cumulative: 0,
      leaveCount: 0,
      leaveDesire: 0,
      reportCount: 0,
      playerInfluence: null,
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
      familiarity: 0.2,
      type: seed.type,
      tag: seed.tag,
      choice: null,
      payoff: null,
      salary: 0,
      cumulative: 0,
      leaveCount: 0,
      leaveDesire: 0,
      reportCount: 0,
      playerInfluence: null,
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
      hasTalkedThisRound: false,
      communicationLog: [],
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

  function findCoworker(name) {
    for (var i = 0; i < state.coworkers.length; i++) {
      if (state.coworkers[i].name === name) return state.coworkers[i];
    }
    return null;
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

    if (c.playerInfluence) return c.playerInfluence;

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
      var resistHtml = (c.type === "normal" && c.leaveDesire >= RESISTANCE_THRESHOLD) ? '<span class="employee-tag resisting">抵制中</span>' : "";

      html +=
        '<article class="opponent-card agent-card ' + cardStateClass + '">' +
          '<div class="opponent-head">' +
            '<div>' +
              '<h3 class="opponent-name">' + c.name + ' ' + tagHtml + ' ' + resistHtml + '</h3>' +
              '<span class="agent-label">' + c.desc + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="agent-stats">' +
            '<div class="agent-stat"><span>本轮选择</span><strong class="scenario-choice">' + (c.choice === null ? "—" : choiceText(c.choice)) + '</strong></div>' +
            '<div class="agent-stat"><span>累计工资</span><strong>' + c.salary + '</strong></div>' +
            '<div class="agent-stat"><span>精力</span><strong>' + c.cumulative + '</strong></div>' +
          '</div>' +
        '</article>';
    });
    companyCoworkersEl.innerHTML = html;
  }

  function renderCommunication() {
    var options = "";
    var normalAvailable = false;
    state.coworkers.forEach(function (c) {
      if (c.type === "normal" && !c.fired) {
        normalAvailable = true;
        options += '<option value="' + c.name + '">' + c.name + '</option>';
      }
    });
    companyTalkTargetEl.innerHTML = options;

    var talkDisabled = state.hasTalkedThisRound || state.forced || state.done || !normalAvailable;
    talkOvertimeBtn.disabled = talkDisabled;
    talkLeaveBtn.disabled = talkDisabled;
    companyTalkTargetEl.disabled = talkDisabled;
  }

  function talk(direction) {
    if (state.hasTalkedThisRound || state.forced || state.done) return;

    var target = findCoworker(companyTalkTargetEl.value);
    if (!target || target.type !== "normal") return;

    var familiarity = target.familiarity;
    var rationality = target.rationality;
    var verbalChance = 0.45 + 0.5 * familiarity * (1 - rationality);
    var actualChance = verbalChance * 0.7;
    var actualRoll = Math.random();
    var verbalRoll = Math.random();
    var directionText = direction === "overtime" ? "加班" : "不加班";
    var message;

    if (actualRoll < actualChance) {
      target.playerInfluence = direction;
      message = target.name + " 真正答应了你的建议：本轮选择" + directionText + "。";
    } else if (verbalRoll < verbalChance) {
      target.playerInfluence = null;
      message = target.name + " 口头答应了，但本轮不一定会真的照做。";
    } else {
      target.playerInfluence = null;
      message = target.name + " 拒绝了你的建议。";
    }

    target.familiarity = clamp(target.familiarity + FAMILIARITY_GAIN, 0, 1);
    state.hasTalkedThisRound = true;
    state.communicationLog.push(message);
    companyTalkResultEl.textContent = message;
    renderCommunication();
  }

  function buildDialogues() {
    var lines = [];

    if (hasType("A")) {
      var targets = state.coworkers.filter(function (c) {
        return c.type === "normal" && !c.fired;
      }).slice(0, 4);

      targets.forEach(function (c) {
        lines.push({ speaker: "员工A", text: "对 " + c.name + "：今晚一起加班吧，项目要紧。" });
        var reply;
        if (c.choice === "overtime") {
          reply = "好吧，我加。";
        } else if (c.rationality >= 0.8) {
          reply = "不了，我有自己的安排。";
        } else {
          reply = "我今天真的有事。";
        }
        lines.push({ speaker: c.name, text: reply });
      });
    }

    if (hasType("B")) {
      lines.push({ speaker: "员工B", text: "对大家：我们不该被加班文化绑架，准点下班才是对自己负责。" });
    }

    return lines;
  }

  function dialogueHtml(lines) {
    if (!lines.length) return "";
    var html = '<div class="dialogue-box">';
    lines.forEach(function (line) {
      html += '<div class="dialogue-line"><strong>' + line.speaker + '：</strong>' + line.text + '</div>';
    });
    html += '</div>';
    return html;
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
      companyStatusTextEl.textContent = "选择这一轮是否加班。你也可以先尝试说服一位同事。";
    }

    renderCoworkers();
    renderCommunication();

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
      '<div class="result-detail">' + detail + '</div>';
    companyResultEl.classList.remove("is-hidden");
  }

  function applySickPenalties(messages) {
    if (state.playerEnergy <= LOW_ENERGY_THRESHOLD) {
      state.playerSalary = Math.max(0, state.playerSalary - SICK_SALARY_PENALTY);
      messages.push("你精力过低，生病治疗，工资 -" + SICK_SALARY_PENALTY);
    }

    state.coworkers.forEach(function (c) {
      if (!c.fired && c.cumulative <= LOW_ENERGY_THRESHOLD) {
        c.salary = Math.max(0, c.salary - SICK_SALARY_PENALTY);
        messages.push(c.name + " 精力过低，生病治疗，工资 -" + SICK_SALARY_PENALTY);
      }
    });
  }

  function applyAReporting(messages) {
    if (!hasType("A")) return;

    state.coworkers.forEach(function (c) {
      if (c.fired || c.type === "A") return;

      if (c.choice === "leave") {
        c.leaveCount += 1;
        c.leaveDesire += 1;
      }

      while (c.leaveCount >= LEAVE_REPORT_THRESHOLD) {
        c.leaveCount -= LEAVE_REPORT_THRESHOLD;

        if (c.leaveDesire >= RESISTANCE_THRESHOLD && Math.random() < RESISTANCE_BLOCK_CHANCE) {
          messages.push(c.name + " 和同事们一起抵制工贼，告发被压下来了。");
        } else {
          c.reportCount += 1;
          c.salary = Math.max(0, c.salary - REPORT_SALARY_PENALTY);
          messages.push(c.name + " 被工贼告发，工资 -" + REPORT_SALARY_PENALTY);
        }
      }

      if (c.reportCount >= FIRE_REPORT_THRESHOLD) {
        c.fired = true;
        messages.push(c.name + " 被开除");
      }
    });

    state.coworkers = state.coworkers.filter(function (c) { return !c.fired; });
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
      state.hasTalkedThisRound = false;
      state.communicationLog = [];
      render();
    }
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
      c.playerInfluence = null;
    });

    state.overtimeCount = totalWorkers;
    state.companyOutput += totalWorkers * 4;
    state.lastOvertimeCount = totalWorkers;
    state.lastWorkerCount = totalWorkers;

    var messages = [];
    if (added) messages.push(added.name + "（" + added.tag + "）加入了公司。");
    messages.push("每个人收益 -2，但公司产出增加 " + (totalWorkers * 4) + "。你的工资 +" + state.playerRoundSalary + "。");
    applySickPenalties(messages);

    showResult("第 " + (state.round + 1) + " 轮：全员强制加班", messages.map(function (m) { return '<p>' + m + '</p>'; }).join(""), "Resources/tired.png");
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
      c.playerInfluence = null;
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

    var messages = [];
    if (added) messages.push(added.name + "（" + added.tag + "）加入了公司。");
    messages.push("本轮共有 " + totalOvertime + " / " + state.lastWorkerCount + " 人加班。你的工资 +" + state.playerRoundSalary + "。");
    if (totalOvertime >= OVERTIME_THRESHOLD) {
      messages.push("加班人数已经足够多，连续达标 " + state.streak + " 轮。");
    }

    applySickPenalties(messages);
    applyAReporting(messages);

    if (state.communicationLog.length) {
      messages.push("你的交流：" + state.communicationLog.join("；"));
    }

    var dialogues = buildDialogues();
    var detailHtml = messages.map(function (m) { return '<p>' + m + '</p>'; }).join("") + dialogueHtml(dialogues);

    var image = playerChoice === "overtime" ? "Resources/work.png" : "Resources/afterwork.png";
    showResult("第 " + (state.round + 1) + " 轮结果", detailHtml, image);

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
    companyBackSandboxBtn.classList.toggle("is-hidden", !unlocked);
    companyUnlockEl.classList.add("is-hidden");
    companyActionsEl.classList.remove("is-hidden");
    companyResultEl.classList.add("is-hidden");
    render();
  }

  function returnToCompany() {
    resetSimulation();
    startScreen.classList.add("is-hidden");
    companyScreen.classList.remove("is-hidden");
    companyBackSandboxBtn.classList.remove("is-hidden");
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
  talkOvertimeBtn.addEventListener("click", function () { talk("overtime"); });
  talkLeaveBtn.addEventListener("click", function () { talk("leave"); });
  returnCompanyBtn.addEventListener("click", returnToCompany);
  companyBackSandboxBtn.addEventListener("click", enterSandbox);

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
