import Client from '../client/client';
import Factory from '../client/factory';
import Player from '../client/player-client';
import Item from '../client/item-client';
import Monster from '../client/monster-client';
import Home from './home';
import NPC from '../client/npc';
import spaceMap from '../client/spaceMap';
var AOIutils = require('../client/AOIutils');

/*
 * Author: Jerome Renaux
 * E-mail: jerome.renaux@gmail.com
 */
export default function Game(game) {
    this.borderPadding = 10;// size of the gray border of the this.game window
    this.HUDheight = 32; // height of the HUD bar at the bottom (with life etc.)
    this.achievementsHolderWidth = 850;
    this.barY = 0; // y position of that very same bar
    this.nbGroundLayers = 4; // number of tilemap layers corresponding to "ground" elements (ground, grass, water, cliffs), vs high elements (trees, houses, ...)
    this.defaultOrientation = 4; // Face down by default
    this.playerSpeed = 120; // number of ms that the movement tween takes to cross one tile (the lower the faster)
    this.playerLife = 100; // Max health of a player
    this.cursor = 'url(/assets/sprites/hand.png), auto'; // image of the mouse cursor in normal circumstances
    this.talkCursor = 'url(/assets/sprites/talk.png), auto'; // image of the cursor when hovering NPC
    this.lootCursor = 'url(/assets/sprites/loot.png), auto'; // image of cursors when hovering loot
    this.fightCursor = 'url(/assets/sprites/sword.png), auto'; // image of cursor when hovering monster
    this.markerPosition = new window.Phaser.Point(); // current position of the square marker indicating the highlighted tile
    this.previousMarkerPosition = new window.Phaser.Point(); // previous position of that marker
    this.cameraFollowing = true; // is the camera centered on the player
    this.mapWideningY = 54; // y coordinate (in tiles) of the region of the map above which the bounds of the world are wider
    this.speechBubbleCornerSize = 5;// size of the sprite used to make the corners of the speech bubbles
    this.healthBarWidth = 179; // width of the sprite representing the life of the player
    this.nbConnected = 0; // number of players connected to the this.game
    this.playerIsInitialized = false; // has the client received data from the server and created the world?
    this.inDoor = false; // is the player currently in an indoors location
    this.HPdelay = 100; // Delay before displaying hit points
    this.maxChatLength = 300; // Max length of text to input in chat
    this.latency = 0; // Initial latency of the client; continuously updated by values from server
    this.charactersPool = {}; // Map of the players in the this.game, accessed by their player id
    this.clickDelay = window.Phaser.Timer.SECOND * 0.2; // minimum time between player mouse clicks
    this.clickEnabled = true; // bool used to check if the player has clicked faster than the click delay
}
// used to map the orientation of the player, stored as a number, to the actual name of the orientation
// (used to select the right animations to play, by name)

var orientationsDict = {
    1: 'left',
    2: 'up',
    3: 'right',
    4: 'down'
};
var game;
var myself;
var scenery;
var entities;
var map;
var db;
var HUD;
var HUDbuttons;
var view;
var itemsInfo;
var npcInfo;
var monstersInfo;
var itemsIDmap;
var monstersIDmap;
var borderPadding = 10;// size of the gray border of the this.game window
var HUDheight = 32; // height of the HUD bar at the bottom (with life etc.)
var achievementsHolderWidth = 850;
var barY = 0; // y position of that very same bar
var nbGroundLayers = 4; // number of tilemap layers corresponding to "ground" elements (ground, grass, water, cliffs), vs high elements (trees, houses, ...)
var defaultOrientation = 4; // Face down by default
var playerSpeed = 120; // number of ms that the movement tween takes to cross one tile (the lower the faster)
var playerLife = 100; // Max health of a player
var cursor = 'url(/assets/sprites/hand.png), auto'; // image of the mouse cursor in normal circumstances
var talkCursor = 'url(/assets/sprites/talk.png), auto'; // image of the cursor when hovering NPC
var lootCursor = 'url(/assets/sprites/loot.png), auto'; // image of cursors when hovering loot
var fightCursor = 'url(/assets/sprites/sword.png), auto'; // image of cursor when hovering monster
var markerPosition = new window.Phaser.Point(); // current position of the square marker indicating the highlighted tile
var previousMarkerPosition = new window.Phaser.Point(); // previous position of that marker
var cameraFollowing = true; // is the camera centered on the player
var mapWideningY = 54; // y coordinate (in tiles) of the region of the map above which the bounds of the world are wider
var speechBubbleCornerSize = 5;// size of the sprite used to make the corners of the speech bubbles
var healthBarWidth = 179; // width of the sprite representing the life of the player
var nbConnected = 0; // number of players connected to the this.game
var playerIsInitialized = false; // has the client received data from the server and created the world?
var inDoor = false; // is the player currently in an indoors location
var HPdelay = 100; // Delay before displaying hit points
var maxChatLength = 300; // Max length of text to input in chat
var latency = 0; // Initial latency of the client; continuously updated by values from server
var charactersPool = {}; // Map of the players in the this.game, accessed by their player id
var clickDelay = window.Phaser.Timer.SECOND * 0.2; // minimum time between player mouse clicks
var clickEnabled = true;

var cameraFocus;

var groundMapLayers;
var highMapLayers;
var nbConnectedText;
var markerGroup;

var playerFactory;
var monsterFactory;
var itemFactory;

var itemsTable;
var monstersTable;
var displayedPlayers;

var player;

var collisionArray;

Game.prototype.init = function () {
    // this.easystar = new EasyStar.js();
    this.game.canvas.style.cursor = this.cursor; // Sets the pointer to hand sprite
};

// Game.prototype.preload = function () {
//     this.game.load.tilemap('map', 'assets/maps/minimap_client.json', null, window.window.Phaser.Tilemap.TILED_JSON);
//     this.game.load.spritesheet('tileset', 'assets/tilesets/tilesheet.png', 32, 32);
//     this.game.load.atlasJSONHash('atlas4', 'assets/sprites/atlas4.png', 'assets/sprites/atlas4.json'); // Atlas of monsters
//     this.game.load.spritesheet('bubble', 'assets/sprites/bubble2.png', 5, 5); // tilesprite used to make speech bubbles
//     this.game.load.spritesheet('life', 'assets/sprites/lifelvl.png', 5, 18); // tilesprite used to make lifebar
//     this.game.load.audio('sounds', 'assets/audio/sounds.mp3', 'assets/audio/sounds.ogg'); // audio sprite of all sound effects
//     this.game.load.json('entities', 'assets/json/entities_client.json'); // Basically a list of the NPC, mapping their id to the key used in other JSON files
// };

// Makes a map mapping the numerical id's of elements of a collection to their names (their names being the keys used to fetch relevant data from JSON files)
Game.makeIDmap = function (collection, map) {
    Object.keys(collection).forEach(function (key) {
        var e = collection[key];
        map[e.id] = key;
    });
};

Game.prototype.create = function () {
    HUD = this.game.add.group(); // Group containing all objects involved in the HUD
    HUD.add(this.game.add.sprite(0, 0, 'atlas1', 'border')); // Adds the gray border of the this.game
    db = this.game.cache.getJSON('db');
    // this.displayLoadingScreen(); // Display the loading screen
    myself = this;

    // A few maps mapping the name of an element (a monster, npc, item...) to its properties
    // Put before other functions, which might need it
    itemsInfo = db.items;
    npcInfo = db.npc;
    monstersInfo = db.monsters;
    // this.findLocationAchievements(); // Scan the list of location-based achievements and store them somewhere

    // A few maps mapping numerical id's to string keys
    itemsIDmap = {};
    monstersIDmap = {};
    Game.makeIDmap(itemsInfo, itemsIDmap);
    Game.makeIDmap(monstersInfo, monstersIDmap);
    entities = myself.game.add.group(); // Group containing all the objects appearing on the map (npc, monster, items, players ...)
    scenery = myself.game.add.group(); // Group containing all the animated sprites generated from the map

    Game.displayMap(); // Reads the Tiled JSON to generate the map, manage layers, create collision array for the pathfinding and make a dictionary of teleports
    // Game.displayScenery(); // Finds all "scenery" tiles in the map and replace them by animated sprites
    // Game.displayNPC(); // Read the Tiled JSON and display the NPC

    Game.createMarker(); // Creates the marker following the pointer that highlight tiles
    Game.makeHPtexts(); // Creates a pool of text elements to use to display HP
    // this.addSounds(); // Add the sounds of the this.game to some global object

    // Factories used to fecth unused sprites before creating new ones (or creating new ones when no other available)
    playerFactory = new Factory(function (x, y, key) {
        return new Player(myself.game, x, y, key);
    });
    itemFactory = new Factory(function (game, x, y, key) {
        return new Item(myself.game, x, y, key);
    });
    monsterFactory = new Factory(function (game, x, y, key) {
        return new Monster(myself.game, x, y, key);
    });

    Client.requestData();
};

