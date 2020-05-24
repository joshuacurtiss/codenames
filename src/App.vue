<template>
    <main>
        <nav>
            <h1 class="third">Codenames</h1>
            <div v-show='gameInited' class="third btn-container">
                <span class='btn' @click='newGame'>New Game</span>
            </div>
            <div v-show='gameInited' class="third btn-container text-right">
                <span :class='{btn: true, selected:isSpymaster}' @click='isSpymaster=true'>Spymaster</span>
                <span :class='{btn: true, selected:!isSpymaster}' @click='isSpymaster=false'>Player</span>
            </div>
        </nav>
        <div :class="{
            container: true,
            dim: !websocketActive
        }">
            <h2 :class='{"text-center": true, "invisible": !gameOver}'>Game Over</h2>
            <div v-show='gameInited'>
                <p class="third score">
                    Score:
                    <strong v-for='i in maxTeams'
                        v-bind:key='i'
                        :class='"player"+(i-1)'
                    >
                        <em v-if='i>1'> - </em>
                        {{ teamScores[i-1] }}
                    </strong>
                </p>
                <p class="third text-center">
                    Current Team:
                    <span :class='"player"+currTeam'>{{ currTeamName }}</span>
                </p>
                <p class="third text-right">
                    <button type="button" :disabled='gameOver' @click='currTeam++; sendUpdate()'>End Turn</button>
                </p>
            </div>
            <div :class='{
                gameover: gameOver,
                spymaster: isSpymaster,
                player: isPlayer
            }'>
                <div v-for='(word, index) in tileWords'
                    v-bind:key='word'
                    v-on:click='tileClick(index)'
                    :class='{
                        word: true,
                        bomb: tileOwners[index]<0,
                        player0: tileOwners[index]===0,
                        player1: tileOwners[index]===1,
                        player2: tileOwners[index]===2,
                        player3: tileOwners[index]===3,
                        sel: tileStatuses[index]
                    }'
                >
                    {{ word }}
                </div>
            </div>
        </div>
        <div v-show='!gameInited && this.settings' class='startGameDialog'>
            <h2>Start or Join a Game!</h2>
            <form @submit.prevent='initGame'>
                <div>
                    Dictionary:
                    <select v-model='lang'>
                        <option v-for='language in langs' :key='language' :value='language'>{{ language }}</option>
                    </select>
                    Teams:
                    <select v-model='maxTeams'>
                        <option v-for='key in [2,3,4]' :key='key' :value='key'>{{ key }}</option>
                    </select>
                </div>
                <div>
                    <input type="text" v-model="name" @focus="$event.target.select()" />
                    <button type="submit">Go!</button>
                </div>
            </form>
        </div>
        <div v-show='settings && gameInited && !websocketActive' class="reconnecting">
            Reconnecting...
        </div>
    </main>
</template>

