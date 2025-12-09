class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 25; // Even tighter Body Block
        this.height = 25;
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
        // Apply Gravity always (even attacking)
        this.vy += GRAVITY;
        this.y += this.vy;
        this.checkCollisions();

        // Animation Lock
        if (this.isAttacking) {
            this.animate();
            return; // Don't move or change AI state while attacking
        }

        // AI: Chase Player
        if (gameState.player) {
            // Calculate Center-to-Center distance for accuracy
            const pCx = gameState.player.x + gameState.player.width / 2;
            const pCy = gameState.player.y + gameState.player.height / 2;
            const myCx = this.x + this.width / 2;
            const myCy = this.y + this.height / 2;

            const dx = pCx - myCx;
            const dy = pCy - myCy;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Priority 1: Attack (Medium Close Range)
            if (dist < 35) {
                this.startAttack(dx);
            }
            // Priority 2: Chase (Medium Range)
            else if (dist < 200) {
                this.state = 'MOVE';
                if (dx > 0) {
                    this.vx = this.speed * 0.5;
                    this.facingRight = true;
                } else {
                    this.vx = -this.speed * 0.5;
                    this.facingRight = false;
                }
            }
            // Priority 3: Idle
            else {
                this.state = 'IDLE';
                this.vx = 0;
            }
        }

        // Move properly (Physics applied at start)
        this.x += this.vx;

        this.animate();
    }

    startAttack(dx) {
        this.state = 'ATTACK';
        this.isAttacking = true;
        this.frameIndex = 0; // Reset animation
        this.vx = 0;
        this.facingRight = (dx > 0);

        // Attack Knockback
        // Apply immediately
        const dist = Math.sqrt(Math.pow(gameState.player.x - this.x, 2) + Math.pow(gameState.player.y - this.y, 2));
        if (dist < 60) {
            const pushDir = (dx > 0) ? 1 : -1;
            gameState.player.vx = pushDir * 12;
            gameState.player.vy = -4;
        }
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
            if (this.state === 'ATTACK') {
                this.isAttacking = false; // Attack complete
                this.state = 'IDLE';
            }
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