// Main update function; processes the global update packages received from the server
Game.updateWorld = function (data) { // data is the update package from the server
    var createdPlayers = [];
    if (data.newplayers) {
        for (var n = 0; n < data.newplayers.length; n+=1) {
            Game.createPlayer(data.newplayers[n]);
            createdPlayers.push(data.newplayers[n].id);
        }
        if (data.newplayers.length > 0) Game.sortEntities(); // Sort entitites according to y coordinate to make them render properly above each other
    }

    // Create new monsters and items and store them in the appropriate maps
    if (data.newitems) Game.populateTable(itemsTable, data.newitems, Game.createItem);
    if (data.newmonsters) {
        Game.populateTable(monstersTable, data.newmonsters, Game.createMonster);
        Game.sortEntities();
    }

    for (var n = 0; n < createdPlayers.length; n++) {
        player = charactersPool[createdPlayers[n]];
        if (player.inFight) {
            player.target = monstersTable[player.targetID]; // ultimately, target is object, not ID
            player.fight();
        }
    }

    if (data.disconnected) { // data.disconnected is an array of disconnected players
        for (var i = 0; i < data.disconnected.length; i++) {
            Game.removePlayer(charactersPool[data.disconnected[i]], true); // animate death
        }
    }

    // data.items, data.players and data.monsters are associative arrays mapping the id's of the entities
    // to small object indicating which properties need to be updated. The following code iterate over
    // these objects and call the relevant update functions.
    if (data.items) Game.traverseUpdateObject(data.items, itemsTable, this.updateItem);
    // "Status" updates ; used to update some properties that need to be set before taking any real action on the this.game objects
    if (data.players) Game.traverseUpdateObject(data.players, charactersPool, this.updatePlayerStatus);
    if (data.monsters) Game.traverseUpdateObject(data.monsters, monstersTable, this.updateMonsterStatus);
    // "Action" updates
    if (data.players) Game.traverseUpdateObject(data.players, charactersPool, this.updatePlayerAction);
    if (data.monsters) Game.traverseUpdateObject(data.monsters, monstersTable, this.updateMonsterAction);
};
// For each element in arr, call the callback on it and store the result in the map 'table'
Game.populateTable = function (table, arr, callback) {
    for (var i = 0; i < arr.length; i += 1) {
        var data = arr[i];
        // The callback receives the object received from the server as an argument, uses the relevant factory to create
        // the proper sprite, and returns that sprite
        var object = callback(data);
        object.id = data.id;
        table[data.id] = object;
    }
};
// For each element in obj, call callback on it
Game.traverseUpdateObject = function (obj, table, callback) {
    Object.keys(obj).forEach(function (key) {
        if (table[key]) callback(table[key], obj[key]);
    });
};

// CREATION CODE
// These functions are supposed to return a sprite, whether by creating one from scratch, recycling and old one or
// fetching the appropriate already existing one, based on the info in the 'data' packer from the server
Game.createMonster = function (data) { // data contains the data from the server on the new entity to create
    var monster = (monstersTable[data.id] ?
        monstersTable[data.id] :
        monsterFactory.next(data.x * map.tileWidth, data.y * map.tileHeight, 'atlas4')
    );
    monster.setUp(monstersIDmap[data.monster]);
    Game.updateMonsterStatus(monster, data);
    Game.updateMonsterAction(monster, data);
    return monster;
};

Game.createItem = function (data) { // data contains the data from the server on the new entity to create
    var item;
    if (itemsTable[data.id]) {
        item = itemsTable[data.id]
    } else {
        item = itemFactory.next(myself.game, data.x * map.tileWidth, data.y * map.tileHeight, 'atlas3');
        item.setUp(itemsIDmap[data.itemID], data.chest, data.inChest, data.visible, data.respawn, data.loot);
    }
    Game.updateItem(item, data);
    return item;
};

Game.createPlayer = function (data) { // data contains the data from the server on the new entity to create
var player;
    console.log(data)
    if (charactersPool[data.id]) {
        player = charactersPool[data.id];
    } else {
        player = Game.newPlayer(myself.game, data.x, data.y, data.id);
    }
    if (!data.alive) player.visible = false;
    Game.setUpPlayer(player, data);
    Game.updatePlayerStatus(player, data);
    Game.updatePlayerAction(player, data);
    Game.displayedPlayers.add(player.id);
};
Game.newPlayer = function (game, x, y, id) {
    player = playerFactory.next(myself.game, x * map.tileWidth, y * map.tileHeight, 'atlas3');
    player.orientation = defaultOrientation;
    player.id = id;
    entities.add(player);
    charactersPool[id] = player;
    Game.sortEntities();
    return player;
};

Game.setUpPlayer = function (player, data) { // data contains the data from the server on the new entity to create
    player.setName(data.name);
    player.speed = playerSpeed;
    player.orientation = defaultOrientation;
};

Game.fadeInTween = function (object) { // Fade-in effect used to spawn items and monsters
    object.alpha = 0;
    var tween = this.game.add.tween(object);
    tween.to({ alpha: 1 }, window.Phaser.Timer.SECOND / 2);
    tween.start();
};

// UPDATE CODE

Game.updatePlayerStatus = function (player, info) { // info contains the updated data from the server
    if (info.connected == false) {
        Game.removePlayer(player, true);
        return;
    }
    if (info.x && info.y) player.position.set(info.x * map.tileWidth, info.y * map.tileHeight);

    if (info.aoi) { // Update the id of the AOI that the player is in
        player.aoi = info.aoi;
        if (player.isPlayer) Game.updateDisplayList();
    }

    if (info.alive == false && player.alive == true) player.flagForDeath();
    if (info.weapon) Game.updateEquipment(player, info.weapon);
    if (info.armor) Game.updateEquipment(player, info.armor);
    // if (info.weapon || info.armor) player.idle(false); // If an equipment change has taken place, need to resume idling animation
    if (info.targetID !== undefined) player.target = (info.targetID ? monstersTable[info.targetID] : null);
};

Game.updateDisplayList = function () {
    // Whenever the player moves to a different AOI, for each player displayed in the this.game, check if it will still be
    // visible from the new AOI; if not, remove it
    if (!this.displayedPlayers) return;
    var adjacent = AOIutils.listAdjacentAOIs(this.player.aoi);
    this.displayedPlayers.forEach(function (pid) {
        var p = charactersPool[pid];
        // check if the AOI of player p is in the list of the AOI's adjacent to the main player
        if (p) if (adjacent.indexOf(p.aoi) == -1) Game.removePlayer(p, false); // false: don't animate death
    });
};

Game.updateEquipment = function (player, eqID) {
    var equipment = itemsIDmap[eqID];
    var itemInfo = itemsInfo[equipment];
    // if (itemInfo.type === 1) { // weapon
    //     player.equipWeapon(equipment);
    // } else if (itemInfo.type === 2) { // armor
    //     player.equipArmor(equipment);
    // }
};

Game.updatePlayerAction = function (player, info) { // info contains the updated data from the server
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
};

Game.updateMonsterStatus = function (monster, info) { // info contains the updated data from the server
    if (info.alive == false && monster.alive == true) {
        monster.flagForDeath();
        monster.delayedDeath(500);
        return;
    }
    if (info.x && info.y) monster.position.set(info.x * this.map.tileWidth, info.y * this.map.tileHeight);
    if (info.targetID !== undefined) monster.target = charactersPool[info.targetID];
};