<script>
import dict from './assets/dict'
const VER = process.env.PACKAGE_VERSION || 0
let websocket = null
let websocketTimeout = null
export default {
    name: 'App',
    data () {
        return {
            name: '',
            boardSize: 25,
            maxTeams: 2,
            currTeam: 0,
            lang: 'Standard',
            isSpymaster: false,
            tileIndices: [],
            tileOwners: [],
            tileStatuses: [],
            settings: null,
            websocketActive: false
        }
    },
    computed: {
        currTeamName () {
            const index = this.currTeam
            return index === 0 ? 'red' : index === 1 ? 'blue' : index === 2 ? 'purple' : 'green'
        },
        dictWords () {
            return dict[this.lang]
        },
        gameInited () {
            return this.tileIndices.length > 0
        },
        gameOver () {
            return this.gameInited && (this.teamScores.includes(0) || this.tileStatuses[this.tileOwners.indexOf(-1)])
        },
        isPlayer () {
            return !this.isSpymaster
        },
        langs () {
            return Object.keys(dict)
        },
        teamScores () {
            const results = []
            for (let i = 0; i < this.maxTeams; i++) {
                const totalTiles = this.tileOwners.filter(item => item === i).length
                const selTiles = this.tileOwners.filter((item, index) => item === i && this.tileStatuses[index]).length
                results.push(totalTiles - selTiles)
            }
            return results
        },
        tileWords () {
            return this.tileIndices.map(index => this.dictWords[index])
        }
    },
    watch: {
        currTeam (newval) {
            if (newval >= this.maxTeams) this.currTeam = 0
        },
        lang () {
            if (!this.gameInited) this.name = this.randomizeName()
        },
        name (newval) {
            this.name = newval.toLowerCase().replace(/\s/, '-').replace(/[^a-z0-9-]/, '')
        }
    },
    methods: {
        /**
         * Handles connecting to the WebSocket and setting up the event listeners.
         */
        connect () {
            // Only if our AJAX call to get settings has completed and a name is selected.
            if (this.settings && this.name) {
                // Close an existing connection
                if (websocket) websocket.close()
                // Create the WebSocket connection
                if (this.settings.wssport) websocket = new WebSocket(`${location.protocol.replace(/^http/, 'ws')}//${location.hostname}:${this.settings.wssport}${location.pathname}`)
                else websocket = new WebSocket(location.href.replace(/^http/, 'ws'))
                // Message handler. In this case, prepend the message to array of messages, while truncating old messages.
                websocket.addEventListener('message', ev => {
                    const data = JSON.parse(ev.data)
                    this.receiveMessage(data)
                })
                // On open connection, mark active status and clear out any timer for reconnection
                websocket.addEventListener('open', () => {
                    clearTimeout(websocketTimeout)
                    this.websocketActive = true
                })
                // On closed connection, mark acctive status and start a timer to try to reconnect
                websocket.addEventListener('close', () => {
                    this.websocketActive = false
                    websocketTimeout = setTimeout(this.connect, 6000)
                })
            }
        },
        /**
         * Handles clicking on a word tile
         */
        tileClick (index) {
            if (this.gameOver || this.tileStatuses[index]) return
            this.$set(this.tileStatuses, index, true)
            if (this.tileOwners[index] !== this.currTeam && this.tileOwners[index] >= 0) this.currTeam++
            this.sendUpdate()
        },
        /**
         * Returns an array of numbers that correspond to the word dictionary for the selected language
         */
        wordRandomizer (size = this.boardSize) {
            const out = []
            for (var i = 0; i < size; i++) {
                const num = Math.round(Math.random() * (this.dictWords.length - 1))
                if (out.includes(num)) i -= 1; else out.push(num)
            }
            return out
        },
        /**
         * Returns an array of numbers that assign owners to the tiles in the game, plus the bomb
         */
        ownerRandomizer (size = this.boardSize) {
            const out = Array(size).fill(null)
            const qty = Math.floor(size * 0.75 / this.maxTeams)
            // Set the bomb:
            out[Math.round(Math.random() * (size - 1))] = -1
            // Loop thru players and randomly assign tiles (first player gets one more tile)
            for (var player = 0; player < this.maxTeams; player++) {
                for (var i = 0; i < qty - (player ? 1 : 0); i++) {
                    const index = Math.round(Math.random() * (size - 1))
                    if (out[index] === null) out[index] = player; else i -= 1
                }
            }
            return out
        },
        initGame () {
            window.history.pushState(this.name, `Codenames: ${this.name}`, `/${this.name}`)
            this.connect()
            this.newGame()
        },
        newGame () {
            if (this.name.length === 0) return
            this.isSpymaster = false
            this.tileIndices = this.wordRandomizer()
            this.tileOwners = this.ownerRandomizer()
            this.tileStatuses = this.tileIndices.map(item => false)
            this.currTeam = 0
            this.sendUpdate()
        },
        receiveMessage (data) {
            if (data.action === 'sync' && this.gameInited) this.sendUpdate()
            if (data.ver !== VER) return
            if (data.action === 'update') {
                this.boardSize = data.boardSize
                this.lang = data.lang
                this.tileIndices = data.tileIndices
                this.maxTeams = data.maxTeams
                this.currTeam = data.currTeam
                this.tileOwners = data.tileOwners
                this.tileStatuses = data.tileStatuses
            }
        },
        sendUpdate () {
            if (websocket.readyState === WebSocket.OPEN) {
                websocket.send(JSON.stringify({
                    action: 'update',
                    ver: VER,
                    boardSize: this.boardSize,
                    maxTeams: this.maxTeams,
                    currTeam: this.currTeam,
                    lang: this.lang,
                    tileIndices: this.tileIndices,
                    tileOwners: this.tileOwners,
                    tileStatuses: this.tileStatuses
                }))
            } else {
                setTimeout(this.sendUpdate, 100)
            }
        },
        randomizeName () {
            const rand1 = Math.floor(Math.random() * this.dictWords.length)
            const rand2 = Math.floor(Math.random() * this.dictWords.length)
            return this.dictWords[rand1] + '-' + this.dictWords[rand2]
        }
    },
    created () {
        this.name = location.pathname.substring(1) || this.randomizeName()
    },
    async mounted () {
        const req = await fetch('api/settings')
        this.settings = await req.json()
        if (this.name.length) this.connect()
    }
}
</script>

