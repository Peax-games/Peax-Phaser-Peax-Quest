import bootState from './states/boot';
import loadState from './states/load';
import menuState from './states/menu';
import playState from './states/play';
import winState from './states/win';
import loseState from './states/lose';

window.PIXI = require('phaser-ce/build/custom/pixi');
window.p2 = require('phaser-ce/build/custom/p2');
window.Phaser = require('phaser-ce/build/custom/phaser-split');

export default function PeaxQuest() {
    var game = new Phaser.Game(24*32, 17*32, Phaser.AUTO, 'myCanvas');
    game.stage.disableVisibilityChange = true;

    game.state.add('boot', bootState);
    game.state.add('load', loadState);
    game.state.add('menu', menuState);
    game.state.add('play', playState);
    game.state.add('win', winState);
    game.state.add('lose', loseState);

    game.state.start('boot');

}