Game.updateMonsterAction = function (monster, info) { // info contains the updated data from the server
    if (info.alive == false && monster.alive == true) {
        var hitter = charactersPool[info.lastHitter];
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
};

Game.updateItem = function (item, info) { // info contains the updated data from the server
    if (info.visible == false && item.alive == true) {
        item.remove();
    } else if (info.visible == true && item.alive == false) {
        item.respawn();
    }
    if (info.inChest == false && item.inChest == true) item.open();
};

Game.updateSelf = function (data) {
    // Whereas updateWorld processes the global updates from the server about entities in the world, updateSelf
    // processes updates specific to the player, visible only to him
    if (data.life !== undefined) {
        player.life = data.life;
        player.updateLife();
    }
    if (data.x != undefined && data.y != undefined) {
        if (!player.alive) player.respawn(); // A change of position is send via personal update package only in case of respawn, so respawn is called immediately
        player.position.set(data.x * map.tileWidth, data.y * map.tileHeight);
        Game.followPlayer();
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
                    player.displayHP(hp.hp, 0);
                }
            } else if (hp.target == true) { // The HP should appear above the target monster
                player.attackAndDisplay(-(hp.hp));
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
            var used = itemsInfo[itemsIDmap[data.used[i]]];
            if (used.msg) Game.messageIn(used.msg);
            if (!this.weaponAchievement || !this.armorAchievement) this.handleLootAchievement(data.used[i]);
        }
    }
    if (data.noPick) { // boolean indicating whether the player tried to pick an inferior item
        Game.messageIn('You already have better equipment!');
        this.sounds.play('noloot');
    }
};

Game.revivePlayer = function () { // Revive the player after clicking "revive"
    // Client.sendRevive();
    this.deathScroll.hideTween.start();
};

// INIT CODE

Game.setLatency = function (latency) {
    this.latency = latency;
};

Game.initWorld = function (data) { // Initialize the this.game world based on the server data
   
    AOIutils.nbAOIhorizontal = data.nbAOIhorizontal;
    AOIutils.lastAOIid = data.lastAOIid;
  

    Game.displayHero(data.player.x, data.player.y, data.player.id);

    Game.displayHUD(); // Displays HUD, and sets up life bar, chat bar, the HUD buttons and their behavior

    Game.setUpPlayer(player,data.player);
    Game.updatePlayerStatus(player,data.player);

    // Reorder the groups a little, so that all their elements render in the proper order
    Game.moveGroupTo(myself.game.world, groundMapLayers, 0);
    Game.moveGroupTo(myself.game.world, scenery, groundMapLayers.z);
    Game.moveGroupTo(myself.game.world, markerGroup, scenery.z); // z start at 1
    Game.moveGroupTo(myself.game.world, entities, markerGroup.z);
    Game.moveGroupTo(myself.game.world, highMapLayers, entities.z);
    Game.moveGroupTo(myself.game.world, HUD, highMapLayers.z);

    itemsTable = {};
    monstersTable = {};
    displayedPlayers = new Set();
    playerIsInitialized = true;

    // If the this.game loads while the window is out of focus, it may hang; disableVisibilityChange should be set to true
    // only once it's fully loaded
    // if (document.hasFocus()) {
    //     myself.game.stage.disableVisibilityChange = true; // Stay alive even if window loses focus
    // } else {
    //     myself.game.onResume.addOnce(function () {
    //         myself.game.stage.disableVisibilityChange = true;
    //     }, myself);
    // }
    // Check whether these three achievements have been fulfilled already (stored in localStorage)
    // this.weaponAchievement = Client.hasAchievement(0);
    // this.armorAchievement = Client.hasAchievement(4);
    // this.speakAchievement = Client.hasAchievement(3);

    Client.emptyQueue(); // Process the queue of packets from the server that had to wait while the client was initializing
    groundMapLayers.setAll('visible', true);
    highMapLayers.setAll('visible', true);
    scenery.setAll('visible',true);
    // Destroy loading screen
    // myself.loadingShade.destroy();
    // myself.loadingText.destroy();
    Game.messageIn((Game.isNewPlayer ? 'Welcome to window.PhaserQuest!' : 'Welcome back!'));

    if (Game.isNewPlayer) Game.toggleHelp();
};

Game.moveGroupTo = function (parent, group, endPos) {
    // parent is the window.Phaser Group that contains the group to move (default: world)
    // group is the window.Phaser Group to be moved
    // endPos is the position (integer) at which to move it
    // if endPos is some group's z value, the moved group will be right below (visually) that group
    // This manipulation is needed because the rendering order and visual overlap of the sprites depend of the order of their groups

    var startPos = 1 - 1;
    var diff = startPos - endPos;
    if (diff > 0) {
        for (diff; diff > 0; diff -= 1) {
            parent.moveDown(group);
        }
    } else if (diff < 0) {
        for (diff; diff < 0; diff += 1) {
            parent.moveUp(group);
        }
    }
};

Game.displayHero = function (x, y, id) {
    player = Game.newPlayer(myself.game, x, y, id);
    player.setIsPlayer(true);
    player.addChild(cameraFocus = myself.game.add.sprite(0, 16)); // trick to force camera offset
    Game.followPlayer();
};

// MOVE CODE

Game.moveCharacter = function (id, end, orientation, delta) { // Move character according to information from the server
    // end is a small object containing the x and y coordinates to move to
    // orientation, between 1 and 4, indicates the orientation the character should face at the end of the movement
    // delta is the latency of the player, to adjust the speed of the movements (movements go faster as the latency increase, to make sure they don't get increasingly out of sync)
    var character = charactersPool[id];
    character.prepareMovement(end, orientation, { action: 0 }, delta + this.latency, false); // false : don't send path to server
};
Game.moveMonster = function (id, path, delta) { // Move monster according to information from the server
    // path is an array of 2-tuples of coordinates, representing the path to follow
    // delta is the latency of the player, to adjust the speed of the movements (movements go faster as the latency increase, to make sure they don't get increasingly out of sync)
    var monster = this.monstersTable[id];
    if (monster) monster.prepareMovement(path, { action: 0 }, delta + this.latency);
};

// REMOVAL CODE

Game.removePlayer = function (player, animate) {
    // animate is a boolean to indicate if the death animation should be played or not (if the player to be removed is not visible on screen, it's useless to play the animation)
    if (!player) return;
    player.die(animate);
    delete charactersPool[player.id];
};

// ======================

// SCREENS CODE : Code about displaying screens of any kind

Game.prototype.makeAchievementsScroll = function () { // Create the screen displaying the achievements of the player
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
    var mask = this.game.add.graphics(0, 0);
    mask.fixedToCamera = true;
    mask.beginFill(0xffffff);
    mask.drawRect(this.achievementsBg.x + 40, this.achievementsBg.y + 40, this.achievementsHolderWidth - 100, 300);
    mask.endFill();
    var page = 0;
    // Create one "holder" per achievement, consisting in a background image, the name and the description
    this.achievementsBg.holders = [];
    for (var i = 0; i < this.nbAchievements; i++) {
        if (i > 0 && i % perPage == 0) page++;
        this.achievementsBg.holders.push(this.achievementsBg.addChild(this.game.add.sprite(40 + (page * this.achievementsHolderWidth), 50 + ((i % 4) * 62), 'atlas1', 'achievementholder')));
        this.achievementsBg.holders[i].addChild(this.game.add.text(75, 13, achievements[i].name, nameStyle));
        this.achievementsBg.holders[i].addChild(this.game.add.text(295, 15, achievements[i].desc, descStyle));
        this.achievementsBg.holders[i].mask = mask;
    }

    this.achievementsBg.leftArrow = this.achievementsBg.addChild(this.game.add.button(345, 315, 'atlas1', function () {
        this.changeAchievementsPage('left');
    }, this, 'arrows_2', 'arrows_2', 'arrows_4'));
    this.achievementsBg.rightArrow = this.achievementsBg.addChild(this.game.add.button(412, 315, 'atlas1', function () {
        this.changeAchievementsPage('right');
    }, this, 'arrows_3', 'arrows_3', 'arrows_5'));
    this.achievementsBg.leftArrow.input.useHandCursor = false;
    this.achievementsBg.rightArrow.input.useHandCursor = false;

    this.achievementsBg.completed = this.achievementsBg.addChild(this.game.add.text(645, 325, '', {
        font: '18px pixel',
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3
    }));
    this.updateAchievements();
    this.updateAchievementsArrows();
};

