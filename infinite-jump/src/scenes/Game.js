import Phaser from '../lib/phaser.js'
import Collect from '../game/Collect.js'

var moveLeft = false;

export default class Game extends Phaser.Scene
{ 
    totalScore = 0
    /** @type {Phaser.Physics.Arcade.StaticGroup} */
    platforms
    /** @type {Phaser.Physics.Arcade.Sprite} */
    player
    /** @type {Phaser.Types.Input.Keyboard.CursorKeys} */
    cursors
    /** @type {Phaser.Physics.Arcade.Group} */
    collectables
    /** @type {Phaser.GameObjects.Text} */
    totalScoreText
    

    constructor()
    {
        super('game')
    }

    init()
    {
        this.totalScore = 0
    }
    
    preload()
    {
        this.load.image('background', 'assets/bg_layer2.jpg')
        this.load.image('cloud', 'assets/cloud2.png')
        this.load.image('collect', 'assets/carrot.png')
        this.load.image('platform', 'assets/ground_grass.png')
        this.load.image('bunny-stand', 'assets/bunny1_stand.png')
        this.load.image('bunny-jump', 'assets/bunny1_jump.png')
        this.load.audio('jump', 'assets/sfx/jumpSound.ogg')
        this.load.audio('collectSound', 'assets/sfx/collectionSound.ogg')
        this.load.audio('gameover', 'assets/sfx/gameoverSound.ogg')

        this.cursors = this.input.keyboard.createCursorKeys()
    }

    create()
    {
        this.input.on('pointerdown', function(){
            moveLeft = true;
        }, this);

        this.add.image(240, 320, 'background')
            .setScrollFactor(0)
        
        this.platforms = this.physics.add.staticGroup()
        this.player = this.physics.add.sprite(240, 320, 'bunny-stand')
            .setScale(0.5)
    

        this.cameras.main.startFollow(this.player)    

        for (let i = 0; i < 5; ++i)
        {
            const x = Phaser.Math.Between(80, 500)
            const y = 150 * i 

            /** @type {Phaser.Physics.Arcade.Sprite} */
            const platform = this.platforms.create(x, y, 'platform')
            platform.scale = 0.45

            /** @type {Phaser.Physics.Arcade.StaticBody} */
            const body = platform.body
            body.updateFromGameObject()
        }

        // Collision detection
        this.physics.add.collider(this.platforms, this.player)
        this.player.body.checkCollision.up = false
        this.player.body.checkCollision.left = false
        this.player.body.checkCollision.right = false

        // Camera dead zones
        this.cameras.main.startFollow(this.player)
        this.cameras.main.setDeadzone(this.scale.width * 1.5)

        // Creating collectable
        this.collectables = this.physics.add.group({
            classType: Collect
        })

        this.physics.add.collider(this.platforms, this.collectables)

        this.physics.add.overlap(
            this.player,
            this.collectables,
            this.handleCollectables, // Called on overlap
            undefined,
            this
        )

        var iCloud = this.add.image(240, -35, 'cloud')
            .setScrollFactor(0)
            .setOrigin(0.5, 0)
            .setScale(0.15)       
        iCloud.setDepth(5)

        // Text for scoring
        const style = { color: '#000', fontSize: 24 }
        this.totalScoreText = this.add.text(240, 15, 'Score: 0', style)
            .setScrollFactor(0)
            .setOrigin(0.5, 0)
        this.totalScoreText.setDepth(6)    
            
    }

    update()
    {
        // Iterate over each platform.. checks if each platform's y value is greater than or equal to the vertical distance that the camera has scrolled
        // plus a fixed 700 pixels. If true, the platform is moved to a random amount(50 - 85px) above the top of the camera.
        this.platforms.children.iterate(child => {
            /** @type {Phaser.Physics.Arcade.Sprite} */
            const platform = child
            const scrollY = this.cameras.main.scrollY
            if (platform.y >= scrollY + 700)
            {
                platform.y = scrollY - Phaser.Math.Between(50, 100)
                platform.x = Phaser.Math.Between(80, 500)
                platform.body.updateFromGameObject()

                this.addCollectableAbove(platform)
            }
        })

        // Platform collision
        const touchingDown = this.player.body.touching.down

        if (touchingDown)
        {
            this.player.setVelocityY(-300)

            //Switch to jump texture
            this.player.setTexture('bunny-jump')
            this.sound.play('jump')
        }

        const vy = this.player.body.velocity.y
        if (vy > 0 && this.player.texture.key !== 'bunny-stand')
        {
            //switch back to stand texture when falling
            this.player.setTexture('bunny-stand')
        }
        
        // Player move logic

        if (this.cursors.left.isDown && !touchingDown)
        {
            this.player.setVelocityX(-200)
        }
        else if (this.cursors.right.isDown && !touchingDown)
        {
            this.player.setVelocityX(200)
        }
        else
        {
            this.player.setVelocityX(0)
        }

        // Screen wrapping logic
        this.horizontalWrap(this.player)

        // Game over logic
        const bottomPlatform = this.findBottomMostPlatform()
        if (this.player.y > bottomPlatform.y + 200)
        {
            this.scene.start('game-over')
            this.sound.play('gameover')
        }
    }

    // If passed in sprite goes past the left side more than half its width then teleport it to the right side plus half its width, then do the reverse for 
    // the right side.
    horizontalWrap(sprite)
    {
        const halfWidth = sprite.displayWidth * 0.5
        const gameWidth = this.scale.width
        if (sprite.x < -halfWidth)
        {
            sprite.x = gameWidth + halfWidth
        }
        else if (sprite.x > gameWidth + halfWidth)
        {
            sprite.x = -halfWidth
        }
    }

    // Collectable sprite is inserted above the parameter sprite when method is called
    addCollectableAbove(sprite)
    {
        const y = sprite.y - sprite.displayHeight

        /** @type {Phaser.Physics.Arcade.Sprite} */
        const collect = this.collectables.get(sprite.x, y, 'collect')

        collect.setActive(true)
        collect.setVisible(true)

        this.add.existing(collect)

        collect.body.setSize(collect.width, collect.height)

        this.physics.world.enable(collect)

        return collect
    }

    // Code handles collectable that collides with player and removes it from the game
    handleCollectables(player, collectable)
    {
        // hide from display
        this.collectables.killAndHide(collectable)

        // disable from physics world
        this.physics.world.disableBody(collectable.body)

        // Increment score every time a collectable is collected
        this.totalScore++

        // Create new text value and set it
        const value = `Score: ${this.totalScore}`
        this.totalScoreText.text = value

        this.sound.play('collectSound')
    }

    findBottomMostPlatform()
    {
        const platforms = this.platforms.getChildren()
        let bottomPlatform = platforms[0]

        for (let i = 1; i < platforms.length; ++i)
        {
            const platform = platforms[i]

            //discard any platforms that are above current
            if (platform.y < bottomPlatform.y)
            {
                continue
            }
            bottomPlatform = platform
        }

        return bottomPlatform
    }
}
