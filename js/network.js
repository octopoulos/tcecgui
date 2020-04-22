// network
//
// moved all socket functions here
//
// included after: common, engine, global, 3d, xboard, game
/*
globals
_, bracketDataMain, DEV, get_string, io, LS, newUpdateStandData, Prop, save_option, setLastMoveTime, setPgn,
setTwitchChange, setUsers, setUsersMain, set_viewers, showBanner, time_delta:true, timeDiff:true, updateCrashData,
updateEngRatingData, updateH2hData, update_live_eval, update_pgn, update_player_eval, update_table,
updateLiveChartData, updateLiveEvalData, updateLiveEvalDataNew, updateScheduleData,
Y
*/
'use strict';

let globalRoom = 0,
    socket;

function getUserS()
{
    socket.emit('getusers', 'd');
}

/**
 * Initialise sockets
 * + handle all messages
 */
function init_sockets() {
    socket = io.connect('https://tcec-chess.com/');
    unlistenLogMain();

    socket.on('htmlread', datal => {
        let data = datal.data,
            date = new Date().toLocaleTimeString(),
            div = _('#log-wrapper'),
            text = data.split(/\n|\s\n/).join("<br>");

        if (DEV.socket & 1)
            LS(`XXX: recieving data from log: ${datal.room}`);
        div.innerHTML += `<h5><b><i><u>${date}</u></i></b></h5><p align=left>${text}</p>`;
        div.scrollTop = div.scrollHeight;
    });
    socket.on('crosstable', data => {
        if (DEV.socket & 1) {
            LS('socket/crosstable:');
            LS(data);
        }
        newUpdateStandData(data);
    });
    socket.on('liveeval', data => {
        if (DEV.socket & 1) {
            LS('socket/liveval:');
            LS(data);
        }
        // DELETE
        updateLiveEvalData(data, 1, null, 1);

        update_live_eval(data, 0);
    });
    socket.on('liveeval1', data => {
        if (DEV.socket & 1) {
            LS('socket/liveeval1:');
            LS(data);
        }
        // DELETE
        updateLiveEvalData(data, 1, null, 2);

        update_live_eval(data, 1);
    });
    socket.on('updeng', data => {
        if (DEV.socket & 1) {
            LS('socket/updeng:');
            LS(data);
        }
        // DELETE
        updateLiveEvalDataNew(data, 1, null, 2);

        update_player_eval(data);
    });
    socket.on('pgn', data => {
        if (DEV.socket & 1) {
            LS('socket/pgn:');
            LS(data);
        }
        // DELETE
        if (DEV.socket & 1)
            LS(`Got move: ${data.lastMoveLoaded} : users=${data.Users}`);
        setUsersMain(data.Users);
        timeDiff = 0;
        setPgn(data);

        time_delta = 0;
        update_pgn(data);
    });
    socket.on('schedule', data => {
        if (DEV.socket & 1) {
            LS('socket/schedule:');
            LS(data);
        }
        updateScheduleData(data);
        updateH2hData(data);

        update_table('sched', data);
    });
    socket.on('livechart', data => {
        if (DEV.socket & 1) {
            LS('socket/livechart:');
            LS(data);
        }
        updateLiveChartData(data, 1);
    });
    socket.on('livechart1', data => {
        if (DEV.socket & 1) {
            LS('socket/livechart1:');
            LS(data);
        }
        updateLiveChartData(data, 2);
    });
    socket.on('lastpgntime', data => {
        if (DEV.socket & 1) {
            LS('socket/lastpgntime:');
            LS(data);
        }
        setLastMoveTime(data);
    });
    socket.on('users', data => {
        if (DEV.socket & 1) {
            LS('socket/users:');
            LS(data);
        }
        // DELETE
        setUsers(data);

        set_viewers(data.count);
    });
    socket.on('banner', data => {
        if (DEV.socket & 1) {
            LS('socket/banner:');
            LS(data);
        }
        showBanner(data);
    });
    socket.on('tournament', data => {
        if (DEV.socket & 1) {
            LS('socket/tournament:');
            LS(data);
        }
        setTwitchChange(data);
    });
    socket.on('enginerating', data => {
        if (DEV.socket & 1) {
            LS('socket/enginerating:');
            LS(data);
        }
        updateEngRatingData(data);
    });
    socket.on('crash', data => {
        if (DEV.socket & 1) {
            LS('socket/crash:');
            LS(data);
        }
        updateCrashData(data);
    });
    socket.on('bracket', data => {
        if (DEV.socket & 1) {
            LS('socket/bracket:');
            LS(data);
        }
        bracketDataMain(data);
    });
}

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
