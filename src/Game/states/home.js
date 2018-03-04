// import Input from 'orange-games';
import Game from './game';
import Client from '../client/client';
/**
 * Created by Jerome on 09-02-17.
 */

 var myself;
export default function homeState(game) {
   var maxNameLength= 20; // max length of the name of the player
};
// var clio = new Client();
homeState.prototype.init = function(){
    if(this.game.device.desktop == false){
        console.log('W : '+window.screen.width+', H : '+window.screen.height);
        if(Math.min(window.screen.width,window.screen.height) < this.game.width) { // If at least one of the two screen dimensions is smaller for the game, enable asking for device reorientation
            this.game.scale.scaleMode = window.Phaser.ScaleManager.RESIZE;
            this.game.scale.forceOrientation(true,false);
        }
    }
    this.game.scale.pageAlignHorizontally = true;
    // this.game.add.plugin(Fabrique.Plugins.InputField); // https://github.com/orange-games/phaser-input
    Game.isNewPlayer = Client.isNewPlayer();
};

homeState.prototype.preload = function(){
    this.game.load.atlasJSONHash('atlas1', 'assets/sprites/atlas1.png', 'assets/sprites/atlas1.json'); // PNJ, HUD, marker, achievements ...
    this.game.load.atlasJSONHash('atlas3', 'assets/sprites/atlas3.png', 'assets/sprites/atlas3.json'); // Items, weapons, armors
    this.game.load.json('db', 'assets/json/db.json');
};

homeState.prototype.create = function(){
    myself = this;
    Game.db = this.game.cache.getJSON('db');
    if(this.game.device.desktop == false)
    {
        this.game.scale.enterIncorrectOrientation.add(Game.displayOrientationScreen, this);
        this.game.scale.leaveIncorrectOrientation.add(Game.removeOrientationScreen, this);
    }
    if(!Game.isNewPlayer) this.makeResetScroll();
    this.displayhomeStateScroll();
    this.displayLogo();
    //homeState.displayLinks();
    document.onkeydown = homeState.handleKeyPress;
};

homeState.prototype.displayhomeStateScroll = function(){
    if(!homeState.scroll) this.makehomeStateScroll();
    if(homeState.resetScroll && homeState.resetScroll.visible) homeState.resetScroll.hideTween.start();
    homeState.scroll.visible = true;
    homeState.scroll.showTween.start();
};

homeState.prototype.displayLogo = function(){
    homeState.logo = this.game.add.sprite(0, 20, 'atlas1', 'logo');
    homeState.logo.anchor.set(0.5,0);
    homeState.logo.x = this.game.width/2;
    homeState.logo.hideTween = this.game.add.tween(homeState.logo);
    homeState.logo.hideTween.to({alpha: 0}, window.Phaser.Timer.SECOND*0.2);
};

homeState.prototype.displayLinks = function(){
    var x = homeState.makeLink(300,'About',function(){console.log('about')},true);
    x = homeState.makeLink(x+30,'Credits',function(){console.log('credits')},true);
    x = homeState.makeLink(x+30,'License',function(){console.log('license')},true);
};

homeState.prototype.makeLink = function(x,text,callback,hyphen){
    var color = '#b2af9b';
    var style = {font: '18px pixel',fill:color};
    var y = 430;
    var link = this.game.add.text(x,y,text,style);
    link.inputEnabled = true;
    link.events.onInputOver.add(function(txt){
        txt.addColor('#f4d442',0);
    }, this);
    link.events.onInputOut.add(function(txt){
        txt.addColor(color,0);
    }, this);
    link.events.onInputDown.add(callback, this);
    if(hyphen) {
        var hyphen = this.game.add.text(link.x+link.width+10,y,' - ',style);
        return hyphen.x;
    }
    return link.x;
};

homeState.prototype.makeScroll = function(){
    var scroll = this.game.add.sprite(0,0,'atlas1','scroll_1');
    scroll.x = this.game.width/2 - scroll.width/2;
    scroll.y = this.game.height/2 - scroll.height/2;
    scroll.addChild(this.game.add.sprite(-78,0,'atlas1','scroll_3'));
    scroll.addChild(this.game.add.sprite(scroll.width,0,'atlas1','scroll_2'));
    scroll.fixedToCamera = true;
    scroll.alpha = 0;
    scroll.visible = false;
    return scroll;
};

homeState.setFadeTweens = function(element){
    var speedCoef = 0.2;
    element.showTween = myself.game.add.tween(element);
    element.hideTween = myself.game.add.tween(element);
    element.showTween.to({alpha: 1}, window.Phaser.Timer.SECOND*speedCoef);
    element.hideTween.to({alpha: 0}, window.Phaser.Timer.SECOND*speedCoef);
    element.hideTween.onComplete.add(function(){
        element.visible = false;
    },this);
};

