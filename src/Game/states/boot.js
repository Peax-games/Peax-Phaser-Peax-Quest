export default function bootState(game){
    return{
      preload: function() {
        this.load.image('preloaderBackground', 'img/menu-stuffs/preloadbck.png');
        this.load.image('preloaderBar', 'img/menu-stuffs/preloadbar.png');
        },

        create: function(){
            game.canvas.style.cursor = this.cursor; // Sets the pointer to hand sprite
            game.state.start('load')
        }
    };
}