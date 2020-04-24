// game.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-04-24
//
// Ideally, only this file needs modification from an administrator.
// If other files need to be modified, then contact me, and I will reengineer the system a bit.
//
// included after: common, engine, global, 3d, xboard, game, network
/*
globals
Assign, CHART_JS:true, COLOR_BLACK:true, COLOR_WHITE:true, ENGINE_COLORS:true, ENGINE_FEATURES, ENGINE_NAMES:true,
HOST:true, LINKS:true, LIVE_ENGINES:true, TWITCH_CHANNEL:true, TWITCH_CHAT:true
*/
'use strict';

/**
 * Override settings here
 * - first features are the ones that are changed the most frequently
 */
function startup_config() {
    LIVE_ENGINES = ['4x V100 6Men TB', '16TH 7Men TB'];

    HOST = 'https://tcec-chess.com';

    // 2 & 3 = live engines
    ENGINE_NAMES = ['White', 'Black', 'Blueleela', '7Fish'];

    // Use Assign to append new NN engines here, by default: AllieStein & LCZero
    // - & 1 => NN engine
    // - & 2 => Leela variations
    Assign(ENGINE_FEATURES, {
        LCZeroCPU: 3,
    });

    // navigation links
    // the URL will be: HOST/path, except if it starts with 'http', '.' or '/'
    LINKS = {
        articles: {
            'Super Final 16 by GM Sadler.pdf': 'articles/Sufi_16_-_Sadler.pdf',
            'Super Final 15 by GM Sadler.pdf': 'articles/Sufi_15_-_Sadler.pdf',
            'Super Final 14 by GM Sadler.pdf': 'articles/Sufi_14_-_Sadler.pdf',
            // separator
            'a': 0,
            'TCEC_16.pdf': 'articles/TCEC_16.pdf',
            'TCEC_15.pdf': 'articles/TCEC_16.pdf',
            'TCEC_14.pdf': 'articles/TCEC_16.pdf',
            'TCEC_13.pdf': 'articles/TCEC_16.pdf',
            'TCEC_12.pdf': 'articles/TCEC_16.pdf',
            'TCEC_11.pdf': 'articles/TCEC_16.pdf',
            'TCEC_10.pdf': 'articles/TCEC_16.pdf',
            // again
            'b': 0,
            'TCEC_Cup_4.pdf': 'http://tcec-chess.com/articles/TCEC_Cup_4.pdf',
            'TCEC_Cup_3.pdf': 'http://tcec-chess.com/articles/TCEC_Cup_3.pdf',
            'TCEC_Cup_2.pdf': 'http://tcec-chess.com/articles/TCEC_Cup_2.pdf',
            'TCEC_Cup_1.pdf': 'http://tcec-chess.com/articles/TCEC_Cup_1.pdf',
        },
        download: {
            Crosstable: 'crosstable.json',
            Schedule: 'schedule.json',
            'Event PGN': 'evalbotelo/archive.pgn',
            'Current PGN': 'evalbotelo/live.pgn',
        },
        navigate: {
            'Main live': 'live.html',
            'Twitch Stream': 'https://www.twitch.tv/tcec_chess_tv',
        },
        rules: {
            Rules: 'https://wiki.chessdom.org/Rules',
            'Book FAQ': 'articles/TCEC_Openings_FAQ.html',
        },
    };

    // graph colors
    COLOR_BLACK = '#000000';
    COLOR_WHITE = '#efefef';
    ENGINE_COLORS = [COLOR_WHITE, COLOR_BLACK, '#007bff', 'darkred', 'green', 'yellow', 'purple', 'orange'];

    // dynamically loaded libraries
    CHART_JS = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.9.3/Chart.min.js';

    TWITCH_CHANNEL = 'https://player.twitch.tv/?channel=TCEC_Chess_TV';
    TWITCH_CHAT = 'https://www.twitch.tv/embed/TCEC_Chess_TV/chat';

    ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // POST PROCESS
    ///////////////

    // clean up some mistakes
    HOST = HOST.replace(/\/$/, '');
}
