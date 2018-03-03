export default function bootState(){
    return{
      preload: function() {
            game.load.tilemap('map', 'assets/map/example_map.json', null, Phaser.Tilemap.TILED_JSON);
            game.load.spritesheet('tileset', 'assets/map/tilesheet.png',32,32);
            game.load.image('sprite','assets/sprites/sprite.png');
        },

        create: function(){
            Game.playerMap = {};
            var testKey = game.input.keyboard.addKey(Phaser.Keyboard.ENTER);
            testKey.onDown.add(Client.sendTest, this);
            var map = game.add.tilemap('map');
            map.addTilesetImage('tilesheet', 'tileset'); // tilesheet is the key of the tileset in map's JSON file
            var layer;
            for(var i = 0; i < map.layers.length; i++) {
                layer = map.createLayer(i);
            }
            layer.inputEnabled = true; // Allows clicking on the map ; it's enough to do it on the last layer
            layer.events.onInputUp.add(Game.getCoordinates, this);
            Client.askNewPlayer();
        }
    };
}