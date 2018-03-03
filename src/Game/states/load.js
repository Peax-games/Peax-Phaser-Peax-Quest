export default function loadState(game) {
    return {
        preload: function () {
            game.load.tilemap('map', 'img/maps/minimap_client.json', null, window.Phaser.Tilemap.TILED_JSON);
            game.load.spritesheet('tileset', 'img/tilesets/tilesheet.png', 32, 32);
            game.load.atlasJSONHash('atlas4', 'img/sprites/atlas4.png', 'assets/sprites/atlas4.json'); // Atlas of monsters
            game.load.spritesheet('bubble', 'img/sprites/bubble2.png', 5, 5); // tilesprite used to make speech bubbles
            game.load.spritesheet('life', 'img/sprites/lifelvl.png', 5, 18); // tilesprite used to make lifebar
            // game.load.audio('sounds', 'img/audio/sounds.mp3', 'assets/audio/sounds.ogg'); // audio sprite of all sound effects
            game.load.json('entities', 'img/json/entities_client.json'); // Basically a list of the NPC, mapping their id to the key used in other JSON files
        },
        create: function () {
            game.state.start('menu');
        }
    }
}