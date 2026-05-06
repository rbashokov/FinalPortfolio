const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const hubIntroPanel = document.getElementById("hubIntroPanel");
const gotItButton = document.getElementById("gotItButton");

const introPanel = document.getElementById("introPanel");
const introTitle = document.getElementById("introTitle");
const introText = document.getElementById("introText");
const startGameButton = document.getElementById("startGameButton");
const backFromIntroButton = document.getElementById("backFromIntroButton");

const unlockPanel = document.getElementById("unlockPanel");
const unlockTitle = document.getElementById("unlockTitle");
const unlockText = document.getElementById("unlockText");
const unlockLink = document.getElementById("unlockLink");
const playAgainButton = document.getElementById("playAgainButton");
const hubButton = document.getElementById("hubButton");

const unlockModeToggle = document.getElementById("unlockModeToggle");

const projects = {
    loop: {
        title: "The Loop",
        link: "https://rbashokov.github.io/project1-the-loop/",
        unlockText: "You broke the repeating path. The original project is a short movie website built around a time loop mystery and a hidden inconsistency.",
        introText: "You are trapped in a dark looping room. To unlock the project, move to the screen edges in the correct order shown in the left bottom corner. You should memorize it before moving on. A wrong move resets the sequence."
    },
    switch: {
        title: "The Switch",
        link: "https://rbashokov.github.io/project2-the-switch/",
        unlockText: "You survived the switched controls. The original project is an online comic about two students learning empathy by living through each other’s routines.",
        introText: "Dodge the falling obstacles until the timer ends. The challenge becomes harder over time, and your left-right controls keep switching."
    },
    audio: {
        title: "The Homecoming",
        link: "https://dsshji.github.io/comm-lab-audiostory/",
        unlockText: "You followed the signal through the darkness. The original project is a sound based story about burnout, home nostalgia, and internal peace.",
        introText: "The world is dark. Follow the sound using the volume meter in the bottom right corner. The signal itself is hidden, so you must move toward louder sound."
    },
    focus: {
        title: "How to Not Procrastinate",
        link: "https://rbashokov.github.io/comm-lab-project4/",
        unlockText: "You locked in and reached the top. The original project is an interactive video website about procrastination and focus.",
        introText: "Climb upward to reach the link at the top. Avoid moving distractions on every level. Getting hit pushes you back down."
    }
};

let width = window.innerWidth;
let height = window.innerHeight;
let scene = "hub";
let keys = {};
let portals = [];
let activePortal = null;
let currentProjectId = null;
let introDismissed = false;

let player = {
    x: width / 2,
    y: height / 2,
    r: 13,
    speed: 3.4
};

let unlocked = {
    loop: false,
    switch: false,
    audio: false,
    focus: false
};

let loopStep = 0;
let loopMessage = "follow the order: up, right, up, left";
let loopSequence = [];

let falling = [];
let switchStartedAt = 0;
let lastFallAt = 0;
let switchLives = 3;
let controlsReversed = false;

let soundTarget = {
    x: width * 0.78,
    y: height * 0.28
};

let audioSignal = document.getElementById("audioSignal");
let audioReady = false;

let distractions = [];
let focusMessage = "reach the light at the top";
let hitCooldown = 0;
let focusWalls = [];

resetProgress();
resizeCanvas();
connectEvents();
showHubIntroPanel();
draw();

function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;

    const ratio = window.devicePixelRatio || 1;

    canvas.width = width * ratio;
    canvas.height = height * ratio;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    createPortals();

    player.x = clamp(player.x, player.r, width - player.r);
    player.y = clamp(player.y, player.r, height - player.r);
}