Game.prototype.makeDeathScroll = function () { // Make the screen that is displayed when player dies
    this.deathScroll = Home.makeScroll(); // Start from a generic scroll-like screen
    Home.setFadeTweens(this.deathScroll);
    var title = this.deathScroll.addChild(this.game.add.text(0, 125, 'You died...', {
        font: '30px pixel',
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3
    }));
    title.x = this.deathScroll.width / 2 - title.width / 2;
    var button = this.deathScroll.addChild(this.game.add.button(0, 210, 'atlas1', this.revivePlayer, this, 'revive_0', 'revive_0', 'revive_1'));
    button.x = this.deathScroll.width / 2;
    button.anchor.set(0.5, 0);
};

Game.makeFlatScroll = function (callback) { // Creates and empty, generic flat scroll screen, to be used for achievements and help
    // callback is the function to call when clicking on the close button (typically a toggle function, such as toggleHelp() )
    var scroll = myself.game.add.sprite(80, 32, 'atlas1', 'achievements');
    scroll.fixedToCamera = true;
    scroll.alpha = 0;
    scroll.visible = false;
    Home.setFadeTweens(scroll);
    var closeBtn = scroll.addChild(myself.game.add.button(scroll.width - 18, -14, 'atlas1', callback, this, 'close_1', 'close_0', 'close_2'));
    closeBtn.input.useHandCursor = false;
    return scroll;
};

Game.makeHelpScroll = function () { // Make the screen showing how to play instructions
    this.helpScroll = Game.makeFlatScroll(Game.toggleHelp);
    Home.makeTitle(this.helpScroll, 'How to play');
    var mouseY = 130;
    var enterY = 200;
    var charY = 270;
    var style = { font: '18px pixel' };
    var mouse = this.helpScroll.addChild(myself.game.add.sprite(55, mouseY, 'atlas1', 'mouse'));
    mouse.anchor.set(0.5);
    this.helpScroll.addChild(myself.game.add.text(100, mouseY - 10, this.db.texts.help_move, style));
    var enter = this.helpScroll.addChild(myself.game.add.sprite(55, enterY, 'atlas1', 'enter'));
    enter.anchor.set(0.5);
    this.helpScroll.addChild(myself.game.add.text(100, enterY - 12, this.db.texts.help_chat, style));
    var char = this.helpScroll.addChild(myself.game.add.sprite(55, charY, 'atlas3', 'clotharmor_31'));
    char.anchor.set(0.5);
    this.helpScroll.addChild(myself.game.add.text(100, charY - 10, this.db.texts.help_save, style));
};

// Create the screen used to prompt the player to change the orientation of their device
Game.prototype.makeOrientationScreen = function () {
    this.orientationContainer = this.game.add.sprite(0, 0); // Create a container sprite
    // Make black screen to cover the scene
    this.orientationShade = this.orientationContainer.addChild(this.game.add.graphics(0, 0));
    this.orientationShade.beginFill(0x000000, 1);
    this.orientationShade.drawRect(0, 0, this.game.width, this.game.height);
    this.orientationShade.endFill();
    this.deviceImage = this.orientationContainer.addChild(this.game.add.sprite(this.game.width / 2, this.game.height / 2, 'atlas1', 'device'));
    this.deviceImage.anchor.set(0.5);
    this.rotateText = this.orientationContainer.addChild(this.game.add.text(0, 0, this.db.texts.orient, {
        font: '40px pixel',
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3
    }));
    this.rotateText.x = this.game.width / 2 - this.rotateText.width / 2;
    this.rotateText.y = this.deviceImage.y + this.deviceImage.height + 20;
    this.rotateText.style.wordWrap = true;
    this.rotateText.style.wordWrapWidth = 400;
    this.orientationContainer.fixedToCamera = true;
    this.orientationContainer.visible = false;
};

Game.prototype.displayDeathScroll = function () { // Displayed when player dies
    if (!this.deathScroll) this.makeDeathScroll();
    this.deathScroll.visible = true;
    this.deathScroll.showTween.start();
};

// Display an error message if the user id in localStorage has no match in the database;
// called when receiving the error notification from the server
Game.prototype.displayError = function () {
    this.loadingText.text = this.db.texts.db_error;
    this.loadingText.x = this.game.width / 2 - this.loadingText.width / 2;
    this.loadingText.y = this.game.height / 2 - this.loadingText.height / 2;
};

// Display the loading screen when the this.game starts, after clicking "play"
Game.prototype.displayLoadingScreen = function () {
    // Cover the screen with a black rectangle
    this.loadingShade = this.game.add.graphics(0, 0);
    this.loadingShade.beginFill(0x000000, 1);
    this.loadingShade.drawRect(this.borderPadding, this.borderPadding, this.game.stage.width - (this.borderPadding * 2), this.game.stage.height - (this.borderPadding * 2));
    this.loadingShade.endFill();
    // Add some loading text (whos value is in this.db.texts) and center it
    this.loadingText = this.game.add.text(0, 0, this.db.texts.create, {
        font: '18px pixel',
        fill: "#ffffff", // f4d442
        stroke: "#000000",
        strokeThickness: 3
    });
    this.loadingText.x = this.game.width / 2 - this.loadingText.width / 2;
    this.loadingText.y = this.game.height / 2 - this.loadingText.height / 2;
    this.loadingText.style.wordWrap = true;
    this.loadingText.style.wordWrapWidth = 400;
};

// Displays the screen used to prompt the player to change the orientation of his device;
// called by the enterIncorrectOrientation callback
Game.prototype.displayOrientationScreen = function () {
    if (!this.orientationContainer) this.makeOrientationScreen(); // Make the screen if it doesn't exist yet (it's not made until necessary)
    // Hide the help and achievements screens if they are visible
    if (this.helpScroll && this.helpScroll.visible) Game.toggleHelp();
    if (this.achievementsBg && this.achievementsBg.visible) this.toggleAchievements();
    this.orientationContainer.visible = true;
};

// Hide the screen used to prompt the player to change the orientation of his device;
// called by the leaveIncorrectOrientation callback
Game.prototype.removeOrientationScreen = function () {
    this.orientationContainer.visible = false;
};

Game.toggleHelp = function () { // Toggles the visibility state of the help screen
    // if (!this.helpScroll) Game.makeHelpScroll();
    // if (this.helpScroll.visible) {
    //     this.helpButton.freezeFrames = false;
    //     this.helpButton.setFrames('helpicon_1', 'helpicon_0', 'helpicon_2');
    //     this.helpScroll.hideTween.start();
    // } else {
    //     this.helpScroll.visible = true;
    //     this.helpButton.freezeFrames = true;
    //     this.helpScroll.showTween.start();
    // }
};

Game.prototype.toggleAchievements = function () { // Toggles the visibility state of the achievements screen
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
};

// Game.prototype.updateAchievements = function () {
//     // Check each achievement holder and, if the corresponding achievement has been acquired, update the content accordingly
//     if (!this.achievementsBg) this.makeAchievementsScroll();
//     var achievements = this.db.achievements;
//     var completed = 0;
//     for (var i = 0; i < this.nbAchievements; i++) {
//         // var owned = Client.hasAchievement(i);
//         if (owned) completed++;
//         if (owned) {
//             this.achievementsBg.holders[i].addChild(this.game.add.sprite(0, 0, 'atlas1', 'tokens_' + achievements[i].token));
//             this.achievementsBg.holders[i].getChildAt(0).addColor("#f4d442", 0);
//         }
//     }
//     this.achievementsBg.completed.text = 'Completed ' + completed + '/' + this.nbAchievements;
// };

