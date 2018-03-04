// import Input from 'orange-games';
import Game from './game';
import Client from './client';
/**
 * Created by Jerome on 09-02-17.
 */
export default function homeState(game) {
    var maxNameLength = 20; // max length of the name of the player
    var db;
    var something;
    return {
        init: function () {
            if (game.device.desktop == false) {
                console.log('W : ' + window.screen.width + ', H : ' + window.screen.height);
                if (Math.min(window.screen.width, window.screen.height) < game.width) { // If at least one of the two screen dimensions is smaller for the game, enable asking for device reorientation
                    game.scale.scaleMode = window.Phaser.ScaleManager.RESIZE;
                    game.scale.forceOrientation(true, false);
                }
            }
            game.scale.pageAlignHorizontally = true;
            // game.add.plugin(PhaserInput.InputField); // https://github.com/orange-games/phaser-input
            something = new Client();
            Game.isNewPlayer = something.isNewPlayer();
        },
        // JSONHash
        preload: function () {
            game.load.atlas('atlas1', 'assets/sprites/atlas1.png', 'assets/sprites/atlas1.json'); // PNJ, HUD, marker, achievements ...
            game.load.atlas('atlas3', 'assets/sprites/atlas3.png', 'assets/sprites/atlas3.json'); // Items, weapons, armors
            game.load.json('db', 'assets/json/db.json');
        },

        create: function () {
            db = game.cache.getJSON('db');
            // if (game.device.desktop == false) {
            //     game.scale.enterIncorrectOrientation.add(Game.displayOrientationScreen, this);
            //     game.scale.leaveIncorrectOrientation.add(Game.removeOrientationScreen, this);
            // }
            if (!Game.isNewPlayer) this.makeResetScroll();
            this.displaythisScroll();
            this.displayLogo();
            // this.displayLinks();
            document.onkeydown = this.handleKeyPress;
        },

        displaythisScroll: function () {
            if (!this.scroll) this.makethisScroll();
            if (this.resetScroll && this.resetScroll.visible) this.resetScroll.hideTween.start();
            this.scroll.visible = true;
            this.scroll.showTween.start();
        },

        displayLogo: function () {
            this.logo = game.add.sprite(0, 20, 'atlas1', 'logo');
            this.logo.anchor.set(0.5, 0);
            this.logo.x = game.width / 2;
            this.logo.hideTween = game.add.tween(this.logo);
            this.logo.hideTween.to({ alpha: 0 }, window.Phaser.Timer.SECOND * 0.2);
        },

        displayLinks: function () {
            var x = this.makeLink(300, 'About', function () { console.log('about') }, true);
            x = this.makeLink(x + 30, 'Credits', function () { console.log('credits') }, true);
            x = this.makeLink(x + 30, 'License', function () { console.log('license') }, true);
        },
        makeLink: function (x, text, callback, hyphen) {
            var color = '#b2af9b';
            var style = { font: '18px pixel', fill: color };
            var y = 430;
            var link = game.add.text(x, y, text, style);
            link.inputEnabled = true;
            link.events.onInputOver.add(function (txt) {
                txt.addColor('#f4d442', 0);
            }, this);
            link.events.onInputOut.add(function (txt) {
                txt.addColor(color, 0);
            }, this);
            link.events.onInputDown.add(callback, this);
            if (hyphen) {
                var hyphen = game.add.text(link.x + link.width + 10, y, ' - ', style);
                return hyphen.x;
            }
            return link.x;
        },

        makeScroll: function () {
            var scroll = game.add.sprite(0, 0, 'atlas1', 'scroll_1');
            scroll.x = game.width / 2 - scroll.width / 2;
            scroll.y = game.height / 2 - scroll.height / 2;
            scroll.addChild(game.add.sprite(-78, 0, 'atlas1', 'scroll_3'));
            scroll.addChild(game.add.sprite(scroll.width, 0, 'atlas1', 'scroll_2'));
            scroll.fixedToCamera = true;
            scroll.alpha = 0;
            scroll.visible = false;
            return scroll;
        },

        setFadeTweens: function (element) {
            var speedCoef = 0.2;
            element.showTween = game.add.tween(element);
            element.hideTween = game.add.tween(element);
            element.showTween.to({ alpha: 1 }, window.Phaser.Timer.SECOND * speedCoef);
            element.hideTween.to({ alpha: 0 }, window.Phaser.Timer.SECOND * speedCoef);
            element.hideTween.onComplete.add(function () {
                element.visible = false;
            }, this);
        },

        makethisScroll: function () {
            Game.isNewPlayer = something.isNewPlayer();
            this.scroll = this.makeScroll();
            this.setFadeTweens(this.scroll);

            this.makeTitle(this.scroll, (Game.isNewPlayer ? 'Create a new character' : 'Load existing character'));

            var buttonY;
            var player;
            if (Game.isNewPlayer) {
                player = this.scroll.addChild(game.add.sprite(0, 110, 'atlas3', 'clotharmor_31'));
                player.alpha = 0.5;
                // this.inputField = this.scroll.addChild(game.add.inputField(185, 160, {
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
                //     max: this.maxNameLength
                // }));
                // this.inputField.x = this.scroll.width / 2 - this.inputField.width / 2;
                // this.inputField.input.useHandCursor = false;
                // buttonY = 220;
            } else {
                player = this.scroll.addChild(game.add.sprite(0, 100, 'atlas3', something.getArmor() + '_31'));

                var wpn = something.getWeapon();
                var wpn;
                var weapon = player.addChild(game.add.sprite(0, 0, 'atlas3', wpn + '_31'));
                weapon.position.set(Game.db.items[wpn].offsets.x, Game.db.items[wpn].offsets.y);
                var name = player.addChild(game.add.text(0, 42, 'hi', {
                    font: '18px pixel',
                    fill: "#fff",
                    stroke: "#000000",
                    strokeThickness: 3
                }));
                name.x = Math.floor(12 - (name.width / 2));
                this.makeScrollLink(this.scroll, 'Reset your character', this.displayResetScroll);
                buttonY = 180;
            }
            player.addChild(game.add.sprite(0, 5, 'atlas1', 'shadow'));
            player.anchor.set(0.25, 0.35);
            this.button = this.makeButton(this.scroll, buttonY, 'play', this.startGame);
            if (!Game.isNewPlayer) this.disableButton();
            player.x = this.button.x - 18;
        },
        makeTitle: function (scroll, txt) {
            var titleY = 65;
            var title = scroll.addChild(game.add.text(0, titleY, 'Name',{ 
                font: '18px pixel',
                fill: "#f4d442",
                stroke: "#000000",
                strokeThickness: 3
            }));
            title.x = scroll.width / 2;
            title.anchor.set(0.5);
            scroll.addChild(game.add.sprite(title.x - 170, titleY - 12, 'atlas1', 'stache_0'));
            scroll.addChild(game.add.sprite(title.x + 105, titleY - 12, 'atlas1', 'stache_1'));
        },
        makeButton: function (scroll, buttonY, frame, callback) {
            var button = scroll.addChild(game.add.button(210, buttonY, 'atlas1', callback, this, frame + '_0', frame + '_0', frame + '_1'));
            button.x = scroll.width / 2;
            button.anchor.set(0.5, 0);
            button.input.useHandCursor = false;
            return button;
        },
        makeScrollLink: function (scroll, text, callback) {
            var link = scroll.addChild(game.add.text(0, 310, text, {
                font: '16px pixel',
                fill: "#fff",
                stroke: "#000",
                strokeThickness: 3
            }));
            link.x = scroll.width / 2;
            link.anchor.set(0.5);
            link.inputEnabled = true;
            link.events.onInputOver.add(function (txt) {
                txt.addColor('#f4d442', 0);
            }, this);
            link.events.onInputOut.add(function (txt) {
                txt.addColor('#fff', 0);
            }, this);
            link.events.onInputDown.add(callback, this);
        },

        displayResetScroll: function () {
            if (!this.resetScroll) this.makeResetScroll();
            this.scroll.hideTween.start();
            this.resetScroll.visible = true;
            this.resetScroll.showTween.start();
        },
        makeResetScroll: function () {
            this.resetScroll = this.makeScroll();
            this.setFadeTweens(this.resetScroll);
            this.makeTitle(this.resetScroll, 'Reset your character?');
            var txt = this.resetScroll.addChild(game.add.text(0, 135, 'All your progress will be lost. Are you sure?', {
                font: '18px pixel',
                fill: "#000"
            }));
            this.makeButton(this.resetScroll, 180, 'delete', this.deletePlayer);
            txt.anchor.set(0.5);
            txt.x = this.resetScroll.width / 2;
            this.makeScrollLink(this.resetScroll, 'Cancel', this.displaythisScroll);
        },
        deletePlayer: function () {
            something.deletePlayer();
            this.scroll.destroy();
            this.scroll = null;
            this.displaythisScroll();
        },
        // isNameEmpty: function () {
        //     return (this.inputField.text.text.length == 0);
        // },
        startGame: function () {
            var ok = true;
            if (Game.isNewPlayer) {
                    something.setName('BluntsAlot');
               
            }
            if (ok) {
                document.onkeydown = null;
                this.scroll.hideTween.onComplete.add(function () {
                    game.state.start('game', false, true, {something: something});
                }, this);
                this.scroll.hideTween.start();
                this.logo.hideTween.start();
            }
        },
        disableButton: function () {
            this.button.setFrames('play_2', 'play_2', 'play_2');
            this.button.inputEnabled = false;
        },
        enableButton: function () {
            this.button.setFrames('play_0', 'play_0', 'play_1');
            this.button.inputEnabled = true;
        },
        handleKeyPress: function (e) {
            e = e || window.event;
            if (e.keyCode == 13) this.startGame();
        },
        update: function () {
            if (this.inputField) {
                this.inputField.update();
                if (this.button.inputEnabled) {
                    if (this.isNameEmpty()) this.disableButton();
                } else {
                    if (!this.isNameEmpty()) this.enableButton();
                }
            }
        }
    }
}