function connectEvents() {
    window.addEventListener("keydown", function (event) {
        const key = event.key.toLowerCase();

        if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
            event.preventDefault();
        }

        const panelIsOpen =
            hubIntroPanel.classList.contains("hidden") === false ||
            introPanel.classList.contains("hidden") === false ||
            unlockPanel.classList.contains("hidden") === false;

        if (panelIsOpen) {
            if (key === "h" && introDismissed) {
                returnToHub();
            }

            return;
        }

        keys[key] = true;
        startAudioContext();

        if (key === "e" && scene === "hub" && activePortal) {
            enterPortal(activePortal.id);
        }

        if (key === "h") {
            returnToHub();
        }

        if (key === "r") {
            resetCurrentLevel();
        }
    });

    window.addEventListener("keyup", function (event) {
        keys[event.key.toLowerCase()] = false;
    });

    window.addEventListener("resize", function () {
        resizeCanvas();
    });

    unlockModeToggle.addEventListener("change", function () {
        if (unlockModeToggle.checked) {
            hideAllPanels();
            introDismissed = true;
        }
    });

    hubButton.addEventListener("click", function () {
        returnToHub();
    });

    backFromIntroButton.addEventListener("click", function () {
        returnToHub();
    });

    gotItButton.addEventListener("click", function () {
        introDismissed = true;
        resetKeys();
        hideAllPanels();
    });

    startGameButton.addEventListener("click", function () {
        if (!currentProjectId) {
            return;
        }

        resetKeys();
        hideAllPanels();
        startLevel(currentProjectId);
    });

    playAgainButton.addEventListener("click", function () {
        if (!currentProjectId) {
            return;
        }

        resetKeys();
        hideAllPanels();
        startLevel(currentProjectId);
    });
}

function draw() {
    if (scene !== "audio") {
        quietAudio();
    }

    if (scene === "hub") {
        drawHub();
    }

    if (scene === "loop") {
        drawLoop();
    }

    if (scene === "switch") {
        drawSwitch();
    }

    if (scene === "audio") {
        drawAudio();
    }

    if (scene === "focus") {
        drawFocus();
    }

    if (scene === "unlocked") {
        drawUnlockedBackground();
    }

    requestAnimationFrame(draw);
}

function createPortals() {
    portals = [
        {
            id: "loop",
            label: "The Loop Escape",
            x: width * 0.26,
            y: height * 0.36
        },
        {
            id: "switch",
            label: "The Raining Assignments",
            x: width * 0.74,
            y: height * 0.36
        },
        {
            id: "audio",
            label: "The Sound Pursuit",
            x: width * 0.26,
            y: height * 0.72
        },
        {
            id: "focus",
            label: "The Way to Lock In",
            x: width * 0.74,
            y: height * 0.72
        }
    ];
}

function drawHub() {
    drawBackground(13);

    if (introDismissed && !panelIsOpen()) {
        updatePlayer(false);
    }

    activePortal = null;

    portals.forEach(function (portal) {
        drawPortal(portal);
    });

    drawPlayer();
    drawHubText();
    drawPortalHint();
}

function drawPortal(portal) {
    const distanceToPlayer = distance(player.x, player.y, portal.x, portal.y);
    const isNear = distanceToPlayer < 76;
    const isUnlocked = unlocked[portal.id] || unlockModeToggle.checked;

    if (isNear) {
        activePortal = portal;
    }

    ctx.save();
    ctx.translate(portal.x, portal.y);

    ctx.strokeStyle = isUnlocked ? "#c49243" : "rgba(244, 239, 227, 0.52)";
    ctx.lineWidth = isNear ? 3 : 1.5;

    drawCircle(0, 0, 43 + Math.sin(Date.now() * 0.004) * 3, false);
    drawCircle(0, 0, 27, false);

    ctx.restore();

    drawText(portal.label, portal.x, portal.y + 66, 15, "#f4efe3", "center", 600);
}

function drawHubText() {
    if (unlockModeToggle.checked) {
        drawText("unlock mode is on. enter any portal to reveal its project link.", width / 2, height - 44, 15, "rgba(244, 239, 227, 0.72)", "center", 500);
        return;
    }

    const count = unlockedCount();
    drawText(count + " of 4 projects unlocked", width / 2, height - 44, 15, "rgba(244, 239, 227, 0.72)", "center", 500);
}

function drawPortalHint() {
    if (!introDismissed || panelIsOpen() || !activePortal) {
        return;
    }

    let message = "";

    if (unlockModeToggle.checked) {
        message = "press e to reveal " + activePortal.label;
    } else if (unlocked[activePortal.id]) {
        message = "press e to reveal " + activePortal.label;
    } else {
        message = "press e to enter " + activePortal.label;
    }

    drawText(message, width / 2, height - 72, 15, "#f4efe3", "center", 500);
}

