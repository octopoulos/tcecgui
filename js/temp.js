// temp.js
//
// temporary replaces tcec.js to test index_base.html
/*
globals
create_boards, download_pgn, HTML, LS, update_pgn, window, xboards
*/
'use strict';

let timeDiff;

function getUserS() {

}

function hideBanner() {

}

function initTables() {

}

function setDefaults() {

}

function setPgn(pgn) {
    update_pgn(pgn);
}

function setTwitch() {

}

function setUsers(data) {
    LS('setUsers:');
    LS(data);
    HTML('#table-view td[data-x="viewers"]', data.count);
}

function setUsersMain() {

}

function tcecHandleKey() {

}

function updateEngRatingData() {

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
    create_boards();
}

function startup_archive() {

}

function startup_tcec() {

}