homeState.prototype.makehomeStateScroll = function(){
    Game.isNewPlayer = Client.isNewPlayer();
    homeState.scroll = this.makeScroll();
    homeState.setFadeTweens(homeState.scroll);

    homeState.makeTitle(homeState.scroll,(Game.isNewPlayer ? 'Create a new character' : 'Load existing character'));

    var buttonY;
    var player;
    if(Game.isNewPlayer){
        player = homeState.scroll.addChild(myself.game.add.sprite(0, 110, 'atlas3', 'clotharmor_31'));
        player.alpha = 0.5;
        // homeState.inputField = homeState.scroll.addChild(this.game.add.inputField(185, 160,{
        //     width: 300,
        //     padding: 10,
        //     fill: '#000',
        //     stroke: '#fff',
        //     backgroundColor: '#d0cdba',
        //     borderWidth: 2,
        //     borderColor: '#b2af9b',
        //     borderRadius: 3,
        //     font: '18px pixel',
        //     placeHolder: 'Name your character',
        //     placeHolderColor: '#b2af9b',
        //     cursorColor: '#b2af9b',
        //     max: homeState.maxNameLength
        // }));
        // homeState.inputField.x = homeState.scroll.width/2 - homeState.inputField.width/2;
        // homeState.inputField.input.useHandCursor = false;
        buttonY = 220;
    }else {
        player = homeState.scroll.addChild(myself.game.add.sprite(0, 100, 'atlas3', Client.getArmor()+'_31'));
        var wpn = Client.getWeapon();
        var weapon = player.addChild(myself.game.add.sprite(0, 0, 'atlas3', wpn+'_31'));
        weapon.position.set(Game.db.items[wpn].offsets.x, Game.db.items[wpn].offsets.y);
        var name = player.addChild(this.game.add.text(0,42, Client.getName(), {
            font: '18px pixel',
            fill: "#fff",
            stroke: "#000000",
            strokeThickness: 3
        }));
        name.x = Math.floor(12 - (name.width/2));
        homeState.makeScrollLink(homeState.scroll,'Reset your character',homeState.displayResetScroll);
        buttonY = 180;
    }
    player.addChild(this.game.add.sprite(0,5, 'atlas1','shadow'));
    player.anchor.set(0.25,0.35);
    homeState.button = homeState.makeButton(homeState.scroll,buttonY,'play',this.startGame);
    if(!Game.isNewPlayer) homeState.disableButton();
    player.x = homeState.button.x - 18;
};

homeState.makeTitle = function(scroll,txt){
    var titleY = 65;
    var title = scroll.addChild(myself.game.add.text(0, titleY, txt,{
        font: '18px pixel',
        fill: "#f4d442",
        stroke: "#000000",
        strokeThickness: 3
    }));
    title.x = scroll.width/2;
    title.anchor.set(0.5);
    scroll.addChild(myself.game.add.sprite(title.x - 170,titleY-12,'atlas1','stache_0'));
    scroll.addChild(myself.game.add.sprite(title.x + 105,titleY-12,'atlas1','stache_1'));
};

homeState.makeButton = function(scroll,buttonY,frame,callback){
    var button = scroll.addChild(myself.game.add.button(210,buttonY, 'atlas1',callback, this, frame+'_0', frame+'_0', frame+'_1'));
    button.x = scroll.width/2;
    button.anchor.set(0.5,0);
    button.input.useHandCursor = false;
    return button;
};

homeState.makeScrollLink = function(scroll,text,callback){
    var link = scroll.addChild(this.game.add.text(0,310,text,{
        font: '16px pixel',
        fill: "#fff",
        stroke: "#000",
        strokeThickness: 3
    }));
    link.x = scroll.width/2;
    link.anchor.set(0.5);
    link.inputEnabled = true;
    link.events.onInputOver.add(function(txt){
        txt.addColor('#f4d442',0);
    }, this);
    link.events.onInputOut.add(function(txt){
        txt.addColor('#fff',0);
    }, this);
    link.events.onInputDown.add(callback, this);
};


homeState.displayResetScroll = function(){
    if(!homeState.resetScroll) homeState.makeResetScroll();
    homeState.scroll.hideTween.start();
    homeState.resetScroll.visible = true;
    homeState.resetScroll.showTween.start();
};

homeState.makeResetScroll = function(){
    homeState.resetScroll = homeState.makeScroll();
    homeState.setFadeTweens(homeState.resetScroll);
    homeState.makeTitle(homeState.resetScroll,'Reset your character?');
    var txt = homeState.resetScroll.addChild(this.game.add.text(0,135,'All your progress will be lost. Are you sure?',{
        font: '18px pixel',
        fill: "#000"
    }));
    homeState.makeButton(homeState.resetScroll,180,'delete',homeState.deletePlayer);
    txt.anchor.set(0.5);
    txt.x = homeState.resetScroll.width/2;
    homeState.makeScrollLink(homeState.resetScroll,'Cancel',homeState.displayhomeStateScroll);
};

homeState.deletePlayer = function(){
    Client.deletePlayer();
    homeState.scroll.destroy();
    homeState.scroll = null;
    homeState.displayhomeStateScroll();
};

// homeState.prototype.isNameEmpty = function(){
//     return (homeState.inputField.text.text.length == 0);
// };

homeState.prototype.startGame = function(){
    var ok = true;
    if(Game.isNewPlayer) {
        // if(!this.isNameEmpty()){
            Client.setName('BluntsAlot');
        // }else{
            // ok = false;
        // }
    }
    if(ok) {
        document.onkeydown = null;
        homeState.scroll.hideTween.onComplete.add(function(){
            myself.game.state.start('game');
        },myself);
        homeState.scroll.hideTween.start();
        homeState.logo.hideTween.start();
    }
};

homeState.prototype.disableButton = function(){
    homeState.button.setFrames('play_2','play_2','play_2');
    homeState.button.inputEnabled = false;
};

homeState.prototype.enableButton = function(){
    homeState.button.setFrames('play_0','play_0','play_1');
    homeState.button.inputEnabled = true;
};

homeState.prototype.handleKeyPress = function(e){
    e = e || window.event;
    if(e.keyCode == 13) homeState.startGame();
};

homeState.prototype.update = function () {
    if(homeState.inputField) {
        homeState.inputField.update();
        if (homeState.button.inputEnabled) {
            if (homeState.isNameEmpty()) homeState.disableButton();
        } else {
            if (!homeState.isNameEmpty()) homeState.enableButton();
        }
    }
};