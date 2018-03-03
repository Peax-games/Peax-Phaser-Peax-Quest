export default function playState(){
    return{
        var Game = {};

        Game.init = function(){
            game.stage.disableVisibilityChange = true; // This could be in the create method.
        };
        
        Game.preload = function() {
            game.load.tilemap('map', 'assets/map/example_map.json', null, Phaser.Tilemap.TILED_JSON);
            game.load.spritesheet('tileset', 'assets/map/tilesheet.png',32,32);
            game.load.image('sprite','assets/sprites/sprite.png');
        };
        
        Game.create = function(){
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
        };
        
        Game.getCoordinates = function(layer,pointer){
            Client.sendClick(pointer.worldX,pointer.worldY);
        };
        
        Game.addNewPlayer = function(id,x,y){
            Game.playerMap[id] = game.add.sprite(x,y,'sprite');
        };
        
        Game.movePlayer = function(id,x,y){
            var player = Game.playerMap[id];
            var distance = Phaser.Math.distance(player.x,player.y,x,y);
            var tween = game.add.tween(player);
            var duration = distance*10;
            tween.to({x:x,y:y}, duration);
            tween.start();
        };
        
        Game.removePlayer = function(id){
            Game.playerMap[id].destroy();
            delete Game.playerMap[id];
        };
    
    // end of game file.

    var Client = {};
Client.socket = io.connect();

Client.sendTest = function(){
    console.log("test sent");
    Client.socket.emit('test');
};

Client.askNewPlayer = function(){
    Client.socket.emit('newplayer');
};

Client.sendClick = function(x,y){
  Client.socket.emit('click',{x:x,y:y});
};

Client.socket.on('newplayer',function(data){
    Game.addNewPlayer(data.id,data.x,data.y);
});

Client.socket.on('allplayers',function(data){
    for(var i = 0; i < data.length; i++){
        Game.addNewPlayer(data[i].id,data[i].x,data[i].y);
    }

    Client.socket.on('move',function(data){
        Game.movePlayer(data.id,data.x,data.y);
    });

    Client.socket.on('remove',function(id){
        Game.removePlayer(id);
    });
});

// End of client file.

var game = new Phaser.Game(24*32, 17*32, Phaser.AUTO, document.getElementById('game'));
game.state.add('Game',Game);
game.state.start('Game');

// End of main file.
    }
}