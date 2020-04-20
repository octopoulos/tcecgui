// temp.js
//
// temporary replaces tcec.js to test index_base.html
/*
globals
LS, window, xboards
*/
'use strict';

let timeDiff;

function getUserS() {

}

function hideBanner() {

}

function initTables() {

}

function resize() {

}

function setDefaults() {

}

function setPgn(pgn) {
    LS(pgn);
    window.pgn = pgn;

    if (pgn.Headers) {
        if (pgn.Moves && pgn.Moves.length > 0) {
            let fen = pgn.Moves[pgn.Moves.length - 1].fen;
            xboards.board.set_fen(fen, true);
        }
    }
}

function setTwitch() {

}

function setUsersMain() {

}

function tcecHandleKey() {

}

function updateLiveChart() {

}

function updateLiveChartData() {

}

function updateLiveEval() {

}

function updateLiveEvalData() {

}

function updateLiveEvalDataNew() {

}

function updatePgn() {

}

function updateTables() {

}

function updateWinners() {

}

// STARTUP
//////////

function set_ui_events() {

}

function start_tcec() {

}

function startup_archive() {

}

function startup_tcec() {

}
