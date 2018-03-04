
import bootState from './states/boot';
import loadState from './states/load';
import menuState from './states/menu';
import homeState from './states/home';
import gameState from './states/game';


window.PIXI = require('phaser-ce/build/custom/pixi');
window.p2 = require('phaser-ce/build/custom/p2');
window.Phaser = require('phaser-ce/build/custom/phaser-split');

export default function PeaxQuest() {
    var game = new window.Phaser.Game(980, 500, window.Phaser.AUTO, 'myCanvas', null, true, false);
    // game.stage.disableVisibilityChange = true;

    game.global = {
        height: 980,
        borderPadding: 10, // size of the gray border of the game window
        HUDheight: 32, // height of the HUD bar at the bottom (with life etc.)
        achievementsHolderWidth: 850,
        barY: 0, // y position of that very same bar
        nbGroundLayers: 4, // number of tilemap layers corresponding to "ground" elements (ground, grass, water, cliffs), vs high elements (trees, houses, ...)
        defaultOrientation: 4, // Face down by default
        playerSpeed: 120, // number of ms that the movement tween takes to cross one tile (the lower the faster)
        playerLife: 100, // Max health of a player
        cursor: 'url(/assets/sprites/hand.png), auto', // image of the mouse cursor in normal circumstances
        talkCursor: 'url(/assets/sprites/talk.png), auto', // image of the cursor when hovering NPC
        lootCursor: 'url(/assets/sprites/loot.png), auto', // image of cursors when hovering loot
        fightCursor: 'url(/assets/sprites/sword.png), auto', // image of cursor when hovering monster
        markerPosition: new window.Phaser.Point(), // current position of the square marker indicating the highlighted tile
        previousMarkerPosition: new window.Phaser.Point(), // previous position of that marker
        cameraFollowing: true, // is the camera centered on the player
        mapWideningY: 54, // y coordinate (in tiles) of the region of the map above which the bounds of the world are wider
        speechBubbleCornerSize: 5, // size of the sprite used to make the corners of the speech bubbles
        healthBarWidth: 179, // width of the sprite representing the life of the player
        nbConnected: 0, // number of players connected to the game
        playerIsInitialized: false, // has the client received data from the server and created the world?
        inDoor: false, // is the player currently in an indoors location
        HPdelay: 100, // Delay before displaying hit points
        maxChatLength: 300, // Max length of text to input in chat
        latency: 0, // Initial latency of the client; continuously updated by values from server
        charactersPool: {}, // Map of the players in the game, accessed by their player id
        clickDelay: window.Phaser.Timer.SECOND * 0.2, // minimum time between player mouse clicks
        clickEnabled: true // bool used to check if the player has clicked faster than the click delay
    }
    // window.game = game;
    game.state.add('boot', bootState);
    game.state.add('load', loadState);
    game.state.add('menu', menuState); 
    game.state.add('game', gameState);
    game.state.add('home', homeState);
   

    game.state.start('boot');

}