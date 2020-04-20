<template>
    <main>
        <nav>
            <h1 class="third">Codenames</h1>
            <div class="third btn-container">
                <span class='btn' @click='newGame'>New Game</span>
            </div>
            <div class="third btn-container text-right">
                <span :class='{btn: true, selected:isSpymaster}' @click='isSpymaster=true'>Spymaster</span>
                <span :class='{btn: true, selected:!isSpymaster}' @click='isSpymaster=false'>Player</span>
            </div>
        </nav>
        <div class="container">
            <h2 :class='{"text-center": true, "invisible": !gameOver}'>Game Over</h2>
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
                <button type="button" :disabled='gameOver' @click='currTeam++'>End Turn</button>
            </p>
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
    </main>
</template>

<script>
import dict from './assets/dict.json'
export default {
    name: 'App',
    data () {
        return {
            boardSize: 25,
            maxTeams: 2,
            currTeam: 0,
            lang: 'en',
            isSpymaster: false,
            tileIndices: [],
            tileOwners: [],
            tileStatuses: []
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
        gameOver () {
            return this.teamScores.includes(0) || this.tileStatuses[this.tileOwners.indexOf(-1)]
        },
        isPlayer () {
            return !this.isSpymaster
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
        }
    },
    methods: {
        tileClick (index) {
            if (this.gameOver || this.tileStatuses[index]) return
            this.$set(this.tileStatuses, index, true)
            if (this.tileOwners[index] !== this.currTeam && this.tileOwners[index] >= 0) this.currTeam++
        },
        wordRandomizer (size = this.boardSize) {
            const out = []
            for (var i = 0; i < size; i++) {
                const num = Math.round(Math.random() * (this.dictWords.length - 1))
                if (out.includes(num)) i -= 1; else out.push(num)
            }
            return out
        },
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
        newGame () {
            this.isSpymaster = false
            this.tileIndices = this.wordRandomizer()
            this.tileOwners = this.ownerRandomizer()
            this.tileStatuses = this.tileIndices.map(item => false)
            this.currTeam = 0
        }
    },
    mounted () {
        if (!this.tileIndices.length) this.newGame()
    }
}
</script>

<style scoped>
main {
    -webkit-user-select: none;
    -moz-user-select: none;
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
.btn {
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
</style>
