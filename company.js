// SPDX-License-Identifier: GPL-3.0-or-later
// 主线：公司加班模拟，按周推进，员工会根据玩家决策更新好感
(function () {
  "use strict";

  var TOTAL_DAYS = 42;
  var DAYS_PER_WEEK = 7;
  var OVERTIME_THRESHOLD = 4;
  var CULTURE_STREAK = 2;
  var WEEKDAY_SALARY = 8;
  var OVERTIME_SALARY_BONUS = 6;
  var WORK_ENERGY_COST = 1;
  var OVERTIME_ENERGY_BASE = 2;
  var OVERTIME_ENERGY_STEP = 1;
  var WEEKEND_WORK_SALARY = 20;
  var WEEKEND_WORK_ENERGY = 2;
  var REST_ENERGY_MIN = 2;
  var REST_ENERGY_MAX = 4;
  var AI_OVERTIME_SALARY = 12;
  var AI_LEAVE_SALARY = 8;
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
  var REPUTATION_OVERTIME = -2;
  var REPUTATION_LEAVE = 1;
  var REPUTATION_REST = 2;
  var REPUTATION_WEEKEND_WORK = -1;

  var WEEKDAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

  var COWORKERS = [
    { name: "老张", bias: 0.75, desc: "老员工，习惯加班", rationality: 0.40, familiarity: 0.40, proactiveChance: 0.55 },
    { name: "小李", bias: 0.55, desc: "看情况，随大流", rationality: 0.60, familiarity: 0.30, proactiveChance: 0.40 },
    { name: "小王", bias: 0.35, desc: "想准点下班", rationality: 0.80, familiarity: 0.50, proactiveChance: 0.35 },
    { name: "小周", bias: 0.25, desc: "能溜就溜", rationality: 0.90, familiarity: 0.20, proactiveChance: 0.20 },
    { name: "阿杰", bias: 0.10, desc: "几乎不加班", rationality: 0.70, familiarity: 0.30, proactiveChance: 0.10 }
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
  var companyPlayerReputationEl = document.getElementById("company-player-reputation");
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
  var companyProactiveEl = document.getElementById("company-proactive");
  var proactiveSpeakerEl = document.getElementById("proactive-speaker");
  var proactiveTextEl = document.getElementById("proactive-text");
  var proactiveAgreeBtn = document.getElementById("proactive-agree-btn");
  var proactiveRefuseBtn = document.getElementById("proactive-refuse-btn");
  var proactivePretendAgreeBtn = document.getElementById("proactive-pretend-agree-btn");
  var proactivePretendRefuseBtn = document.getElementById("proactive-pretend-refuse-btn");
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
      proactiveChance: seed.proactiveChance || 0,
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

  function makeSpecial(type, count) {
    var seed = SPECIALS[type];
    var number = count > 1 ? String(count) : "";
    return {
      name: seed.name + number,
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
      playerReputation: 50,
      companyOutput: 0,
      playerChoice: null,
      playerPayoff: null,
      forced: false,
      streak: 0,
      overtimeStreak: 0,
      overtimeCount: 0,
      lastOvertimeCount: null,
      lastWorkerCount: null,
      hasTalkedThisRound: false,
      communicationLog: [],
      coworkers: COWORKERS.map(makeCoworker),
      specialCounts: { A: 0, B: 0, C: 0 },
      proactiveEvent: null,
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

  function currentDayIndex() {
    return state.round % DAYS_PER_WEEK;
  }

  function isWeekend() {
    return currentDayIndex() >= 5;
  }

  function currentWeek() {
    return Math.floor(state.round / DAYS_PER_WEEK) + 1;
  }

  function currentOvertimeCost() {
    return OVERTIME_ENERGY_BASE + state.overtimeStreak * OVERTIME_ENERGY_STEP;
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
    if (currentRound < SPECIAL_ADD_FIRST_ROUND) {
      return null;
    }

    var shouldAdd = currentRound === SPECIAL_ADD_FIRST_ROUND || Math.random() < SPECIAL_ADD_CHANCE;
    if (!shouldAdd) return null;

    var types = ["A", "B", "C"];
    var type = types[Math.floor(Math.random() * types.length)];
    state.specialCounts[type] += 1;
    var employee = makeSpecial(type, state.specialCounts[type]);
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

    var talkDisabled = state.hasTalkedThisRound || state.done || !normalAvailable;
    talkOvertimeBtn.disabled = talkDisabled;
    talkLeaveBtn.disabled = talkDisabled;
    companyTalkTargetEl.disabled = talkDisabled;
  }

  function maybeTriggerProactive() {
    if (state.proactiveEvent) return;

    var candidates = state.coworkers.filter(function (c) {
      return c.type === "normal" && !c.fired;
    });

    if (!candidates.length) return;

    var chosen = null;
    for (var i = 0; i < candidates.length; i++) {
      var chance = candidates[i].proactiveChance || 0;
      if (Math.random() < chance) {
        chosen = candidates[i];
        break;
      }
    }

    if (!chosen) return;

    var text = chosen.bias >= 0.5
      ? "今晚一起加班吗？我想听听你的真实想法。"
      : "这轮我想准点下班，你怎么看？";

    state.proactiveEvent = {
      name: chosen.name,
      text: text
    };
  }

  function renderProactive() {
    if (state.proactiveEvent && !state.done) {
      proactiveSpeakerEl.textContent = state.proactiveEvent.name;
      proactiveTextEl.textContent = state.proactiveEvent.text;
      companyProactiveEl.classList.remove("is-hidden");
    } else {
      companyProactiveEl.classList.add("is-hidden");
    }
  }

  function handleProactive(response) {
    if (!state.proactiveEvent) return;

    var event = state.proactiveEvent;
    var repChange = 0;
    var message = "";

    if (response === "agree") {
      repChange = 2;
      message = "你真诚同意了 " + event.name + " 的提议，员工好感 +2。";
    } else if (response === "refuse") {
      repChange = 0;
      message = "你真诚拒绝了 " + event.name + " 的提议。";
    } else if (response === "pretend-agree") {
      repChange = -3;
      message = "你假装同意 " + event.name + "，对方感觉到了不真诚，员工好感 -3。";
    } else if (response === "pretend-refuse") {
      repChange = -3;
      message = "你假装拒绝 " + event.name + "，对方感觉到了不真诚，员工好感 -3。";
    }

    state.playerReputation = clamp(state.playerReputation + repChange, 0, 100);
    state.communicationLog.push(message);
    companyTalkResultEl.textContent = message;
    state.proactiveEvent = null;
    renderProactive();
    render();
  }

  function talk(direction) {
    if (state.hasTalkedThisRound || state.done) return;

    var target = findCoworker(companyTalkTargetEl.value);
    if (!target || target.type !== "normal") return;

    var familiarity = target.familiarity;
    var rationality = target.rationality;
    var reputationFactor = state.playerReputation / 100;
    var verbalChance = 0.35 + 0.5 * familiarity * (1 - rationality) + 0.15 * reputationFactor;
    var actualChance = verbalChance * (0.5 + 0.4 * reputationFactor);
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

  function updateActionButtons() {
    var overtimeLabel = overtimeBtn.querySelector(".action-label");
    var overtimeSub = overtimeBtn.querySelector(".action-sub");
    var leaveLabel = leaveBtn.querySelector(".action-label");
    var leaveSub = leaveBtn.querySelector(".action-sub");

    if (isWeekend()) {
      overtimeLabel.textContent = "工作";
      overtimeSub.textContent = "工资 +" + WEEKEND_WORK_SALARY + " / 精力 -" + WEEKEND_WORK_ENERGY;
      leaveLabel.textContent = "休息";
      leaveSub.textContent = "不加薪 / 恢复 " + REST_ENERGY_MIN + "-" + REST_ENERGY_MAX + " 精力";
    } else if (state.forced) {
      overtimeLabel.textContent = "继续（强制加班）";
      overtimeSub.textContent = "全员必须加班";
      leaveLabel.textContent = "不可选择";
      leaveSub.textContent = "加班文化已经形成";
    } else {
      overtimeLabel.textContent = "加班";
      overtimeSub.textContent = "工资 +" + (WEEKDAY_SALARY + OVERTIME_SALARY_BONUS) + " / 精力 -" + (WORK_ENERGY_COST + currentOvertimeCost());
      leaveLabel.textContent = "不加班";
      leaveSub.textContent = "工资 +" + WEEKDAY_SALARY + " / 精力 -" + WORK_ENERGY_COST;
    }
  }

  function render() {
    companyRoundEl.textContent = "第" + currentWeek() + "周 " + WEEKDAY_NAMES[currentDayIndex()] + "（" + (state.round + 1) + "/" + TOTAL_DAYS + "）";
    companyPlayerEnergyEl.textContent = String(state.playerEnergy);
    companyPlayerSalaryEl.textContent = String(state.playerSalary);
    companyOutputEl.textContent = String(state.companyOutput);
    companyPlayerReputationEl.textContent = String(state.playerReputation);
    companyPlayerPayoffEl.textContent = state.playerPayoff === null ? "—" : sign(state.playerPayoff);

    if (isWeekend()) {
      companyStatusTextEl.textContent = "周末：你可以选择休息恢复精力，或者继续工作赚取更高工资。";
    } else if (state.forced) {
      companyStatusTextEl.textContent = "工作日：加班文化已经形成，全员强制加班。";
    } else {
      companyStatusTextEl.textContent = "工作日：必须先工作，然后选择是否加班。你也可以先尝试说服一位同事。";
    }

    updateActionButtons();
    renderCoworkers();
    renderCommunication();
    renderProactive();

    if (state.done) {
      companyActionsEl.classList.add("is-hidden");
      companyResultEl.classList.add("is-hidden");
      companyUnlockEl.classList.remove("is-hidden");
    } else {
      companyUnlockEl.classList.add("is-hidden");
      var forcedWeekday = !isWeekend() && state.forced;
      overtimeBtn.disabled = forcedWeekday ? false : false;
      leaveBtn.disabled = forcedWeekday ? true : false;
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
    if (state.round >= TOTAL_DAYS) {
      finish();
    } else {
      state.hasTalkedThisRound = false;
      state.communicationLog = [];
      state.proactiveEvent = null;
      maybeTriggerProactive();
      render();
    }
  }

  function playCoworkers() {
    var coworkerOvertime = 0;
    state.coworkers.forEach(function (c) {
      if (c.fired) return;
      c.choice = chooseForCoworker(c);
      c.payoff = c.choice === "overtime" ? -1 : 0;
      c.cumulative += c.payoff;
      c.salary += c.choice === "overtime" ? AI_OVERTIME_SALARY : AI_LEAVE_SALARY;
      c.lastChoice = c.choice;
      c.playerInfluence = null;
      if (c.choice === "overtime") coworkerOvertime += 1;
    });
    return coworkerOvertime;
  }

  function playWeekday(action) {
    var added = addSpecialIfDue();
    var forced = state.forced;
    if (forced) action = "overtime";

    state.playerChoice = action;
    if (action === "overtime") {
      var overtimeCost = currentOvertimeCost();
      state.playerPayoff = -(WORK_ENERGY_COST + overtimeCost);
      state.playerEnergy += state.playerPayoff;
      state.playerRoundSalary = WEEKDAY_SALARY + OVERTIME_SALARY_BONUS;
      state.playerSalary += state.playerRoundSalary;
      state.overtimeStreak += 1;
      state.playerReputation = clamp(state.playerReputation + REPUTATION_OVERTIME, 0, 100);
    } else {
      state.playerPayoff = -WORK_ENERGY_COST;
      state.playerEnergy += state.playerPayoff;
      state.playerRoundSalary = WEEKDAY_SALARY;
      state.playerSalary += state.playerRoundSalary;
      state.overtimeStreak = 0;
      state.playerReputation = clamp(state.playerReputation + REPUTATION_LEAVE, 0, 100);
    }

    var coworkerOvertime = playCoworkers();
    var totalOvertime = (action === "overtime" ? 1 : 0) + coworkerOvertime;
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
    messages.push("今天工作后你选择了" + (action === "overtime" ? "加班" : "不加班") + "，工资 +" + state.playerRoundSalary + "，精力 " + state.playerPayoff + "。");
    if (action === "overtime") messages.push("你已经连续加班 " + state.overtimeStreak + " 天，下一次加班会更累。");

    applySickPenalties(messages);
    applyAReporting(messages);

    if (state.communicationLog.length) {
      messages.push("你的交流：" + state.communicationLog.join("；"));
    }

    if (state.streak >= CULTURE_STREAK && !state.forced) {
      state.forced = true;
      messages.push("加班文化形成：之后的工作日全员强制加班。");
    }

    var dialogues = buildDialogues();
    var detailHtml = messages.map(function (m) { return '<p>' + m + '</p>'; }).join("") + dialogueHtml(dialogues);

    var image = action === "overtime" ? "Resources/overwork.png" : "Resources/afterwork.png";
    showResult("第" + currentWeek() + "周 " + WEEKDAY_NAMES[currentDayIndex()], detailHtml, image);
    advance();
  }

  function playWeekend(action) {
    var added = addSpecialIfDue();

    if (action === "rest") {
      state.playerChoice = "rest";
      var restore = REST_ENERGY_MIN + Math.floor(Math.random() * (REST_ENERGY_MAX - REST_ENERGY_MIN + 1));
      state.playerPayoff = restore;
      state.playerEnergy += restore;
      state.playerRoundSalary = 0;
      state.overtimeStreak = 0;
      state.playerReputation = clamp(state.playerReputation + REPUTATION_REST, 0, 100);
    } else {
      state.playerChoice = "work";
      state.playerPayoff = -WEEKEND_WORK_ENERGY;
      state.playerEnergy += state.playerPayoff;
      state.playerRoundSalary = WEEKEND_WORK_SALARY;
      state.playerSalary += state.playerRoundSalary;
      state.companyOutput += 4;
      state.overtimeStreak = 0;
      state.playerReputation = clamp(state.playerReputation + REPUTATION_WEEKEND_WORK, 0, 100);
    }

    var coworkerOvertime = playCoworkers();
    state.lastOvertimeCount = coworkerOvertime;
    state.lastWorkerCount = workerCount();

    var messages = [];
    if (added) messages.push(added.name + "（" + added.tag + "）加入了公司。");
    if (action === "rest") {
      messages.push("你选择休息，精力恢复 +" + state.playerPayoff + "，本周不增加工资。");
    } else {
      messages.push("你选择周末工作，工资 +" + state.playerRoundSalary + "，精力 " + state.playerPayoff + "。");
    }

    applySickPenalties(messages);
    applyAReporting(messages);

    if (state.communicationLog.length) {
      messages.push("你的交流：" + state.communicationLog.join("；"));
    }

    var dialogues = buildDialogues();
    var detailHtml = messages.map(function (m) { return '<p>' + m + '</p>'; }).join("") + dialogueHtml(dialogues);

    var image = action === "rest" ? "Resources/energy.png" : "Resources/work.png";
    showResult("第" + currentWeek() + "周 " + WEEKDAY_NAMES[currentDayIndex()], detailHtml, image);
    advance();
  }

  function playRound(action) {
    if (state.done) return;
    if (isWeekend()) {
      playWeekend(action);
    } else {
      playWeekday(action);
    }
  }

  function startGame() {
    resetSimulation();
    startScreen.classList.add("is-hidden");
    companyScreen.classList.remove("is-hidden");
    companyBackSandboxBtn.classList.toggle("is-hidden", !unlocked);
    companyUnlockEl.classList.add("is-hidden");
    companyActionsEl.classList.remove("is-hidden");
    companyResultEl.classList.add("is-hidden");
    maybeTriggerProactive();
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
    maybeTriggerProactive();
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

  proactiveAgreeBtn.addEventListener("click", function () { handleProactive("agree"); });
  proactiveRefuseBtn.addEventListener("click", function () { handleProactive("refuse"); });
  proactivePretendAgreeBtn.addEventListener("click", function () { handleProactive("pretend-agree"); });
  proactivePretendRefuseBtn.addEventListener("click", function () { handleProactive("pretend-refuse"); });
  startBtn.addEventListener("click", startGame);
  overtimeBtn.addEventListener("click", function () { playRound(isWeekend() ? "work" : "overtime"); });
  leaveBtn.addEventListener("click", function () { playRound(isWeekend() ? "rest" : "leave"); });
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