// Game.prototype.changeAchievementsPage = function (dir) {
//     // dir is a string that indicates if the right or left arrow was clicked
//     if (dir == 'right' && this.currentAchievementsPage == this.maxAchievementsPage) return;
//     if (dir == 'left' && this.currentAchievementsPage == this.minAchievementsPage) return;
//     var sign = (dir == 'right' ? -1 : 1);
//     for (var i = 0; i < this.achievementsBg.holders.length; i++) {
//         var holder = this.achievementsBg.holders[i];
//         var tween = this.game.add.tween(holder);
//         tween.to({ x: holder.x + (sign * this.achievementsHolderWidth) }, window.Phaser.Timer.SECOND * 0.4);
//         tween.start();
//     }
//     this.currentAchievementsPage += -1 * sign;
//     this.updateAchievementsArrows();
// };

// Game.prototype.updateAchievementsArrows = function () {
//     if (this.currentAchievementsPage == this.maxAchievementsPage) {
//         this.achievementsBg.rightArrow.setFrames('arrows_1', 'arrows_1', 'arrows_1');
//     } else {
//         this.achievementsBg.rightArrow.setFrames('arrows_3', 'arrows_3', 'arrows_5');
//     }
//     if (this.currentAchievementsPage == this.minAchievementsPage) {
//         this.achievementsBg.leftArrow.setFrames('arrows_0', 'arrows_0', 'arrows_0');
//     } else {
//         this.achievementsBg.leftArrow.setFrames('arrows_2', 'arrows_2', 'arrows_4');
//     }
// };

// // ==============

// // ACHIEVEMENTS CODE : Code about handling achievements

// Game.prototype.handleLootAchievement = function (id) { // item id
//     var item = this.itemsInfo[this.itemsIDmap[id]];
//     if (item.type !== undefined) {
//         if (item.type == 1 && !this.weaponAchievement) {
//             this.getAchievement(0);
//             this.weaponAchievement = true;
//         } else if (item.type == 2 && !this.armorAchievement) {
//             this.getAchievement(4);
//             this.armorAchievement = true;
//         }
//     }
// };

// Game.prototype.handleSpeakAchievement = function () {
//     this.getAchievement(3);
//     this.speakAchievement = true;
// };

// Game.prototype.handleKillAchievement = function (id) { // monster id
//     var nbKilled = localStorage.getItem('killed_' + id);
//     if (nbKilled === undefined) nbKilled = 0;
//     nbKilled++;
//     localStorage.setItem('killed_' + id, nbKilled);
//     var aid = this.monstersInfo[this.monstersIDmap[id]].achievement;
//     if (this.db.achievements[aid] && nbKilled >= this.db.achievements[aid].nb && !Client.hasAchievement(aid)) this.getAchievement(aid);
// };

// Game.prototype.handleLocationAchievements = function () {
//     if (this.inDoor || !this.locationAchievements.length) return;
//     var pos = this.computeTileCoords(this.player.x, this.player.y);
//     for (var i = this.locationAchievements.length - 1; i >= 0; i--) {
//         var area = this.locationAchievements[i];
//         if ((area.criterion == "in" && area.contains(pos.x, pos.y)) || (area.criterion == "out" && !area.contains(pos.x, pos.y))) {
//             this.getAchievement(area.achID);
//             this.locationAchievements.splice(i, 1);
//         }
//     }
// };

// Game.prototype.getAchievement = function (id) { // achievement id
//     Client.setAchievement(id);
//     this.sounds.play('achievement');
//     this.achButton.blink = false;
//     if (!this.achTween.isRunning) this.achTween.start();
//     if (this.achTween.isPaused) this.achTween.resume();
//     this.achBar.visible = true;
//     this.achBar.upTween.start();
//     this.achBar.achName.text = this.db.achievements[id].name;
//     this.achBar.achName.x = Math.floor((this.achBar.width / 2) - (this.achBar.achName.width / 2));
//     this.updateAchievements();
// };

// Game.prototype.findLocationAchievements = function () {
//     this.locationAchievements = [];
//     Object.keys(this.db.achievements).forEach(function (achID) {
//         if (Client.hasAchievement(achID)) return;
//         var ach = this.db.achievements[achID];
//         if (ach.locationAchievement) {
//             var area = new window.Phaser.Rectangle(ach.rect.x, ach.rect.y, ach.rect.w, ach.rect.h);
//             area.criterion = ach.criterion;
//             area.achID = achID;
//             this.locationAchievements.push(area);
//         }
//     });
// };

// =======================
// POS CODE : Code for position and camera-related computations

// Determines if two entities (a and b) are on the same cell (returns -1), on adjacent (non-diagonal) cells (returns a value between
// 1 and 4 corresponding to the orientation of a with respect to b) or further apart (returns 0)
Game.adjacent = function (a, b) {
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
};

// Fetches the first element from the space map at the proived coordinates
Game.prototype.detectElement = function (map, x, y) {
    // map is the spaceMap in which to look
    var cell = this.computeTileCoords(x, y);
    return map.getFirst(cell.x, cell.y);
};

// Compute the orientation that the player must have to go to the last cell of its path (used when the last cell is occupied by something and the past has to be "shortened" by one cell)
Game.computeFinalOrientation = function (path) { // path is a list of cells
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
};

// Convert pixel coordinates into tiles coordinates (e.g. 96, 32 becomes 3, 1)
Game.computeTileCoords = function (x, y) {
    var layer = map.gameLayers[0];
    return new window.Phaser.Point(layer.getTileX(x), layer.getTileY(y));
};

// Returns the rectangle corresponding to the view of the camera (not counting HUD, the actual view of the world)
Game.computeView = function () {
    view = new window.Phaser.Rectangle(myself.game.camera.x + borderPadding, myself.game.camera.y + borderPadding,
        myself.game.camera.width - borderPadding * 2, myself.game.camera.height - borderPadding * 2 - HUDheight);
};

Game.checkCameraBounds = function () {
    // Due to the shape of the map, the bounds of the camera cannot always be the same; north of some Y coordinate (this.mapWideningY),
    // the width of the bounds has to increase, from 92 to 113.
    var pos = this.computeTileCoords(this.player.x, this.player.y);
    if (this.cameraFollowing && pos.y <= this.mapWideningY && this.game.camera.bounds.width == 92 * this.map.tileWidth) {
        this.tweenCameraBounds(113);
    } else if (this.cameraFollowing && pos.y > this.mapWideningY && this.game.camera.bounds.width == 113 * this.map.tileWidth) {
        this.tweenCameraBounds(92);
    }
};

Game.prototype.tweenCameraBounds = function (width) {
    // width is the width in pixels of the camera bounds that should be tweened to
    var tween = this.game.add.tween(this.camera.bounds);
    tween.to({ width: width * this.map.tileWidth }, 1500, null, false, 0);
    tween.start();
};

Game.followPlayer = function () { // Make the camera follow the player, within the appropriate bounds
    inDoor = false;
    // Rectangle to which the camera is bound, cannot move outside it
    var width = (player.x >= 92 ? 113 : 92);
    myself.game.camera.bounds = new window.Phaser.Rectangle(map.tileWidth - borderPadding, map.tileWidth - borderPadding, width * map.tileWidth, 311 * map.tileWidth);
    myself.game.camera.follow(cameraFocus);
    cameraFollowing = true;
};

Game.followPlayerIndoors = function (x, y, mx, my) { // Follow player but with extra constraints due to being indoors
    // x and y are the coordinates in tiles of the top left corner of the rectangle in which the camera can move
    // mx and my are the coordinates in tiles of the bottom right corner of that same rectangle
    inDoor = true;
    myself.game.camera.follow(cameraFocus);
    if (x && y && mx && my) {
        var w = Math.max((mx - x) * this.map.tileWidth, this.game.width);
        var h = (my - y) * this.map.tileHeight;
        this.game.camera.bounds = new window.Phaser.Rectangle(x * this.map.tileWidth, y * this.map.tileHeight, w, h);
    } else {
        this.game.camera.bounds = new window.Phaser.Rectangle(this.map.tileWidth - this.borderPadding, this.map.tileWidth - this.borderPadding, 170 * this.map.tileWidth, 311 * this.map.tileWidth);
    }
    this.cameraFollowing = true;
};

