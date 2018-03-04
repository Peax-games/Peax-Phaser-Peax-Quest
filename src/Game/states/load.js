export default function loadState(game) {
    return {
        preload: function () {

            game.load.atlasJSONHash('atlas1', 'assets/sprites/atlas1.png', 'assets/sprites/atlas1.json'); // PNJ, HUD, marker, achievements ...
            game.load.atlasJSONHash('atlas3', 'assets/sprites/atlas3.png', 'assets/sprites/atlas3.json'); // Items, weapons, armors
            game.load.json('db', 'assets/json/db.json');

            game.load.tilemap('map', 'assets/maps/minimap_client.json', null, window.Phaser.Tilemap.TILED_JSON);
            game.load.spritesheet('tileset', 'assets/tilesets/tilesheet.png', 32, 32);
            game.load.atlasJSONHash('atlas4', 'assets/sprites/atlas4.png', 'assets/sprites/atlas4.json'); // Atlas of monsters
            game.load.spritesheet('bubble', 'assets/sprites/bubble2.png', 5, 5); // tilesprite used to make speech bubbles
            game.load.spritesheet('life', 'assets/sprites/lifelvl.png', 5, 18); // tilesprite used to make lifebar
            // game.load.audio('sounds', 'assets/audio/sounds.mp3', 'assets/audio/sounds.ogg'); // audio sprite of all sound effects
            game.load.json('entities', 'assets/json/entities_client.json'); // Basically a list of the NPC, mapping their id to the key used in other JSON files
        },
        create: function () {
            game.state.start('menu');
        }
    }
}