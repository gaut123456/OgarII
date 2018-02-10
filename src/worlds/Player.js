const PlayingRouter = require("../primitives/PlayingRouter");
const ServerHandle = require("../ServerHandle");
const World = require("./World");
const Cell = require("../cells/Cell");
const PlayerCell = require("../cells/PlayerCell");

class Player {
    /**
     * @param {ServerHandle} handle
     * @param {Number} id
     * @param {PlayingRouter} playingRouter
     */
    constructor(handle, id, playingRouter) {
        this.handle = handle;
        this.id = id;
        this.playingRouter = playingRouter;

        /**
         * -1 - Idle
         * 0  - Playing
         * 1  - Spectating
         * 2  - Roaming
         * @type {-1|0|1|2}
         */
        this.state = -1;
        /** @type {World} */
        this.world = null;
        /** @type {any} */
        this.team = null;
        this.score = NaN;

        /** @type {PlayerCell[]} */
        this.ownedCells = [];
        /** @type {{[cellId: string]: Cell}} */
        this.visibleCells = { };
        /** @type {{[cellId: string]: Cell}} */
        this.lastVisibleCells = { };
        /** @type {{x: Number, y: Number, w: Number, h: Number, s: Number}} */
        this.viewArea = {
            x: 0,
            y: 0,
            w: 1920 / 2 * handle.settings.playerViewScaleMult,
            h: 1080 / 2 * handle.settings.playerViewScaleMult,
            s: 1
        };
    }

    get settings() { return this.handle.settings; }

    destroy() {
        
    }

    /**
     * @param {-1|0|1|2} targetState
     */
    updateState(targetState) {
        if (this.world === null) this.state = -1;
        else if (this.ownedCells.length > 0) this.state = 0;
        else if (this.world.largestPlayer === null) this.state = 2;
        else if (this.state === 1 && targetState === 2) this.state = 2;
        else if (this.state === 2 && targetState === 1) this.state = 1;
        else this.state = -1;
    }

    updateVisibleCells() {
        let s;
        switch (this.state) {
            case -1: this.score = NaN; break;
            case 0:
                let x = 0, y = 0, score = 0; s = 0;
                const l = this.ownedCells.length;
                for (let i = 0; i < l; i++) {
                    const cell = this.ownedCells[i];
                    x += cell.x;
                    y += cell.y;
                    s += cell.size;
                    score += cell.mass;
                }
                this.viewArea.x = x / l;
                this.viewArea.y = y / l;
                this.score = score;
                s = this.viewArea.s = Math.pow(Math.min(64 / s, 1), 0.4);
                this.viewArea.w = 1920 / s / 2 * this.settings.playerViewScaleMult;
                this.viewArea.h = 1080 / s / 2 * this.settings.playerViewScaleMult;
                break;
            case 1:
                this.score = NaN;
                const spectating = this.world.largestPlayer;
                this.viewArea.x = spectating.viewArea.x;
                this.viewArea.y = spectating.viewArea.y;
                this.viewArea.s = spectating.viewArea.s;
                this.viewArea.w = spectating.viewArea.w;
                this.viewArea.h = spectating.viewArea.h;
                break;
            case 2:
                this.score = NaN;
                let dx = this.playingRouter.mouseX - this.viewArea.x;
                let dy = this.playingRouter.mouseY - this.viewArea.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                const D = Math.min(d, this.settings.playerRoamSpeed);
                if (D < 1) break; dx /= d; dy /= d;
                const border = this.world.border;
                this.viewArea.x = Math.max(border.x - border.w, Math.min(this.viewArea.x + dx * D, border.x + border.w));
                this.viewArea.y = Math.max(border.y - border.h, Math.min(this.viewArea.y + dy * D, border.y + border.h));
                s = this.viewArea.s = this.settings.playerRoamViewScale;
                this.viewArea.w = 1920 / s / 2 * this.settings.playerViewScaleMult;
                this.viewArea.h = 1080 / s / 2 * this.settings.playerViewScaleMult;
                break;
        }

        delete this.lastVisibleCells;
        this.lastVisibleCells = this.visibleCells;
        let visibleCells = this.visibleCells = { };
        for (let i = 0, l = this.ownedCells.length; i < l; i++) {
            const cell = this.ownedCells[i];
            visibleCells[cell.id] = cell;
        }
        this.world.finder.search(this.viewArea, (cell) => visibleCells[cell.id] = cell);
    }
}

module.exports = Player;