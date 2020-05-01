// temp.js
//
// temporary replaces tcec.js to test index_base.html
/*
globals
create_boards, download_pgn, download_tables, HTML, LS, tour_info:true, update_twitch, window, xboards
*/
'use strict';

let timeDiff;

function bracketDataMain() {
}

function hideBanner() {

}

function initTables() {

}

// DONE
function newUpdateStandData() {
}

function setDefaults() {

}

// DONE
function setPgn(pgn) {
}

function setTwitch() {
}

function setTwitchChange(data)
{
    tour_info = data;
    update_twitch(null, `https://www.twitch.tv/embed/${data.twitchaccount}/chat`);
}

// DONE
function setUsers(data) {
}

function setUsersMain() {

}

function tcecHandleKey() {

}

function updateEngRatingData() {

}

function updateH2hData() {

}

function updateLiveChart() {

}

function updateLiveChartData() {

}

function updateLiveEval() {

}

// DONE
function updateLiveEvalData(data, _a, _b, id) {
}

function updateLiveEvalDataNew() {

}

function updatePgn() {
    download_pgn();
}

function updateScheduleData() {

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
