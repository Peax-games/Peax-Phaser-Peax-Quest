export default function bootState(game){
    return{
      preload: function() {
        this.load.image('preloaderBackground', 'assets/menu-stuffs/preloadbck.png');
        this.load.image('preloaderBar', 'assets/menu-stuffs/preloadbar.png');
        },

        create: function(){
            // game.canvas.style.cursor = this.cursor; // Sets the pointer to hand sprite
            game.state.start('load')
        }
    };
}