<style scoped>
main {
    -webkit-user-select: none;
    -moz-user-select: none;
}
.dim {
    filter: opacity(0.3) blur(1px);
    pointer-events: none;
}
nav {
    background-color: navy;
    padding: 5px 10px;
    height: 44px;
}
h1 {
    font-family: 'VT323', monospace;
    font-size: 40px;
    color: white;
    margin: 0;
}
.btn-container {
    margin-top: 10px;
}
.btn {transition: filter 0.4s;
    cursor: pointer;
    font-size: 0.8em;
    margin-left: 10px;
    padding: 1px 10px;
    border-radius: 3px;
    border: 1px solid #333;
    color: #333;
    background-color: #ddd;
}
.btn:hover {
    filter: brightness(93%);
}
.btn.selected {
    filter: none;
    background-color: goldenrod;
}
.container {
    margin: 0 12%;
    transition: filter 0.4s;
}
.invisible {
    visibility: hidden;
}
.third {
    float: left;
    width: 29%;
    padding: 0 3% 0 1%;
}
.text-center {
    text-align: center;
}
.text-right {
    text-align: right;
}
.score em {
    color: black;
}
.gameover .word {
    cursor: default;
}
.word {
    border: 1px solid #bbb;
    border-radius: 5px;
    background-color: #cfcfcf;
    text-align: center;
    float: left;
    width: 17.1%;
    padding: 4% 0;
    margin: 1% 1% 0.5% 1%;
    font-size: 14px;
    overflow: hidden;
    cursor: pointer;
    transition: filter .4s ease-in-out;
}
.player .word {
    color: black;
}
.player .word:hover {
    filter: brightness(107%);
}
.player3 {
    color: darkgreen;
}
.player2 {
    color: darkviolet;
}
.player1 {
    color: dodgerblue;
}
.player0 {
    color: firebrick;
}
.spymaster .bomb {
    color: #eee;
    background-color: #555;
}
.sel {
    color: #eee !important;
    filter: none !important;
    background-color: #b5b5b5;
    cursor: default;
}
.sel.player3 {
    background-color: darkgreen;
}
.sel.player2 {
    background-color: darkorchid;
}
.sel.player1 {
    background-color: dodgerblue;
}
.sel.player0 {
    background-color: firebrick
}
.sel.bomb {
    background-color: #111;
}
.reconnecting {
    position: absolute;
    top: 35vh;
    width: 50%;
    margin-left: 25%;
    padding: 5vh 0;
    text-align: center;
    font-size: 1.2em;
    background-color: white;
    border: 1px solid #444;
    border-radius: 6px;
}
.startGameDialog {
    margin: 5% 0 0 15%;
    padding: 0 0 25px 0;
    width: 70%;
    border: 1px solid #444;
    border-radius: 6px;
    text-align: center;
}
form div {
    margin-bottom: 12px;
}
.startGameDialog input {
    width: 60%;
    font-size: 24px;
    text-align: center;
    padding: 5px;
}
.startGameDialog button {
    font-size: 24px;
    margin-left: 10px;
    padding: 6px;
}
</style>
