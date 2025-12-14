const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Configuración Global
const GRAVITY = 0.5;
const FRICTION = 0.8;
const MOVE_SPEED = 4;
const JUMP_FORCE = -12;
const VIDEO_PLAYBACK_SPEED = 0.4;

// Mapa de Salas
let rooms = [];
const roomOrder = ['room1', 'room2', 'room3', 'room5'];

// Estado del Juego
const gameState = {
    started: false,
    currentRoomIndex: 1,
    currentRoom: null,
    player: null,
    assets: {
        sprites: [],
        slimeSprite: null,
        background: null,
        isVideo: false,
        music: null
    },
    enemies: [],
    projectiles: []
};

// Cargar Sprites del Jugador

const initMusic = () => {
    const music = new Audio('Background_song.mp3');
    music.loop = true;
    music.volume = 0.08;
    gameState.assets.music = music;
};

// Clase Jugador

// Helper to get lines
function getRoomSegments(room) {
    let segments = [];
    if (room.staticLines) {
        segments = room.staticLines;
    } else if (room.terrain) {
        for (let i = 0; i < room.terrain.length - 1; i++) {
            segments.push({
                p1: room.terrain[i],
                p2: room.terrain[i + 1]
            });
        }
    }
    return segments;
}

// Input Handling
const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'Enter' && !gameState.started) {
        gameState.started = true;
        if (gameState.assets.music) {
            gameState.assets.music.play().catch(e => console.log("Init audio failed", e));
        }
        gameLoop();
    }

    // Magic Attack (Q)
    if (e.key.toLowerCase() === 'q' && gameState.player && gameState.started) {
        // Spawn Magic in front of player
        const spawnX = gameState.player.facingRight
            ? gameState.player.x + gameState.player.width
            : gameState.player.x - 64; // Approx offset

        const spawnY = gameState.player.y;

        const magic = new MagicProjectile(spawnX, spawnY, gameState.player.facingRight);
        gameState.projectiles.push(magic);
    }
});
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// Room Management
const switchRoom = (index, spawnX) => {
    gameState.currentRoomIndex = index;
    const roomData = rooms[index];
    gameState.currentRoom = roomData;

    gameState.assets.background = null;
    gameState.assets.isVideo = false;

    // Clear previous enemies
    gameState.enemies = [];

    // Spawn Slime in Room 2
    if (index === 2) { // Room 2 is index 1
        // Place it on the center island
        gameState.enemies.push(new Enemy(400, 300));
    }

    // Background Loading
    const isVideo = roomData.bgType === 'video' || (typeof roomData.bgSrc === 'string' && roomData.bgSrc.endsWith('.mp4'));

    if (isVideo) {
        const video = document.createElement('video');
        video.src = roomData.bgSrc;
        video.loop = true;
        video.muted = true;
        // Use room specific speed if defined, otherwise global default
        video.playbackRate = roomData.playbackSpeed || VIDEO_PLAYBACK_SPEED;
        video.play().catch(e => console.log("Video autoplay blocked", e));

        gameState.assets.background = video;
        gameState.assets.isVideo = true;
    } else {
        const img = new Image();
        img.src = roomData.bgSrc;
        gameState.assets.background = img;
        gameState.assets.isVideo = false;
    }

    if (gameState.player) {
        gameState.player.x = spawnX;

        // Smart Y Calculation
        let safeY = 200; // Fallback
        const spawnFootX = spawnX + gameState.player.width / 2;
        const segments = getRoomSegments(roomData);
        let foundGround = false;

        for (let line of segments) {
            const minX = Math.min(line.p1.x, line.p2.x);
            const maxX = Math.max(line.p1.x, line.p2.x);

            if (spawnFootX >= minX && spawnFootX <= maxX) {
                const slope = (line.p2.y - line.p1.y) / (line.p2.x - line.p1.x);
                const lineY = line.p1.y + slope * (spawnFootX - line.p1.x);
                // Set Y above line
                safeY = lineY - gameState.player.height - 10;
                foundGround = true;
                break;
            }
        }
        gameState.player.y = safeY;
    }
};

const drawMenu = () => {
    if (gameState.assets.background) {
        if (gameState.assets.isVideo) {
            ctx.drawImage(gameState.assets.background, 0, 0, canvas.width, canvas.height);
        } else if (gameState.assets.background.complete) {
            ctx.drawImage(gameState.assets.background, 0, 0, canvas.width, canvas.height);
        }
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    ctx.font = '30px "Press Start 2P", cursive';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS ENTER TO START', canvas.width / 2, canvas.height / 2);

    if (!gameState.started) {
        requestAnimationFrame(drawMenu);
    }
};

const init = () => {
    rooms = [];
    if (typeof room1 !== 'undefined') rooms.push(room1);
    if (typeof room2 !== 'undefined') rooms.push(room2);
    if (typeof room3 !== 'undefined') rooms.push(room3);
    else console.error("room3 not loaded");
    if (typeof room5 !== 'undefined') rooms.push(room5);
    else console.error("room5 not loaded");

    if (rooms.length === 0) {
        alert("Error: No rooms loaded.");
        return;
    }

    loadPlayerSprites();
    initMusic();
    gameState.player = new Player(150, 200);

    // Start in Room 1 (Index 0)
    switchRoom(0, 150);

    if (!gameState.started) {
        requestAnimationFrame(drawMenu);
    }
};

const gameLoop = () => {
    if (!gameState.started) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState.assets.background) {
        if (gameState.assets.isVideo) {
            ctx.drawImage(gameState.assets.background, 0, 0, canvas.width, canvas.height);
        } else {
            if (gameState.assets.background.complete) {
                ctx.drawImage(gameState.assets.background, 0, 0, canvas.width, canvas.height);
            }
        }
    }

    // Visualize Terrain
    if (gameState.currentRoom) {
        ctx.strokeStyle = '#006400';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const segments = getRoomSegments(gameState.currentRoom);
        segments.forEach(line => {
            ctx.moveTo(line.p1.x, line.p1.y);
            ctx.lineTo(line.p2.x, line.p2.y);
        });
        ctx.stroke();
    }

    if (gameState.player) {
        gameState.player.update();
        gameState.player.draw();

        // Projectiles
        gameState.projectiles.forEach((proj, index) => {
            proj.update();
            proj.draw();
            if (proj.state === 'DESTROIED') {
                gameState.projectiles.splice(index, 1);
            }
        });

        // Enemy Interaction
        gameState.enemies.forEach(enemy => {
            enemy.update();
            enemy.draw();

            // Simple Hitbox
            if (
                gameState.player.x < enemy.x + enemy.width &&
                gameState.player.x + gameState.player.width > enemy.x &&
                gameState.player.y < enemy.y + enemy.height &&
                gameState.player.y + gameState.player.height > enemy.y
            ) {
                // Body Block (Solid Collision)
                // Just push player out of the enemy, don't add knockback velocity
                if (gameState.player.x + gameState.player.width / 2 < enemy.x + enemy.width / 2) {
                    // Player is on Left
                    gameState.player.x = enemy.x - gameState.player.width;
                } else {
                    // Player is on Right
                    gameState.player.x = enemy.x + enemy.width;
                }
                // Stop momentum slightly to feel weight
                // gameState.player.vx = 0; 
            }
        });
    }

    requestAnimationFrame(gameLoop);
};

window.onload = init;
