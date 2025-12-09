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
    enemies: []
};

// Cargar Sprites del Jugador
const loadPlayerSprites = () => {
    const spritePaths = [
        'player_sprite_1.png',
        'player_sprite_2.png',
        'player_sprite_3.png',
        'player_sprite_4.png',
        'player_sprite_5.png',
        'player_sprite_6.png'
    ];

    gameState.assets.sprites = [];
    spritePaths.forEach(path => {
        const img = new Image();
        img.src = path;
        gameState.assets.sprites.push(img);
    });

    const slimeImg = new Image();
    slimeImg.src = 'slime_frame.png';
    gameState.assets.slimeSprite = slimeImg;
};

const initMusic = () => {
    const music = new Audio('Background_song.mp3');
    music.loop = true;
    music.volume = 0.08;
    gameState.assets.music = music;
};

// Clase Jugador
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 64;
        this.height = 64;
        this.vx = 0;
        this.vy = 0;
        this.isGrounded = false;
        this.facingRight = true;
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.animationSpeed = 8;
        this.state = 'IDLE';
    }

    update() {
        // Movimiento Horizontal
        if (keys['d']) {
            this.vx += 1;
            this.facingRight = true;
            this.state = 'RUNNING';
        } else if (keys['a']) {
            this.vx -= 1;
            this.facingRight = false;
            this.state = 'RUNNING';
        } else {
            this.state = 'IDLE';
        }

        this.vx *= FRICTION;
        this.x += this.vx;

        // Movimiento Vertical
        this.vy += GRAVITY;
        this.y += this.vy;

        this.checkCollisions();
        this.checkRoomTransition();

        if (keys['w'] && this.isGrounded) {
            this.vy = JUMP_FORCE;
            this.isGrounded = false;
        }

        if (!this.isGrounded) {
            this.state = 'JUMPING';
        }

        this.animate();
    }

    checkRoomTransition() {
        // Salir por la derecha
        if (this.x > canvas.width - this.width) {
            if (gameState.currentRoomIndex < rooms.length - 1) {
                switchRoom(gameState.currentRoomIndex + 1, 20); // Spawn left side
            } else {
                this.x = canvas.width - this.width; // Block/Bounce
                this.vx = 0;
            }
        }
        // Salir por la izquierda
        else if (this.x < 0) {
            if (gameState.currentRoomIndex > 0) {
                switchRoom(gameState.currentRoomIndex - 1, canvas.width - 80); // Spawn right side
            } else {
                this.x = 0; // Block/Bounce
                this.vx = 0;
            }
        }
    }

    checkCollisions() {
        this.isGrounded = false;
        if (!gameState.currentRoom) return;

        const footX = this.x + this.width / 2;
        const footY = this.y + this.height;

        let segments = getRoomSegments(gameState.currentRoom);

        for (let line of segments) {
            const minX = Math.min(line.p1.x, line.p2.x);
            const maxX = Math.max(line.p1.x, line.p2.x);

            if (footX >= minX && footX <= maxX) {
                const slope = (line.p2.y - line.p1.y) / (line.p2.x - line.p1.x);
                const lineY = line.p1.y + slope * (footX - line.p1.x);

                if (this.vy >= 0 && Math.abs(footY - lineY) < 20 + this.vy) {
                    this.y = lineY - this.height;
                    this.vy = 0;
                    this.isGrounded = true;
                    this.state = (Math.abs(this.vx) > 0.5) ? 'RUNNING' : 'IDLE';
                    break;
                }
            }
        }

        if (this.y > canvas.height + 100) {
            this.x = 100;
            this.y = 100; // Safe fallback
            this.vy = 0;
        }
    }

    animate() {
        let startFrame = 0;
        let endFrame = 0;
        let loop = true;

        if (this.state === 'JUMPING') {
            // Sprites 4-6 (Indices 3-5)
            startFrame = 3;
            endFrame = 5;
            loop = false; // Don't loop jump animation
        } else if (this.state === 'RUNNING') {
            // Sprites 1-3 (Indices 0-2)
            startFrame = 0;
            endFrame = 2;
        } else {
            // IDLE
            startFrame = 0;
            endFrame = 0;
        }

        this.frameTimer++;
        if (this.frameTimer >= this.animationSpeed) {

            // If current frame is outside the range for the state, reset it
            if (this.frameIndex < startFrame || this.frameIndex > endFrame) {
                this.frameIndex = startFrame;
            } else {
                this.frameIndex++;
                if (this.frameIndex > endFrame) {
                    if (loop) {
                        this.frameIndex = startFrame;
                    } else {
                        this.frameIndex = endFrame; // Hold last frame
                    }
                }
            }
            this.frameTimer = 0;
        }

        if (this.frameIndex >= gameState.assets.sprites.length) this.frameIndex = 0;
    }

    draw() {
        const sprite = gameState.assets.sprites[this.frameIndex];
        if (sprite && sprite.complete) {
            ctx.save();
            ctx.translate(Math.floor(this.x) + this.width / 2, Math.floor(this.y) + this.height / 2);
            if (!this.facingRight) {
                ctx.scale(-1, 1);
            }
            ctx.drawImage(sprite, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        } else {
        }
    }
}

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
    if (index === 1) { // Room 2 is index 1
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
                // Collision! Bounce Player
                console.log("Player Hit!");
                // Push player away
                if (gameState.player.x < enemy.x) gameState.player.vx = -10;
                else gameState.player.vx = 10;

                gameState.player.vy = -5; // Small hop
            }
        });
    }

    requestAnimationFrame(gameLoop);
};

window.onload = init;