function startLevel(id) {
    if (id === "loop") {
        startLoop();
    }

    if (id === "switch") {
        startSwitch();
    }

    if (id === "audio") {
        startAudio();
    }

    if (id === "focus") {
        startFocus();
    }
}

function startLoop() {
    scene = "loop";
    loopStep = 0;

    const directions = ["up", "right", "down", "left"];

    loopSequence = [];

    for (let i = 0; i < 4; i += 1) {
        loopSequence.push(directions[Math.floor(random(0, directions.length))]);
    }

    loopMessage = "follow the order: " + loopSequence.join(", ");

    player.x = width / 2;
    player.y = height / 2;
    player.speed = 3.4;
}

function drawLoop() {
    drawBackground(5);
    drawLoopRoom();
    updatePlayer(false);
    checkLoopExit();
    drawPlayer();
    drawLevelText("the loop escape", loopMessage);
}

function drawLoopRoom() {
    ctx.strokeStyle = "rgba(244, 239, 227, 0.28)";
    ctx.lineWidth = 1;
    ctx.strokeRect(90, 90, width - 180, height - 180);

    drawText("up", width / 2, 62, 13, "#c49243", "center", 600);
    drawText("right", width - 54, height / 2, 13, "#c49243", "center", 600);
    drawText("down", width / 2, height - 54, 13, "#c49243", "center", 600);
    drawText("left", 54, height / 2, 13, "#c49243", "center", 600);
}

function checkLoopExit() {
    let direction = null;

    if (player.y <= player.r + 1) {
        direction = "up";
    } else if (player.x >= width - player.r - 1) {
        direction = "right";
    } else if (player.y >= height - player.r - 1) {
        direction = "down";
    } else if (player.x <= player.r + 1) {
        direction = "left";
    }

    if (!direction) {
        return;
    }

    if (direction === loopSequence[loopStep]) {
        loopMessage = "correct move: " + direction;
        loopStep += 1;
    } else {
        loopMessage = "wrong move. sequence reset.";
        loopStep = 0;
    }

    player.x = width / 2;
    player.y = height / 2;

    if (loopStep >= loopSequence.length) {
        unlockProject("loop");
    }
}

function startSwitch() {
    scene = "switch";
    switchStartedAt = performance.now();
    lastFallAt = 0;
    switchLives = 3;
    falling = [];
    player.x = width / 2;
    player.y = height - 80;
    player.speed = 4.8;
}

function drawSwitch() {
    drawBackground(12);

    const elapsed = performance.now() - switchStartedAt;
    const remaining = Math.max(0, 23000 - elapsed);

    controlsReversed = Math.floor(elapsed / 2500) % 2 === 1;

    if (controlsReversed) {
        drawSwitchWarning();
    }

    updatePlayer(controlsReversed);
    spawnFalling();
    updateFalling();
    drawPlayer();

    const controlText = controlsReversed ? "controls switched" : "controls normal";
    const subtitleColor = controlsReversed ? "#ff4d4d" : "rgba(244, 239, 227, 0.9)";

    drawLevelText("the raining assignments", controlText + " / lives " + switchLives + " / " + Math.ceil(remaining / 1000) + "s", subtitleColor);

    if (remaining <= 0) {
        unlockProject("switch");
        return;
    }
}

function drawSwitchWarning() {
    ctx.fillStyle = "rgba(255, 77, 77, 0.08)";
    ctx.fillRect(0, 0, width, height);

    drawText("controls switched", width / 2, height * 0.18, 42, "#ff4d4d", "center", 800);
}

function spawnFalling() {
    if (performance.now() - lastFallAt < 280) {
        return;
    }

    const labels = ["essay", "bug", "exam", "deck", "deadline", "code", "pitch", "task"];
    const amount = Math.random() < 0.6 ? 2 : 3;

    for (let i = 0; i < amount; i += 1) {
        falling.push({
            x: random(50, width - 50),
            y: -40,
            r: random(15, 30),
            speed: random(3.6, 6.8),
            label: labels[Math.floor(random(0, labels.length))]
        });
    }

    lastFallAt = performance.now();
}

