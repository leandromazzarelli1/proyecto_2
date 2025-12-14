class MagicProjectile {
    constructor(x, y, facingRight) {
        this.x = x;
        this.y = y;
        this.facingRight = facingRight;
        this.vx = facingRight ? 6 : -6; // Travel speed
        this.width = 64;
        this.height = 64;

        // State
        this.state = 'INVOKE'; // INVOKE, LAUNCH, IMPACT, DESTROY
        this.timer = 0;
        this.invokeDuration = 60; // 1 second at 60fps
        this.launchDuration = 120; // 2 seconds max flight
        this.impactDuration = 20; // Short impact anim

        // Animation
        this.frameIndex = 0;
        this.frameTimer = 0;
        this.animationSpeed = 8;

        this.assets = {
            invoke: [],
            launch: [],
            impact: []
        };

        this.loadAssets();
    }

    loadAssets() {
        const basePath = 'Magic/Magic_1/';

        // Invoke (1 frame)
        const inv = new Image();
        inv.src = `${basePath}magic_ball_invoque_1.png`;
        this.assets.invoke.push(inv);

        // Launch (3 frames) - Note typo in filename 'lunch'
        for (let i = 1; i <= 3; i++) {
            const img = new Image();
            img.src = `${basePath}magic_ball_lunch_${i}.png`; // 'lunch' typo in source
            this.assets.launch.push(img);
        }

        // Impact (3 frames) - Note typo in filename 'inpact'
        for (let i = 1; i <= 3; i++) {
            const img = new Image();
            img.src = `${basePath}magic_ball_inpact_${i}.png`; // 'inpact' typo in source
            this.assets.impact.push(img);
        }
    }

    update() {
        if (this.state === 'DESTROIED') return;

        this.frameTimer++;
        if (this.frameTimer >= this.animationSpeed) {
            this.frameIndex++;
            this.frameTimer = 0;
        }

        if (this.state === 'INVOKE') {
            this.timer++;
            // Show invoke animation
            this.frameIndex = 0; // Only 1 frame provided

            if (this.timer >= this.invokeDuration) {
                this.state = 'LAUNCH';
                this.timer = 0;
                this.frameIndex = 0;
            }
        }
        else if (this.state === 'LAUNCH') {
            // Move
            this.x += this.vx;
            this.timer++;

            // Loop Launch Animation
            if (this.frameIndex >= this.assets.launch.length) this.frameIndex = 0;

            // Check Collision with Enemies
            gameState.enemies.forEach(enemy => {
                // Simple Hitbox Check
                if (this.x < enemy.x + enemy.width &&
                    this.x + this.width > enemy.x &&
                    this.y < enemy.y + enemy.height &&
                    this.y + this.height > enemy.y) {

                    this.triggerImpact();
                    // Optional: Clean up enemy or apply damage? 
                    // User said "si impacta contra un objeto enemigo ejecuta el sprite de impact en el lugar que lo toco no sigue avanzando"
                    // Doesn't explicitly say kill enemy. Just plays impact.
                }
            });

            // Max Range
            if (this.timer > this.launchDuration) {
                this.state = 'DESTROIED';
            }

            // Wall Collision? Not requested but good practice. For now skip.
        }
        else if (this.state === 'IMPACT') {
            this.timer++;
            // Play Impact Animation once
            if (this.frameIndex >= this.assets.impact.length) {
                this.state = 'DESTROIED';
            }
        }
    }

    triggerImpact() {
        this.state = 'IMPACT';
        this.frameIndex = 0;
        this.timer = 0;
    }

    draw() {
        if (this.state === 'DESTROIED') return;

        let currentSprite = null;

        if (this.state === 'INVOKE') {
            currentSprite = this.assets.invoke[0];
        } else if (this.state === 'LAUNCH') {
            currentSprite = this.assets.launch[this.frameIndex % this.assets.launch.length];
        } else if (this.state === 'IMPACT') {
            currentSprite = this.assets.impact[Math.min(this.frameIndex, this.assets.impact.length - 1)];
        }

        if (currentSprite && currentSprite.complete) {
            ctx.save();
            ctx.translate(Math.floor(this.x) + this.width / 2, Math.floor(this.y) + this.height / 2);
            if (!this.facingRight) ctx.scale(-1, 1);

            ctx.drawImage(currentSprite, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.restore();
        }
    }
}
