export default function bootState(){
    return{
        create: function(){
            this.game.physics.startSystem(window.Phaser.Physics.ARCADE);
            this.game.state.start('load');
        }
    }
}