function updateFalling() {
    for (let i = falling.length - 1; i >= 0; i -= 1) {
        const item = falling[i];
        item.y += item.speed;

        ctx.fillStyle = "#c49243";
        drawCircle(item.x, item.y, item.r, true);
        drawText(item.label, item.x, item.y + 1, 10, "#101010", "center", 600);

        if (distance(player.x, player.y, item.x, item.y) < player.r + item.r) {
            falling.splice(i, 1);
            switchLives -= 1;

            if (switchLives <= 0) {
                startSwitch();
                return;
            }
        } else if (item.y > height + 60) {
            falling.splice(i, 1);
        }
    }
}

function startAudio() {
    scene = "audio";

    player.x = width / 2;
    player.y = height / 2;
    player.speed = 3.1;

    const margin = 120;
    const bottomSafeZone = 160;

    const possibleTargets = [
        { x: margin, y: margin },
        { x: width / 2, y: margin },
        { x: width - margin, y: margin },

        { x: margin, y: height / 2 },
        { x: width - margin, y: height / 2 },

        { x: margin, y: height - bottomSafeZone },
        { x: width / 2, y: height - bottomSafeZone },
        { x: width - margin, y: height - bottomSafeZone }
    ];

    soundTarget = possibleTargets[Math.floor(random(0, possibleTargets.length))];

    if (audioSignal) {
        audioSignal.currentTime = 0;
        audioSignal.volume = 0;

        audioSignal.play()
            .then(function () {
                audioReady = true;
            })
            .catch(function () {
                audioReady = false;
            });
    }
}

function drawAudio() {
    drawBackground(3);

    updatePlayer(false);

    const distanceToTarget = distance(player.x, player.y, soundTarget.x, soundTarget.y);
    const maxDistance = getMaxDistanceFromTarget(soundTarget);

    const rawCloseness = clamp(1 - distanceToTarget / maxDistance, 0, 1);
    const closeness = Math.pow(rawCloseness, 3.2);

    updateAudioTone(closeness);
    drawAudioLight(closeness);
    drawPlayer();
    drawVolumeMeter(closeness);
    drawLevelText("the sound pursuit", "follow the volume. the signal is hidden.");

    if (distanceToTarget < 32) {
        unlockProject("audio");
    }
}

function getMaxDistanceFromTarget(target) {
    const distances = [
        distance(0, 0, target.x, target.y),
        distance(width, 0, target.x, target.y),
        distance(0, height, target.x, target.y),
        distance(width, height, target.x, target.y)
    ];

    return Math.max(...distances);
}

