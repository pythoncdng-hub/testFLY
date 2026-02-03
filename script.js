const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const energyEl = document.getElementById("energy");
const levelEl = document.getElementById("level");
const overlay = document.getElementById("overlay");
const playBtn = document.getElementById("playBtn");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");

const state = {
  running: false,
  paused: false,
  score: 0,
  energy: 100,
  level: 1,
  shield: 0,
  lastShot: 0,
  spawnTimer: 0,
  powerTimer: 0,
};

const player = {
  x: canvas.width * 0.15,
  y: canvas.height / 2,
  radius: 18,
  speed: 5,
};

const keys = new Set();
const bullets = [];
const enemies = [];
const particles = [];
const powerups = [];

const colors = {
  player: "#24d1ff",
  enemy: "#ff4d6d",
  bullet: "#f8fbff",
  power: "#6fff8b",
  shield: "rgba(123, 97, 255, 0.4)",
};

function resetGame() {
  state.score = 0;
  state.energy = 100;
  state.level = 1;
  state.shield = 0;
  state.lastShot = 0;
  state.spawnTimer = 0;
  state.powerTimer = 0;
  bullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  powerups.length = 0;
  player.x = canvas.width * 0.15;
  player.y = canvas.height / 2;
  updateHud();
}

function updateHud() {
  scoreEl.textContent = state.score.toString();
  energyEl.textContent = Math.max(0, Math.round(state.energy)).toString();
  levelEl.textContent = state.level.toString();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function spawnEnemy() {
  const size = 18 + Math.random() * 20;
  const y = Math.random() * (canvas.height - size * 2) + size;
  const speed = 2 + Math.random() * 2 + state.level * 0.4;
  enemies.push({
    x: canvas.width + size,
    y,
    size,
    speed,
    hp: Math.ceil(1 + state.level * 0.4),
  });
}

function spawnPowerUp() {
  const size = 12;
  const y = Math.random() * (canvas.height - size * 2) + size;
  powerups.push({
    x: canvas.width + size,
    y,
    size,
    speed: 2.5,
  });
}

function createExplosion(x, y, color) {
  for (let i = 0; i < 18; i += 1) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 40 + Math.random() * 20,
      color,
    });
  }
}

function fireBullet() {
  const now = performance.now();
  if (now - state.lastShot < 150) {
    return;
  }
  state.lastShot = now;
  bullets.push({
    x: player.x + player.radius,
    y: player.y,
    vx: 9,
    size: 4,
  });
}

function updatePlayer() {
  let dx = 0;
  let dy = 0;

  if (keys.has("ArrowUp") || keys.has("w")) dy -= player.speed;
  if (keys.has("ArrowDown") || keys.has("s")) dy += player.speed;
  if (keys.has("ArrowLeft") || keys.has("a")) dx -= player.speed;
  if (keys.has("ArrowRight") || keys.has("d")) dx += player.speed;

  player.x = clamp(player.x + dx, player.radius, canvas.width - player.radius);
  player.y = clamp(player.y + dy, player.radius, canvas.height - player.radius);
}

function updateBullets() {
  bullets.forEach((bullet, index) => {
    bullet.x += bullet.vx;
    if (bullet.x > canvas.width + 20) {
      bullets.splice(index, 1);
    }
  });
}

function updateEnemies() {
  enemies.forEach((enemy, index) => {
    enemy.x -= enemy.speed;
    if (enemy.x < -enemy.size) {
      enemies.splice(index, 1);
      state.energy -= 8;
      createExplosion(enemy.x, enemy.y, "rgba(255, 77, 109, 0.6)");
    }
  });
}

function updatePowerups() {
  powerups.forEach((power, index) => {
    power.x -= power.speed;
    if (power.x < -power.size) {
      powerups.splice(index, 1);
    }
  });
}

function updateParticles() {
  particles.forEach((particle, index) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 1;
    if (particle.life <= 0) {
      particles.splice(index, 1);
    }
  });
}

function handleCollisions() {
  bullets.forEach((bullet, bulletIndex) => {
    enemies.forEach((enemy, enemyIndex) => {
      const distance = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
      if (distance < enemy.size) {
        bullets.splice(bulletIndex, 1);
        enemy.hp -= 1;
        createExplosion(bullet.x, bullet.y, colors.bullet);
        if (enemy.hp <= 0) {
          enemies.splice(enemyIndex, 1);
          state.score += 120;
          createExplosion(enemy.x, enemy.y, colors.enemy);
        } else {
          state.score += 30;
        }
      }
    });
  });

  enemies.forEach((enemy, index) => {
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (distance < enemy.size + player.radius) {
      enemies.splice(index, 1);
      if (state.shield > 0) {
        state.score += 80;
      } else {
        state.energy -= 20;
      }
      createExplosion(enemy.x, enemy.y, colors.enemy);
    }
  });

  powerups.forEach((power, index) => {
    const distance = Math.hypot(power.x - player.x, power.y - player.y);
    if (distance < power.size + player.radius) {
      powerups.splice(index, 1);
      state.energy = Math.min(100, state.energy + 25);
      state.score += 50;
      createExplosion(power.x, power.y, colors.power);
    }
  });
}

