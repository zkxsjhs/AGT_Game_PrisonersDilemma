// SPDX-License-Identifier: GPL-3.0-or-later
// 课程切换
(function () {
  "use strict";

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".lesson-tab"));
  var lessons = Array.prototype.slice.call(document.querySelectorAll(".lesson"));

  function activate(lessonNumber) {
    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-lesson") === String(lessonNumber);
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-current", active ? "page" : "false");
    });

    lessons.forEach(function (lesson) {
      var active = lesson.id === "lesson-" + lessonNumber;
      lesson.classList.toggle("is-active", active);
      lesson.hidden = !active;
    });
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      activate(tab.getAttribute("data-lesson"));
    });
  });

  activate(1);
})();