Game.unfollowPlayer = function () { // Make the camera stop following player, typically because he is in a small indoors area
    inDoor = true;
    myself.game.camera.unfollow();
    myself.game.camera.bounds = null;
    cameraFollowing = false;
};

// =============
// Sounds-related code

Game.prototype.addSounds = function () {
    // Slices the audio sprite based on the markers positions fetched from the JSON
    var markers = this.db.sounds;
    this.sounds = this.game.add.audio('sounds');
    this.sounds.allowMultiple = true;
    Object.keys(markers.spritemap).forEach(function (sound) {
        var sfx = markers.spritemap[sound];
        this.sounds.addMarker(sound, sfx.start, sfx.end - sfx.start);
    });
};

//===================
// Animations-related code

// Sets up basic, single-orientation animations for scenic animated sprites
Game.basicAnimation = function (sprite) { // sprite is the sprite to which the animation should be applied
    var frames = [];
    for (var m = 0; m < sprite.nbFrames; m+=1) { // Generate the list of frames of the animations based on the initial frame and the total number of frames
        frames.push(sprite.frame + m);
    }
    sprite.animations.add('idle', frames, sprite.rate, true);
    sprite.animations.play('idle');
};

// Same but using atlas frames
Game.basicAtlasAnimation = function (sprite) { // sprite is the sprite to which the animation should be applied
    // sprite, nbFrames, ... are absorbed from npc.json when a new NPC() is created
    sprite.animations.add('idle', window.Phaser.Animation.generateFrameNames(sprite.atlasKey + '_', 0, 0 + sprite.nbFrames - 1), sprite.rate, true);
    sprite.animations.play('idle');
};

//======================
// HUD CODE: HUD-related code

Game.displayHUD = function () {
    var lifeX = borderPadding;
    var lifeY = myself.game.height - borderPadding - HUDheight + 6;
    barY = myself.game.height - borderPadding - HUDheight;

    HUDbuttons = myself.game.add.group();

    // this.displayChatBar();
    // this.displayAchievementDock();

    HUD.add(myself.game.add.sprite(borderPadding, barY, 'atlas1', 'bar'));
    HUD.add(this.weaponIcon = myself.game.add.sprite(borderPadding + 210, barY, 'atlas3'));
    HUD.add(this.armorIcon = myself.game.add.sprite(borderPadding + 244, barY + 3, 'atlas3'));

    this.HUDmessage = null;
    this.messages = myself.game.add.group();
    for (var m = 0; m < 4; m++) {
        this.messages.add(myself.game.add.text(490, barY + 5, '', {
            font: '16px pixel',
            fill: "#eeeeee"
        }));
    }
    this.messages.setAll('fixedToCamera', true);
    this.messages.setAll("anchor.x", 0.5);
    this.messages.setAll("exists", false);

    nbConnectedText = HUD.add(myself.game.add.text(745, barY + 8, '0 players', {
        font: '16px pixel',
        fill: "#eeeeee"
    }));

    this.chatButton = HUDbuttons.add(myself.game.add.button(850, barY + 2, 'atlas1', this.toggleChat, this, 'talkicon_1', 'talkicon_0', 'talkicon_2'));
    this.achButton = HUDbuttons.add(myself.game.add.button(880, barY + 2, 'atlas1', this.toggleAchievements, this, 'achievementicon_1', 'achievementicon_0', 'achievementicon_2'));
    this.helpButton = HUDbuttons.add(myself.game.add.button(910, barY + 2, 'atlas1', this.toggleHelp, this, 'helpicon_1', 'helpicon_0', 'helpicon_2'));
    HUDbuttons.add(myself.game.add.button(940, barY + 2, 'atlas1', function (_btn) {
        if (!myself.game.sound.mute) {
            _btn.setFrames('soundicon_1', 'soundicon_0', 'soundicon_1');
        } else if (myself.game.sound.mute) {
            _btn.setFrames('soundicon_2', 'soundicon_2', 'soundicon_2');
        }
        myself.game.sound.mute = !myself.game.sound.mute;
    }, myself, 'soundicon_2', 'soundicon_2', 'soundicon_2'));

    // Set up the blinking tween that triggers when a new achievement is unlocked
    this.achTween = myself.game.add.tween(this.achButton);
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

    Game.createLifeBar(lifeX, lifeY);
    HUD.add(this.health);
    HUD.add(myself.game.add.sprite(lifeX, lifeY, 'atlas1', 'life'));
    HUD.add(HUDbuttons);
    HUD.setAll('fixedToCamera', true);
    HUDbuttons.forEach(function (button) {
        button.input.useHandCursor = false;
    });

    // var chatKey = myself.game.input.keyboard.addKey(window.Phaser.Keyboard.ENTER);
    // chatKey.onDown.add(this.toggleChat, this);
};

// Game.prototype.displayChatBar = function () {
//     this.chatBar = this.HUD.add(window.game.add.sprite(96, this.barY + 1, 'atlas1', 'chatbar'));
//     this.chatBar.visible = false;
//     this.chatBar.upTween = window.game.add.tween(this.chatBar.cameraOffset);
//     this.chatBar.downTween = window.game.add.tween(this.chatBar.cameraOffset);
//     this.chatBar.upTween.to({ y: this.barY - 30 }, window.Phaser.Timer.SECOND / 5);
//     this.chatBar.downTween.to({ y: this.barY + 1 }, window.Phaser.Timer.SECOND / 5);
//     this.chatBar.downTween.onComplete.add(function () {
//         this.chatBar.visible = false;
//     }, this);
//     this.chatBar.upTween.onComplete.add(function () {
//         this.chatInput.focusOutOnEnter = true;
//     }, this);
//     this.chatInput = this.HUD.add(window.game.add.inputField(115, this.barY - 20, {
//         width: 750,
//         height: 18,
//         fillAlpha: 0,
//         cursorColor: '#fff',
//         fill: '#fff',
//         font: '14px pixel',
//         max: this.maxChatLength
//     }));
//     this.chatInput.visible = false;
//     this.chatInput.focusOutOnEnter = false;
//     this.chatInput.input.useHandCursor = false;
// };

// Game.prototype.displayAchievementDock = function () {
//     this.achBar = this.HUD.add(this.game.add.sprite(274, this.barY + 1, 'atlas1', 'newach'));
//     this.achBar.visible = false;
//     this.achBar.upTween = this.game.add.tween(this.achBar.cameraOffset);
//     this.achBar.downTween = this.game.add.tween(this.achBar.cameraOffset);
//     this.achBar.upTween.to({ y: this.barY - 68 }, window.Phaser.Timer.SECOND / 5);
//     this.achBar.downTween.to({ y: this.barY + 1 }, window.Phaser.Timer.SECOND / 5, null, false, window.Phaser.Timer.SECOND * 5);
//     this.achBar.downTween.onComplete.add(function () {
//         this.achBar.visible = false;
//     }, this);
//     this.achBar.upTween.onComplete.add(function () {
//         this.achBar.downTween.start();
//     }, this);
//     this.achBar.addChild(this.game.add.sprite(192, -35, 'atlas1', 'tokens_0'));
//     var sparks = this.achBar.addChild(this.game.add.sprite(192, -35, 'atlas1', 'achsparks_0'));
//     var frames = window.Phaser.Animation.generateFrameNames('achsparks_', 0, 5);
//     sparks.animations.add('glitter', frames, 7, true);
//     sparks.play('glitter');
//     var titleStyle = {
//         font: '14px pixel',
//         fill: "#f4d442",
//         stroke: "#000000",
//         strokeThickness: 3
//     };
//     var nameStyle = {
//         font: '16px pixel',
//         fill: "#ffffff", // f4d442
//         stroke: "#000000",
//         strokeThickness: 3
//     };
//     this.achBar.addChild(this.game.add.text(133, 20, 'New Achievement Unlocked!', titleStyle));
//     this.achBar.achName = this.achBar.addChild(this.game.add.text(133, 40, 'A true Warrior!', nameStyle));
// };