function updateLevel() {
  const nextLevel = Math.floor(state.score / 600) + 1;
  if (nextLevel !== state.level) {
    state.level = nextLevel;
  }
}

function drawPlayer() {
  context.save();
  context.translate(player.x, player.y);

  context.fillStyle = colors.player;
  context.beginPath();
  context.moveTo(-player.radius, -player.radius * 0.6);
  context.lineTo(player.radius, 0);
  context.lineTo(-player.radius, player.radius * 0.6);
  context.closePath();
  context.fill();

  context.fillStyle = "rgba(255,255,255,0.8)";
  context.fillRect(-player.radius * 0.2, -4, player.radius * 0.7, 8);

  if (state.shield > 0) {
    context.strokeStyle = colors.shield;
    context.lineWidth = 6;
    context.beginPath();
    context.arc(0, 0, player.radius + 10, 0, Math.PI * 2);
    context.stroke();
  }

  context.restore();
}

function drawBullets() {
  context.fillStyle = colors.bullet;
  bullets.forEach((bullet) => {
    context.beginPath();
    context.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
    context.fill();
  });
}

function drawEnemies() {
  enemies.forEach((enemy) => {
    context.fillStyle = colors.enemy;
    context.beginPath();
    context.moveTo(enemy.x - enemy.size, enemy.y - enemy.size * 0.6);
    context.lineTo(enemy.x + enemy.size, enemy.y);
    context.lineTo(enemy.x - enemy.size, enemy.y + enemy.size * 0.6);
    context.closePath();
    context.fill();

    context.fillStyle = "rgba(255,255,255,0.2)";
    context.fillRect(enemy.x - enemy.size * 0.4, enemy.y - 3, enemy.size * 0.6, 6);
  });
}

function drawPowerups() {
  powerups.forEach((power) => {
    context.fillStyle = colors.power;
    context.beginPath();
    context.arc(power.x, power.y, power.size, 0, Math.PI * 2);
    context.fill();
  });
}

function drawParticles() {
  particles.forEach((particle) => {
    context.fillStyle = particle.color;
    context.globalAlpha = Math.max(0, particle.life / 60);
    context.beginPath();
    context.arc(particle.x, particle.y, 2.5, 0, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawParticles();
  drawPlayer();
  drawBullets();
  drawEnemies();
  drawPowerups();
}

function update(delta) {
  updatePlayer();
  updateBullets();
  updateEnemies();
  updatePowerups();
  updateParticles();
  handleCollisions();
  updateLevel();

  state.energy = clamp(state.energy, 0, 100);
  state.shield = Math.max(0, state.shield - delta * 0.001);

  state.spawnTimer += delta;
  state.powerTimer += delta;
  const spawnRate = Math.max(350, 1100 - state.level * 80);

  if (state.spawnTimer > spawnRate) {
    state.spawnTimer = 0;
    spawnEnemy();
  }

  if (state.powerTimer > 5000) {
    state.powerTimer = 0;
    if (Math.random() > 0.4) {
      spawnPowerUp();
    }
  }

  if (state.energy <= 0) {
    endGame();
  }

  updateHud();
}

let lastTime = 0;
function loop(timestamp) {
  if (!state.running) return;
  if (!state.paused) {
    const delta = timestamp - lastTime;
    update(delta || 16.6);
    draw();
    lastTime = timestamp;
  }
  requestAnimationFrame(loop);
}

function startGame() {
  overlay.style.display = "none";
  state.running = true;
  state.paused = false;
  lastTime = performance.now();
  loop(lastTime);
}

function endGame() {
  state.running = false;
  overlay.style.display = "grid";
  overlay.querySelector("h2").textContent = "انتهت المعركة!";
  overlay.querySelector("p").textContent =
    "أعد ترتيب قواتك وحاول مرة أخرى لتحقيق رقم قياسي أعلى.";
  playBtn.textContent = "إعادة المحاولة";
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? "استئناف" : "إيقاف مؤقت";
  if (!state.paused) {
    lastTime = performance.now();
    loop(lastTime);
  }
}

function activateShield() {
  if (state.shield <= 0) {
    state.shield = 4;
  }
}

window.addEventListener("keydown", (event) => {
  keys.add(event.key);
  if (event.key === " ") {
    event.preventDefault();
    fireBullet();
  }
  if (event.key === "Shift") {
    activateShield();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key);
});

playBtn.addEventListener("click", () => {
  resetGame();
  startGame();
});

startBtn.addEventListener("click", () => {
  resetGame();
  startGame();
  window.scrollTo({ top: canvas.offsetTop - 80, behavior: "smooth" });
});

pauseBtn.addEventListener("click", togglePause);

window.addEventListener("blur", () => {
  state.paused = true;
  pauseBtn.textContent = "استئناف";
});
