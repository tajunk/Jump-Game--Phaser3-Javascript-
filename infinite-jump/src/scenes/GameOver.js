import Phaser from '../lib/phaser.js'

export default class GameOver extends Phaser.Scene
{
    constructor()
    {
        super('game-over')
    }

    preload()
    {
        this.load.audio('newgame', 'assets/sfx/retrySound.ogg')
    }

    create()
    {
        const width = this.scale.width
        const height = this.scale.height

        this.add.text(width * 0.5, height * 0.5, 'Game Over', {
            fontSize: 48
        })
        .setOrigin(0.5)
        this.add.text(width * 0.5, height * 0.6, 'Press SPACE to play again', {
            fontSize: 28
        })
        .setOrigin(0.5)

        this.input.keyboard.once('keydown_SPACE', () => {
            this.scene.start('game')
            this.sound.play('newgame')
        })
    }
}