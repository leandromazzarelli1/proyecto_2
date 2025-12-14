// Helper to load player sprites into gameState
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

// Clase Jugador
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 32; // Tighter Hitbox (was 64)
        this.height = 48; // Tighter Height (was 64)
        this.drawSize = 64; // Visual Size
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
            // Translate to center of Physics Body
            ctx.translate(Math.floor(this.x) + this.width / 2, Math.floor(this.y) + this.height / 2);
            if (!this.facingRight) {
                ctx.scale(-1, 1);
            }
            // Draw visual sprite larger and centered
            ctx.drawImage(sprite, -this.drawSize / 2, -this.drawSize / 2, this.drawSize, this.drawSize);
            ctx.restore();
        } else {
        }
    }
}