function drawAudioLight(closeness) {
    const lightSize = 72 + closeness * 84;

    const gradient = ctx.createRadialGradient(
        player.x,
        player.y,
        0,
        player.x,
        player.y,
        lightSize
    );

    gradient.addColorStop(0, "rgba(244, 239, 227, 0.24)");
    gradient.addColorStop(0.45, "rgba(196, 146, 67, 0.14)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = gradient;
    drawCircle(player.x, player.y, lightSize, true);
}

function drawVolumeMeter(closeness) {
    const meterX = width - 190;
    const meterY = height - 70;
    const activeBars = Math.floor(closeness * 10);

    drawText("volume", meterX, meterY - 24, 15, "rgba(244, 239, 227, 0.82)", "left", 600);

    for (let i = 0; i < 10; i += 1) {
        if (i < activeBars) {
            ctx.fillStyle = "#c49243";
        } else {
            ctx.fillStyle = "rgba(244, 239, 227, 0.16)";
        }

        roundRect(meterX + i * 15, meterY, 9, 20 + i * 2.5, 5, true);
    }
}

function startFocus() {
    scene = "focus";
    player.x = width / 2;
    player.y = height - 48;
    player.speed = 3.55;
    focusMessage = "reach the light at the top";
    hitCooldown = 0;

    focusWalls = generateFocusWalls();

    distractions = [
    { x: 120, y: height - 125, speed: 4.2, text: "later" },
    { x: width - 180, y: height - 195, speed: -4.0, text: "one more video" },
    { x: 160, y: height - 265, speed: 4.5, text: "check phone" },
    { x: width - 210, y: height - 335, speed: -4.3, text: "five min break" },
    { x: 260, y: height - 405, speed: 4.8, text: "open tab" },
    { x: width - 260, y: height - 475, speed: -4.6, text: "scroll" },
    { x: width / 2, y: height - 545, speed: 4.4, text: "tomorrow" },
    { x: 220, y: height - 615, speed: 5.0, text: "snack" },
    { x: width - 240, y: height - 685, speed: -4.8, text: "message" }
    ];
}

function generateFocusWalls() {
    const walls = [];
    const rows = 9;
    const spacing = 70;

    for (let i = 0; i < rows; i += 1) {
        const y = height - 105 - i * spacing;

        const gapWidth = random(width * 0.24, width * 0.36);
        const gapX = random(width * 0.12, width * 0.88 - gapWidth);

        const leftWallEnd = gapX;
        const rightWallStart = gapX + gapWidth;

        if (leftWallEnd > width * 0.08) {
            walls.push({
                x1: width * 0.04,
                y1: y,
                x2: leftWallEnd,
                y2: y
            });
        }

        if (rightWallStart < width * 0.92) {
            walls.push({
                x1: rightWallStart,
                y1: y,
                x2: width * 0.96,
                y2: y
            });
        }
    }

    return walls;
}

function getFocusWalls() {
    return focusWalls;
}

function drawFocus() {
    drawBackground(10);

    const previousX = player.x;
    const previousY = player.y;

    updatePlayer(false);
    resolveFocusWallCollision(previousX, previousY);

    drawFocusWorld();
    updateDistractions();
    drawPlayer();
    drawLevelText("the way to lock in", focusMessage);

    if (distance(player.x, player.y, width / 2, 62) < 42) {
        unlockProject("focus");
    }
}

function getFocusWalls() {
    return [
        {
            x1: width * 0.08,
            y1: height - 105,
            x2: width * 0.48,
            y2: height - 105
        },
        {
            x1: width * 0.56,
            y1: height - 175,
            x2: width * 0.94,
            y2: height - 175
        },
        {
            x1: width * 0.18,
            y1: height - 245,
            x2: width * 0.66,
            y2: height - 245
        },
        {
            x1: width * 0.74,
            y1: height - 315,
            x2: width * 0.98,
            y2: height - 315
        },
        {
            x1: width * 0.02,
            y1: height - 385,
            x2: width * 0.42,
            y2: height - 385
        },
        {
            x1: width * 0.48,
            y1: height - 455,
            x2: width * 0.86,
            y2: height - 455
        },
        {
            x1: width * 0.12,
            y1: height - 525,
            x2: width * 0.58,
            y2: height - 525
        },
        {
            x1: width * 0.64,
            y1: height - 595,
            x2: width * 0.96,
            y2: height - 595
        },
        {
            x1: width * 0.24,
            y1: height - 665,
            x2: width * 0.76,
            y2: height - 665
        }
    ];
}


function drawFocusWorld() {
    const walls = getFocusWalls();

    ctx.strokeStyle = "rgba(244, 239, 227, 0.58)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    walls.forEach(function (wall) {
        drawLine(wall.x1, wall.y1, wall.x2, wall.y2);
    });

    ctx.lineCap = "butt";

    ctx.fillStyle = "#c49243";
    drawCircle(width / 2, 62, 24, true);
    drawText("link", width / 2, 62, 13, "#111111", "center", 700);
}

function resolveFocusWallCollision(previousX, previousY) {
    const walls = getFocusWalls();

    walls.forEach(function (wall) {
        const withinWallX =
            player.x + player.r > wall.x1 &&
            player.x - player.r < wall.x2;

        const crossedFromBelow =
            previousY - player.r >= wall.y1 &&
            player.y - player.r <= wall.y1;

        const crossedFromAbove =
            previousY + player.r <= wall.y1 &&
            player.y + player.r >= wall.y1;

        if (withinWallX && crossedFromBelow) {
            player.y = wall.y1 + player.r;
            focusMessage = "wall blocked. find the gap.";
        }

        if (withinWallX && crossedFromAbove) {
            player.y = wall.y1 - player.r;
            focusMessage = "wall blocked. find the gap.";
        }
    });
}

