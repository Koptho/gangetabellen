(function () {
  "use strict";

  var scoreEl = document.getElementById("score");
  var comboEl = document.getElementById("combo");
  var livesEl = document.getElementById("lives");
  var levelEl = document.getElementById("level");
  var statusLineEl = document.getElementById("statusLine");
  var questionEl = document.getElementById("question");
  var feedbackEl = document.getElementById("feedback");
  var timerBarEl = document.getElementById("timerBar");

  var answerForm = document.getElementById("answerForm");
  var answerInput = document.getElementById("answerInput");
  var tableOptions = document.getElementById("tableOptions");
  var startButton = document.getElementById("startButton");
  var restartButton = document.getElementById("restartButton");
  var highScoreListEl = document.getElementById("highScoreList");
  var saveScoreForm = document.getElementById("saveScoreForm");
  var playerNameInput = document.getElementById("playerName");
  var saveHintEl = document.getElementById("saveHint");

  var STORAGE_KEY = "gangetabell-toppscore-v1";

  var state = {
    score: 0,
    combo: 0,
    lives: 3,
    level: 1,
    selectedTables: [2, 3, 4, 5],
    currentQuestion: null,
    roundSeconds: 8,
    remainingMs: 0,
    running: false,
    finished: false,
    timerId: null,
  };

  var highScores = [];

  function renderTableOptions() {
    for (var i = 1; i <= 12; i++) {
      var id = "table-" + i;
      var label = document.createElement("label");
      var input = document.createElement("input");
      input.type = "checkbox";
      input.value = String(i);
      input.id = id;
      input.checked = state.selectedTables.indexOf(i) !== -1;
      label.htmlFor = id;
      label.appendChild(input);
      label.appendChild(document.createTextNode(i + "-gangen"));
      tableOptions.appendChild(label);
    }
  }

  function updateHUD() {
    scoreEl.textContent = String(state.score);
    comboEl.textContent = "x" + String(Math.max(1, state.combo));
    livesEl.textContent = String(state.lives);
    levelEl.textContent = String(state.level);
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function nextQuestion() {
    var a = pickRandom(state.selectedTables);
    var b = 1 + Math.floor(Math.random() * 12);
    state.currentQuestion = {
      a: a,
      b: b,
      answer: a * b,
    };
    questionEl.textContent = a + " × " + b + " = ?";
  }

  function clearFeedback() {
    feedbackEl.textContent = "";
    feedbackEl.classList.remove("ok");
    feedbackEl.classList.remove("err");
  }

  function animateCard(className) {
    questionEl.classList.remove("shake");
    questionEl.classList.remove("burst");
    void questionEl.offsetWidth;
    questionEl.classList.add(className);
  }

  function updateTimerBar() {
    var pct = Math.max(0, (state.remainingMs / (state.roundSeconds * 1000)) * 100);
    timerBarEl.style.width = pct + "%";
    if (pct > 50) {
      timerBarEl.style.background = "linear-gradient(90deg, #33c58e, #9be55b)";
    } else if (pct > 25) {
      timerBarEl.style.background = "linear-gradient(90deg, #ffc94b, #ff9f1c)";
    } else {
      timerBarEl.style.background = "linear-gradient(90deg, #ff5d73, #d7263d)";
    }
  }

  function applyWrong(message) {
    feedbackEl.classList.remove("ok");
    state.combo = 0;
    state.lives -= 1;
    feedbackEl.textContent = message;
    feedbackEl.classList.add("err");
    animateCard("shake");
    updateHUD();
    if (state.lives <= 0) {
      endGame();
      return;
    }
    setRoundTimer();
    nextQuestion();
  }

  function levelFromScore() {
    return 1 + Math.floor(state.score / 120);
  }

  function setRoundTimer() {
    var levelBonus = Math.max(0, state.level - 1) * 300;
    var seconds = Math.max(3.8, state.roundSeconds - levelBonus / 1000);
    state.remainingMs = seconds * 1000;
    updateTimerBar();
  }

  function endGame() {
    state.running = false;
    state.finished = true;
    statusLineEl.textContent = "Spelet er over. Trykk Start på nytt for ny runde.";
    questionEl.textContent = "Sluttsum: " + state.score;
    answerInput.disabled = true;
    feedbackEl.textContent = "Game over.";
    feedbackEl.classList.add("err");
    updateSaveSection();
  }

  function normalizeName(name) {
    var trimmed = name.trim();
    if (!trimmed) return "Spelar";
    return trimmed.slice(0, 14);
  }

  function loadHighScores() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter(function (entry) {
          return (
            entry &&
            typeof entry.name === "string" &&
            typeof entry.score === "number" &&
            Number.isFinite(entry.score)
          );
        })
        .sort(function (a, b) {
          return b.score - a.score;
        })
        .slice(0, 5);
    } catch (err) {
      return [];
    }
  }

  function saveHighScores() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(highScores));
      return true;
    } catch (err) {
      return false;
    }
  }

  function renderHighScores() {
    highScoreListEl.innerHTML = "";
    if (highScores.length === 0) {
      var emptyItem = document.createElement("li");
      emptyItem.textContent = "Ingen score enno";
      highScoreListEl.appendChild(emptyItem);
      return;
    }

    highScores.forEach(function (entry) {
      var item = document.createElement("li");
      item.textContent = entry.name + " - " + entry.score + " poeng";
      highScoreListEl.appendChild(item);
    });
  }

  function isTopScore(score) {
    if (score <= 0) return false;
    if (highScores.length < 5) return true;
    return score > highScores[highScores.length - 1].score;
  }

  function updateSaveSection() {
    if (!state.finished) {
      saveScoreForm.classList.add("hidden");
      saveHintEl.textContent = "";
      return;
    }

    if (isTopScore(state.score)) {
      saveScoreForm.classList.remove("hidden");
      saveHintEl.textContent = "Ny toppscore! Skriv namn og lagre.";
      playerNameInput.focus();
    } else {
      saveScoreForm.classList.add("hidden");
      saveHintEl.textContent = "Ikkje topp 5 denne gongen. Prøv igjen.";
    }
  }

  function saveCurrentScore(event) {
    event.preventDefault();
    if (!state.finished || !isTopScore(state.score)) return;

    var newEntry = {
      name: normalizeName(playerNameInput.value),
      score: state.score,
    };

    highScores.push(newEntry);
    highScores.sort(function (a, b) {
      return b.score - a.score;
    });
    highScores = highScores.slice(0, 5);
    var didSave = saveHighScores();
    renderHighScores();

    saveScoreForm.classList.add("hidden");
    saveHintEl.textContent = didSave ? "Score lagra!" : "Kunne ikkje lagre i nettlesaren.";
    playerNameInput.value = "";
  }

  function handleCorrect() {
    feedbackEl.classList.remove("err");
    state.combo += 1;
    var bonus = 10 + (state.combo - 1) * 2;
    state.score += bonus;
    state.level = levelFromScore();
    updateHUD();
    feedbackEl.textContent = "Rett! +" + bonus + " poeng";
    feedbackEl.classList.add("ok");
    animateCard("burst");
    setRoundTimer();
    nextQuestion();
  }

  function submitAnswer(event) {
    event.preventDefault();
    if (!state.running || !state.currentQuestion) return;

    clearFeedback();
    var value = Number(answerInput.value);
    answerInput.value = "";
    answerInput.focus();

    if (value === state.currentQuestion.answer) {
      handleCorrect();
    } else {
      applyWrong("Feil svar. Rett var " + state.currentQuestion.answer + ".");
    }
  }

  function tick() {
    if (!state.running) return;
    state.remainingMs -= 100;
    if (state.remainingMs <= 0) {
      applyWrong("Tida gjekk ut.");
      return;
    }
    updateTimerBar();
  }

  function collectTables() {
    var checked = tableOptions.querySelectorAll('input[type="checkbox"]:checked');
    var picked = [];
    checked.forEach(function (node) {
      picked.push(Number(node.value));
    });
    return picked;
  }

  function startGame() {
    var picked = collectTables();
    if (picked.length === 0) {
      feedbackEl.textContent = "Vel minst ein tabell fyrst.";
      feedbackEl.classList.add("err");
      return;
    }

    clearFeedback();
    state.selectedTables = picked;
    state.score = 0;
    state.combo = 0;
    state.lives = 3;
    state.level = 1;
    state.running = true;
    state.finished = false;
    answerInput.disabled = false;
    saveScoreForm.classList.add("hidden");
    playerNameInput.value = "";
    saveHintEl.textContent = "";
    updateHUD();
    statusLineEl.textContent = "Svar raskt for combo og høgare poeng.";
    setRoundTimer();
    nextQuestion();
    answerInput.focus();
  }

  function restartGame() {
    startGame();
  }

  function boot() {
    highScores = loadHighScores();
    renderHighScores();
    renderTableOptions();
    updateHUD();
    questionEl.textContent = "Trykk Start spel for å byrje.";
    answerInput.disabled = true;
    state.timerId = setInterval(tick, 100);
  }

  answerForm.addEventListener("submit", submitAnswer);
  saveScoreForm.addEventListener("submit", saveCurrentScore);
  startButton.addEventListener("click", startGame);
  restartButton.addEventListener("click", restartGame);
  boot();
})();
