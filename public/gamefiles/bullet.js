class Bullet {
    constructor(x, y) {
        this.x = x-32;
        this.y = y;
        this.r = 8;
        this.vel = 10;
        this.bulletShot = document.getElementById('gunshotaudio');
    }

    // Check if bullet is offscreen
    offScreen() {
        if (this.y < 0) 
            return true;
    }

    // Check if bullet hits the asteroid, if true update asteroid mass
    hits(asteroids) {
        for (let i = 0; i < asteroids.length; i++) {
            let x = asteroids[i].getArgs()[0];
            let y = asteroids[i].getArgs()[1];
            let r = asteroids[i].getArgs()[2];
            let d = sqrt(pow(x - this.x, 2) + pow(y - this.y, 2));
            if (d < this.r / 2 + r / 2) {
                asteroids[i].updateMass();
                this.bulletShot.play();
                return true;
            }
        }
        return false;
    }

    // Update position
    update() {
        this.y -= this.vel;
    }
    
    // Display the bullet
    show() {
        stroke(125);
        fill(255);
        ellipse(this.x, this.y, this.r, this.r);
    }
}