Game.computeLifeBarWidth = function () {
    // Based on the amount of life the player has, compute how many pixels wide the health bar should be
    // return Math.max(this.healthBarWidth * (this.player.life / this.player.maxLife), 1);
    return Math.max(healthBarWidth * (1), 1);
};

Game.createLifeBar = function (lifeX, lifeY) {
    // lifeX and lifeY are the coordinates in pixels where the life bar should be displayed at on the screen
    var width = Game.computeLifeBarWidth();
    this.health = myself.game.add.sprite(lifeX + 20, lifeY + 4);
    this.health.addChild(myself.game.add.tileSprite(0, 0, width, 18, 'life', 0));
    this.health.addChild(myself.game.add.sprite(width, 0, 'life', 1));
};

Game.createMarker = function () { // Creates the white marker that follows the pointer
    markerGroup = myself.game.add.group();
    this.marker = markerGroup.add(myself.game.add.sprite(0, 0, 'atlas1'));
    this.marker.alpha = 0.5;
    this.marker.canSee = true;
    this.marker.collide = false;
    myself.game.canvas.style.cursor = this.cursor;
};

Game.updateMarker = function (x, y, collide) { // Makes the marker white or red depending on whether the underlying tile is collidable
    // collide is the boolean indicating if the tile is a collision tile or not
    this.marker.position.set(x, y);
    this.marker.frameName = (collide ? 'marker_1' : 'marker_0');
    this.marker.collide = collide;
};

Game.messageIn = function (txt) { // Slide a message in the message area of the HUD
    // txt is the string to display in the message area
    var msg = this.messages.getFirstExists(false);
    msg.exists = true;
    msg.alpha = 0;
    msg.text = txt;
    msg.cameraOffset.y = this.barY + 20;
    var yTween = myself.game.add.tween(msg.cameraOffset);
    var alphaTween = myself.game.add.tween(msg);
    yTween.to({ y: barY + 8 }, window.Phaser.Timer.SECOND / 5);
    alphaTween.to({ alpha: 1 }, window.Phaser.Timer.SECOND / 5);
    yTween.start();
    alphaTween.start();
    if (this.HUDmessage) Game.messageOut(this.HUDmessage);
    this.HUDmessage = msg;
    var outTween = myself.game.add.tween(msg);
    outTween.to({}, window.Phaser.Timer.SECOND * 3);
    outTween.onComplete.add(this.messageOut, this);
    outTween.start();
};

Game.messageOut = function (msg) { // Slide a message in the message area of the HUD
    // msg is the text object to move out
    var yTween = myself.game.add.tween(msg.cameraOffset);
    var alphaTween = myself.game.add.tween(msg);
    yTween.to({ y: barY }, window.Phaser.Timer.SECOND / 5);
    alphaTween.to({ alpha: 0 }, window.Phaser.Timer.SECOND / 5);
    yTween.start();
    alphaTween.start();
    alphaTween.onComplete.add(function (txt) {
        txt.exists = false;
    }, this);
    this.HUDmessage = null;
};

Game.toggleChat = function () { // Toggles the visibility of the chat bar
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
            // Client.sendChat(txt);
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
};

Game.updateNbConnected = function (nb) {
    if (!nbConnectedText) return;
    nbConnected = nb;
    nbConnectedText.text = nbConnected + ' player' + (nbConnected > 1 ? 's' : '');
};

// ===========================
// MAP CODE : Map & NPC-related code

Game.displayMap = function () {
    groundMapLayers = myself.game.add.group();
    highMapLayers = myself.game.add.group();
    map = myself.game.add.tilemap('map');
    map.addTilesetImage('tilesheet', 'tileset');
    map.gameLayers = [];
    for (var i = 0; i < map.layers.length; i += 1) {
        var group = (i <= nbGroundLayers - 1 ? groundMapLayers : highMapLayers);
        map.gameLayers[i] = map.createLayer(map.layers[i].name, 0, 0, group);
        map.gameLayers[i].visible = false; // Make map invisible before the this.game has fully loaded
    }
    map.gameLayers[0].inputEnabled = true; // Allows clicking on the map
    map.gameLayers[0].events.onInputUp.add(Game.handleMapClick, this);
    Game.createDoorsMap(); // Create the associative array mapping coordinates to doors/teleports

    //this.game.world.resize(this.map.widthInPixels,this.map.heightInPixels);
    myself.game.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    map.tileset = {
        gid: 1,
        tileProperties: map.tilesets[0].tileProperties
    };

    Game.createCollisionArray();
};

