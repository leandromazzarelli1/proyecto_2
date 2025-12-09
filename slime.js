
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40; // Smaller size (was 64)
        this.height = 40;
        this.vx = 0;
        this.vy = 0;
        this.speed = 1.5;
        this.isGrounded = false;

        // Animation State
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.animationSpeed = 10;
        this.state = 'IDLE'; // IDLE, MOVE, ATTACK
        this.facingRight = false;

        // Assets Arrays
        this.assets = {
            idle: [],
            move: [],
            attack: []
        };

        this.loadAssets();
    }

    loadAssets() {
        const basePath = 'enemigo/slime/';

        // Load Idle (1-7)
        for (let i = 1; i <= 7; i++) {
            const img = new Image();
            img.src = `${basePath}idle_${i}.png`;
            this.assets.idle.push(img);
        }

        // Load Move (1-7)
        for (let i = 1; i <= 7; i++) {
            const img = new Image();
            img.src = `${basePath}move_${i}.png`;
            this.assets.move.push(img);
        }

        // Load Attack (1-5)
        for (let i = 1; i <= 5; i++) {
            const img = new Image();
            img.src = `${basePath}attack_${i}.png`;
            this.assets.attack.push(img);
        }
    }

    update() {
        // AI: Chase Player
        if (gameState.player) {
            const dx = gameState.player.x - this.x;
            const dy = gameState.player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 300) {
                this.state = 'MOVE';
                if (dx > 0) {
                    this.vx = this.speed * 0.5;
                    this.facingRight = true;
                } else {
                    this.vx = -this.speed * 0.5;
                    this.facingRight = false;
                }
            } else {
                this.state = 'IDLE';
                this.vx = 0;
            }

            // Simple Attack Logic (Visual only for now)
            if (dist < 60) {
                this.state = 'ATTACK';
            }
        }

        // Physics
        this.vy += GRAVITY;
        this.x += this.vx;
        this.y += this.vy;

        this.checkCollisions();
        this.animate();
    }

    checkCollisions() {
        this.isGrounded = false;
        if (!gameState.currentRoom) return;

        const footX = this.x + this.width / 2;
        const footY = this.y + this.height;

        let segments = [];
        if (gameState.currentRoom.staticLines) {
            segments = gameState.currentRoom.staticLines;
        } else if (gameState.currentRoom.terrain) {
            for (let i = 0; i < gameState.currentRoom.terrain.length - 1; i++) {
                segments.push({
                    p1: gameState.currentRoom.terrain[i],
                    p2: gameState.currentRoom.terrain[i + 1]
                });
            }
        }

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
                    break;
                }
            }
        }

        if (this.y > canvas.height + 200) {
            this.y = -1000;
        }
    }

    animate() {
        this.frameTimer++;
        if (this.frameTimer >= this.animationSpeed) {
            this.frameIndex++;
            this.frameTimer = 0;
        }

        let currentArray = this.assets.idle;
        if (this.state === 'MOVE') currentArray = this.assets.move;
        else if (this.state === 'ATTACK') currentArray = this.assets.attack;

        if (this.frameIndex >= currentArray.length) {
            this.frameIndex = 0;
        }
    }

    draw() {
        let currentArray = this.assets.idle;
        if (this.state === 'MOVE') currentArray = this.assets.move;
        else if (this.state === 'ATTACK') currentArray = this.assets.attack;

        const sprite = currentArray[this.frameIndex];

        if (sprite && sprite.complete) {
            ctx.save();
            ctx.translate(Math.floor(this.x) + this.width / 2, Math.floor(this.y) + this.height / 2);
            if (!this.facingRight) {
                ctx.scale(-1, 1);
            }

            ctx.drawImage(
                sprite,
                -this.width / 2, -this.height / 2, this.width, this.height
            );

            ctx.restore();
        } else {
            ctx.fillStyle = 'purple';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}
