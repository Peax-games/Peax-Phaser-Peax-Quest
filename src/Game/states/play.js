import io from 'socket.io-client';

export default function playState(game) {
    var Client = {};
    var playerMap = {};
    var map;
    var testKey;
    var layer;
    var socket;
    var HUD;
    var HPGroup

    var orientationsDict = {
        1: 'left',
        2: 'up',
        3: 'right',
        4: 'down'
    };

    // dictionary of the fill and stroke colors to use to display different kind of HP
    var colorsDict = {
        'heal': {
            fill: "#00ad00",
            stroke: "#005200"
        },
        'hurt': {
            fill: '#ad0000',
            stroke: '#520000'
        },
        'hit': {
            fill: '#ffffff',
            stroke: '#000000'
        }
    };

/**
 * Created by Jerome on 21-01-17.
 */

var AOIutils = {
    nbAOIhorizontal: 0,
    lastAOIid: 0
};
/**
 * Created by Jerome on 09-11-16.
 */

// A space map is a custom data struture, similar to a sparse 2D array. Entities are stored according to their coordinates;
// that is, two keys are needed to fetch entities, the x position and the y position. This allows fast look-up based on position.
function spaceMap(){}

spaceMap.prototype.add = function(x,y,object){
    if(!this.hasOwnProperty(x)){
        this[x] = {};
    }
    if(!this[x].hasOwnProperty(y)){
        this[x][y] = [];
    }
    this[x][y].push(object);
};

spaceMap.prototype.delete = function(x,y,object){
    if(!this.hasOwnProperty(x) ||!this[x].hasOwnProperty(y)) return;
    var idx = this[x][y].indexOf(object);
    if (idx >= 0) this[x][y].splice( idx, 1 );
};

spaceMap.prototype.move = function(x1,y1,x2,y2,object){
    this.delete(x1,y1,object);
    this.add(x2,y2,object);
};

spaceMap.prototype.get = function(x,y){
    if(!this.hasOwnProperty(x)){
        return null;
    }
    if(!this[x].hasOwnProperty(y)){
        return null;
    }
    return this[x][y];
};

spaceMap.prototype.getFirst = function(x,y){
    var objects = this.get(x,y);
    return (objects ? objects[0] : null);
};

spaceMap.prototype.getFirstFiltered = function(x,y,filters,notFilters){
    // filters is an array of property names that need to be true
    // notFilters is an array of property names that need to be false
    // Returns the first entity at the given position, for which the values in filters are true and the values in notFilters are false
    // e.g. return the first item on a given cell that is visible but is not a chest
    if(notFilters === undefined) notFilters = [];
    var objects = this.get(x,y);
    if(!objects) return null;
    for(var o = 0; o < objects.length; o++){
        var ok = true;
        for(var f = 0; f < filters.length; f++){
            if(!objects[o][filters[f]]) {
                ok = false;
                break;
            }
        }
        if(!ok) return null;
        for(var f = 0; f < notFilters.length; f++){
            if(objects[o][notFilters[f]]) {
                ok = false;
                break;
            }
        }
        if(ok) return objects[o];
    }
    return null;
};

spaceMap.prototype.getAll = function(fnCall){
    var l = [];
    for(var i = 0; i < Object.keys(this).length; i++) { // NB: If use forEach instead, "this" won't refer to the object!
        var x = Object.keys(this)[i];
        if (this.hasOwnProperty(x)) {
            for(var j = 0; j < Object.keys(this[x]).length; j++) {
                var y = Object.keys(this[x])[j];
                if (this[x].hasOwnProperty(y)){
                    if(fnCall){
                        for(var k = 0; k < this[x][y].length; k++){
                            l.push(this[x][y][k][fnCall]());
                        }
                    }else {
                        l = l.concat(this[x][y]);
                    }
                }
            }
        }
    }
    return l;
};

if (typeof window === 'undefined') {
    module.exports.spaceMap = spaceMap;
}

AOIutils.listAdjacentAOIs = function(current){
    var AOIs = [];
    var isAtTop = (current < AOIutils.nbAOIhorizontal);
    var isAtBottom = (current > AOIutils.lastAOIid - AOIutils.nbAOIhorizontal);
    var isAtLeft = (current%AOIutils.nbAOIhorizontal == 0);
    var isAtRight = (current%AOIutils.nbAOIhorizontal == AOIutils.nbAOIhorizontal-1);
    AOIs.push(current);
    if(!isAtTop) AOIs.push(current - AOIutils.nbAOIhorizontal);
    if(!isAtBottom) AOIs.push(current + AOIutils.nbAOIhorizontal);
    if(!isAtLeft) AOIs.push(current-1);
    if(!isAtRight) AOIs.push(current+1);
    if(!isAtTop && !isAtLeft) AOIs.push(current-1-AOIutils.nbAOIhorizontal);
    if(!isAtTop && !isAtRight) AOIs.push(current+1-AOIutils.nbAOIhorizontal);
    if(!isAtBottom && !isAtLeft) AOIs.push(current-1+AOIutils.nbAOIhorizontal);
    if(!isAtBottom && !isAtRight) AOIs.push(current+1+AOIutils.nbAOIhorizontal);
    return AOIs;
};

if (typeof window === 'undefined') module.exports.AOIutils = AOIutils;


    /**
     * Created by Jerome on 14-10-16.
     */
    /*
     * Author: Jerome Renaux
     * E-mail: jerome.renaux@gmail.com
     */
    // Helper function to make a sprite object absorb all the properties of a provided JSON object; Object.assign() should work as well
    window.Phaser.Sprite.prototype.absorbProperties = function (object) {
        for (var key in object) {
            if (!object.hasOwnProperty(key)) continue;
            this[key] = object[key];
        }
    };

    // Being is the topmost class encompassing all "living" sprites, be it players, NPC or monsters (not items)
    function Being(x, y, key) {
        // key is the string indicating which atlas to use
        window.Phaser.Sprite.call(this, this, x, y, key); // Call to constructor of parent
        this.speed = 0;
        this.destination = null;
        this.add.existing(this);
    }
    Being.prototype = Object.create(window.Phaser.Sprite.prototype); // Declares the inheritance relationship
    Being.prototype.constructor = Being;

    Being.prototype.setAnimations = function (object) {
        // object is the sprite to animate
        // Players and monsters have a bunch of similar needs in terms of animations:
        // - Moving in all 4 directions
        // - Attacking in all 4 directions
        // - Idling in all 4 directions
        // + dying
        // This function sets up the animations for all cases by specifying which frames should be used for each, based on
        // default frames or JSON data from db.json
        var frames = this.frames || this.defaultFrames;
        var framePrefix;
        if (object == this.weapon) {
            frames = this.defaultFrames;
            framePrefix = this.weapon.name;
        } else {
            framePrefix = (object instanceof Monster ? this.monsterName : this.armorName);
        }
        var rates = { // Rates of the different kinds of animations
            "": 8,
            "idle_": (frames.hasOwnProperty('idle_rate') ? frames.idle_rate : 2),
            "attack_": 14
        };
        var deathframes;
        if (frames.hasOwnProperty('death')) { // Fetch death animation, or make a default one
            deathframes = window.Phaser.Animation.generateFrameNames(framePrefix + '_', frames.death[0], frames.death[1]);
        } else {
            deathframes = window.Phaser.Animation.generateFrameNames('death_', 0, 5);
        }
        object.animations.add('death', deathframes, 8, false);
        var prefixes = ['', 'idle_', 'attack_'];
        var directions = ['down', 'up', 'left', 'right'];
        for (var p = 0; p < prefixes.length; p++) {
            for (var d = 0; d < directions.length; d++) {
                var animation = prefixes[p] + directions[d];
                if (frames.hasOwnProperty(animation)) {
                    // The frames data for a given animation in the JSON is an array of two (optionally three) values :
                    // 0 : number of the beginning frame of the animation
                    // 1 : number of the end frame of the animation
                    // (2 : number of the frame to come back to at the end of the animation, if not end frame)
                    // The final animation will consist in all frames between begin and end, + the optional comeback frame
                    var fms = window.Phaser.Animation.generateFrameNames(framePrefix + '_', frames[animation][0], frames[animation][1]);
                    if (frames[animation][2]) fms.push(framePrefix + '_' + frames[animation][2]); // if comeback frame, add it
                    object.animations.add(animation, fms, rates[prefixes[p]], (prefixes[p] == 'attack_' ? false : true)); // The last boolean is whether the animation should loop or not ; always the case except for attacks
                }
            }
        }
    };

    Being.prototype.idle = function (force) { // Start idling animation, in the appropriate orientation
        // force is a boolean to indicate if the animation should be forced to play, or if it can depend from the situation (see animate() )
        this.animate('idle_' + orientationsDict[this.orientation], force);
    };

    Being.prototype.attackAndDisplay = function (hp) { // Attack a target and display HP above it subsequently
        // hp is the integer of hit points to display
        if (!this.target) return;
        this.attack();
        this.target.displayHP(hp);
    };

    Being.prototype.attack = function () {
        if (!this.target) return;
        var direction = this.adjacent(this, this.target);
        if (direction > 0) this.orientation = direction;
        this.animate('attack_' + orientationsDict[this.orientation], false);
        if (this.inCamera) {
            var sound = (this instanceof Player ? 'hit1' : 'hurt');
            this.sounds.play(sound);
        }
        if (this.target.deathmark) {
            setTimeout(function (_target) {
                _target.die(true);
            }, 500, this.target);
        }
        this.idle();
    };

    Being.prototype.flagForDeath = function () {
        this.deathmark = true;
    };

    Being.prototype.displayHP = function (hp) {
        // hp is the integer of hit points to display
        var color = (this.isPlayer ? (hp >= 0 ? 'heal' : 'hurt') : 'hit');
        this.displayHP(hp, color, this, this.HPdelay);
        if (this.isPlayer && hp > 0) this.sounds.play('heal');
    };

    Being.prototype.endFight = function () {
        if (this.fightTween) this.fightTween.stop();
        this.fightTween = null;
        this.inFight = false;
        this.deathmark = false;
        this.idle(false);
        // don't nullify target
    };

    Being.prototype.adjustStartPosition = function (start) {
        // Prevents small "hiccups" in the tween when changing direction while already moving
        // start is a 2-tuple of the coordinates of the starting position to adjust
        switch (this.orientation) {
            case 3: // right
                if (this.x % 32 != 0) start.x++;
                break;
            case 4: // down
                if (this.y % 32 != 0) start.y++;
                break;

        }
        return start;
    };

    Being.prototype.pathfindingCallback = function (finalOrientation, action, delta, sendToServer, path) {
        // This function is called when the pathfinding algorithm has successfully found a path to navigate
        // finalOrientation is a value between 1 and 4 indicatinh the orientation the player should have at the end of the path
        // action is a small object containing data about what to do once the path is ended (talk to NPC, fight monster, ...)
        // delta is some value based on latency, that will slightly adjust the speed of the movement to compensate for the latency
        // sendToServer is a boolean indicating if the computed path should be sent to the server (because it's the path that the player wants to follow)
        // path is an array of 2-tuples of coordinates
        if (path === null && this.isPlayer) {
            this.moveTarget.visible = false;
            this.marker.visible = true;
        } else if (path !== null) {
            if (action.action == 3 || action.action == 4) { // fight or chest
                finalOrientation = this.computeFinalOrientation(path);
                path.pop(); // The player should stop right before the target, not at its location
            }
            var actionToSend = (action.action != 1 ? action : { action: 0 });
            if (this.isPlayer && sendToServer && path.length) Client.sendPath(path, actionToSend, finalOrientation);
            this.move(path, finalOrientation, action, delta);
        }
    };

    Being.prototype.move = function (path, finalOrientation, action, delta) {
        // This function make a sprite move according to a determined path
        // action is a small object containing data about what to do once the path is ended (talk to NPC, fight monster, ...)
        // delta is some value based on latency, that will slightly adjust the speed of the movement to compensate for the latency
        // (e.g. if you receive information that player A moved to a specific location, but you have 200ms latency, A should
        // move 200ms faster to arrive at the end location at the same time as he would if you had received the message instantly)
        if (!path.length) {
            this.finishMovement(finalOrientation, action);
            return;
        }
        // Converts the cell coordinates in pixels coordinates, for the movement tween
        var x_steps = [];
        var y_steps = [];
        for (var q = 0; q < path.length; q++) {
            x_steps.push(path[q].x * this.map.tileWidth);
            y_steps.push(path[q].y * this.map.tileWidth);
        }
        var tween = this.add.tween(this);
        this.lastOrientationCheck = 0; // timestamp at which the orientation of the sprite was checked for the last time
        var duration = Math.ceil(Math.max(1, path.length * this.speed - delta)); // duration of the movement, based on player speed, path length and latency
        tween.to({ x: x_steps, y: y_steps }, duration);
        var checkRate = (this instanceof Player ? 0.7 : 0.4); // Rate at which the orientation of the sprite will be checked (see below)
        tween.onUpdateCallback(function () {
            // At a regular interval (not each frame!), check in which direction the sprite has moved and change its orientation accordingly
            if (Date.now() - this.lastOrientationCheck < this.speed * checkRate) return;
            this.lastOrientationCheck = Date.now();
            if (this.position.x > this.previousPosition.x) { // right
                this.orient(3);
            } else if (this.position.x < this.previousPosition.x) { // left
                this.orient(1);
            } else if (this.position.y > this.previousPosition.y) { // down
                this.orient(4);
            } else if (this.position.y < this.previousPosition.y) { // up
                this.orient(2);
            }
            this.animate(orientationsDict[this.orientation], false);
        }, this);
        tween.onComplete.add(function () {
            this.finishMovement(finalOrientation, action);
        }, this);
        this.tween = tween;
        tween.start();
    };

    Being.prototype.orient = function (orientation) {
        // orientation is a value between 1 and 4 (see orientationsDict)
        if (this.orientation != orientation) this.orientation = orientation;
    };

    Being.prototype.stopMovement = function (complete) {
        // complete is a boolean indicating if the onComplete callback should be called
        this.tween.stop(complete);
        this.tween = null;
    };

    Being.prototype.setPosition = function (x, y) {
        this.x = x * this.map.tileWidth;
        this.y = y * this.map.tileHeight;
    };

    Being.prototype.finishMovement = function (finalOrientation, action) {
        // Called whenever a path has been travelled to its end; based on the action object, the appropriate action is taken
        // finalOrientation is a value between 1 and 4 indicatinh the orientation the player should have at the end of the path
        // action is a small object containing data about what to do once the path is ended (talk to NPC, fight monster, ...)
        if (this.isPlayer) {
            if (action.action == 1) { // talk
                action.character.displayBubble(action.text);
                if (!this.speakAchievement) this.handleSpeakAchievement();
            }
            this.moveTarget.visible = false;
            this.handleLocationAchievements();
        }
        if (this instanceof Player) { // Check if the path ends on a teleport, and if so, teleport player
            var door = this.detectElement(this.doors, this.x, this.y);
            if (door) finalOrientation = this.teleport(door);
        }
        if (finalOrientation) this.orient(finalOrientation);
        this.tween = null;
        this.idle(false);
        this.sortEntities();
    };

    Being.prototype.hasMoved = function () {
        return (this.position.x != this.previousPosition.x) || (this.position.y != this.previousPosition.y);
    };

    Being.prototype.animate = function (animation, force) {
        // Manage animations, depending on which animation is requested and which one is currently playing
        // animation is the string of the name of the animation to play (death, attack_left, idle_right...)
        if (animation == 'death' || force) { // If the requested animation is death, or the "force" flag is true, start the requested animation no matter what
            this.animations.stop();
            this.animations.play(animation);
            if (this.weapon) this.weapon.animations.play(animation); // Weapon and character animations always need to be the same
            return;
        }
        var currentAnim = this.animations.currentAnim;
        if (currentAnim.name == 'death') return; // If the currently playing animation is death, cancel the play of any other animation
        if (currentAnim.isPlaying && !currentAnim.loop) { // if the current animation is not looping, let it finish before playing the requested one
            if (currentAnim.name != animation) { // Make sure not to re-play the same animation
                currentAnim.onComplete.addOnce(function () {
                    this.animate(animation, false);
                }, this);
            }
        } else { // if no animation is playing or it is looping, start the requested one immediately
            this.animations.play(animation);
            if (this.weapon) this.weapon.animations.play(animation);
        }
    };

    Being.prototype.delayedDeath = function (delay) {
        setTimeout(function (_being) {
            _being.die(true);
        }, delay, this);
    };

    Being.prototype.delayedKill = function (delay) {
        setTimeout(function (_being) {
            _being.kill();
        }, delay, this);
    };

    /* Items and stuff below */

    function Item(x, y, key) {
        // key is a string indicating the atlas to use for the texture
        window.Phaser.Sprite.call(this, this, x, y, key); // Call to constructor of parent
        this.add.existing(this);
        this.events.onKilled.addOnce(function (item) {
            item.recycle();
        }, this);
    }
    Item.prototype = Object.create(window.Phaser.Sprite.prototype);
    Item.prototype.constructor = Item;

    Item.prototype.setUp = function (content, chest, inChest, visible, respawn, loot) {
        // Sets all the properties of the object and sets up its appearance.
        this.entities.add(this);
        this.chest = chest; // boolean, is it a chest or not
        this.inChest = inChest; // boolean, is it currently in chest or has it been opened
        this.content = content; // string key of the item
        this.canRespawn = respawn; // boolean, respawnable item or not
        this.loot = loot; // boolean, was it dropped by a monster or not
        this.visible = visible; // boolean
        this.display();
        if (!this.visible) this.kill();
    };

    Item.prototype.display = function () {
        this.absorbProperties(this.itemsInfo[this.content]);
        if (!this.shadow) this.shadow = this.addChild(this.add.sprite(1, 0, 'atlas1', 'shadow'));
        if (!this.sparks) {
            this.sparks = this.addChild(this.add.sprite(0, 0, 'atlas1', 'sparks_0'));
            this.sparks.animations.add('glitter', window.Phaser.Animation.generateFrameNames('sparks_', 0, 5), 10, true);
        }
        this.sparks.animations.play('glitter');
        this.rate = 6;
        this.atlasKey = this.content; // Used in bAsicAtlasAnimation
        try {
            this.inputEnabled = true;
            this.setHoverCursors(this, this.lootCursor);
        } catch (e) {
            console.log(e);
        }
        if (this.chest) {
            this.animations.add('open', window.Phaser.Animation.generateFrameNames('death_', 0, 5), 8, false);
            this.events.onAnimationComplete.add(function (chest) {
                chest.swapToItem();
            }, this);

            this.swapToChest();
        } else {
            this.swapToItem();
        }
    };

    Item.prototype.setBlinkingTween = function () {
        var tween = this.add.tween(this);
        this.blinkingTween = tween;
        var blinks = 0;
        // will blink every 200ms, 20 times (4 sec), after a delay of sec
        tween.to({}, 200, null, false, window.Phaser.Timer.SECOND * 5, -1);
        tween.onLoop.add(function (item) {
            item.visible = !item.visible;
            blinks++;
            if (blinks >= 20) this.kill();
        }, this);
        tween.start();
    };

    Item.prototype.swapToChest = function () {
        this.frameName = 'chest';
        this.anchor.set(0);
        this.inChest = true;
        this.shadow.visible = false;
        this.sparks.visible = false;
        this.events.onInputUp.removeAll();
        this.events.onInputUp.add(this.handleChestClick, this);
        this.fadeInTween(this);
    };

    Item.prototype.swapToItem = function () {
        if (this.frameName != this.content) this.frameName = this.content + '_0';
        if (this.customAnchor) {
            this.anchor.set(this.customAnchor.x, this.customAnchor.y);
        } else {
            this.anchor.set(0, 0.25);
        }
        this.inChest = false;
        this.shadow.visible = true;
        this.sparks.visible = true;
        if (this.chest || this.loot) this.setBlinkingTween(); // need to be set each time because stop() deletes tweens
        this.basicAtlasAnimation(this);
        this.events.onInputUp.removeAll();
        this.events.onInputUp.add(this.handleLootClick, this);
    };

    Item.prototype.remove = function () {
        if (this.canRespawn) {
            this.kill(); // Kill the sprite (we kill instead of destroying in order to reuse the sprite if it has to respawn)
        } else {
            this.destroy();
            delete this.itemsTable[this.id];
        }

    };

    Item.prototype.recycle = function () {
        //if(!this.canRespawn) this.itemFactory.graveyard.push(this);
        if (this.blinkingTween) this.blinkingTween.stop(); // If the item was blinking (because on the verge of disappearing), stop that tween
    };

    Item.prototype.open = function () {
        this.animations.play('open');
        this.sounds.play('chest');
        // swapToItem() is not mentioned here, it's included as the onComplete of the animation in display()
    };

    Item.prototype.respawn = function () {
        this.revive();
        if (this.chest) {
            this.swapToChest();
        } else {
            this.swapToItem();
            this.fadeInTween(this);
        }
    };
    function Monster(x, y, key) {
        // key is a string indicating the atlas to use for the texture
        Being.call(this, x, y, key);
        this.isPlayer = false;
        this.addChild(this.add.sprite(0, 0, 'atlas1', 'shadow'));
        this.setHoverCursors(this, this.fightCursor);
        this.inputEnabled = true;
        this.events.onInputUp.add(this.handleMonsterClick, this);
        this.inFight = false;
        this.orientation = this.rnd.between(1, 4);
        this.initialPosition = new window.Phaser.Point(x, y);
    }
    Monster.prototype = Object.create(Being.prototype);
    Monster.prototype.constructor = Monster;

    Monster.prototype.setUp = function (key) {
        // key is a string use as a key in this.monstersInfo to fetch the necessary information about the monster to create
        // it's also used as part of the frame names to use (e.g. rat, red_0, rat_1, ...)
        this.frameName = key + '_0';
        this.monsterName = key;
        this.anchor.set(0.25, 0.2);
        this.absorbProperties(this.monstersInfo[key]);
        if (this.customAnchor) {
            this.anchor.x = this.customAnchor.x;
            this.anchor.y = this.customAnchor.y;
        }
        this.maxLife = this.life;
        this.entities.add(this);
        this.setAnimations(this);
        this.idle(false);
    };

    Monster.prototype.prepareMovement = function (path, action, delta) {
        if (!path) return;
        if (this.tween) {
            this.stopMovement(false);
            //path[0] = this.adjustStartPosition(path[0]);
        }
        this.pathfindingCallback(0, action, delta, false, path); // false : send to server
    };

    // fight and fightAction: see the equicalents in Player
    Monster.prototype.fight = function () {
        this.inFight = true;
        this.fightTween = this.add.tween(this);
        this.fightTween.to({}, window.Phaser.Timer.SECOND, null, false, 150, -1); // Small delay to allow the player to finish his movement, -1 for looping
        this.fightTween.onStart.add(function () { this.fightAction(); }, this);
        this.fightTween.onLoop.add(function () { this.fightAction(); }, this);
        this.fightTween.start();
    };

    Monster.prototype.fightAction = function () {
        if (Date.now() - this.lastAttack < 900) return;
        this.lastAttack = Date.now();
        if (!this.target) return;
        if (this.target.isPlayer) return;
        var direction = this.adjacent(this, this.target);
        if (direction > 0) {
            if (this.tween) {
                this.tween.stop();
                this.tween = null;
            }
            this.orientation = direction;
            this.attack();
        }
    };

    Monster.prototype.die = function (animate) {
        this.endFight();
        this.target = null;
        this.alive = false;
        if (animate) {
            this.animate('death', false);
            //this.sounds.kill.play();
            this.sounds.play('kill2');
        }
        this.delayedKill(500);
    };

    Monster.prototype.respawn = function () {
        this.revive(); // method from the Phaser Sprite class
        this.orientation = this.rnd.between(1, 4);
        this.position.set(this.initialPosition.x, this.initialPosition.y);
        this.life = this.maxLife;
        this.idle(true);
        this.fadeInTween(this);
    };

    /**
     * Created by Jerome on 25-02-17.
     */

    function NPC(x, y, key) {
        // key is a string use as a key in this.npcInfo to fetch the necessary information about the NPC to create
        Human.call(this, x, y, 'atlas1');
        this.rate = 2; // animation rate
        this.absorbProperties(this.npcInfo[key]);
        if (this.customAnchor) {
            this.anchor.set(this.customAnchor.x, this.customAnchor.y);
        } else {
            this.anchor.set(0, 0.25);
        }
        this.addChild(this.add.sprite(0, 4, 'atlas1', 'shadow'));
        this.setHoverCursors(this, this.talkCursor);
        var tile = this.computeTileCoords(this.x, this.y);
        this.collisionArray[tile.y][tile.x] = 1; // So that you have to walk around NPC
        this.events.onInputUp.add(this.handleCharClick, this);
    }
    NPC.prototype = Object.create(Human.prototype);
    NPC.prototype.constructor = NPC;

    /**
 * Created by Jerome on 25-02-17.
 */

    function Player(x, y, key) {
        // key is a string indicating the atlas to use as texture
        Human.call(this, x, y, key); // Send context as first argument!!
        this.anchor.set(0.25, 0.35);
        this.orientation = 4; // down
        this.speed = this.playerSpeed;
        this.dialoguesMemory = {};
        this.maxLife = this.playerLife;
        this.life = this.maxLife;
        this.inFight = false;
        this.defaultFrames = {
            // the third value is the frame to come back to at the end of the animation
            "attack_right": [0, 4, 9],
            "right": [5, 8],
            "idle_right": [9, 10],
            "attack_up": [11, 15, 20],
            "up": [16, 19],
            "idle_up": [20, 21],
            "attack_down": [22, 26, 31],
            "down": [27, 30],
            "idle_down": [31, 32],
            "attack_left": [33, 37, 42],
            "left": [38, 41],
            "idle_left": [42, 43]
        };
        this.addChild(this.weapon = this.add.sprite(0, 0, 'atlas3'));
        this.addChild(this.shadow = this.add.sprite(0, 5, 'atlas1', 'shadow'));
        this.addChild(this.nameHolder = this.add.text(0, -30, '', {
            font: '14px pixel',
            fill: "#ffffff",
            stroke: "#000000",
            strokeThickness: 2
        }));
        this.events.onKilled.add(function (player) {
            this.displayedPlayers.delete(player.id);
        }, this);
    }
    Player.prototype = Object.create(Human.prototype);
    Player.prototype.constructor = Player;

    Player.prototype.setIsPlayer = function (flag) { // sets the isPlayer flag to true or false to indicate if a sprite is the main player or another player
        this.isPlayer = flag;
        if (this.isPlayer) this.nameHolder.addColor("#f4d442", 0);
    };

    Player.prototype.setName = function (name) {
        this.nameHolder.text = name;
        this.nameHolder.x = Math.floor(16 - (this.nameHolder.width / 2));
    };

    Player.prototype.prepareMovement = function (end, finalOrientation, action, delta, sendToServer) {
        // Handles the necessary caretaking preliminary to moving the player
        if (!this.alive) return;
        if (!end) return;
        var start = this.computeTileCoords(this.x, this.y);
        if (start.x == end.x && start.y == end.y) {
            if (action.action == 1) this.finishMovement(finalOrientation, action);
            return;
        }
        if (this.isPlayer) this.manageMoveTarget(end.x, end.y);
        if (this.tween) {
            this.stopMovement(false);
            start = this.adjustStartPosition(start);
        }
        if (this.isPlayer && this.inFight && action.action != 3) this.endFight();
        this.easystar.findPath(start.x, start.y, end.x, end.y, this.pathfindingCallback.bind(this, finalOrientation, action, delta, sendToServer));
        this.easystar.calculate();
    };

    Player.prototype.equipWeapon = function (key) {
        // key is a string use as a key in this.itemsInfo to fetch the necessary information about the item to equip
        // it's also used as part of the frame names to use (e.g. redsword_0, redsword_1, ...)
        this.weapon.name = key;
        this.weapon.frameName = key + '_0';
        this.weapon.absorbProperties(this.itemsInfo[key]);
        this.atk = this.weapon.atk;
        this.adjustWeapon();
        this.setAnimations(this.weapon);
        if (this.isPlayer) {
            this.weaponIcon.frameName = this.weapon.icon + '_0';
            Client.setWeapon(key);
        }
        return true;
    };

    Player.prototype.adjustWeapon = function () {
        this.weapon.position.set(this.weapon.offsets.x, this.weapon.offsets.y);
    };

    Player.prototype.equipArmor = function (key) {
        // key is a string use as a key in this.itemsInfo to fetch the necessary information about the item to equip
        // it's also used as part of the frame names to use (e.g. redsword_0, redsword_1, ...)
        var armorInfo = this.itemsInfo[key];
        this.def = armorInfo.def;
        this.armorName = key;
        this.frameName = key + '_0';
        if (this.isPlayer) {
            this.armorIcon.frameName = armorInfo.icon + '_0';
            Client.setArmor(key);
            this.armorIcon.anchor.set(0, 0);
            if (armorInfo.iconAnchor) this.armorIcon.anchor.set(armorInfo.iconAnchor.x, armorInfo.iconAnchor.y);
        }
        var animationFrames = (armorInfo.hasOwnProperty('frames') ? armorInfo.frames : null);
        this.frames = animationFrames;
        this.setAnimations(this);
        return true;
    };

    Player.prototype.updateLife = function () { // Update the life bar to reflect the amout of health of the player
        if (this.life < 0) this.life = 0;
        var width = this.computeLifeBarWidth();
        var tweenWidth = this.add.tween(this.health.getChildAt(0)); // tween for the "body" of the bar
        var tweenEnd = this.add.tween(this.health.getChildAt(1)); // tween for the curved tip
        tweenWidth.to({ width: width }, 200, null, false, 200);
        tweenEnd.to({ x: width }, 200, null, false, 200);
        tweenWidth.start();
        tweenEnd.start();
    };

    Player.prototype.teleport = function () {
        var cell = this.computeTileCoords(this.x, this.y);
        var door = this.doors.getFirst(cell.x, cell.y);
        if (door) {
            this.position.set(door.to.x, door.to.y);
            if (this.isPlayer) {
                if (door.camera && !door.follow) { // if the camera cannot follow the player but has to be fixed at specific coordinates
                    this.unfollowPlayer();
                    this.camera.x = door.camera.x;
                    this.camera.y = door.camera.y;
                } else if (door.follow) { // if the camera can follow, but indoors and within possible bounds
                    this.followPlayerIndoors(door.min_cx, door.min_cy, door.max_cx, door.max_cy);
                } else {
                    this.followPlayer();
                }
            }
            var orientationMap = {
                l: 1,
                u: 2,
                r: 3,
                d: 4
            };
            return orientationMap[door.orientation];
        }
        return null;
    };

    Player.prototype.fight = function () {
        // Sets the player in "fight mode", and start a tween that calls fightAction() regularly in order to display the attack animations
        if (!this.target) return;
        this.inFight = true;
        this.fightTween = this.add.tween(this);
        this.fightTween.to({}, window.Phaser.Timer.SECOND, null, false, 0, -1);
        this.fightTween.onStart.add(function () { this.fightAction(); }, this);
        this.fightTween.onLoop.add(function () { this.fightAction(); }, this);
        this.fightTween.start();
    };

    Player.prototype.fightAction = function () {
        // Checks if the target is on an adjacent cell, and if yes, triggers attack animation
        if (this.isPlayer) return; // For the main player, attack animations are handled differently, see updateSelf()
        var direction = this.adjacent(this, this.target);
        if (direction > 0) { // Target is on adjacent cell
            if (this.tween) {
                this.tween.stop();
                this.tween = null;
            }
            this.orientation = direction;
            this.attack();
        }
    };

    Player.prototype.die = function (animate) {
        // animate is a boolean indicating if the death animation should be played (if not, the sprite simply disappears)
        if (this.tween) this.stopMovement(false);
        this.endFight();
        this.target = null;
        this.life = 0;
        if (this.isPlayer) {
            this.moveTarget.visible = false;
            this.updateLife();
            setTimeout(this.displayDeathScroll, window.Phaser.Timer.SECOND * 2);
        }
        if (animate && this.inCamera) {
            this.frameName = 'death_0';
            this.animate('death', false);
            this.sounds.play('death');
        }
        this.delayedKill(750);
    };

    Player.prototype.respawn = function () {
        this.revive(); // method from the Phaser Sprite class
        this.orientation = this.rnd.between(1, 4);
        if (this.isPlayer) {
            this.life = this.maxLife;
            this.updateLife();
        }
        this.idle(true);
    };

    /**
 * Created by Jerome on 25-02-17.
 */

    function Human(x, y, key) {
        // Child of Being, parent of NPC and Player (the common aspect being the handling of speech bubbles)
        // key is a string indicating the atlas to use as texture
        Being.call(this, x, y, key);
    }
    Human.prototype = Object.create(Being.prototype);
    Human.prototype.constructor = Human;

    Human.prototype.generateBubble = function () {
        this.bubble = this.makeBubble();
        this.bubble.alpha = 0.6;
        this.bubble.exists = false;
    };

    Human.prototype.displayBubble = function (text) {
        // Displays a speech bubble above a character, containing the string in text
        var maxTextWidth = 200;
        if (!text) {
            if (this.bubble) this.killBubble();
            return;
        }
        if (!this.bubble) this.generateBubble();
        this.bubble.exists = true;
        var txt = this.bubble.getChildAt(10);
        txt.text = text;
        txt.style.wordWrap = true;
        txt.style.wordWrapWidth = maxTextWidth;
        var width = window.Phaser.Math.clamp(txt.width, 30, maxTextWidth);
        if (width % 2 != 0) width++; // Odd widths cause gaps in the bubbles
        var height = txt.height;
        // Compute coordinates of pieces of the speech bubble
        var ls = this.speechBubbleCornerSize;
        var rs = ls + width;
        var ts = this.speechBubbleCornerSize;
        var bs = ts + height;
        // Tail offset: positive value to place the tail approx. in the middle of the bubble
        var tail_offset = (width + 2 * this.speechBubbleCornerSize) / 2;
        var tail_y = bs + this.speechBubbleCornerSize;
        this.bubble.lifespan = window.Phaser.Timer.SECOND * 5; // Disappears after 5 sec
        txt.anchor.x = 0.5;
        txt.x = width / 2 + this.speechBubbleCornerSize;
        txt.y = ts;
        this.bubble.getChildAt(1).width = width; // top side
        this.bubble.getChildAt(2).x = rs; // top right corner
        this.bubble.getChildAt(3).height = height; // left side
        this.bubble.getChildAt(4).width = width; // center
        this.bubble.getChildAt(4).height = height; // center
        this.bubble.getChildAt(5).x = rs; // right side
        this.bubble.getChildAt(5).height = height; // right side
        this.bubble.getChildAt(6).y = bs; // bottom left corner
        this.bubble.getChildAt(7).width = width; // bottom side
        this.bubble.getChildAt(7).y = bs; // bottom side
        this.bubble.getChildAt(8).x = rs; // bottom right corner
        this.bubble.getChildAt(8).y = bs; // bottom right corner
        this.bubble.getChildAt(9).x = tail_offset; // tail
        this.bubble.getChildAt(9).y = tail_y; // tail
        this.bubble.postUpdate = function () { // Ensures that the bubble follows the character if he moves
            this.bubble.x = this.x - (tail_offset - 20);
            this.bubble.y = this.y + (this == this.player ? -this.height : -(this.height + 13)) - txt.height + 16;
        }.bind(this);
        this.sounds.play('chat');
    };

    Human.prototype.killBubble = function () {
        this.bubble.kill();
    };

    /**
 * Created by Jerome on 28-12-16.
 */

    function Factory(create) {
        this.graveyard = [];
        this.create = create;
    }

    Factory.prototype.next = function (x, y, key) {
        // Check if a dead sprite lies in the graveyard ; if yes, "refresh" it and return it, else, create a new one using the "create" callback supplied when creating the factory
        for (var g = 0; g < this.graveyard.length; g++) {
            if (!this.graveyard[g].alive) return this.setUp(this.graveyard[g], x, y, key);
        }
        return this.create(x, y, key);
    };

    Factory.prototype.setUp = function (sprite, x, y, key) {
        sprite.x = x;
        sprite.y = y;
        sprite.revive();
        return sprite;
    };

    return {
        init: function () {
            this.stage.disableVisibilityChange = true; // This could be in the create method.
        },
        create: function () {
            socket = io();

            testKey = this.input.keyboard.addKey(window.Phaser.Keyboard.ENTER);
            testKey.onDown.add(Client.sendTest, this);
            map = this.add.tilemap('map');
            map.addTilesetImage('tilesheet', 'tileset'); // tilesheet is the key of the tileset in map's JSON file

            for (var i = 0; i < map.layers.length; i++) {
                layer = map.createLayer(i);
            }
            layer.inputEnabled = true; // Allows clicking on the map ; it's enough to do it on the last layer
            layer.events.onInputUp.add(this.getCoordinates, this);

            HUD = this.add.group(); // Group containing all objects involved in the HUD
            HUD.add(this.add.sprite(0, 0, 'atlas1', 'border')); // Adds the gray border of the this
            this.displayLoadingScreen(); // Display the loading screen

            // A few maps mapping the name of an element (a monster, npc, item...) to its properties
            // Put before other functions, which might need it
            this.itemsInfo = this.db.items;
            this.npcInfo = this.db.npc;
            this.monstersInfo = this.db.monsters;
            this.findLocationAchievements(); // Scan the list of location-based achievements and store them somewhere

            // A few maps mapping numerical id's to string keys
            this.itemsIDmap = {};
            this.monstersIDmap = {};
            this.makeIDmap(this.itemsInfo, this.itemsIDmap);
            this.makeIDmap(this.monstersInfo, this.monstersIDmap);
            this.entities = this.add.group(); // Group containing all the objects appearing on the map (npc, monster, items, players ...)
            this.scenery = this.add.group(); // Group containing all the animated sprites generated from the map

            this.displayMap(); // Reads the Tiled JSON to generate the map, manage layers, create collision array for the pathfinding and make a dictionary of teleports
            //this.displayScenery(); // Finds all "scenery" tiles in the map and replace them by animated sprites
            this.displayNPC(); // Read the Tiled JSON and display the NPC

            this.createMarker(); // Creates the marker following the pointer that highlight tiles
            this.makeHPtexts(); // Creates a pool of text elements to use to display HP
            this.addSounds(); // Add the sounds of the this to some global object

            // Factories used to fetch unused sprites before creating new ones (or creating new ones when no other available)


            this.playerFactory = new Factory(function (x, y, key) {
                return new Player(x, y, key);
            });
            this.itemFactory = new Factory(function (x, y, key) {
                return new Item(x, y, key);
            });
            this.monsterFactory = new Factory(function (x, y, key) {
                return new Monster(x, y, key);
            });

            Client.requestData();

            Client.askNewPlayer();

            socket.on('newplayer', function (data) {
                this.addNewPlayer(data.id, data.x, data.y);
            });
            socket.on('allplayers', function (data) {
                for (var i = 0; i < data.length; i++) {
                    this.addNewPlayer(data[i].id, data[i].x, data[i].y);
                }

                Client.socket.on('move', function (data) {
                    this.movePlayer(data.id, data.x, data.y);
                });

                Client.socket.on('remove', function (id) {
                    this.removePlayer(id);
                });
            });
        },
        getCoordinates: function (layer, pointer) {
            Client.sendClick(pointer.worldX, pointer.worldY);
        },
        addNewPlayer: function (id, x, y) {
            playerMap[id] = this.add.sprite(x, y, 'sprite');
        },
        movePlayer: function (id, x, y) {
            var player = playerMap[id];
            var distance = window.Phaser.Math.distance(player.x, player.y, x, y);
            var tween = this.add.tween(player);
            var duration = distance * 10;
            tween.to({ x: x, y: y }, duration);
            tween.start();
        },
        removePlayer: function (id) {
            playerMap[id].destroy();
            delete playerMap[id];
        },

        // end of this file.

        sendTest: function () {
            console.log("test sent");
            Client.socket.emit('test');
        },

        askNewPlayer: function () {
            Client.socket.emit('newplayer');
        },

        sendClick: function (x, y) {
            Client.socket.emit('click', { x: x, y: y });
        },
        // Main update function; processes the global update packages received from the server
        updateWorld: function (data) { // data is the update package from the server
            var createdPlayers = [];
            if (data.newplayers) {
                for (var n = 0; n < data.newplayers.length; n++) {
                    this.createPlayer(data.newplayers[n]);
                    createdPlayers.push(data.newplayers[n].id);
                }
                if (data.newplayers.length > 0) this.sortEntities(); // Sort entitites according to y coordinate to make them render properly above each other
            }

            // Create new monsters and items and store them in the appropriate maps
            if (data.newitems) this.populateTable(this.itemsTable, data.newitems, this.createItem);
            if (data.newmonsters) {
                this.populateTable(this.monstersTable, data.newmonsters, this.createMonster);
                this.sortEntities();
            }

            for (var n = 0; n < createdPlayers.length; n++) {
                var player = this.charactersPool[createdPlayers[n]];
                if (player.inFight) {
                    player.target = this.monstersTable[player.targetID]; // ultimately, target is object, not ID
                    player.fight();
                }
            }

            if (data.disconnected) { // data.disconnected is an array of disconnected players
                for (var i = 0; i < data.disconnected.length; i++) {
                    this.removePlayer(this.charactersPool[data.disconnected[i]], true); // animate death
                }
            }

            // data.items, data.players and data.monsters are associative arrays mapping the id's of the entities
            // to small object indicating which properties need to be updated. The following code iterate over
            // these objects and call the relevant update functions.
            if (data.items) this.traverseUpdateObject(data.items, this.itemsTable, this.updateItem);
            // "Status" updates ; used to update some properties that need to be set before taking any real action on the this objects
            if (data.players) this.traverseUpdateObject(data.players, this.charactersPool, this.updatePlayerStatus);
            if (data.monsters) this.traverseUpdateObject(data.monsters, this.monstersTable, this.updateMonsterStatus);
            // "Action" updates
            if (data.players) this.traverseUpdateObject(data.players, this.charactersPool, this.updatePlayerAction);
            if (data.monsters) this.traverseUpdateObject(data.monsters, this.monstersTable, this.updateMonsterAction);
        },
        // For each element in arr, call the callback on it and store the result in the map 'table'
        populateTable: function (table, arr, callback) {
            for (var i = 0; i < arr.length; i++) {
                var data = arr[i];
                // The callback receives the object received from the server as an argument, uses the relevant factory to create
                // the proper sprite, and returns that sprite
                var object = callback(data);
                object.id = data.id;
                table[data.id] = object;
            }
        },
        // For each element in obj, call callback on it
        traverseUpdateObject: function (obj, table, callback) {
            Object.keys(obj).forEach(function (key) {
                if (table[key]) callback(table[key], obj[key]);
            });
        },

        // CREATION CODE
        // These functions are supposed to return a sprite, whether by creating one from scratch, recycling and old one or
        // fetching the appropriate already existing one, based on the info in the 'data' packer from the server
        createMonster: function (data) { // data contains the data from the server on the new entity to create
            var monster = (this.monstersTable[data.id] ?
                this.monstersTable[data.id] :
                this.monsterFactory.next(data.x * this.map.tileWidth, data.y * this.map.tileHeight, 'atlas4')
            );
            monster.setUp(this.monstersIDmap[data.monster]);
            this.updateMonsterStatus(monster, data);
            this.updateMonsterAction(monster, data);
            return monster;
        },

        createItem: function (data) { // data contains the data from the server on the new entity to create
            var item;
            if (this.itemsTable[data.id]) {
                item = this.itemsTable[data.id]
            } else {
                item = this.itemFactory.next(data.x * this.map.tileWidth, data.y * this.map.tileHeight, 'atlas3');
                item.setUp(this.itemsIDmap[data.itemID], data.chest, data.inChest, data.visible, data.respawn, data.loot);
            }
            this.updateItem(item, data);
            return item;
        },

        createPlayer: function (data) { // data contains the data from the server on the new entity to create
            var player;
            if (this.charactersPool[data.id]) {
                player = this.charactersPool[data.id];
            } else {
                player = this.newPlayer(data.x, data.y, data.id);
            }
            if (!data.alive) player.visible = false;
            this.setUpPlayer(player, data);
            this.updatePlayerStatus(player, data);
            this.updatePlayerAction(player, data);
            this.displayedPlayers.add(player.id);
        },

        newPlayer: function (x, y, id) {
            var player = this.playerFactory.next(x * this.map.tileWidth, y * this.map.tileHeight, 'atlas3');
            player.orientation = this.defaultOrientation;
            player.id = id;
            this.entities.add(player);
            this.charactersPool[id] = player;
            this.sortEntities();
            return player;
        },

        setUpPlayer: function (player, data) { // data contains the data from the server on the new entity to create
            player.setName(data.name);
            player.speed = this.playerSpeed;
            player.orientation = this.defaultOrientation;
        },

        fadeInTween: function (object) { // Fade-in effect used to spawn items and monsters
            object.alpha = 0;
            var tween = this.add.tween(object);
            tween.to({ alpha: 1 }, window.Phaser.Timer.SECOND / 2);
            tween.start();
        },

        // UPDATE CODE

        updatePlayerStatus: function (player, info) { // info contains the updated data from the server
            if (info.connected == false) {
                this.removePlayer(player, true);
                return;
            }
            if (info.x && info.y) player.position.set(info.x * this.map.tileWidth, info.y * this.map.tileHeight);

            if (info.aoi) { // Update the id of the AOI that the player is in
                player.aoi = info.aoi;
                if (player.isPlayer) this.updateDisplayList();
            }

            if (info.alive == false && player.alive == true) player.flagForDeath();
            if (info.weapon) this.updateEquipment(player, info.weapon);
            if (info.armor) this.updateEquipment(player, info.armor);
            if (info.weapon || info.armor) player.idle(false); // If an equipment change has taken place, need to resume idling animation
            if (info.targetID !== undefined) player.target = (info.targetID ? this.monstersTable[info.targetID] : null);
        },

        updateDisplayList: function () {
            // Whenever the player moves to a different AOI, for each player displayed in the this, check if it will still be
            // visible from the new AOI; if not, remove it
            if (!this.displayedPlayers) return;
            var adjacent = AOIutils.listAdjacentAOIs(this.player.aoi);
            this.displayedPlayers.forEach(function (pid) {
                var p = this.charactersPool[pid];
                // check if the AOI of player p is in the list of the AOI's adjacent to the main player
                if (p) if (adjacent.indexOf(p.aoi) == -1) this.removePlayer(p, false); // false: don't animate death
            });
        },

        updateEquipment: function (player, eqID) {
            var equipment = this.itemsIDmap[eqID];
            var itemInfo = this.itemsInfo[equipment];
            if (itemInfo.type == 1) { // weapon
                player.equipWeapon(equipment);
            } else if (itemInfo.type == 2) { // armor
                player.equipArmor(equipment);
            }
        },

        updatePlayerAction: function (player, info) { // info contains the updated data from the server
            if (info.alive == true && player.alive == false) player.respawn();
            if (!player.alive) return;
            if (info.alive == false && player.alive == true) {
                if (!player.isPlayer) { // only for other players; for self, attackAndDisplay will be used instead
                    var hitter = this.monstersTable[info.lastHitter];
                    if (hitter) hitter.attack();
                    player.delayedDeath(500);
                }
                return;
            }
            if (!player.isPlayer && info.route) this.moveCharacter(player.id, info.route.end, info.route.orientation, info.route.delta);
            if (info.inFight == false && player.inFight == true) {
                player.endFight();
            } else if (info.inFight == true && player.inFight == false) {
                player.fight();
            }
        },

        updateMonsterStatus: function (monster, info) { // info contains the updated data from the server
            if (info.alive == false && monster.alive == true) {
                monster.flagForDeath();
                monster.delayedDeath(500);
                return;
            }
            if (info.x && info.y) monster.position.set(info.x * this.map.tileWidth, info.y * this.map.tileHeight);
            if (info.targetID !== undefined) monster.target = this.charactersPool[info.targetID];
        },
        updateMonsterAction: function (monster, info) { // info contains the updated data from the server
            if (info.alive == false && monster.alive == true) {
                var hitter = this.charactersPool[info.lastHitter];
                if (hitter) hitter.attack();
                return;
            } else if (info.alive == true && monster.alive == false) {
                monster.respawn();
            }
            if (info.route) this.moveMonster(monster.id, info.route.path, info.route.delta);
            if (info.inFight == false && monster.inFight == true) {
                monster.endFight();
            } else if (info.inFight == true && monster.inFight == false) {
                monster.fight();
            }
        },

        updateItem: function (item, info) { // info contains the updated data from the server
            if (info.visible == false && item.alive == true) {
                item.remove();
            } else if (info.visible == true && item.alive == false) {
                item.respawn();
            }
            if (info.inChest == false && item.inChest == true) item.open();
        },

        updateSelf: function (data) {
            // Whereas updateWorld processes the global updates from the server about entities in the world, updateSelf
            // processes updates specific to the player, visible only to him
            if (data.life !== undefined) {
                this.player.life = data.life;
                this.player.updateLife();
            }
            if (data.x != undefined && data.y != undefined) {
                if (!this.player.alive) this.player.respawn(); // A change of position is send via personal update package only in case of respawn, so respawn is called immediately
                this.player.position.set(data.x * this.map.tileWidth, data.y * this.map.tileHeight);
                this.followPlayer();
            }
            // data.hp is an array of "hp" objects, which contain info about hit points to display over specific targets
            if (data.hp !== undefined) {
                for (var h = 0; h < data.hp.length; h++) {
                    var hp = data.hp[h];
                    if (hp.target == false) { // The HP should appear above the player
                        if (hp.from !== undefined) {
                            var attacker = this.monstersTable[hp.from];
                            attacker.attackAndDisplay(-(hp.hp));
                        } else {
                            this.player.displayHP(hp.hp, 0);
                        }
                    } else if (hp.target == true) { // The HP should appear above the target monster
                        this.player.attackAndDisplay(-(hp.hp));
                    }
                }
            }
            if (data.killed) { // array of monsters killed by the player since last packet
                for (var i = 0; i < data.killed.length; i++) {
                    var killed = this.monstersInfo[this.monstersIDmap[data.killed[i]]].name;
                    this.messageIn('You killed a ' + killed + '!');
                    this.handleKillAchievement(data.killed[i]);
                }
            }
            if (data.used) { // array of items used by the player since last packet
                for (var i = 0; i < data.used.length; i++) {
                    var used = this.itemsInfo[this.itemsIDmap[data.used[i]]];
                    if (used.msg) this.messageIn(used.msg);
                    if (!this.weaponAchievement || !this.armorAchievement) this.handleLootAchievement(data.used[i]);
                }
            }
            if (data.noPick) { // boolean indicating whether the player tried to pick an inferior item
                this.messageIn('You already have better equipment!');
                this.sounds.play('noloot');
            }
        },

        revivePlayer: function () { // Revive the player after clicking "revive"
            Client.sendRevive();
            this.deathScroll.hideTween.start();
        },
        // INIT CODE

        setLatency: function (latency) {
            this.latency = latency;
        },

        initWorld: function (data) { // Initialize the this world based on the server data
            AOIutils.nbAOIhorizontal = data.nbAOIhorizontal;
            AOIutils.lastAOIid = data.lastAOIid;

            this.displayHero(data.player.x, data.player.y, data.player.id);

            this.displayHUD(); // Displays HUD, and sets up life bar, chat bar, the HUD buttons and their behavior

            this.setUpPlayer(this.player, data.player);
            this.updatePlayerStatus(this.player, data.player);

            // Reorder the groups a little, so that all their elements render in the proper order
            this.moveGroupTo(this.world, this.groundMapLayers, 0);
            this.moveGroupTo(this.world, this.scenery, this.groundMapLayers.z);
            this.moveGroupTo(this.world, this.markerGroup, this.scenery.z); // z start at 1
            this.moveGroupTo(this.world, this.entities, this.markerGroup.z);
            this.moveGroupTo(this.world, this.highMapLayers, this.entities.z);
            this.moveGroupTo(this.world, this.HUD, this.highMapLayers.z);

            this.itemsTable = {};
            this.monstersTable = {};
            this.displayedPlayers = new Set();
            this.playerIsInitialized = true;
            // If the this loads while the window is out of focus, it may hang; disableVisibilityChange should be set to true
            // only once it's fully loaded
            if (document.hasFocus()) {
                this.stage.disableVisibilityChange = true; // Stay alive even if window loses focus
            } else {
                this.onResume.addOnce(function () {
                    this.stage.disableVisibilityChange = true;
                }, this);
            }
            // Check whether these three achievements have been fulfilled already (stored in localStorage)
            this.weaponAchievement = Client.hasAchievement(0);
            this.armorAchievement = Client.hasAchievement(4);
            this.speakAchievement = Client.hasAchievement(3);

            Client.emptyQueue(); // Process the queue of packets from the server that had to wait while the client was initializing
            this.groundMapLayers.setAll('visible', true);
            this.highMapLayers.setAll('visible', true);
            //this.scenery.setAll('visible',true);
            // Destroy loading screen
            this.loadingShade.destroy();
            this.loadingText.destroy();
            this.messageIn((this.isNewPlayer ? 'Welcome to PhaserQuest!' : 'Welcome back!'));

            if (this.isNewPlayer) this.toggleHelp();
        },

        moveGroupTo: function (parent, group, endPos) {
            // parent is the Phaser Group that contains the group to move (default: world)
            // group is the Phaser Group to be moved
            // endPos is the position (integer) at which to move it
            // if endPos is some group's z value, the moved group will be right below (visually) that group
            // This manipulation is needed because the rendering order and visual overlap of the sprites depend of the order of their groups
            var startPos = group.z - 1;
            var diff = startPos - endPos;
            if (diff > 0) {
                for (diff; diff > 0; diff--) {
                    parent.moveDown(group);
                }
            } else if (diff < 0) {
                for (diff; diff < 0; diff++) {
                    parent.moveUp(group);
                }
            }
        },

        displayHero: function (x, y, id) {
            this.player = this.newPlayer(x, y, id);
            this.player.setIsPlayer(true);
            this.player.addChild(this.cameraFocus = this.add.sprite(0, 16)); // trick to force camera offset
            this.followPlayer();
        },

        // MOVE CODE

        moveCharacter: function (id, end, orientation, delta) { // Move character according to information from the server
            // end is a small object containing the x and y coordinates to move to
            // orientation, between 1 and 4, indicates the orientation the character should face at the end of the movement
            // delta is the latency of the player, to adjust the speed of the movements (movements go faster as the latency increase, to make sure they don't get increasingly out of sync)
            var character = this.charactersPool[id];
            character.prepareMovement(end, orientation, { action: 0 }, delta + this.latency, false); // false : don't send path to server
        },
        moveMonster: function (id, path, delta) { // Move monster according to information from the server
            // path is an array of 2-tuples of coordinates, representing the path to follow
            // delta is the latency of the player, to adjust the speed of the movements (movements go faster as the latency increase, to make sure they don't get increasingly out of sync)
            var monster = this.monstersTable[id];
            if (monster) monster.prepareMovement(path, { action: 0 }, delta + this.latency);
        },

        // REMOVAL CODE

        removePlayer: function (player, animate) {
            // animate is a boolean to indicate if the death animation should be played or not (if the player to be removed is not visible on screen, it's useless to play the animation)
            if (!player) return;
            player.die(animate);
            delete this.charactersPool[player.id];
        },

        // ======================

        // SCREENS CODE : Code about displaying screens of any kind

        makeAchievementsScroll: function () { // Create the screen displaying the achievements of the player
            var achievements = this.db.achievements;
            this.nbAchievements = Object.keys(achievements).length;
            var perPage = 4;
            this.currentAchievementsPage = 1;
            this.minAchievementsPage = 1;
            this.maxAchievementsPage = this.nbAchievements / perPage;
            this.achievementsBg = this.makeFlatScroll(this.toggleAchievements);
            var nameStyle = { // Style for achievements names
                font: '18px pixel',
                fill: "#ffffff", // f4d442
                stroke: "#000000",
                strokeThickness: 3
            };
            var descStyle = { // Style for achievements descriptions
                font: '18px pixel',
                fill: "#000000"
            };
            // Creates a mask outside of which the achievement holders won't be visible, to allow to make them slide in and out
            // of the scroll background
            var mask = this.add.graphics(0, 0);
            mask.fixedToCamera = true;
            mask.beginFill(0xffffff);
            mask.drawRect(this.achievementsBg.x + 40, this.achievementsBg.y + 40, this.achievementsHolderWidth - 100, 300);
            mask.endFill();
            var page = 0;
            // Create one "holder" per achievement, consisting in a background image, the name and the description
            this.achievementsBg.holders = [];
            for (var i = 0; i < this.nbAchievements; i++) {
                if (i > 0 && i % perPage == 0) page++;
                this.achievementsBg.holders.push(this.achievementsBg.addChild(this.add.sprite(40 + (page * this.achievementsHolderWidth), 50 + ((i % 4) * 62), 'atlas1', 'achievementholder')));
                this.achievementsBg.holders[i].addChild(this.add.text(75, 13, achievements[i].name, nameStyle));
                this.achievementsBg.holders[i].addChild(this.add.text(295, 15, achievements[i].desc, descStyle));
                this.achievementsBg.holders[i].mask = mask;
            }

            this.achievementsBg.leftArrow = this.achievementsBg.addChild(this.add.button(345, 315, 'atlas1', function () {
                this.changeAchievementsPage('left');
            }, this, 'arrows_2', 'arrows_2', 'arrows_4'));
            this.achievementsBg.rightArrow = this.achievementsBg.addChild(this.add.button(412, 315, 'atlas1', function () {
                this.changeAchievementsPage('right');
            }, this, 'arrows_3', 'arrows_3', 'arrows_5'));
            this.achievementsBg.leftArrow.input.useHandCursor = false;
            this.achievementsBg.rightArrow.input.useHandCursor = false;

            this.achievementsBg.completed = this.achievementsBg.addChild(this.add.text(645, 325, '', {
                font: '18px pixel',
                fill: "#ffffff",
                stroke: "#000000",
                strokeThickness: 3
            }));
            this.updateAchievements();
            this.updateAchievementsArrows();
        },

        // makeDeathScroll: function () { // Make the screen that is displayed when player dies
        //     this.deathScroll = Home.makeScroll(); // Start from a generic scroll-like screen
        //     Home.setFadeTweens(this.deathScroll);
        //     var title = this.deathScroll.addChild(this.add.text(0, 125, 'You died...', {
        //         font: '30px pixel',
        //         fill: "#ffffff",
        //         stroke: "#000000",
        //         strokeThickness: 3
        //     }));
        //     title.x = this.deathScroll.width / 2 - title.width / 2;
        //     var button = this.deathScroll.addChild(this.add.button(0, 210, 'atlas1', this.revivePlayer, this, 'revive_0', 'revive_0', 'revive_1'));
        //     button.x = this.deathScroll.width / 2;
        //     button.anchor.set(0.5, 0);
        // },

        // makeFlatScroll: function (callback) { // Creates and empty, generic flat scroll screen, to be used for achievements and help
        //     // callback is the function to call when clicking on the close button (typically a toggle function, such as toggleHelp() )
        //     var scroll = this.add.sprite(80, 32, 'atlas1', 'achievements');
        //     scroll.fixedToCamera = true;
        //     scroll.alpha = 0;
        //     scroll.visible = false;
        //     Home.setFadeTweens(scroll);
        //     var closeBtn = scroll.addChild(this.add.button(scroll.width - 18, -14, 'atlas1', callback, this, 'close_1', 'close_0', 'close_2'));
        //     closeBtn.input.useHandCursor = false;
        //     return scroll;
        // },

        // makeHelpScroll: function () { // Make the screen showing how to play instructions
        //     this.helpScroll = this.makeFlatScroll(this.toggleHelp);
        //     Home.makeTitle(this.helpScroll, 'How to play');
        //     var mouseY = 130;
        //     var enterY = 200;
        //     var charY = 270;
        //     var style = { font: '18px pixel' };
        //     var mouse = this.helpScroll.addChild(this.add.sprite(55, mouseY, 'atlas1', 'mouse'));
        //     mouse.anchor.set(0.5);
        //     this.helpScroll.addChild(this.add.text(100, mouseY - 10, this.db.texts.help_move, style));
        //     var enter = this.helpScroll.addChild(this.add.sprite(55, enterY, 'atlas1', 'enter'));
        //     enter.anchor.set(0.5);
        //     this.helpScroll.addChild(this.add.text(100, enterY - 12, this.db.texts.help_chat, style));
        //     var char = this.helpScroll.addChild(this.add.sprite(55, charY, 'atlas3', 'clotharmor_31'));
        //     char.anchor.set(0.5);
        //     this.helpScroll.addChild(this.add.text(100, charY - 10, this.db.texts.help_save, style));
        // },

        // Create the screen used to prompt the player to change the orientation of his device
        makeOrientationScreen: function () {
            this.orientationContainer = this.add.sprite(0, 0); // Create a container sprite
            // Make black screen to cover the scene
            this.orientationShade = this.orientationContainer.addChild(this.add.graphics(0, 0));
            this.orientationShade.beginFill(0x000000, 1);
            this.orientationShade.drawRect(0, 0, this.width, this.height);
            this.orientationShade.endFill();
            this.deviceImage = this.orientationContainer.addChild(this.add.sprite(this.width / 2, this.height / 2, 'atlas1', 'device'));
            this.deviceImage.anchor.set(0.5);
            this.rotateText = this.orientationContainer.addChild(this.add.text(0, 0, this.db.texts.orient, {
                font: '40px pixel',
                fill: "#ffffff",
                stroke: "#000000",
                strokeThickness: 3
            }));
            this.rotateText.x = this.width / 2 - this.rotateText.width / 2;
            this.rotateText.y = this.deviceImage.y + this.deviceImage.height + 20;
            this.rotateText.style.wordWrap = true;
            this.rotateText.style.wordWrapWidth = 400;
            this.orientationContainer.fixedToCamera = true;
            this.orientationContainer.visible = false;
        },

        displayDeathScroll: function () { // Displayed when player dies
            if (!this.deathScroll) this.makeDeathScroll();
            this.deathScroll.visible = true;
            this.deathScroll.showTween.start();
        },

        // Display an error message if the user id in localStorage has no match in the database;
        // called when receiving the error notification from the server
        displayError: function () {
            this.loadingText.text = this.db.texts.db_error;
            this.loadingText.x = this.width / 2 - this.loadingText.width / 2;
            this.loadingText.y = this.height / 2 - this.loadingText.height / 2;
        },

        // Display the loading screen when the this starts, after clicking "play"
        displayLoadingScreen: function () {
            // Cover the screen with a black rectangle
            this.loadingShade = this.add.graphics(0, 0);
            this.loadingShade.beginFill(0x000000, 1);
            this.loadingShade.drawRect(this.borderPadding, this.borderPadding, this.stage.width - (this.borderPadding * 2), this.stage.height - (this.borderPadding * 2));
            this.loadingShade.endFill();
            // Add some loading text (whos value is in this.db.texts) and center it
            this.loadingText = this.add.text(0, 0, this.db.texts.create, {
                font: '18px pixel',
                fill: "#ffffff", // f4d442
                stroke: "#000000",
                strokeThickness: 3
            });
            this.loadingText.x = this.width / 2 - this.loadingText.width / 2;
            this.loadingText.y = this.height / 2 - this.loadingText.height / 2;
            this.loadingText.style.wordWrap = true;
            this.loadingText.style.wordWrapWidth = 400;
        },

        // Displays the screen used to prompt the player to change the orientation of his device;
        // called by the enterIncorrectOrientation callback
        displayOrientationScreen: function () {
            if (!this.orientationContainer) this.makeOrientationScreen(); // Make the screen if it doesn't exist yet (it's not made until necessary)
            // Hide the help and achievements screens if they are visible
            if (this.helpScroll && this.helpScroll.visible) this.toggleHelp();
            if (this.achievementsBg && this.achievementsBg.visible) this.toggleAchievements();
            this.orientationContainer.visible = true;
        },

        // Hide the screen used to prompt the player to change the orientation of his device;
        // called by the leaveIncorrectOrientation callback
        removeOrientationScreen: function () {
            this.orientationContainer.visible = false;
        },

        toggleHelp: function () { // Toggles the visibility state of the help screen
            if (!this.helpScroll) this.makeHelpScroll();
            if (this.helpScroll.visible) {
                this.helpButton.freezeFrames = false;
                this.helpButton.setFrames('helpicon_1', 'helpicon_0', 'helpicon_2');
                this.helpScroll.hideTween.start();
            } else {
                this.helpScroll.visible = true;
                this.helpButton.freezeFrames = true;
                this.helpScroll.showTween.start();
            }
        },

        toggleAchievements: function () { // Toggles the visibility state of the achievements screen
            if (!this.achievementsBg) this.makeAchievementsScroll();
            if (this.achievementsBg.visible) {
                this.achButton.freezeFrames = false;
                this.achButton.setFrames('achievementicon_1', 'achievementicon_0', 'achievementicon_2');
                this.achievementsBg.hideTween.start();
            } else {
                this.achButton.freezeFrames = true;
                this.achievementsBg.visible = true;
                this.achievementsBg.showTween.start();
                if (this.achTween.isRunning) this.achTween.pause(); // Stops the blinking achievement icon tween
            }
        },

        updateAchievements: function () {
            // Check each achievement holder and, if the corresponding achievement has been acquired, update the content accordingly
            if (!this.achievementsBg) this.makeAchievementsScroll();
            var achievements = this.db.achievements;
            var completed = 0;
            for (var i = 0; i < this.nbAchievements; i++) {
                var owned = Client.hasAchievement(i);
                if (owned) completed++;
                if (owned) {
                    this.achievementsBg.holders[i].addChild(this.add.sprite(0, 0, 'atlas1', 'tokens_' + achievements[i].token));
                    this.achievementsBg.holders[i].getChildAt(0).addColor("#f4d442", 0);
                }
            }
            this.achievementsBg.completed.text = 'Completed ' + completed + '/' + this.nbAchievements;
        },

        changeAchievementsPage: function (dir) {
            // dir is a string that indicates if the right or left arrow was clicked
            if (dir == 'right' && this.currentAchievementsPage == this.maxAchievementsPage) return;
            if (dir == 'left' && this.currentAchievementsPage == this.minAchievementsPage) return;
            var sign = (dir == 'right' ? -1 : 1);
            for (var i = 0; i < this.achievementsBg.holders.length; i++) {
                var holder = this.achievementsBg.holders[i];
                var tween = this.add.tween(holder);
                tween.to({ x: holder.x + (sign * this.achievementsHolderWidth) }, window.Phaser.Timer.SECOND * 0.4);
                tween.start();
            }
            this.currentAchievementsPage += -1 * sign;
            this.updateAchievementsArrows();
        },

        updateAchievementsArrows: function () {
            if (this.currentAchievementsPage == this.maxAchievementsPage) {
                this.achievementsBg.rightArrow.setFrames('arrows_1', 'arrows_1', 'arrows_1');
            } else {
                this.achievementsBg.rightArrow.setFrames('arrows_3', 'arrows_3', 'arrows_5');
            }
            if (this.currentAchievementsPage == this.minAchievementsPage) {
                this.achievementsBg.leftArrow.setFrames('arrows_0', 'arrows_0', 'arrows_0');
            } else {
                this.achievementsBg.leftArrow.setFrames('arrows_2', 'arrows_2', 'arrows_4');
            }
        },

        // ==============

        // ACHIEVEMENTS CODE : Code about handling achievements

        handleLootAchievement: function (id) { // item id
            var item = this.itemsInfo[this.itemsIDmap[id]];
            if (item.type !== undefined) {
                if (item.type == 1 && !this.weaponAchievement) {
                    this.getAchievement(0);
                    this.weaponAchievement = true;
                } else if (item.type == 2 && !this.armorAchievement) {
                    this.getAchievement(4);
                    this.armorAchievement = true;
                }
            }
        },

        handleSpeakAchievement: function () {
            this.getAchievement(3);
            this.speakAchievement = true;
        },

        handleKillAchievement: function (id) { // monster id
            var nbKilled = localStorage.getItem('killed_' + id);
            if (nbKilled === undefined) nbKilled = 0;
            nbKilled++;
            localStorage.setItem('killed_' + id, nbKilled);
            var aid = this.monstersInfo[this.monstersIDmap[id]].achievement;
            if (this.db.achievements[aid] && nbKilled >= this.db.achievements[aid].nb && !Client.hasAchievement(aid)) this.getAchievement(aid);
        },

        handleLocationAchievements: function () {
            if (this.inDoor || !this.locationAchievements.length) return;
            var pos = this.computeTileCoords(this.player.x, this.player.y);
            for (var i = this.locationAchievements.length - 1; i >= 0; i--) {
                var area = this.locationAchievements[i];
                if ((area.criterion == "in" && area.contains(pos.x, pos.y)) || (area.criterion == "out" && !area.contains(pos.x, pos.y))) {
                    this.getAchievement(area.achID);
                    this.locationAchievements.splice(i, 1);
                }
            }
        },

        getAchievement: function (id) { // achievement id
            Client.setAchievement(id);
            this.sounds.play('achievement');
            this.achButton.blink = false;
            if (!this.achTween.isRunning) this.achTween.start();
            if (this.achTween.isPaused) this.achTween.resume();
            this.achBar.visible = true;
            this.achBar.upTween.start();
            this.achBar.achName.text = this.db.achievements[id].name;
            this.achBar.achName.x = Math.floor((this.achBar.width / 2) - (this.achBar.achName.width / 2));
            this.updateAchievements();
        },

        findLocationAchievements: function () {
            this.locationAchievements = [];
            Object.keys(this.db.achievements).forEach(function (achID) {
                if (Client.hasAchievement(achID)) return;
                var ach = this.db.achievements[achID];
                if (ach.locationAchievement) {
                    var area = new window.Phaser.Rectangle(ach.rect.x, ach.rect.y, ach.rect.w, ach.rect.h);
                    area.criterion = ach.criterion;
                    area.achID = achID;
                    this.locationAchievements.push(area);
                }
            });
        },

        // =======================
        // POS CODE : Code for position and camera-related computations

        // Determines if two entities (a and b) are on the same cell (returns -1), on adjacent (non-diagonal) cells (returns a value between
        // 1 and 4 corresponding to the orientation of a with respect to b) or further apart (returns 0)
        adjacent: function (a, b) {
            if (!a || !b) return 0;
            var posA = this.computeTileCoords(a.x, a.y);
            var posB = this.computeTileCoords(b.x, b.y);
            var Xdiff = posA.x - posB.x;
            var Ydiff = posA.y - posB.y;
            if (Xdiff == 1 && Ydiff == 0) {
                return 1;
            } else if (Xdiff == 0 && Ydiff == 1) {
                return 2;
            } else if (Xdiff == -1 && Ydiff == 0) {
                return 3;
            } else if (Xdiff == 0 && Ydiff == -1) {
                return 4;
            } else if (Xdiff == 0 && Ydiff == 0) { // The two entities are on the same cell
                return -1;
            } else { // The two entities are not on adjacent cells, nor on the same one
                return 0;
            }
        },

        // Fetches the first element from the space map at the proived coordinates
        detectElement: function (map, x, y) {
            // map is the spaceMap in which to look
            var cell = this.computeTileCoords(x, y);
            return map.getFirst(cell.x, cell.y);
        },

        // Compute the orientation that the player must have to go to the last cell of its path (used when the last cell is occupied by something and the past has to be "shortened" by one cell)
        computeFinalOrientation: function (path) { // path is a list of cells
            // path is an array of 2-tuples of coordinates
            var last = path[path.length - 1];
            var beforeLast = path[path.length - 2];
            if (last.x < beforeLast.x) {
                return 1;
            } else if (last.y < beforeLast.y) {
                return 2;
            } else if (last.x > beforeLast.x) {
                return 3;
            } else if (last.y > beforeLast.y) {
                return 4;
            }
        },

        // Convert pixel coordinates into tiles coordinates (e.g. 96, 32 becomes 3, 1)
        computeTileCoords: function (x, y) {
            var layer = this.map.thisLayers[0];
            return new window.Phaser.Point(layer.getTileX(x), layer.getTileY(y));
        },

        // Returns the rectangle corresponding to the view of the camera (not counting HUD, the actual view of the world)
        computeView: function () {
            this.view = new window.Phaser.Rectangle(this.camera.x + this.borderPadding, this.camera.y + this.borderPadding,
                this.camera.width - this.borderPadding * 2, this.camera.height - this.borderPadding * 2 - this.HUDheight);
        },

        checkCameraBounds: function () {
            // Due to the shape of the map, the bounds of the camera cannot always be the same; north of some Y coordinate (this.mapWideningY),
            // the width of the bounds has to increase, from 92 to 113.
            var pos = this.computeTileCoords(this.player.x, this.player.y);
            if (this.cameraFollowing && pos.y <= this.mapWideningY && this.camera.bounds.width == 92 * this.map.tileWidth) {
                this.tweenCameraBounds(113);
            } else if (this.cameraFollowing && pos.y > this.mapWideningY && this.camera.bounds.width == 113 * this.map.tileWidth) {
                this.tweenCameraBounds(92);
            }
        },

        tweenCameraBounds: function (width) {
            // width is the width in pixels of the camera bounds that should be tweened to
            var tween = this.add.tween(this.camera.bounds);
            tween.to({ width: width * this.map.tileWidth }, 1500, null, false, 0);
            tween.start();
        },

        followPlayer: function () { // Make the camera follow the player, within the appropriate bounds
            this.inDoor = false;
            // Rectangle to which the camera is bound, cannot move outside it
            var width = (this.player.x >= 92 ? 113 : 92);
            this.camera.bounds = new window.Phaser.Rectangle(this.map.tileWidth - this.borderPadding, this.map.tileWidth - this.borderPadding, width * this.map.tileWidth, 311 * this.map.tileWidth);
            this.camera.follow(this.cameraFocus);
            this.cameraFollowing = true;
        },

        followPlayerIndoors: function (x, y, mx, my) { // Follow player but with extra constraints due to being indoors
            // x and y are the coordinates in tiles of the top left corner of the rectangle in which the camera can move
            // mx and my are the coordinates in tiles of the bottom right corner of that same rectangle
            this.inDoor = true;
            this.camera.follow(this.cameraFocus);
            if (x && y && mx && my) {
                var w = Math.max((mx - x) * this.map.tileWidth, this.width);
                var h = (my - y) * this.map.tileHeight;
                this.camera.bounds = new window.Phaser.Rectangle(x * this.map.tileWidth, y * this.map.tileHeight, w, h);
            } else {
                this.camera.bounds = new window.Phaser.Rectangle(this.map.tileWidth - this.borderPadding, this.map.tileWidth - this.borderPadding, 170 * this.map.tileWidth, 311 * this.map.tileWidth);
            }
            this.cameraFollowing = true;
        },

        unfollowPlayer: function () { // Make the camera stop following player, typically because he is in a small indoors area
            this.inDoor = true;
            this.camera.unfollow();
            this.camera.bounds = null;
            this.cameraFollowing = false;
        },

        // =============
        // Sounds-related code
        addSounds: function () {
            // Slices the audio sprite based on the markers positions fetched from the JSON
            var markers = this.db.sounds;
            this.sounds = this.add.audio('sounds');
            this.sounds.allowMultiple = true;
            Object.keys(markers.spritemap).forEach(function (sound) {
                var sfx = markers.spritemap[sound];
                this.sounds.addMarker(sound, sfx.start, sfx.end - sfx.start);
            });
        },

        //===================
        // Animations-related code

        // Sets up basic, single-orientation animations for scenic animated sprites
        basicAnimation: function (sprite) { // sprite is the sprite to which the animation should be applied
            var frames = [];
            for (var m = 0; m < sprite.nbFrames; m++) { // Generate the list of frames of the animations based on the initial frame and the total number of frames
                frames.push(sprite.frame + m);
            }
            sprite.animations.add('idle', frames, sprite.rate, true);
            sprite.animations.play('idle');
        },

        // Same but using atlas frames
        basicAtlasAnimation: function (sprite) { // sprite is the sprite to which the animation should be applied
            // sprite, nbFrames, ... are absorbed from npc.json when a new NPC() is created
            sprite.animations.add('idle', window.Phaser.Animation.generateFrameNames(sprite.atlasKey + '_', 0, 0 + sprite.nbFrames - 1), sprite.rate, true);
            sprite.animations.play('idle');
        },

        //======================
        // HUD CODE: HUD-related code

        displayHUD: function () {
            var lifeX = this.borderPadding;
            var lifeY = this.height - this.borderPadding - this.HUDheight + 6;
            this.barY = this.height - this.borderPadding - this.HUDheight;

            this.HUDbuttons = this.add.group();

            this.displayChatBar();
            this.displayAchievementDock();

            this.HUD.add(this.add.sprite(this.borderPadding, this.barY, 'atlas1', 'bar'));
            this.HUD.add(this.weaponIcon = this.add.sprite(this.borderPadding + 210, this.barY, 'atlas3'));
            this.HUD.add(this.armorIcon = this.add.sprite(this.borderPadding + 244, this.barY + 3, 'atlas3'));

            this.HUDmessage = null;
            this.messages = this.add.group();
            for (var m = 0; m < 4; m++) {
                this.messages.add(this.add.text(490, this.barY + 5, '', {
                    font: '16px pixel',
                    fill: "#eeeeee"
                }));
            }
            this.messages.setAll('fixedToCamera', true);
            this.messages.setAll("anchor.x", 0.5);
            this.messages.setAll("exists", false);

            this.nbConnectedText = this.HUD.add(this.add.text(745, this.barY + 8, '0 players', {
                font: '16px pixel',
                fill: "#eeeeee"
            }));

            this.chatButton = this.HUDbuttons.add(this.add.button(850, this.barY + 2, 'atlas1', this.toggleChat, this, 'talkicon_1', 'talkicon_0', 'talkicon_2'));
            this.achButton = this.HUDbuttons.add(this.add.button(880, this.barY + 2, 'atlas1', this.toggleAchievements, this, 'achievementicon_1', 'achievementicon_0', 'achievementicon_2'));
            this.helpButton = this.HUDbuttons.add(this.add.button(910, this.barY + 2, 'atlas1', this.toggleHelp, this, 'helpicon_1', 'helpicon_0', 'helpicon_2'));
            this.HUDbuttons.add(this.add.button(940, this.barY + 2, 'atlas1', function (_btn) {
                if (!this.sound.mute) {
                    _btn.setFrames('soundicon_1', 'soundicon_0', 'soundicon_1');
                } else if (this.sound.mute) {
                    _btn.setFrames('soundicon_2', 'soundicon_2', 'soundicon_2');
                }
                this.sound.mute = !this.sound.mute;
            }, this, 'soundicon_2', 'soundicon_2', 'soundicon_2'));

            // Set up the blinking tween that triggers when a new achievement is unlocked
            this.achTween = this.add.tween(this.achButton);
            // will blink every 500ms
            this.achTween.to({}, 500, null, false, 0, -1); // -1 to loop forever
            this.achTween.onLoop.add(function (btn) {
                btn.blink = !btn.blink;
                if (btn.blink) {
                    this.achButton.setFrames('achievementicon_3', 'achievementicon_3', 'achievementicon_3');
                } else {
                    this.achButton.setFrames('achievementicon_1', 'achievementicon_0', 'achievementicon_2');
                }
            }, this);

            this.createLifeBar(lifeX, lifeY);
            this.HUD.add(this.health);
            this.HUD.add(this.add.sprite(lifeX, lifeY, 'atlas1', 'life'));
            this.HUD.add(this.HUDbuttons);
            this.HUD.setAll('fixedToCamera', true);
            this.HUDbuttons.forEach(function (button) {
                button.input.useHandCursor = false;
            });

            var chatKey = this.input.keyboard.addKey(window.Phaser.Keyboard.ENTER);
            chatKey.onDown.add(this.toggleChat, this);
        },

        displayChatBar: function () {
            this.chatBar = this.HUD.add(this.add.sprite(96, this.barY + 1, 'atlas1', 'chatbar'));
            this.chatBar.visible = false;
            this.chatBar.upTween = this.add.tween(this.chatBar.cameraOffset);
            this.chatBar.downTween = this.add.tween(this.chatBar.cameraOffset);
            this.chatBar.upTween.to({ y: this.barY - 30 }, window.Phaser.Timer.SECOND / 5);
            this.chatBar.downTween.to({ y: this.barY + 1 }, window.Phaser.Timer.SECOND / 5);
            this.chatBar.downTween.onComplete.add(function () {
                this.chatBar.visible = false;
            }, this);
            this.chatBar.upTween.onComplete.add(function () {
                this.chatInput.focusOutOnEnter = true;
            }, this);
            this.chatInput = this.HUD.add(this.add.inputField(115, this.barY - 20, {
                width: 750,
                height: 18,
                fillAlpha: 0,
                cursorColor: '#fff',
                fill: '#fff',
                font: '14px pixel',
                max: this.maxChatLength
            }));
            this.chatInput.visible = false;
            this.chatInput.focusOutOnEnter = false;
            this.chatInput.input.useHandCursor = false;
        },

        displayAchievementDock: function () {
            this.achBar = this.HUD.add(this.add.sprite(274, this.barY + 1, 'atlas1', 'newach'));
            this.achBar.visible = false;
            this.achBar.upTween = this.add.tween(this.achBar.cameraOffset);
            this.achBar.downTween = this.add.tween(this.achBar.cameraOffset);
            this.achBar.upTween.to({ y: this.barY - 68 }, window.Phaser.Timer.SECOND / 5);
            this.achBar.downTween.to({ y: this.barY + 1 }, window.Phaser.Timer.SECOND / 5, null, false, window.Phaser.Timer.SECOND * 5);
            this.achBar.downTween.onComplete.add(function () {
                this.achBar.visible = false;
            }, this);
            this.achBar.upTween.onComplete.add(function () {
                this.achBar.downTween.start();
            }, this);
            this.achBar.addChild(this.add.sprite(192, -35, 'atlas1', 'tokens_0'));
            var sparks = this.achBar.addChild(this.add.sprite(192, -35, 'atlas1', 'achsparks_0'));
            var frames = window.Phaser.Animation.generateFrameNames('achsparks_', 0, 5);
            sparks.animations.add('glitter', frames, 7, true);
            sparks.play('glitter');
            var titleStyle = {
                font: '14px pixel',
                fill: "#f4d442",
                stroke: "#000000",
                strokeThickness: 3
            };
            var nameStyle = {
                font: '16px pixel',
                fill: "#ffffff", // f4d442
                stroke: "#000000",
                strokeThickness: 3
            };
            this.achBar.addChild(this.add.text(133, 20, 'New Achievement Unlocked!', titleStyle));
            this.achBar.achName = this.achBar.addChild(this.add.text(133, 40, 'A true Warrior!', nameStyle));
        },

        computeLifeBarWidth: function () {
            // Based on the amount of life the player has, compute how many pixels wide the health bar should be
            return Math.max(this.healthBarWidth * (this.player.life / this.player.maxLife), 1);
        },

        createLifeBar: function (lifeX, lifeY) {
            // lifeX and lifeY are the coordinates in pixels where the life bar should be displayed at on the screen
            var width = this.computeLifeBarWidth();
            this.health = this.add.sprite(lifeX + 20, lifeY + 4);
            this.health.addChild(this.add.tileSprite(0, 0, width, 18, 'life', 0));
            this.health.addChild(this.add.sprite(width, 0, 'life', 1));
        },

        createMarker: function () { // Creates the white marker that follows the pointer
            this.markerGroup = this.add.group();
            this.marker = this.markerGroup.add(this.add.sprite(0, 0, 'atlas1'));
            this.marker.alpha = 0.5;
            this.marker.canSee = true;
            this.marker.collide = false;
            this.canvas.style.cursor = this.cursor;
        },

        updateMarker: function (x, y, collide) { // Makes the marker white or red depending on whether the underlying tile is collidable
            // collide is the boolean indicating if the tile is a collision tile or not
            this.marker.position.set(x, y);
            this.marker.frameName = (collide ? 'marker_1' : 'marker_0');
            this.marker.collide = collide;
        },

        messageIn: function (txt) { // Slide a message in the message area of the HUD
            // txt is the string to display in the message area
            var msg = this.messages.getFirstExists(false);
            msg.exists = true;
            msg.alpha = 0;
            msg.text = txt;
            msg.cameraOffset.y = this.barY + 20;
            var yTween = this.add.tween(msg.cameraOffset);
            var alphaTween = this.add.tween(msg);
            yTween.to({ y: this.barY + 8 }, window.Phaser.Timer.SECOND / 5);
            alphaTween.to({ alpha: 1 }, window.Phaser.Timer.SECOND / 5);
            yTween.start();
            alphaTween.start();
            if (this.HUDmessage) this.messageOut(this.HUDmessage);
            this.HUDmessage = msg;
            var outTween = this.add.tween(msg);
            outTween.to({}, window.Phaser.Timer.SECOND * 3);
            outTween.onComplete.add(this.messageOut, this);
            outTween.start();
        },

        messageOut: function (msg) { // Slide a message in the message area of the HUD
            // msg is the text object to move out
            var yTween = this.add.tween(msg.cameraOffset);
            var alphaTween = this.add.tween(msg);
            yTween.to({ y: this.barY }, window.Phaser.Timer.SECOND / 5);
            alphaTween.to({ alpha: 0 }, window.Phaser.Timer.SECOND / 5);
            yTween.start();
            alphaTween.start();
            alphaTween.onComplete.add(function (txt) {
                txt.exists = false;
            }, this);
            this.HUDmessage = null;
        },

        toggleChat: function () { // Toggles the visibility of the chat bar
            if (this.chatBar.visible) { // Hide bar
                this.chatButton.frameName = 'talkicon_0';
                this.chatButton.freezeFrames = false;
                this.chatInput.focusOutOnEnter = false;
                this.chatInput.visible = false;
                this.chatInput.endFocus();
                this.chatBar.downTween.start();
                if (this.chatInput.text.text) { // If a text has been typed, send it
                    var txt = this.chatInput.text.text;
                    this.player.displayBubble(txt);
                    Client.sendChat(txt);
                }
                this.chatInput.resetText();
            } else { // Show bar
                this.chatButton.frameName = 'talkicon_2';
                this.chatButton.freezeFrames = true;
                this.chatBar.visible = true;
                this.chatInput.visible = true;
                this.chatInput.startFocus();
                this.chatBar.upTween.start();
            }
        },

        updateNbConnected: function (nb) {
            if (!this.nbConnectedText) return;
            this.nbConnected = nb;
            this.nbConnectedText.text = this.nbConnected + ' player' + (this.nbConnected > 1 ? 's' : '');
        },

        // ===========================
        // MAP CODE : Map & NPC-related code

        displayMap: function () {
            this.groundMapLayers = this.add.group();
            this.highMapLayers = this.add.group();
            this.map = this.add.tilemap('map');
            this.map.addTilesetImage('tilesheet', 'tileset');
            this.map.thisLayers = [];
            for (var i = 0; i < this.map.layers.length; i++) {
                var group = (i <= this.nbGroundLayers - 1 ? this.groundMapLayers : this.highMapLayers);
                this.map.thisLayers[i] = this.map.createLayer(this.map.layers[i].name, 0, 0, group);
                this.map.thisLayers[i].visible = false; // Make map invisible before the this has fully loaded
            }
            this.map.thisLayers[0].inputEnabled = true; // Allows clicking on the map
            this.map.thisLayers[0].events.onInputUp.add(this.handleMapClick, this);
            this.createDoorsMap(); // Create the associative array mapping coordinates to doors/teleports

            //this.world.resize(this.map.widthInPixels,this.map.heightInPixels);
            this.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

            this.map.tileset = {
                gid: 1,
                tileProperties: this.map.tilesets[0].tileProperties
            };

            this.createCollisionArray();
        },

        createCollisionArray: function () {
            // Create the grid used for pathfinding ; it consists in a 2D array of 0's and 1's, 1's indicating collisions
            this.collisionArray = [];
            for (var y = 0; y < this.map.height; y++) {
                var col = [];
                for (var x = 0; x < this.map.width; x++) {
                    var collide = false;
                    for (var l = 0; l < this.map.thisLayers.length; l++) {
                        var tile = this.map.getTile(x, y, this.map.thisLayers[l]);
                        if (tile) {
                            // The original BrowserQuest Tiled file doesn't use a collision layer; rather, properties are added to the
                            // tileset to indicate which tiles causes collisions or not. Which is why we have to check in the tileProperties
                            // if a given tile has the property "c" or not (= collision)
                            var tileProperties = this.map.tileset.tileProperties[tile.index - this.map.tileset.gid];
                            if (tileProperties) {
                                if (tileProperties.hasOwnProperty('c')) {
                                    collide = true;
                                    break;
                                }
                            }
                        }
                    }
                    col.push(+collide); // "+" to convert boolean to int
                }
                this.collisionArray.push(col);
            }

            this.easystar.setGrid(this.collisionArray);
            this.easystar.setAcceptableTiles([0]);
        },

        createDoorsMap: function () { // Create the associative array mapping coordinates to doors/teleports
            this.doors = new spaceMap();
            for (var d = 0; d < this.map.objects.doors.length; d++) {
                var door = this.map.objects.doors[d];
                var position = this.computeTileCoords(door.x, door.y);
                this.doors.add(position.x, position.y, {
                    to: new window.Phaser.Point(door.properties.x * this.map.tileWidth, door.properties.y * this.map.tileWidth), // Where does the door teleports to
                    camera: (door.properties.hasOwnProperty('cx') ? new window.Phaser.Point(door.properties.cx * this.map.tileWidth, door.properties.cy * this.map.tileWidth) : null), // If set, will lock the camera at these coordinates (use for indoors locations)
                    orientation: door.properties.o, // What should be the orientation of the player after teleport
                    follow: door.properties.hasOwnProperty('follow'), // Should the camera keep following the player, even if indoors (automatically yes if outdoors)
                    // Below are the camera bounds in case of indoors following
                    min_cx: door.properties.min_cx,
                    min_cy: door.properties.min_cy,
                    max_cx: door.properties.max_cx,
                    max_cy: door.properties.max_cy
                });
            }
        },

        displayScenery: function () {
            var scenery = this.db.scenery.scenery;
            this.groundMapLayers.forEach(function (layer) {
                for (var k = 0; k < scenery.length; k++) {
                    this.map.createFromTiles(this.map.tileset.gid + scenery[k].id, -1, // tile id, replacemet
                        'tileset', layer,// key of new sprite, layer
                        this.scenery, // group added to
                        {
                            frame: scenery[k].frame,
                            nbFrames: scenery[k].nbFrames,
                            rate: 2
                        });
                }
            });
            this.scenery.setAll('visible', false);
            this.scenery.forEach(this.basicAnimation, this);
        },

        displayNPC: function () {
            var entities = this.cache.getJSON('entities'); // mapping from object IDs to sprites, the sprites being keys for the appropriate json file
            for (var e = 0; e < this.map.objects.entities.length; e++) {
                var object = this.map.objects.entities[e];
                if (!entities.hasOwnProperty(object.gid - 1961)) continue; // 1961 is the starting ID of the npc tiles in the map ; this follows from how the map was made in the original BrowserQuest
                var entityInfo = entities[object.gid - 1961];
                if (entityInfo.npc) this.basicAtlasAnimation(this.entities.add(new NPC(object.x, object.y, entityInfo.sprite)));
            }
        },

        // ===========================
        // Mouse and click-related code

        enableClick: function () {
            this.clickEnabled = true;
        },

        disableClick: function () {
            this.clickEnabled = false;
        },

        handleClick: function () {
            // If click is enabled, return true to the calling function to allow player to click,
            // then disable any clicking for time clickDelay
            if (this.clickEnabled) {
                // re-enable the click after time clickDelay has passed
                this.time.events.add(this.clickDelay, this.enableClick, this);
                this.disableClick();
                return true;
            }
            return false;
        },

        handleCharClick: function (character) { // Handles what happens when clicking on an NPC
            if (this.handleClick()) {
                // character is the sprite that was clicked
                var end = this.computeTileCoords(character.x, character.y);
                end.y++; // So that the player walks to place himself in front of the NPC
                // NPC id to keep track of the last line said to the player by each NPC; since there can be multiple identical NPC
                // (e.g. the guards), the NPC ids won't do ; however, since there can be only one NPC at a given location, some
                // basic "hash" of its coordinates makes for a unique id, as follow
                var cid = character.x + '_' + character.y;
                // this.player.dialoguesMemory keeps track of the last line (out of the multiple an NPC can say) that a given NPC has
                // said to the player; the following finds which one it is, and increment it to display the next one
                var lastline;
                if (this.player.dialoguesMemory.hasOwnProperty(cid)) {
                    // character.dialogue is an array of all the lines that an NPC can say. If the last line said is the last
                    // of the array, then assign -1, so that no line will be displayed at the next click (and then it will resume from the first line)
                    if (this.player.dialoguesMemory[cid] >= character.dialogue.length) this.player.dialoguesMemory[cid] = -1;
                } else {
                    // If the player has never talked to the NPC, start at the first line
                    this.player.dialoguesMemory[cid] = 0;
                }
                lastline = this.player.dialoguesMemory[cid]++; // assigns to lastline, then increment
                var action = {
                    action: 1, // talk
                    id: cid,
                    text: (lastline >= 0 ? character.dialogue[lastline] : ''), // if -1, don't display a bubble
                    character: character
                };
                this.player.prepareMovement(end, 2, action, 0, true); // true : send path to server
            };
        },

        handleChestClick: function (chest) { // Handles what happens when clicking on a chest
            if (this.handleClick()) {
                // chest is the sprite that was clicked
                var end = this.computeTileCoords(chest.x, chest.y);
                var action = {
                    action: 4, // chest
                    x: end.x,
                    y: end.y
                };
                this.player.prepareMovement(end, 0, action, 0, true); // true : send path to server
            }
        },

        handleLootClick: function (loot) { // Handles what happens when clicking on an item
            if (this.handleClick()) {
                // loot is the sprite that was clicked
                this.player.prepareMovement(this.computeTileCoords(loot.x, loot.y), 0, { action: 0 }, 0, true); // true : send path to server
            }
        },

        handleMapClick: function (layer, pointer) { // Handles what happens when clicking on an empty tile to move
            if (this.handleClick()) {
                // layer is the layer object that was clicked on, pointer is the mouse
                if (!this.marker.collide && this.view.contains(pointer.worldX, pointer.worldY)) { // To avoid trigger movement to collision cells or cells below the HUD
                    var end = this.computeTileCoords(this.marker.x, this.marker.y);
                    this.player.prepareMovement(end, 0, { action: 0 }, 0, true); // true : send path to server
                }
            }
        },

        handleMonsterClick: function (monster) { // Handles what happens when clicking on a monster
            if (this.handleClick()) {
                // monster is the sprite that was clicked on
                var end = this.computeTileCoords(monster.x, monster.y);
                var action = {
                    action: 3, // fight
                    id: monster.id
                };
                this.player.prepareMovement(end, 0, action, 0, true); // true : send path to server
            }
        },

        manageMoveTarget: function (x, y) {
            // The move target is the green animated square that appears where the player is walking to.
            // This function takes care of displaying it or hiding it.
            var targetX = x * this.map.tileWidth;
            var targetY = y * this.map.tileWidth;
            if (this.moveTarget) {
                this.moveTarget.visible = true;
                this.moveTarget.x = targetX;
                this.moveTarget.y = targetY;
            } else {
                this.moveTarget = this.markerGroup.add(this.add.sprite(targetX, targetY, 'atlas1'));
                this.moveTarget.animations.add('rotate', window.Phaser.Animation.generateFrameNames('target_', 0, 3), 15, true);
                this.moveTarget.animations.play('rotate');
            }
            this.marker.visible = false;
        },

        setHoverCursors: function (sprite, cursor) { // Sets the appearance of the mouse cursor when hovering a specific sprite
            // sprite is the sprite that to apply the hover to
            // cursor is the url of the image to use as a cursor
            sprite.inputEnabled = true;
            sprite.events.onInputOver.add(function () {
                this.canvas.style.cursor = cursor;
                this.marker.canSee = false; // Make the white position marker invisible
            }, this);
            sprite.events.onInputOut.add(function () {
                this.canvas.style.cursor = this.cursor;
                this.marker.canSee = true;
            }, this);
            sprite.events.onDestroy.add(function () { // otheriwse, if sprite is destroyed while the cursor is above it, it'll never fire onInputOut!
                this.canvas.style.cursor = this.cursor;
                this.marker.canSee = true;
            }, this);
        },

        resetHoverCursors: function (sprite) {
            // sprite is the sprite whose hover events have to be purged
            sprite.events.onInputOver.removeAll();
            sprite.events.onInputOut.removeAll();
        },

        // ===================
        // Speech bubbles and HP code (stuff that appears above players)

        makeHPtexts: function () { // Create a pool of HP texts to (re)use when needed during the this
            HPGroup = this.add.group();
            for (var b = 0; b < 60; b++) {
                this.HPGroup.add(this.add.text(0, 0, '', {
                    font: '20px pixel',
                    strokeThickness: 2
                }));
            }
            this.HPGroup.setAll('exists', false);
        },

        displayHP: function (txt, color, target, delay) { // Display hit points above a sprite
            // txt is the value to display
            // target is the sprite above which the hp should be displayed
            // delay is the amount of ms to wait before tweening the hp
            var hp = this.HPGroup.getFirstExists(false); // Get HP from a pool instead of creating a new object
            hp.text = txt;
            hp.fill = colorsDict[color].fill;
            hp.stroke = colorsDict[color].stroke;
            hp.lifespan = window.Phaser.Timer.SECOND * 2; // Disappears after 2sec
            hp.alpha = 1;
            hp.x = target.x + 10;
            hp.y = target.y - 30;
            var tween = this.add.tween(hp);
            tween.to({ y: hp.y - 25, alpha: 0 }, window.Phaser.Timer.SECOND * 2, null, false, delay);
            tween.start();
            hp.exists = true;
        },

        playerSays: function (id, txt) {
            // Display the chat messages received from the server above the players
            // txt is the string to display in the bubble
            var player = this.charactersPool[id];
            player.displayBubble(txt);
        },

        makeBubble: function () { // Create a speech bubble
            var bubble = this.add.sprite(0, 0);
            bubble.addChild(this.add.sprite(0, 0, 'bubble', 0)); // Top left corner
            bubble.addChild(this.add.tileSprite(this.speechBubbleCornerSize, 0, 0, this.speechBubbleCornerSize, 'bubble', 1)); // top side
            bubble.addChild(this.add.sprite(0, 0, 'bubble', 2)); // top right corner

            bubble.addChild(this.add.tileSprite(0, this.speechBubbleCornerSize, this.speechBubbleCornerSize, 0, 'bubble', 3)); // left side
            bubble.addChild(this.add.tileSprite(this.speechBubbleCornerSize, this.speechBubbleCornerSize, 0, 0, 'bubble', 4)); // center
            bubble.addChild(this.add.tileSprite(0, this.speechBubbleCornerSize, this.speechBubbleCornerSize, 0, 'bubble', 5)); // right side

            bubble.addChild(this.add.sprite(0, 0, 'bubble', 6)); // bottom left corner
            bubble.addChild(this.add.tileSprite(this.speechBubbleCornerSize, 0, 0, this.speechBubbleCornerSize, 'bubble', 7)); // bottom side
            bubble.addChild(this.add.sprite(0, 0, 'bubble', 8)); // bottom right corner
            bubble.addChild(this.add.sprite(0, 0, 'atlas1', 'tail')); // tail
            var txt = bubble.addChild(this.add.text(0, 0, '', {
                font: '14px pixel',
                fill: "#ffffff",
                stroke: "#000000",
                strokeThickness: 2
            }));
            txt.maxWidth = 200;
            txt.alpha = 1.5;
            return bubble;
        },

        // ================================
        // Main update code

        markerHasMoved: function () {
            return (this.previousMarkerPosition.x != this.markerPosition.x || this.previousMarkerPosition.y != this.markerPosition.y);
        },

        sortEntities: function () { // Sort the members of the "entities" group according to their y value, so that they overlap nicely
            this.entities.sort('y', window.Phaser.Group.SORT_ASCENDING);
        },
        update: function () { // Main update loop of the client
            if (!this.playerIsInitialized) return;
            var cell = this.computeTileCoords(this.input.activePointer.worldX, this.input.activePointer.worldY);
            this.markerPosition.x = cell.x * this.map.tileWidth;
            this.markerPosition.y = cell.y * this.map.tileWidth;

            if (this.chatInput.visible && !this.chatInput.focus) this.toggleChat(); // Trick to make the chat react to pressing "enter"

            if (this.player.hasMoved()) this.checkCameraBounds();

            if (this.markerHasMoved()) {
                this.computeView();
                this.marker.visible = (this.marker.canSee && this.view.contains(this.markerPosition.x, this.markerPosition.y));

                if (this.marker.visible) { // Check if the tile below the marker is collidable or not, and updae the marker accordingly
                    //var tiles = [];
                    var collide = false;
                    for (var l = 0; l < this.map.thisLayers.length; l++) {
                        var tile = this.map.getTile(cell.x, cell.y, this.map.thisLayers[l]);
                        if (tile) {
                            //tiles.push(tile.index);
                            var tileProperties = this.map.tileset.tileProperties[tile.index - this.map.tileset.gid];
                            if (tileProperties) {
                                if (tileProperties.hasOwnProperty('c')) {
                                    collide = true;
                                    break;
                                }
                            }
                        }
                    }
                    //console.log(tiles);

                    this.updateMarker(this.markerPosition.x, this.markerPosition.y, collide);
                    this.previousMarkerPosition.set(this.markerPosition.x, this.markerPosition.y);
                }
            }
        },

        // render: function () { // Use to display debug information, not used in production
        /*this.debug.cameraInfo(this.camera, 32, 32);
        this.entities.forEach(function(sprite){
            this.debug.spriteBounds(sprite);
        },this);
        this.debug.spriteBounds(this.player);
        this.debug.text(this.time.fps || '--', 2, 14, "#00ff00");*/
        // }
        //End of client file.
    }
}