Game.createCollisionArray = function () {
    // Create the grid used for pathfinding ; it consists in a 2D array of 0's and 1's, 1's indicating collisions

    collisionArray = [];
    for (var y = 0; y < map.height; y+=1) {
        var col = [];
        for (var x = 0; x < map.width; x+=1) {
            var collide = false;
            for (var l = 0; l < map.gameLayers.length; l+=1) {
                var tile = map.getTile(x, y, map.gameLayers[l]);
                if (tile) {
                    // The original BrowserQuest Tiled file doesn't use a collision layer; rather, properties are added to the
                    // tileset to indicate which tiles causes collisions or not. Which is why we have to check in the tileProperties
                    // if a given tile has the property "c" or not (= collision)
                    var tileProperties = map.tileset.tileProperties[tile.index - map.tileset.gid];
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
        collisionArray.push(col);
    }

    // this.easystar.setGrid(this.collisionArray);
    // this.easystar.setAcceptableTiles([0]);
};

Game.createDoorsMap = function () { // Create the associative array mapping coordinates to doors/teleports

    this.doors = new spaceMap();
    for (var d = 0; d < map.objects.doors.length; d++) {
        var door = map.objects.doors[d];
        var position = Game.computeTileCoords(door.x, door.y);
        this.doors.add(position.x, position.y, {
            to: new window.Phaser.Point(door.properties.x * map.tileWidth, door.properties.y * map.tileWidth), // Where does the door teleports to
            camera: (door.properties.hasOwnProperty('cx') ? new window.Phaser.Point(door.properties.cx * map.tileWidth, door.properties.cy * map.tileWidth) : null), // If set, will lock the camera at these coordinates (use for indoors locations)
            orientation: door.properties.o, // What should be the orientation of the player after teleport
            follow: door.properties.hasOwnProperty('follow'), // Should the camera keep following the player, even if indoors (automatically yes if outdoors)
            // Below are the camera bounds in case of indoors following
            min_cx: door.properties.min_cx,
            min_cy: door.properties.min_cy,
            max_cx: door.properties.max_cx,
            max_cy: door.properties.max_cy
        });
    }
};

Game.displayScenery = function () {
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
};

Game.displayNPC = function () {
    var entities = myself.game.cache.getJSON('entities'); // mapping from object IDs to sprites, the sprites being keys for the appropriate json file
    for (var e = 0; e < map.objects.entities.length; e += 1) {
        var object = map.objects.entities[e];
        if (!entities.hasOwnProperty(object.gid - 1961)) continue; // 1961 is the starting ID of the npc tiles in the map ; this follows from how the map was made in the original BrowserQuest
        var entityInfo = entities[object.gid - 1961];
        if (entityInfo.npc) this.basicAtlasAnimation(entities.add(new NPC(myself.game,object.x, object.y, entityInfo.sprite)));
    }
};

// ===========================
// Mouse and click-related code

Game.enableClick = function () {
    this.clickEnabled = true;
};

Game.disableClick = function () {
    this.clickEnabled = false;
};

Game.handleClick = function () {
    // If click is enabled, return true to the calling function to allow player to click,
    // then disable any clicking for time clickDelay
    if (this.clickEnabled) {
        // re-enable the click after time clickDelay has passed
        this.game.time.events.add(this.clickDelay, this.enableClick, this);
        this.disableClick();
        return true;
    }
    return false;
};

Game.handleCharClick = function (character) { // Handles what happens when clicking on an NPC
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
};

Game.handleChestClick = function (chest) { // Handles what happens when clicking on a chest
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
};

Game.handleLootClick = function (loot) { // Handles what happens when clicking on an item
    if (this.handleClick()) {
        // loot is the sprite that was clicked
        this.player.prepareMovement(this.computeTileCoords(loot.x, loot.y), 0, { action: 0 }, 0, true); // true : send path to server
    }
};

Game.handleMapClick = function (layer, pointer) { // Handles what happens when clicking on an empty tile to move
    if (this.handleClick()) {
        // layer is the layer object that was clicked on, pointer is the mouse
        if (!this.marker.collide && this.view.contains(pointer.worldX, pointer.worldY)) { // To avoid trigger movement to collision cells or cells below the HUD
            var end = this.computeTileCoords(this.marker.x, this.marker.y);
            this.player.prepareMovement(end, 0, { action: 0 }, 0, true); // true : send path to server
        }
    }
};

Game.handleMonsterClick = function (monster) { // Handles what happens when clicking on a monster
    if (this.handleClick()) {
        // monster is the sprite that was clicked on
        var end = this.computeTileCoords(monster.x, monster.y);
        var action = {
            action: 3, // fight
            id: monster.id
        };
        this.player.prepareMovement(end, 0, action, 0, true); // true : send path to server
    }
};

Game.manageMoveTarget = function (x, y) {
    // The move target is the green animated square that appears where the player is walking to.
    // This function takes care of displaying it or hiding it.
    var targetX = x * this.map.tileWidth;
    var targetY = y * this.map.tileWidth;
    if (this.moveTarget) {
        this.moveTarget.visible = true;
        this.moveTarget.x = targetX;
        this.moveTarget.y = targetY;
    } else {
        this.moveTarget = this.markerGroup.add(this.game.add.sprite(targetX, targetY, 'atlas1'));
        this.moveTarget.animations.add('rotate', window.Phaser.Animation.generateFrameNames('target_', 0, 3), 15, true);
        this.moveTarget.animations.play('rotate');
    }
    this.marker.visible = false;
};

Game.setHoverCursors = function (sprite, cursor) { // Sets the appearance of the mouse cursor when hovering a specific sprite
    // sprite is the sprite that to apply the hover to
    // cursor is the url of the image to use as a cursor
    sprite.inputEnabled = true;
    sprite.events.onInputOver.add(function () {
        this.game.canvas.style.cursor = cursor;
        this.marker.canSee = false; // Make the white position marker invisible
    }, this);
    sprite.events.onInputOut.add(function () {
        this.game.canvas.style.cursor = this.cursor;
        this.marker.canSee = true;
    }, this);
    sprite.events.onDestroy.add(function () { // otheriwse, if sprite is destroyed while the cursor is above it, it'll never fire onInputOut!
        this.game.canvas.style.cursor = this.cursor;
        this.marker.canSee = true;
    }, this);
};

Game.resetHoverCursors = function (sprite) {
    // sprite is the sprite whose hover events have to be purged
    sprite.events.onInputOver.removeAll();
    sprite.events.onInputOut.removeAll();
};

// ===================
// Speech bubbles and HP code (stuff that appears above players)

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

Game.makeHPtexts = function () { // Create a pool of HP texts to (re)use when needed during the this.game
    this.HPGroup = myself.game.add.group();
    for (var b = 0; b < 60; b++) {
        this.HPGroup.add(myself.game.add.text(0, 0, '', {
            font: '20px pixel',
            strokeThickness: 2
        }));
    }
    this.HPGroup.setAll('exists', false);
};

Game.displayHP = function (txt, color, target, delay) { // Display hit points above a sprite
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
    var tween = this.game.add.tween(hp);
    tween.to({ y: hp.y - 25, alpha: 0 }, window.Phaser.Timer.SECOND * 2, null, false, delay);
    tween.start();
    hp.exists = true;
};

Game.playerSays = function (id, txt) {
    // Display the chat messages received from the server above the players
    // txt is the string to display in the bubble
    var player = this.charactersPool[id];
    player.displayBubble(txt);
};

Game.makeBubble = function () { // Create a speech bubble
    var bubble = this.game.add.sprite(0, 0);
    bubble.addChild(this.game.add.sprite(0, 0, 'bubble', 0)); // Top left corner
    bubble.addChild(this.game.add.tileSprite(this.speechBubbleCornerSize, 0, 0, this.speechBubbleCornerSize, 'bubble', 1)); // top side
    bubble.addChild(this.game.add.sprite(0, 0, 'bubble', 2)); // top right corner

    bubble.addChild(this.game.add.tileSprite(0, this.speechBubbleCornerSize, this.speechBubbleCornerSize, 0, 'bubble', 3)); // left side
    bubble.addChild(this.game.add.tileSprite(this.speechBubbleCornerSize, this.speechBubbleCornerSize, 0, 0, 'bubble', 4)); // center
    bubble.addChild(this.game.add.tileSprite(0, this.speechBubbleCornerSize, this.speechBubbleCornerSize, 0, 'bubble', 5)); // right side

    bubble.addChild(this.game.add.sprite(0, 0, 'bubble', 6)); // bottom left corner
    bubble.addChild(this.game.add.tileSprite(this.speechBubbleCornerSize, 0, 0, this.speechBubbleCornerSize, 'bubble', 7)); // bottom side
    bubble.addChild(this.game.add.sprite(0, 0, 'bubble', 8)); // bottom right corner
    bubble.addChild(this.game.add.sprite(0, 0, 'atlas1', 'tail')); // tail
    var txt = bubble.addChild(this.game.add.text(0, 0, '', {
        font: '14px pixel',
        fill: "#ffffff",
        stroke: "#000000",
        strokeThickness: 2
    }));
    txt.maxWidth = 200;
    txt.alpha = 1.5;
    return bubble;
};

// ================================
// Main update code

Game.markerHasMoved = function () {
    return (this.previousMarkerPosition.x != this.markerPosition.x || this.previousMarkerPosition.y != this.markerPosition.y);
};

Game.sortEntities = function () { // Sort the members of the "entities" group according to their y value, so that they overlap nicely
    entities.sort('y', window.Phaser.Group.SORT_ASCENDING);
};

Game.prototype.update = function () { // Main update loop of the client
    if (!playerIsInitialized) return;
    var cell = Game.computeTileCoords(myself.game.input.activePointer.worldX, myself.game.input.activePointer.worldY);
    this.markerPosition.x = cell.x * map.tileWidth;
    this.markerPosition.y = cell.y * map.tileWidth;

    // if (this.chatInput.visible && !this.chatInput.focus) Game.toggleChat(); // Trick to make the chat react to pressing "enter"

    if (player.hasMoved()) Game.checkCameraBounds();

    // if (Game.markerHasMoved()) {
    //     Game.computeView();
    //     this.marker.visible = (this.marker.canSee && this.view.contains(this.markerPosition.x, this.markerPosition.y));

    //     if (this.marker.visible) { // Check if the tile below the marker is collidable or not, and updae the marker accordingly
    //         //var tiles = [];
    //         var collide = false;
    //         for (var l = 0; l < this.map.this.gameLayers.length; l++) {
    //             var tile = this.map.getTile(cell.x, cell.y, this.map.this.gameLayers[l]);
    //             if (tile) {
    //                 //tiles.push(tile.index);
    //                 var tileProperties = this.map.tileset.tileProperties[tile.index - this.map.tileset.gid];
    //                 if (tileProperties) {
    //                     if (tileProperties.hasOwnProperty('c')) {
    //                         collide = true;
    //                         break;
    //                     }
    //                 }
    //             }
    //         }
    //         //console.log(tiles);

    //         this.updateMarker(this.markerPosition.x, this.markerPosition.y, collide);
    //         this.previousMarkerPosition.set(this.markerPosition.x, this.markerPosition.y);
    //     }
    // }
};

Game.prototype.render = function () { // Use to display debug information, not used in production
    /*this.game.debug.cameraInfo(this.game.camera, 32, 32);
    this.entities.forEach(function(sprite){
        this.game.debug.spriteBounds(sprite);
    },this);
    this.game.debug.spriteBounds(this.player);
    this.game.debug.text(this.game.time.fps || '--', 2, 14, "#00ff00");*/
};