function updateDistractions() {
    if (hitCooldown > 0) {
        hitCooldown -= 1;
    }

    ctx.font = "600 13px Poppins, sans-serif";

    distractions.forEach(function (item) {
        item.x += item.speed;

        if (item.x < 80 || item.x > width - 80) {
            item.speed *= -1;
        }

        const textWidth = ctx.measureText(item.text).width;

        ctx.fillStyle = "#f4efe3";
        roundRect(item.x - textWidth / 2 - 18, item.y - 17, textWidth + 36, 34, 17, true);

        drawText(item.text, item.x, item.y + 1, 13, "#111111", "center", 600);

        if (hitCooldown === 0 && Math.abs(player.x - item.x) < 84 && Math.abs(player.y - item.y) < 30) {
        player.x = width / 2;
        player.y = height - 48;
        hitCooldown = 55;
        focusMessage = "distraction hit. start again.";
        }
    });
}

function updatePlayer(reverseControls) {
    let dx = 0;
    let dy = 0;

    if (keys.a || keys.arrowleft) {
        dx -= 1;
    }

    if (keys.d || keys.arrowright) {
        dx += 1;
    }

    if (keys.w || keys.arrowup) {
        dy -= 1;
    }

    if (keys.s || keys.arrowdown) {
        dy += 1;
    }

    if (reverseControls) {
        dx *= -1;
    }

    const length = Math.sqrt(dx * dx + dy * dy);

    if (length > 0) {
        dx /= length;
        dy /= length;
    }

    player.x += dx * player.speed;
    player.y += dy * player.speed;

    if (scene === "switch") {
        player.y = clamp(player.y, height * 0.46, height - player.r);
    } else {
        player.y = clamp(player.y, player.r, height - player.r);
    }

    player.x = clamp(player.x, player.r, width - player.r);
}

function drawPlayer() {
    const count = unlockedCount();

    if (count >= 3) {
        ctx.fillStyle = "rgba(196, 146, 67, 0.14)";
        drawCircle(player.x, player.y, 48, true);
    }

    ctx.fillStyle = "#f4efe3";
    drawCircle(player.x, player.y, player.r, true);

    if (count >= 1) {
        ctx.strokeStyle = "#c49243";
        ctx.lineWidth = 2;
        drawCircle(player.x, player.y, player.r * 1.55, false);
    }

    if (count >= 2) {
        ctx.strokeStyle = "#c49243";
        ctx.lineWidth = 2;
        drawCircle(player.x, player.y, player.r * 2.1, false);
    }

    if (count >= 3) {
        ctx.fillStyle = "#c49243";
        drawCircle(player.x - player.r * 1.7, player.y, 3, true);
        drawCircle(player.x + player.r * 1.7, player.y, 3, true);
    }

    if (count >= 4) {
        ctx.strokeStyle = "#f4efe3";
        ctx.lineWidth = 2;
        drawLine(player.x - player.r, player.y, player.x + player.r, player.y);
        drawLine(player.x, player.y - player.r, player.x, player.y + player.r);

        ctx.fillStyle = "#c49243";
        drawCircle(player.x, player.y, 3.5, true);
    }
}

function unlockProject(id) {
    unlocked[id] = true;
    showUnlockPanel(id);
    scene = "unlocked";
    quietAudio();
}

function showUnlockPanel(id) {
    currentProjectId = id;
    hideAllPanels();
    unlockTitle.textContent = projects[id].title;
    unlockText.textContent = projects[id].unlockText;
    unlockLink.href = projects[id].link;
    unlockPanel.classList.remove("hidden");
}

function showIntroPanel(id) {
    currentProjectId = id;
    hideAllPanels();
    introTitle.textContent = projects[id].title;
    introText.textContent = projects[id].introText;
    introPanel.classList.remove("hidden");
}

