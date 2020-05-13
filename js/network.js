// network
//
// all socket functions are here
//
// included after: common, engine, global, 3d, xboard, game
/*
globals
_, add_timeout, analyse_crosstable, analyse_tournament, Class, create_bracket, CreateNode, DEV, get_string, HasClass,
Hide, HOST, HTML, Id, InsertNodes, io, LS, Prop, S, save_option, set_viewers, Show, TIMEOUTS, update_live_eval,
update_pgn, update_player_eval, update_table, update_twitch, Y
*/
'use strict';

// modify those values in config.js
let TWITCH_CHANNEL = 'https://player.twitch.tv/?channel=TCEC_Chess_TV',
    TWITCH_CHAT = 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat';

let prev_room = 0,
    socket,
    socket_data = {
        archive: {},
        live: {},
    },
    virtual_resize;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Initialise sockets
 * + handle all messages
 */
function init_sockets() {
    socket = io.connect(HOST);

    // live_log
    socket.on('htmlread', data => {
        log_socket('htmlread', data);
        let data_ = data.data,
            date = new Date().toLocaleTimeString(),
            text = data_.split(/\n|\s\n/).join('<br>');
        insert_log(`<h5><b><i><u>${date}</u></i></b></h5><p align=left>${text}</p>`);
    });

    socket.on('banner', data => {
        log_socket('banner', data);
        show_banner(data);
    });
    socket.on('bracket', data => {
        log_socket('bracket', data);
        create_bracket('live', data);
    });
    socket.on('crash', data => {
        log_socket('crash', data);
        update_table('live', 'crash', data);
    });
    socket.on('crosstable', data => {
        log_socket('crosstable', data);
        analyse_crosstable('live', data);
    });
    socket.on('livechart', data => {
        log_socket('livechart', data);
        update_live_eval('live', data, 0);
    });
    socket.on('livechart1', data => {
        log_socket('livechart1', data);
        update_live_eval('live', data, 1);
    });
    socket.on('liveeval', data => {
        log_socket('liveeval', data);
        update_live_eval('live', data, 0);
    });
    socket.on('liveeval1', data => {
        log_socket('liveeval1', data);
        update_live_eval('live', data, 1);
    });
    socket.on('pgn', data => {
        log_socket('pgn', data);
        update_pgn('live', data);
    });
    socket.on('schedule', data => {
        log_socket('schedule', data);
        update_table('live', 'sched', data);
    });
    socket.on('tournament', data => {
        log_socket('tournament', data, true);
        analyse_tournament('live', data);
        if (Y.x == 'live')
            update_twitch(null, `https://www.twitch.tv/embed/${data.twitchaccount}/chat`);
    });
    socket.on('updeng', data => {
        log_socket('updeng', data);
        update_player_eval('live', data);
    });
    socket.on('users', data => {
        log_socket('users', data);
        set_viewers(data.count);
    });

    // unused => store the data anyway
    socket.on('enginerating', data => {
        log_socket('enginerating', data, true);
    });
    socket.on('lastpgntime', data => {
        log_socket('lastpgntime', data, true);
    });

    //
    add_timeout('get_users', () => {socket.emit('getusers', 'd');}, TIMEOUTS.users);
}

/**
 * Insert a log entry at the top of live_log
 * @param {string} html
 */
function insert_log(html) {
    let node = CreateNode('div', html);
    InsertNodes('#live-log', [node], true);
}

/**
 * Listen to the log (or not)
 */
function listen_log() {
    if (!socket)
        return;
    let new_room = Y.live_log;

    // 1) leave the previous room
    if (prev_room && prev_room != new_room) {
        socket.emit('noroom', `room${prev_room}`);
        insert_log(`<div class="loss">left: ${prev_room}</div>`);
        prev_room = 0;
    }
    // 2) enter the next room
    if (new_room && prev_room != new_room) {
        prev_room = new_room;
        socket.emit('room', `room${prev_room}`);
        insert_log(`<div class="win">entered: ${prev_room}</div>`);
    }
}

/**
 * Log a socket message + optionally cache it
 * @param {string} name
 * @param {Object} data
 * @param {boolean=} cache
 */
function log_socket(name, data, cache) {
    if (DEV.socket) {
        LS(`socket/${name}:`);
        LS(data);
    }
    if (cache)
        socket_data[Y.x][name] = data;
}

/**
 * Show the banner and hide it after a timeout
 * @param {string=} text if there's no text, then just hide it
 */
function show_banner(text) {
    let node = Id('banner');
    if (text) {
        HTML(node, text);
        Show(node);
    }
    add_timeout('banner', () => {Hide(node);}, TIMEOUTS.banner);
}

/**
 * Enable/disable twitch video + chat
 * @param {number=} dark
 * @param {string=} chat_url new chat URL
 * @param {boolean=} only_resize
 */
function update_twitch(dark, chat_url, only_resize) {
    if (dark != undefined)
        save_option('twitch_dark', dark);

    if (chat_url)
        TWITCH_CHAT = chat_url;

    // 1) update twitch chat IF there was a change
    dark = Y.twitch_dark;
    let node = Id('chat');
    if (!node)
        return;

    let current = node.src,
        src = Y.twitch_chat? `${TWITCH_CHAT}${dark? '?darkpopout': ''}`: '';

    if (!only_resize && current != src)
        node.src = src;
    S('#hide-chat, #chat', src);
    S('#show-chat', !src);
    S('#twitch0', src && dark);
    S('#twitch1', src && !dark);

    let right = Id('right'),
        active = _('.active', right),
        active_name = active? active.dataset.x: '',
        has_narrow = HasClass(right, 'narrow'),
        has_wide = HasClass(right, 'wide'),
        need_narrow = (active_name == 'chat' && !src),
        need_wide = (active_name == 'winner');

    if (need_narrow != has_narrow || need_wide != has_wide) {
        Class(right, 'narrow', need_narrow);
        Class(right, 'wide', need_wide);
        if (virtual_resize)
            virtual_resize();
    }

    // 2) update twitch video IF there was a change
    node = Id('twitch-vid');
    current = node.src;
    src = Y.twitch_video? TWITCH_CHANNEL: '';

    if (!only_resize && current != src)
        node.src = src;
    S('#hide-video, #twitch-vid', src);
    S('#show-video', !src);
}
