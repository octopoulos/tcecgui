// network
//
// moved all socket functions here
// TODO: move this to startup because this code will be very short once the DELETE have been deleted?
//
// included after: common, engine, global, 3d, xboard, game
/*
globals
_, add_timeout, analyse_crosstable, bracketDataMain, DEV, get_string, Hide, HOST, HTML, Id, io, LS, newUpdateStandData,
Prop, save_option, set_viewers, setLastMoveTime, setPgn, setTwitchChange, setUsers, setUsersMain, Show, showBanner,
time_delta:true, timeDiff:true, TIMEOUTS, updateCrashData, updateEngRatingData, updateH2hData, update_live_eval,
update_pgn, update_player_eval, update_table, updateLiveChartData, updateLiveEvalData, updateLiveEvalDataNew,
updateScheduleData, Y
*/
'use strict';

let globalRoom = 0,
    socket;

/**
 * Initialise sockets
 * + handle all messages
 */
function init_sockets() {
    socket = io.connect(HOST);
    unlistenLogMain();

    // log
    socket.on('htmlread', datal => {
        log_socket('htmlread', datal);
        let data = datal.data,
            date = new Date().toLocaleTimeString(),
            div = Id('log-wrapper'),
            text = data.split(/\n|\s\n/).join("<br>");

        // TODO: change this, not a good way to add nodes
        div.innerHTML += `<h5><b><i><u>${date}</u></i></b></h5><p align=left>${text}</p>`;
        div.scrollTop = div.scrollHeight;
    });

    socket.on('crosstable', data => {
        log_socket('crosstable', data);
        // DELETE
        newUpdateStandData(data);

        analyse_crosstable(data);
    });
    socket.on('liveeval', data => {
        log_socket('liveeval', data);
        // DELETE
        updateLiveEvalData(data, 1, null, 1);

        update_live_eval(data, 0);
    });
    socket.on('liveeval1', data => {
        log_socket('liveeval1', data);
        // DELETE
        updateLiveEvalData(data, 1, null, 2);

        update_live_eval(data, 1);
    });
    socket.on('updeng', data => {
        log_socket('updeng', data);
        // DELETE
        updateLiveEvalDataNew(data, 1, null, 2);

        update_player_eval(data);
    });
    socket.on('pgn', data => {
        log_socket('pgn', data);
        // DELETE
        setUsersMain(data.Users);
        timeDiff = 0;
        setPgn(data);

        time_delta = 0;
        update_pgn(data);
    });
    socket.on('schedule', data => {
        log_socket('schedule', data);
        // DELETE
        updateScheduleData(data);
        updateH2hData(data);

        update_table('sched', data);
    });
    socket.on('livechart', data => {
        log_socket('livechart', data);
        updateLiveChartData(data, 1);
    });
    socket.on('livechart1', data => {
        log_socket('livechart1', data);
        updateLiveChartData(data, 2);
    });
    socket.on('lastpgntime', data => {
        log_socket('lastpgntime', data);
        setLastMoveTime(data);
    });
    socket.on('users', data => {
        log_socket('users', data);
        // DELETE
        setUsers(data);

        set_viewers(data.count);
    });
    socket.on('banner', data => {
        log_socket('banner', data);
        // DELETE
        showBanner(data);

        show_banner(data);
    });
    socket.on('tournament', data => {
        log_socket('tournament', data);
        setTwitchChange(data);
    });
    socket.on('enginerating', data => {
        log_socket('enginerating', data);
        // not used
        updateEngRatingData(data);
    });
    socket.on('crash', data => {
        log_socket('crash', data);
        // DELETE
        updateCrashData(data);

        update_table('crash', data);
    });
    socket.on('bracket', data => {
        log_socket('bracket', data);
        bracketDataMain(data);
    });

    //
    add_timeout('get_users', () => {socket.emit('getusers', 'd');}, TIMEOUTS.users);
}

/**
 * Log a socket message
 * @param {string} name
 * @param {Object} data
 */
function log_socket(name, data) {
    if (DEV.socket & 1) {
        LS(`socket/${name}:`);
        LS(data);
    }
}

// CHECK AND DELETE ALL THESE:
function setDefaultLiveLog()
{
    globalRoom = Y.engine_livelog;
    Prop(`input[value="${globalRoom}"]`, 'checked', true);
}

function setLiveLog(livelog)
{
    save_option('engine_livelog', livelog.value);
    unlistenLogMain(0);
    if (livelog.value)
        globalRoom = livelog.value;

    listenLog();
}

/**
 * Show the banner and hide it after a timeout
 * @param {string=} text if there's no text, then just hide it
 */
function show_banner(text) {
    let node = _('#banner');
    if (text) {
        HTML(node, text);
        Show(node);
    }
    add_timeout('banner', () => {Hide(node);}, TIMEOUTS.banner);
}

function listenLogMain(room)
{
    if (socket)
        socket.emit('room', room);
}

function unlistenLogMain(room)
{
    globalRoom = 0;
    if (socket)
        socket.emit('noroom', room);
}

function listenLog()
{
    if (globalRoom == 0)
        globalRoom = 'room10';
    listenLogMain(globalRoom);
}

function unlistenLog()
{
    unlistenLogMain('livelog');
}