function showHubIntroPanel() {
    scene = "hub";
    introDismissed = false;
    resetKeys();
    introPanel.classList.add("hidden");
    unlockPanel.classList.add("hidden");
    hubIntroPanel.classList.remove("hidden");
}

function hideAllPanels() {
    hubIntroPanel.classList.add("hidden");
    introPanel.classList.add("hidden");
    unlockPanel.classList.add("hidden");
}

function panelIsOpen() {
    return (
        hubIntroPanel.classList.contains("hidden") === false ||
        introPanel.classList.contains("hidden") === false ||
        unlockPanel.classList.contains("hidden") === false
    );
}

function enterPortal(id) {
    if (unlockModeToggle.checked) {
        unlocked[id] = true;
        showUnlockPanel(id);
        scene = "unlocked";
        return;
    }

    if (unlocked[id]) {
        scene = "unlocked";
        showUnlockPanel(id);
        return;
    }

    showIntroPanel(id);
}

function returnToHub() {
    scene = "hub";
    currentProjectId = null;
    player.x = width / 2;
    player.y = height / 2;
    player.speed = 3.4;
    resetKeys();
    hideAllPanels();
    quietAudio();
}

function resetCurrentLevel() {
    if (scene === "loop") {
        startLoop();
    }

    if (scene === "switch") {
        startSwitch();
    }

    if (scene === "audio") {
        startAudio();
    }

    if (scene === "focus") {
        startFocus();
    }
}

function drawUnlockedBackground() {
    drawBackground(13);
    drawText("project unlocked", width / 2, height - 42, 15, "rgba(244, 239, 227, 0.7)", "center", 500);
}

function drawBackground(value) {
    ctx.fillStyle = "rgb(" + value + ", " + value + ", " + value + ")";
    ctx.fillRect(0, 0, width, height);
}

function drawLevelText(title, subtitle, subtitleColor = "rgba(244, 239, 227, 0.9)") {
    const x = 34;
    const y = height - 114;

    drawText(title, x, y, 24, "#f4efe3", "left", 700);
    drawText(subtitle, x, y + 34, 17, subtitleColor, "left", 600);
    drawText("press h for hub", x, y + 66, 15, "rgba(244, 239, 227, 0.66)", "left", 500);
}

function drawText(text, x, y, size, color, align, weight) {
    ctx.fillStyle = color;
    ctx.font = weight + " " + size + "px Poppins, sans-serif";
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
}

function drawCircle(x, y, r, fill) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);

    if (fill) {
        ctx.fill();
    } else {
        ctx.stroke();
    }
}

function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function roundRect(x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

    if (fill) {
        ctx.fill();
    } else {
        ctx.stroke();
    }
}

function resetProgress() {
    unlocked = {
        loop: false,
        switch: false,
        audio: false,
        focus: false
    };
}

function resetKeys() {
    keys = {};
}

function unlockedCount() {
    if (unlockModeToggle.checked) {
        return 4;
    }

    let count = 0;

    if (unlocked.loop) {
        count += 1;
    }

    if (unlocked.switch) {
        count += 1;
    }

    if (unlocked.audio) {
        count += 1;
    }

    if (unlocked.focus) {
        count += 1;
    }

    return count;
}

function startAudioContext() {
    if (audioReady || !audioSignal) {
        return;
    }

    audioSignal.volume = 0;
    audioSignal.currentTime = 0;

    audioSignal.play()
        .then(function () {
            audioReady = true;
        })
        .catch(function () {
            audioReady = false;
        });
}

function updateAudioTone(closeness) {
    if (!audioSignal) {
        return;
    }

    if (audioSignal.paused) {
        audioSignal.play()
            .then(function () {
                audioReady = true;
            })
            .catch(function () {
                audioReady = false;
            });
    }

    const volume = 0.005 + closeness * 0.22;
    audioSignal.volume = clamp(volume, 0, 0.25);
}

function quietAudio() {
    if (!audioSignal) {
        return;
    }

    audioSignal.pause();
    audioSignal.volume = 0;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function distance(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

function random(min, max) {
    return Math.random() * (max - min) + min;
}