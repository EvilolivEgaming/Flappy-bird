(() => {
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const game = {
    width: 400,
    height: 600,
    groundHeight: 100,
    state: "start", // start | running | gameover
    rafId: null,
    lastFrameTime: 0,
    spawnTimerMs: 0,
    score: 0,

    bird: {
      x: 100,
      y: 300,
      radius: 15,
      velocityY: 0,
      gravity: 0.38,
      flapImpulse: -7.4,
      rotation: 0
    },

    pipes: {
      items: [],
      width: 60,
      gapHeight: 150,
      speed: 2.4,
      spawnIntervalMs: 1500,
      minGapTop: 50,
      minGapBottom: 50
    }
  };

  function resetRound() {
    game.state = "start";
    game.lastFrameTime = 0;
    game.spawnTimerMs = 0;
    game.score = 0;
    game.pipes.items = [];

    game.bird.y = game.height / 2;
    game.bird.velocityY = 0;
    game.bird.rotation = 0;

    draw();
  }

  function startRound() {
    game.state = "running";
    game.lastFrameTime = 0;
    game.spawnTimerMs = 0;
    game.pipes.items = [];
    game.score = 0;

    game.bird.y = game.height / 2;
    game.bird.velocityY = 0;
    flapBird();

    game.rafId = requestAnimationFrame(gameLoop);
  }

  function flapBird() {
    game.bird.velocityY = game.bird.flapImpulse;
  }

  function setGameOver() {
    game.state = "gameover";
    if (game.rafId) {
      cancelAnimationFrame(game.rafId);
      game.rafId = null;
    }
    draw();
  }

  function createPipe() {
    const playAreaHeight = game.height - game.groundHeight;
    const maxGapTop =
      playAreaHeight -
      game.pipes.gapHeight -
      game.pipes.minGapBottom;

    const gapTop = randomBetween(game.pipes.minGapTop, maxGapTop);

    game.pipes.items.push({
      x: game.width,
      gapTop,
      scored: false
    });
  }

  function update(deltaScale, deltaMs) {
    updateBird(deltaScale);
    updatePipes(deltaScale, deltaMs);
    checkCollisions();
  }

  function updateBird(deltaScale) {
    game.bird.velocityY += game.bird.gravity * deltaScale;
    game.bird.y += game.bird.velocityY * deltaScale;

    // Tilt up when moving up, down when falling.
    const targetRotation = clamp(game.bird.velocityY * 0.08, -0.65, 1.1);
    game.bird.rotation = targetRotation;
  }

  function updatePipes(deltaScale, deltaMs) {
    game.spawnTimerMs += deltaMs;

    while (game.spawnTimerMs >= game.pipes.spawnIntervalMs) {
      game.spawnTimerMs -= game.pipes.spawnIntervalMs;
      createPipe();
    }

    for (const pipe of game.pipes.items) {
      pipe.x -= game.pipes.speed * deltaScale;

      if (!pipe.scored && pipe.x + game.pipes.width < game.bird.x) {
        pipe.scored = true;
        game.score += 1;
      }
    }

    game.pipes.items = game.pipes.items.filter((pipe) => pipe.x + game.pipes.width > 0);
  }

  function checkCollisions() {
    const ceilingHit = game.bird.y - game.bird.radius <= 0;
    const groundHit = game.bird.y + game.bird.radius >= game.height - game.groundHeight;

    if (ceilingHit || groundHit) {
      setGameOver();
      return;
    }

    for (const pipe of game.pipes.items) {
      const topPipeHeight = pipe.gapTop;
      const bottomPipeY = pipe.gapTop + game.pipes.gapHeight;
      const bottomPipeHeight = game.height - game.groundHeight - bottomPipeY;

      const hitTopPipe = circleIntersectsRect(
        game.bird.x,
        game.bird.y,
        game.bird.radius,
        pipe.x,
        0,
        game.pipes.width,
        topPipeHeight
      );

      const hitBottomPipe = circleIntersectsRect(
        game.bird.x,
        game.bird.y,
        game.bird.radius,
        pipe.x,
        bottomPipeY,
        game.pipes.width,
        bottomPipeHeight
      );

      if (hitTopPipe || hitBottomPipe) {
        setGameOver();
        return;
      }
    }
  }

  function draw() {
    drawBackground();
    drawPipes();
    drawGround();
    drawBird();
    drawScore();

    if (game.state === "start") {
      drawOverlay("Press Space to Start", "Flap to fly through the gaps");
    } else if (game.state === "gameover") {
      drawOverlay(`Game Over\nScore: ${game.score}`, "Press Space to Restart");
    }
  }

  function drawBackground() {
    ctx.clearRect(0, 0, game.width, game.height);
    ctx.fillStyle = "#9edcff";
    ctx.fillRect(0, 0, game.width, game.height - game.groundHeight);
  }

  function drawGround() {
    ctx.fillStyle = "#d7b46a";
    ctx.fillRect(0, game.height - game.groundHeight, game.width, game.groundHeight);

    ctx.fillStyle = "#b8904c";
    ctx.fillRect(0, game.height - game.groundHeight, game.width, 12);
  }

  function drawBird() {
    ctx.save();
    ctx.translate(game.bird.x, game.bird.y);
    ctx.rotate(game.bird.rotation);

    ctx.beginPath();
    ctx.arc(0, 0, game.bird.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#ffd400";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(6, -5, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#222";
    ctx.fill();

    ctx.restore();
  }

  function drawPipes() {
    ctx.fillStyle = "#2c9f3f";

    for (const pipe of game.pipes.items) {
      const topHeight = pipe.gapTop;
      const bottomY = pipe.gapTop + game.pipes.gapHeight;
      const bottomHeight = game.height - game.groundHeight - bottomY;

      ctx.fillRect(pipe.x, 0, game.pipes.width, topHeight);
      ctx.fillRect(pipe.x, bottomY, game.pipes.width, bottomHeight);

      ctx.fillStyle = "#237d33";
      ctx.fillRect(pipe.x - 2, topHeight - 10, game.pipes.width + 4, 10);
      ctx.fillRect(pipe.x - 2, bottomY, game.pipes.width + 4, 10);
      ctx.fillStyle = "#2c9f3f";
    }
  }

  function drawScore() {
    ctx.fillStyle = "#1f2f3a";
    ctx.font = "bold 40px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(String(game.score), game.width / 2, 20);
  }

  function drawOverlay(title, subtitle) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fillRect(0, 0, game.width, game.height);

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lines = title.split("\n");
    ctx.font = "bold 42px Arial";
    lines.forEach((line, index) => {
      ctx.fillText(line, game.width / 2, game.height / 2 - 35 + index * 46);
    });

    ctx.font = "bold 24px Arial";
    ctx.fillText(subtitle, game.width / 2, game.height / 2 + 60);
  }

  function gameLoop(timestamp) {
    if (game.state !== "running") {
      return;
    }

    if (!game.lastFrameTime) {
      game.lastFrameTime = timestamp;
    }

    const deltaMs = timestamp - game.lastFrameTime;
    game.lastFrameTime = timestamp;

    // Normalize update speed around 60 FPS and clamp giant jumps.
    const deltaScale = Math.min(deltaMs / (1000 / 60), 2.5);

    update(deltaScale, deltaMs);
    draw();

    if (game.state === "running") {
      game.rafId = requestAnimationFrame(gameLoop);
    }
  }

  function handleSpacebar(event) {
    if (event.code !== "Space") {
      return;
    }

    event.preventDefault();

    if (game.state === "start") {
      startRound();
    } else if (game.state === "running") {
      flapBird();
    } else if (game.state === "gameover") {
      startRound();
    }
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function circleIntersectsRect(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = clamp(cx, rx, rx + rw);
    const closestY = clamp(cy, ry, ry + rh);

    const dx = cx - closestX;
    const dy = cy - closestY;

    return dx * dx + dy * dy <= radius * radius;
  }

  document.addEventListener("keydown", handleSpacebar);
  resetRound();
})();
