// game.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-12
/*
globals
__dirname, expect, global, require, test
*/
'use strict';

let {create_module} = require('./create-module');

let IMPORT_PATH = __dirname.replace(/\\/g, '/'),
    OUTPUT_MODULE = `${IMPORT_PATH}/test/game+`;

create_module(IMPORT_PATH, [
    'common',
    'engine',
    'global',
    '3d',
    'libs/chess-quick',
    'xboard',
    'graph',
    //
    'game',
    'startup',
], OUTPUT_MODULE, 'Assign Keys tour_info xboards Y');

let {
    analyse_log, Assign, calculate_h2h, calculate_probability, calculate_score, calculate_seeds, check_adjudication,
    create_boards, create_chart_data, create_game_link, current_archive_link, extract_threads, format_engine,
    format_eval, format_fen, format_hhmmss, format_opening, format_percent, get_short_name, load_defaults,
    parse_date_time, parse_pgn, prepare_settings, tour_info, update_live_eval, update_materials, update_pgn,
    update_player_eval, xboards, Y,
} = require(OUTPUT_MODULE);

Assign(global, {
    T: null,
});

prepare_settings();
load_defaults();
create_boards('text');
create_chart_data();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// analyse_log
[
    [
        ['Stockfish 20200701', 'Komodo 2566.00'],
        '35714477 Komodo 2566.00(45): info depth 31 time 7058 nodes 798000183 score cp -90 lowerbound nps 113047203 hashfull 66 tbhits 75 pv b7b5 a2a3 c8b7',
        1,
        {
            cp: -90,
            depth: 31,
            eval: 0.9,
            nodes: 798000183,
            nps: 113047203,
            pv: 'b7b5 a2a3 c8b7',
            tbhits: 75,
            time: 7058,
        },
    ],
    [
        ['Stockfish 20200701', 'Komodo 2566.00'],
        '33854431 Stockfish 20200701(40): info depth 32 seldepth 45 multipv 1 score cp 859 wdl 1000 0 0 upperbound nodes 1268292755 nps 187561779 hashfull 241 tbhits 106431 time 6762 pv b1g1 c8f5',
        0,
        {
            cp: 859,
            depth: 32,
            eval: 8.59,
            nodes: 1268292755,
            nps: 187561779,
            pv: 'b1g1 c8f5',
            seldepth: 45,
            tbhits: 106431,
            time: 6762,
            wdl: '1000 0 0',
        },
    ],
    [
        ['Stockfish 20200701', 'Komodo 2566.00'],
        '35794491 Stockfish 20200701(44): info depth 31 seldepth 53 multipv 1 score cp 142 wdl 606 389 5 nodes 1052562509 nps 151186801 hashfull 237 tbhits 9667 time 6962 pv c1b1 f8e7 f4f5 d6d5 e4d5 f6d5 c3d5 d8d5 f1d3 e7g5 d2g5 c8b8 g5g7 h8h4 f5e6 f7e6 g7f6 h4f4 f6h6 f4f7 d1e1 d5e5 e1f1 f7d7 h6f8 c6d8 g1g8 b8a7 f8f6 e5d5 f6h4 d5d6 h4g3 d6d5 g3g4 c7b6 g8g7 b6e3 f1f8 a7b6',
        0,
        {
            cp: 142,
            depth: 31,
            eval: 1.42,
            nodes: 1052562509,
            nps: 151186801,
            pv: 'c1b1 f8e7 f4f5 d6d5 e4d5 f6d5 c3d5 d8d5 f1d3 e7g5 d2g5 c8b8 g5g7 h8h4 f5e6 f7e6 g7f6 h4f4 f6h6 f4f7 d1e1 d5e5 e1f1 f7d7 h6f8 c6d8 g1g8 b8a7 f8f6 e5d5 f6h4 d5d6 h4g3 d6d5 g3g4 c7b6 g8g7 b6e3 f1f8 a7b6',
            seldepth: 53,
            tbhits: 9667,
            time: 6962,
            wdl: '606 389 5',
        },
    ],
    [
        ['Stockfish 20200701', 'LCZeroCPU v0.26.0-n703596'],
        '6200503 LCZeroCPU v0.26.0-n703596(7): info depth 10 seldepth 26 time 7138 nodes 312494 score cp -38 wdl 240 263 497 movesleft 52 nps 25028 tbhits 0 pv f7f5 g4g5 c7c5 a2a3 c8d7 a1b1 g8h7 b1b2 e8c7 e1g1 d8c8 b4c5 b6c5',
        1,
        {
            cp: -38,
            depth: 10,
            eval: 0.38,
            nodes: 312494,
            nps: 25028,
            pv: 'f7f5 g4g5 c7c5 a2a3 c8d7 a1b1 g8h7 b1b2 e8c7 e1g1 d8c8 b4c5 b6c5',
            seldepth: 26,
            tbhits: 0,
            time: 7138,
            wdl: '497 263 240',
        },
    ],
].forEach(([names, line, player_id, answer], id) => {
    test(`analyse_log:${id}`, () => {
        let players = xboards.live.players;
        names.forEach((name, id) => {
            players[id].name = name;
        });
        analyse_log(line);
        expect(players[player_id].info).toEqual(answer);
    });
});

// calculate_h2h
[
    [
        ['Counter', 'Marvin'],
        [
            {black: 'Stockfish', result: '0-1', white: 'Counter'},
            {black: 'Marvin', result: '1/2-1/2', white: 'Counter'},
            {black: 'Counter', result: '1-0', white: 'Marvin'},
            {black: 'Counter', result: '1-0', white: 'Stockfish'},
            {black: 'Marvin', result: '*', white: 'Counter'},
        ],
        [
            {black: 'Marvin', result: '1/2-1/2', white: 'Counter'},
            {black: 'Counter', result: '1-0', white: 'Marvin'},
            {black: 'Marvin', result: '*', white: 'Counter'},
        ],
        ['0.5', '1.5'],
    ],
].forEach(([names, rows, answer, answer2], id) => {
    test(`calculate_h2h:${id}`, () => {
        let players = xboards.live.players;
        for (let i = 0; i < names.length; i ++)
            players[i].name = names[i];

        expect(calculate_h2h('live', rows)).toEqual(answer);

        for (let i = 0; i < answer2.length; i ++)
            expect(players[i].score).toEqual(answer2[i]);
    });
});

// calculate_probability
[
    ['AllieStein', 0.27, 0, undefined, '13.7% W | 86.3% D | 0.0% B'],
    ['AllieStein', 128, 0, undefined, '91.6% W | 8.4% D | 0.0% B'],
    ['AllieStein', 256, 0, undefined, '100.0% W | 0.0% D | 0.0% B'],
    ['AllieStein', 256, 0, '437 550 13', '43.7% W | 55.0% D | 1.3% B'],
    ['LCZero', 0.27, 0, undefined, '18.6% W | 81.4% D | 0.0% B'],
    ['LCZero', 128, 0, undefined, '100.0% W | 0.0% D | 0.0% B'],
    ['LCZero', 128, 0, '437 550 13', '43.7% W | 55.0% D | 1.3% B'],
    ['ScorpioNN', 0.27, 0, undefined, '6.0% W | 94.0% D | 0.0% B'],
    ['ScorpioNN', 128, 0, undefined, '100.0% W | 0.0% D | 0.0% B'],
    ['Stockfish', 0.27, -1, undefined, '7.8% W | 92.2% D | 0.0% B'],
    ['Stockfish', 0.27, 0, undefined, '14.7% W | 77.8% D | 7.5% B'],
    ['Stockfish', 0.27, 30, undefined, '13.5% W | 81.3% D | 5.2% B'],
    ['Stockfish', -0.27, 30, undefined, '5.2% W | 81.3% D | 13.5% B'],
    ['Stockfish', -0.27, 30, '437 550 13', '43.7% W | 55.0% D | 1.3% B'],
    ['Stockfish', 128, 0, undefined, '100.0% W | 0.0% D | 0.0% B'],
    ['Stoofvlees', 0.27, 0, undefined, '8.9% W | 91.1% D | 0.0% B'],
    ['Stoofvlees', 128, 0, undefined, '100.0% W | 0.0% D | 0.0% B'],
].forEach(([short_engine, eval_, ply, wdl, answer], id) => {
    test(`calculate_probability:${id}`, () => {
        expect(calculate_probability(short_engine, eval_, ply, wdl)).toEqual(answer);
    });
});

// calculate_seeds
[
    [2, [1, 2]],
    [4, [1, 4, 2, 3]],
    [8, [1, 8, 4, 5, 2, 7, 3, 6]],
    [16, [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]],
    [32, [1, 32, 16, 17, 8, 25, 9, 24, 4, 29, 13, 20, 5, 28, 12, 21, 2, 31, 15, 18, 7, 26, 10, 23, 3, 30, 14, 19, 6, 27, 11, 22]],
    // non power of 2
    [3, [1, 0, 2, 3]],
    [6, [1, 0, 4, 5, 2, 0, 3, 6]],
    [13, [1, 0, 8, 9, 4, 13, 5, 12, 2, 0, 7, 10, 3, 0, 6, 11]],
    [14, [1, 0, 8, 9, 4, 13, 5, 12, 2, 0, 7, 10, 3, 14, 6, 11]],
    [15, [1, 0, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]],
    //
    [0, [1, 2]],
    [1, [1, 2]],
].forEach(([num_team, answer], id) => {
    test(`calculate_seeds:${id}`, () => {
        expect(calculate_seeds(num_team)).toEqual(answer);
    });
});

// calculate_score
[
    ['0', {w: 0, b: 1}],
    ['01', {w: 1, b: 1}],
    ['011===', {w: 3.5, b: 2.5}],
    ['011===11111', {w: 8.5, b: 2.5}],
].forEach(([text, answer], id) => {
    test(`calculate_score:${id}`, () => {
        expect(calculate_score(text)).toEqual(answer);
    });
});

// check_adjudication
[
    [undefined, 30, {}],
    [{R50: 50, Rd: -11, Rr: -11,}, 30, {50: 50, draw: '-', win: '-'}],
    [{adjudication: {Draw: -10, FiftyMoves: 49, ResignOrWin: -11}}, 30, {50: 49, draw: '-', win: '-'}],
    [{R50: 45, Rd: 9, Rr: -11}, 106, {50: 45, draw: '9p', win: '-'}],
].forEach(([dico, total_moves, answer], id) => {
    test(`check_adjudication:${id}`, () => {
        expect(check_adjudication(dico, total_moves)).toEqual(answer);
    });
});

// create_game_link
[
    [{}, 'live', 1, '', '<a class="game" href="#game=1">1</a>'],
    [{link: 'season=18&div=l3'}, 'live', 1, '', '<a class="game" href="#div=l3&game=1&season=18">1</a>'],
].forEach(([info, section, game, text, answer], id) => {
    test(`create_game_link:${id}`, () => {
        Assign(tour_info[section], info);
        expect(create_game_link(section, game, text)).toEqual(answer);
    });
});

// current_archive_link
[
    [{}, 'archive', undefined, ''],
    [{}, 'archive', true, ''],
    [{div: 'p', game: 126, round: '', season: 1, stage: ''}, 'archive', false, 'season=1&div=p'],
    [{div: 'p', game: 126, round: '', season: 1, stage: ''}, 'archive', true, 'season=1&div=p&game=126'],
    [{div: '', game: 1, round: 'fl', season: 'cup5', stage: ''}, 'archive', undefined, 'season=cup5&round=fl'],
    [{div: '', game: 7, round: '', season: '10', stage: '2'}, 'archive', true, 'season=10&stage=2&game=7'],
].forEach(([y, section, is_game, answer], id) => {
    test(`current_archive_link:${id}`, () => {
        Assign(Y, y);
        expect(current_archive_link(section, is_game)).toEqual(answer);
    });
});

// extract_threads
[
    [
        {
            Protocol: 'uci',
            Threads: '176',
            Hash: '65536',
            SyzygyPath: '/home/syzygy/',
            'Move Overhead': '1000',
            OwnBook: 'false',
            Ponder: 'false',
        },
        176,
    ],
    [
        {
            Threads: 'lol',
        },
        '',
    ],
    [
        {
            'Max CPUs': '43',
            Threads: 'lol',
        },
        43,
    ],
    [
        {
            Protocol: 'UCI',
            Hash: '16384',
            'Max CPUs': '43',
            'Use Large Pages': 'false',
            OwnBook: 'false',
            Ponder: 'false',
        },
        43,
    ],
    [
        {
            Protocol: 'UCI',
            Hash: '32768',
            'Number Of Threads': '20',
            NalimovPath: 'C'
        },
        20,
    ],
    [
        {
            'Max CPUs': '43',
            'Number Of Threads': '20',
        },
        20,
    ],
    [
        {
            Cores: 8,
            MaxThreads: 88,
        },
        8,
    ],
    [
        {
            Cores: 'no idea',
            MaxThreads: 88,
        },
        88,
    ],
].forEach(([options, answer], id) => {
    test(`extract_threads:${id}`, () => {
        expect(extract_threads(options)).toEqual(answer);
    });
});

// format_engine
[
    ['', undefined, undefined, ''],
    [undefined, undefined, undefined, ''],
    ['Fire 8_beta', undefined, undefined, 'Fire <i class="version">8_beta</i>'],
    ['LCZero v0.24-sv-t60-3010', undefined, undefined, 'LCZero <i class="version">v0.24-sv-t60-3010</i>'],
    ['LCZero v0.25.1-svjio-t60-3972-mlh', undefined, undefined, 'LCZero <i class="version">v0.25.1-svjio-t60-3972-mlh</i>'],
    ['LCZero v0.25.1-svjio-t60-3972-mlh', undefined, 20, 'LCZero <i class="version version-small">v0.25.1-svjio-t60-3972-mlh</i>'],
    ['LCZero v0.26.0-sv-t60-4229-mlh', undefined, 21, 'LCZero <i class="version version-small">v0.26.0-sv-t60-4229-mlh</i>'],
    ['Stockfish 20200407DC', undefined, undefined, 'Stockfish <i class="version">20200407DC</i>'],
    ['StockfishNNUE 20200704-StockFiNN-0.2', undefined, 21, 'StockfishNNUE <i class="version version-small">20200704-StockFiNN-0.2</i>'],
    ['Stoofvlees II a14', undefined, undefined, 'Stoofvlees <i class="version">II a14</i>'],
    ['Stoofvlees II a14', true, undefined, 'Stoofvlees<div class="version">II a14</div>'],
    ['Stoofvlees II a14', true, 1, 'Stoofvlees<div class="version version-small">II a14</div>'],
    ['SuperBaronizer', undefined, undefined, 'SuperBaronizer'],
].forEach(([text, multi_line, scale, answer], id) => {
    test(`format_engine:${id}`, () => {
        expect(format_engine(text, multi_line, scale)).toEqual(answer);
    });
});

// format_eval
[
    ['', null, undefined, null],
    ['', NaN, undefined, NaN],
    ['', Infinity, undefined, 'Infinity'],
    ['', '', undefined, ''],
    ['', 0, undefined, '0.00'],
    ['always', 0, true, '<i>0.</i><i class="smaller">00</i>'],
    ['always', 0, false, '0.00'],
    ['>= 10', 0, true, '0.00'],
    ['always', 0, true, '<i>0.</i><i class="smaller">00</i>'],
    ['always', 0.98, true, '<i>0.</i><i class="smaller">98</i>'],
    ['always', 0.987654321, false, '0.99'],
    ['always', 0.987654321, true, '<i>0.</i><i class="smaller">99</i>'],
    ['always', '150.142', true, '<i>150.</i><i class="smaller">14</i>'],
    ['always', 10.15535, true, '<i>10.</i><i class="smaller">16</i>'],
    ['>= 10', 10.15535, true, '<i>10.</i><i class="smaller">16</i>'],
    ['>= 100', 10.15535, true, '10.16'],
    ['always', -198.42, true, '<i>-198.</i><i class="smaller">42</i>'],
    ['always', '-198.42', true, '<i>-198.</i><i class="smaller">42</i>'],
    ['never', '-198.42', true, '-198.42'],
    ['always', 'M#43', true, 'M#43'],
].forEach(([small_decimal, value, process, answer], id) => {
    test(`format_eval:${id}`, () => {
        Y.small_decimal = small_decimal;
        expect(format_eval(value, process)).toEqual(answer);
    });
});

// format_fen
[
    ['1r4k1/8/1P1p1pP1/p2P4/2P2P2/P4N2/5K2/4R3 w - - 0 48', '<i class="nowrap">1r4k1</i>/<i class="nowrap">8</i>/<i class="nowrap">1P1p1pP1</i>/<i class="nowrap">p2P4</i>/<i class="nowrap">2P2P2</i>/<i class="nowrap">P4N2</i>/<i class="nowrap">5K2</i>/<i class="nowrap">4R3</i> <i class="nowrap">w - - 0 48</i>'],
    ['8/3R2r1/8/4p1k1/4P3/5K2/8/8 b - - 0 91', '<i class="nowrap">8</i>/<i class="nowrap">3R2r1</i>/<i class="nowrap">8</i>/<i class="nowrap">4p1k1</i>/<i class="nowrap">4P3</i>/<i class="nowrap">5K2</i>/<i class="nowrap">8</i>/<i class="nowrap">8</i> <i class="nowrap">b - - 0 91</i>'],
].forEach(([fen, answer], id) => {
    test(`format_fen:${id}`, () => {
        expect(format_fen(fen)).toEqual(answer);
    });
});

// format_hhmmss
[
    [null, '00:00:00'],
    [NaN, 'aN:aN:aN'],
    [Infinity, 'Infinityd, aN:aN:aN'],
    ['', '00:00:00'],
    [0, '00:00:00'],
    [31, '00:00:31'],
    [314, '00:05:14'],
    [3141, '00:52:21'],
    [31415, '08:43:35'],
    [314159, '3d, 15:15:59'],
].forEach(([seconds, answer], id) => {
    test(`format_hhmmss:${id}`, () => {
        expect(format_hhmmss(seconds)).toEqual(answer);
    });
});

// format_opening
[
    ['', ''],
    [undefined, ''],
    [
        "Alekhine's defence, modern, Larsen variation",
        '<i class="nowrap">Alekhine\'s defence</i><i class="small">, modern, Larsen&nbsp;variation</i>',
    ],
    [
        'English, Neo-Catalan accepted',
        '<i class="nowrap">English</i><i class="small">, Neo-Catalan&nbsp;accepted</i>',
    ],
    [
        'Sicilian, Nimzovich-Rossolimo attack (with ...g6, without ...d6)',
        '<i class="nowrap">Sicilian</i><i class="small">, Nimzovich-Rossolimo&nbsp;attack (with&nbsp;...g6,&nbsp;without&nbsp;...d6)</i>',
    ],
].forEach(([text, answer], id) => {
    test(`format_opening:${id}`, () => {
        expect(format_opening(text)).toEqual(answer);
    });
});

// format_percent
[
    [null, '0%'],
    [NaN, 'NaN%'],
    [Infinity, 'Infinity%'],
    ['', '0%'],
    [0, '0%'],
    [0.98, '98%'],
    [0.987654321, '98.77%'],
    ['150', '15000%'],
].forEach(([value, answer], id) => {
    test(`format_percent:${id}`, () => {
        expect(format_percent(value)).toEqual(answer);
    });
});

// get_short_name
[
    ['', ''],
    [undefined, ''],
    ['Fire 8_beta', 'Fire'],
    ['LCZero v0.24-sv-t60-3010', 'LCZero'],
    ['Stockfish 20200407DC', 'Stockfish'],
    ['Stoofvlees II a14', 'Stoofvlees'],
    ['SuperBaronizer', 'Baron'],
].forEach(([text, answer], id) => {
    test(`get_short_name:${id}`, () => {
        expect(get_short_name(text)).toEqual(answer);
    });
});

// parse_date_time
[
    ['', 0],
    [undefined, 0],
    ['2020-06-11T01:43:15Z', 1591839795],
    ['2020-06-11T01:43:15+00:00', 1591839795],
    ['2020-06-11T01:43:15+01:00', 1591836195],
    ['01:43:15 on 2020-06-11', 1591839795],
    ['2020-06-11 01:43:15 UTC', 1591839795],
    ['2020-06-11 01:43:15Z', 1591839795],
].forEach(([text, answer], id) => {
    test(`parse_date_time:${id}`, () => {
        expect(parse_date_time(text)).toEqual(answer);
    });
});

// parse_pgn
[
    [
        `
        [Event "F/S Return Match"]
        [Site "Belgrade, Serbia JUG"]
        [Date "1992.11.04"]
        [Round "29"]
        [White "Fischer, Robert J."]
        [Black "Spassky, Boris V."]
        [Result "1/2-1/2"]

        1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 {This opening is called the Ruy Lopez.}
        4. Ba4 Nf6 5. O-O 1/2-1/2
        `,
        {
            Headers: {
                Black: 'Spassky, Boris V.',
                Date: '1992.11.04',
                Event: 'F/S Return Match',
                Result: '1/2-1/2',
                Round: '29',
                Site: 'Belgrade, Serbia JUG',
                White: 'Fischer, Robert J.',
            },
            Moves: [
                {m: 'e4', ply: 0},
                {m: 'e5', ply: 1},
                {m: 'Nf3', ply: 2},
                {m: 'Nc6', ply: 3},
                {m: 'Bb5', ply: 4},
                {m: 'a6', ply: 5, 'This opening is called the Ruy Lopez.': true},
                {m: 'Ba4', ply: 6},
                {m: 'Nf6', ply: 7},
                {m: 'O-O', ply: 8},
            ]
        },
    ],
    [
        `
        [Event "TCEC Season 18 - Division P"]
        [Site "https://tcec-chess.com"]
        [Date "2020.06.10"]
        [Round "33.3"]
        [White "Stoofvlees II a14"]
        [Black "LCZero v0.25.1-sv-t60-3010"]
        [Result "*"]
        [BlackElo "3809"]
        [ECO "A43"]
        [GameStartTime "2020-06-10T16:54:26.260 UTC"]
        [Opening "Old Benoni defence"]
        [Termination "unterminated"]
        [TimeControl "5400+10"]
        [WhiteElo "3730"]

        {WhiteEngineOptions: Protocol=uci; Hash=8192; CPUs=20; Threads per GPU=3; SyzygyPath=/home/syzygy; CommandLineOptions=;, BlackEngineOptions: Protocol=uci; MoveOverheadMs=1000; WeightsFile=384x30-t60-3010.pb.gz; Threads=2; Backend=demux; BackendOptions=backend=cudnn-fp16,custom_winograd=true,(gpu=0),(gpu=1),(gpu=2),(gpu=3); NNCacheSize=20000000; MinibatchSize=320; MaxPrefetch=160; MaxCollisionEvents=917; MaxOutOfOrderEvalsFactor=2.4; CPuct=2.147; CPuctAtRoot=2.147; CPuctBase=18368; FpuValue=0.443; CPuctFactor=2.815; PolicyTemperature=1.607; SmartPruningMinimumBatches=600; VerboseMoveStats=true; SyzygyPath=/home/syzygy; LogFile=lc0.log; Ponder=false; UCI_ShowWDL=true; StrictTiming=true; CommandLineOptions=--strict-uci-timing --show-wdl;}
        1. d4 {book, mb=+0+0+0+0+0,} c5 {book, mb=+0+0+0+0+0,}
        2. d5 {book, mb=+0+0+0+0+0,} d6 {book, mb=+0+0+0+0+0,}
        3. c4 {book, mb=+0+0+0+0+0,} g6 {book, mb=+0+0+0+0+0,}
        4. Nc3 {book, mb=+0+0+0+0+0,} Bg7 {book, mb=+0+0+0+0+0,}
        5. g3 {book, mb=+0+0+0+0+0,} Nf6 {book, mb=+0+0+0+0+0,}
        6. Bg2 {book, mb=+0+0+0+0+0,} O-O {book, mb=+0+0+0+0+0,}
        7. Nf3 {book, mb=+0+0+0+0+0,} Na6 {book, mb=+0+0+0+0+0,}
        8. O-O {book, mb=+0+0+0+0+0,} Nc7 {book, mb=+0+0+0+0+0,}
        9. e4 {d=21, sd=57, mt=192630, tl=5217370, s=19738, n=3801954, pv=e4 b6 Bg5 Ba6 Qd3 e6 h3 Re8 Bh4 exd5 exd5 Qd7 a4 Qf5 Qxf5 gxf5 Nd2 Nd7 Rfe1 Ne5 Bf1 Ng6 Bg5 h6 Be3 Bc8 Nf3 Bd7 Kg2 Na6 Bd2 Nb4 Rxe8+ Rxe8 a5, tb=0, h=8.0, ph=0.0, wv=0.72, R50=50, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        e5 {d=14, sd=63, mt=106883, tl=5303117, s=45929, n=4908274, pv=e5 Qe2 b6 a3 Ng4 Bd2 Bd7 a4 a6 Rfb1 a5 Bh3 Qe7 Nh4 Nh6 Bxd7 Qxd7 Rf1 Rae8 Rae1 f5 exf5 Nxf5, tb=0, h=0.0, ph=0.0, wv=0.46, R50=50, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        10. Ne1 {d=21, sd=62, mt=178275, tl=5049095, s=19793, n=3528600, pv=Ne1 Bd7 a4 Na6 Bg5 h6 Bd2 Nb4 a5 b6 axb6 axb6 Ra3 Ra5 Qb3 Nh7 Nb5 Bxb5 cxb5 Qd7 Bxb4 cxb4 Qxb4 Qxb5 Qxb5 Rxb5 Nd3 Ra5 Rb3 Rb8 Nb4 Rba8 Nc6 R5a6 f3 h5 h4 Bh6 Bh3 Kg7 Kf2 Nf6 Ke2 Kf8 Kd3 Kg7 Ke2, tb=0, h=9.8, ph=0.0, wv=0.78, R50=49, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        Bd7 {d=16, sd=62, pd=Qe2, mt=137082, tl=5176035, s=45633, n=6277978, pv=Bd7 a4 Na6 Bg5 h6 Bd2 Nb4 a5 Kh7 Nb5 Ne8 Qb3 a6 Nc3 b6 axb6 Qxb6 Qd1 Qd8 Ra3 Qe7 Qe2 f5 exf5 gxf5 g4 fxg4 Be4+ Kg8 Bb1 Nf6 Ng2 e4, tb=0, h=0.0, ph=0.0, wv=0.40, R50=49, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        `,
        {
            BlackEngineOptions: {
                Backend: 'demux',
                BackendOptions: 'backendcudnn-fp16,custom_winogradtrue,(gpu0),(gpu1),(gpu2),(gpu3)',
                CPuct: '2.147',
                CPuctAtRoot: '2.147',
                CPuctBase: '18368',
                CPuctFactor: '2.815',
                CommandLineOptions: '--strict-uci-timing --show-wdl',
                FpuValue: '0.443',
                LogFile: 'lc0.log',
                MaxCollisionEvents: '917',
                MaxOutOfOrderEvalsFactor: '2.4',
                MaxPrefetch: '160',
                MinibatchSize: '320',
                MoveOverheadMs: '1000',
                NNCacheSize: '20000000',
                PolicyTemperature: '1.607',
                Ponder: 'false',
                Protocol: 'uci',
                SmartPruningMinimumBatches: '600',
                StrictTiming: 'true',
                SyzygyPath: '/home/syzygy',
                Threads: '2',
                UCI_ShowWDL: 'true',
                VerboseMoveStats: 'true',
                WeightsFile: '384x30-t60-3010.pb.gz',
            },
            Headers: {
                Black: 'LCZero v0.25.1-sv-t60-3010',
                BlackElo: '3809',
                Date: '2020.06.10',
                ECO: 'A43',
                Event: 'TCEC Season 18 - Division P',
                GameStartTime: '2020-06-10T16:54:26.260 UTC',
                Opening: 'Old Benoni defence',
                Result: '*',
                Round: '33.3',
                Site: 'https://tcec-chess.com',
                Termination: 'unterminated',
                TimeControl: '5400+10',
                White: 'Stoofvlees II a14',
                WhiteElo: '3730',
            },
            Moves: [
                {
                    book: true,
                    m: 'd4',
                    mb: '+0+0+0+0+0',
                    ply: 0,
                },
                {
                    book: true,
                    m: 'c5',
                    mb: '+0+0+0+0+0',
                    ply: 1,
                },
                {
                    book: true,
                    m: 'd5',
                    mb: '+0+0+0+0+0',
                    ply: 2,
                },
                {
                    book: true,
                    m: 'd6',
                    mb: '+0+0+0+0+0',
                    ply: 3,
                },
                {
                    book: true,
                    m: 'c4',
                    mb: '+0+0+0+0+0',
                    ply: 4,
                },
                {
                    book: true,
                    m: 'g6',
                    mb: '+0+0+0+0+0',
                    ply: 5,
                },
                {
                    book: true,
                    m: 'Nc3',
                    mb: '+0+0+0+0+0',
                    ply: 6,
                },
                {
                    book: true,
                    m: 'Bg7',
                    mb: '+0+0+0+0+0',
                    ply: 7,
                },
                {
                    book: true,
                    m: 'g3',
                    mb: '+0+0+0+0+0',
                    ply: 8,
                },
                {
                    book: true,
                    m: 'Nf6',
                    mb: '+0+0+0+0+0',
                    ply: 9,
                },
                {
                    book: true,
                    m: 'Bg2',
                    mb: '+0+0+0+0+0',
                    ply: 10,
                },
                {
                    book: true,
                    m: 'O-O',
                    mb: '+0+0+0+0+0',
                    ply: 11,
                },
                {
                    book: true,
                    m: 'Nf3',
                    mb: '+0+0+0+0+0',
                    ply: 12,
                },
                {
                    book: true,
                    m: 'Na6',
                    mb: '+0+0+0+0+0',
                    ply: 13,
                },
                {
                    book: true,
                    m: 'O-O',
                    mb: '+0+0+0+0+0',
                    ply: 14,
                },
                {
                    book: true,
                    m: 'Nc7',
                    mb: '+0+0+0+0+0',
                    ply: 15,
                },
                {
                    R50: 50,
                    Rd: -11,
                    Rr: -11,
                    d: 21,
                    h: '8.0',
                    m: 'e4',
                    mb: '+0+0+0+0+0',
                    mt: 192630,
                    n: 3801954,
                    ph: '0.0',
                    ply: 16,
                    pv: '9. e4 b6 10. Bg5 Ba6 11. Qd3 e6 12. h3 Re8 13. Bh4 exd5 14. exd5 Qd7 15. a4 Qf5 16. Qxf5 gxf5 17. Nd2 Nd7 18. Rfe1 Ne5 19. Bf1 Ng6 20. Bg5 h6 21. Be3 Bc8 22. Nf3 Bd7 23. Kg2 Na6 24. Bd2 Nb4 25. Rxe8+ Rxe8 26. a5',
                    s: 19738,
                    sd: 57,
                    tb: 0,
                    tl: 5217370,
                    wv: '0.72',
                },
                {
                    R50: 50,
                    Rd: -11,
                    Rr: -11,
                    d: 14,
                    h: '0.0',
                    m: 'e5',
                    mb: '+0+0+0+0+0',
                    mt: 106883,
                    n: 4908274,
                    ph: '0.0',
                    ply: 17,
                    pv: '9...e5 10. Qe2 b6 11. a3 Ng4 12. Bd2 Bd7 13. a4 a6 14. Rfb1 a5 15. Bh3 Qe7 16. Nh4 Nh6 17. Bxd7 Qxd7 18. Rf1 Rae8 19. Rae1 f5 20. exf5 Nxf5',
                    s: 45929,
                    sd: 63,
                    tb: 0,
                    tl: 5303117,
                    wv: '0.46',
                },
                {
                    R50: 49,
                    Rd: -11,
                    Rr: -11,
                    d: 21,
                    h: '9.8',
                    m: 'Ne1',
                    mb: '+0+0+0+0+0',
                    mt: 178275,
                    n: 3528600,
                    ph: '0.0',
                    ply: 18,
                    pv: '10. Ne1 Bd7 11. a4 Na6 12. Bg5 h6 13. Bd2 Nb4 14. a5 b6 15. axb6 axb6 16. Ra3 Ra5 17. Qb3 Nh7 18. Nb5 Bxb5 19. cxb5 Qd7 20. Bxb4 cxb4 21. Qxb4 Qxb5 22. Qxb5 Rxb5 23. Nd3 Ra5 24. Rb3 Rb8 25. Nb4 Rba8 26. Nc6 R5a6 27. f3 h5 28. h4 Bh6 29. Bh3 Kg7 30. Kf2 Nf6 31. Ke2 Kf8 32. Kd3 Kg7 33. Ke2',
                    s: 19793,
                    sd: 62,
                    tb: 0,
                    tl: 5049095,
                    wv: '0.78',
                },
                {
                    R50: 49,
                    Rd: -11,
                    Rr: -11,
                    d: 16,
                    h: '0.0',
                    m: 'Bd7',
                    mb: '+0+0+0+0+0',
                    mt: 137082,
                    n: 6277978,
                    pd: 'Qe2',
                    ph: '0.0',
                    ply: 19,
                    pv: '10...Bd7 11. a4 Na6 12. Bg5 h6 13. Bd2 Nb4 14. a5 Kh7 15. Nb5 Ne8 16. Qb3 a6 17. Nc3 b6 18. axb6 Qxb6 19. Qd1 Qd8 20. Ra3 Qe7 21. Qe2 f5 22. exf5 gxf5 23. g4 fxg4 24. Be4+ Kg8 25. Bb1 Nf6 26. Ng2 e4',
                    s: 45633,
                    sd: 62,
                    tb: 0,
                    tl: 5176035,
                    wv: '0.40',
                },
            ],
            WhiteEngineOptions: {
                CPUs: '20',
                CommandLineOptions: '',
                Hash: '8192',
                Protocol: 'uci',
                SyzygyPath: '/home/syzygy',
                'Threads per GPU': '3',
            },
        },
    ],
    [
        `


        [Event "TCEC Season 18 - Division P"]
        [Site "https://tcec-chess.com"]
        [Date "2020.06.11"]
        [Round "34.4"]
        [White "AllieStein v0.7_dev-net_14.3"]
        [Black "Komodo 2551.00"]

        [Result "1-0"]
        [BlackElo "3743"]
        [ECO "B12"]
        [GameDuration "03:20:37"]
        [GameEndTime "2020-06-11T10:55:20.131 UTC"]
        [GameStartTime "2020-06-11T07:34:42.280 UTC"]
        [Opening "Caro-Kann"]
        [PlyCount "148"]
        [Termination "adjudication"]
        [TerminationDetails "TCEC win rule"]
        [TimeControl "5400+10"]
        [Variation "advance variation"]
        [WhiteElo "3761"]

        {WhiteEngineOptions: Protocol=uci; GPUCores=4; Cache=20000000; MoveOverhead=2000; MaxBatchSize=160; OpeningTimeFactor=2.22; TryPlayoutLimit=80; UseFP16=true; UseCustomWinograd=true; SyzygyPath=/home/syzygy/; CommandLineOptions=;, BlackEngineOptions: Protocol=uci; Threads=176; Hash=65536; SyzygyPath=/home/syzygy/; Overhead ms=75; Time Usage=0; Table Memory=1024; Syzygy Probe Limit=6; Syzygy Probe Depth=2; Smart Syzygy=false; OwnBook=false; Ponder=false;}
        1. e4 {book, mb=+0+0+0+0+0,} c6 {book, mb=+0+0+0+0+0,}
        2. d4 {book, mb=+0+0+0+0+0,} d5 {book, mb=+0+0+0+0+0,}
        3. e5 {book, mb=+0+0+0+0+0,} Bf5 {book, mb=+0+0+0+0+0,}
        4. Nf3 {book, mb=+0+0+0+0+0,} e6 {book, mb=+0+0+0+0+0,}
        5. Be2 {book, mb=+0+0+0+0+0,} Nd7 {book, mb=+0+0+0+0+0,}
        6. O-O {book, mb=+0+0+0+0+0,} Ne7 {book, mb=+0+0+0+0+0,}
        7. Nbd2 {book, mb=+0+0+0+0+0,} Rc8 {book, mb=+0+0+0+0+0,}
        8. Re1 {book, mb=+0+0+0+0+0,} Ng6 {book, mb=+0+0+0+0+0,}
        9. Nf1 {d=25, sd=66, mt=271954, tl=5138046, s=386890, n=104253574, pv=Nf1 c5 Ne3 Be4 c3 Ne7 c4 Nc6 cxd5 exd5 Bd3 cxd4 Nxd4 Nc5 Nxc6 bxc6 Bxe4 Nxe4 Nf5 Qd7 Qf3 h5 h4 g6 Ng3 Nc5 Bg5 Bg7 Qa3 Ne6 Bf6 Bxf6 exf6 Qd8 Re3, tb=0, h=98.6, ph=0.0, wv=0.58, R50=48, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        c5 {d=43, sd=43, mt=343204, tl=5066796, s=142242314, n=48818131317, pv=c5 c3 Ne7, tb=2074, h=100.0, ph=0.0, wv=0.72, R50=50, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        10. c3 {d=42, sd=57, pd=c5, mt=16209, tl=5131837, s=289034, n=4684667, pv=c3 Nh4 Nxh4 Qxh4 Bb5 a6 Bxd7+ Kxd7 dxc5 Bxc5 Be3 Qg4 Qd2 Be7 Ng3 Rhd8 Bb6 Rh8 a4 Rc6 a5 Rhc8 f3 Qg5 Be3 Qg6 Ra4 h6 Rf4 Bd3 Ne4 Bc4 b4 Ke8 Rg4 Qh7 Nc5 Bb5 Qd1, tb=0, h=92.4, ph=100.0, wv=0.57, R50=50, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        *
        `,
        {
            BlackEngineOptions: {
                Hash: '65536',
                'Overhead ms': '75',
                OwnBook: 'false',
                Ponder: 'false',
                Protocol: 'uci',
                'Smart Syzygy': 'false',
                'Syzygy Probe Depth': '2',
                'Syzygy Probe Limit': '6',
                SyzygyPath: '/home/syzygy/',
                'Table Memory': '1024',
                Threads: '176',
                'Time Usage': '0',
            },
            Headers: {
                Black: 'Komodo 2551.00',
                BlackElo: '3743',
                Date: '2020.06.11',
                ECO: 'B12',
                Event: 'TCEC Season 18 - Division P',
                GameDuration: '03:20:37',
                GameEndTime: '2020-06-11T10:55:20.131 UTC',
                GameStartTime: '2020-06-11T07:34:42.280 UTC',
                Opening: 'Caro-Kann',
                PlyCount: '148',
                Result: '1-0',
                Round: '34.4',
                Site: 'https://tcec-chess.com',
                Termination: 'adjudication',
                TerminationDetails: 'TCEC win rule',
                TimeControl: '5400+10',
                Variation: 'advance variation',
                White: 'AllieStein v0.7_dev-net_14.3',
                WhiteElo: '3761',
            },
            Moves: [
                {
                    book: true,
                    m: 'e4',
                    mb: '+0+0+0+0+0',
                    ply: 0,
                },
                {
                    book: true,
                    m: 'c6',
                    mb: '+0+0+0+0+0',
                    ply: 1,
                },
                {
                    book: true,
                    m: 'd4',
                    mb: '+0+0+0+0+0',
                    ply: 2,
                },
                {
                    book: true,
                    m: 'd5',
                    mb: '+0+0+0+0+0',
                    ply: 3,
                },
                {
                    book: true,
                    m: 'e5',
                    mb: '+0+0+0+0+0',
                    ply: 4,
                },
                {
                    book: true,
                    m: 'Bf5',
                    mb: '+0+0+0+0+0',
                    ply: 5,
                },
                {
                    book: true,
                    m: 'Nf3',
                    mb: '+0+0+0+0+0',
                    ply: 6,
                },
                {
                    book: true,
                    m: 'e6',
                    mb: '+0+0+0+0+0',
                    ply: 7,
                },
                {
                    book: true,
                    m: 'Be2',
                    mb: '+0+0+0+0+0',
                    ply: 8,
                },
                {
                    book: true,
                    m: 'Nd7',
                    mb: '+0+0+0+0+0',
                    ply: 9,
                },
                {
                    book: true,
                    m: 'O-O',
                    mb: '+0+0+0+0+0',
                    ply: 10,
                },
                {
                    book: true,
                    m: 'Ne7',
                    mb: '+0+0+0+0+0',
                    ply: 11,
                },
                {
                    book: true,
                    m: 'Nbd2',
                    mb: '+0+0+0+0+0',
                    ply: 12,
                },
                {
                    book: true,
                    m: 'Rc8',
                    mb: '+0+0+0+0+0',
                    ply: 13,
                },
                {
                    book: true,
                    m: 'Re1',
                    mb: '+0+0+0+0+0',
                    ply: 14,
                },
                {
                    book: true,
                    m: 'Ng6',
                    mb: '+0+0+0+0+0',
                    ply: 15,
                },
                {
                    R50: 48,
                    Rd: -11,
                    Rr: -11,
                    d: 25,
                    h: '98.6',
                    m: 'Nf1',
                    mb: '+0+0+0+0+0',
                    mt: 271954,
                    n: 104253574,
                    ph: '0.0',
                    ply: 16,
                    pv: '9. Nf1 c5 10. Ne3 Be4 11. c3 Ne7 12. c4 Nc6 13. cxd5 exd5 14. Bd3 cxd4 15. Nxd4 Nc5 16. Nxc6 bxc6 17. Bxe4 Nxe4 18. Nf5 Qd7 19. Qf3 h5 20. h4 g6 21. Ng3 Nc5 22. Bg5 Bg7 23. Qa3 Ne6 24. Bf6 Bxf6 25. exf6 Qd8 26. Re3',
                    s: 386890,
                    sd: 66,
                    tb: 0,
                    tl: 5138046,
                    wv: '0.58',
                },
                {
                    R50: 50,
                    Rd: -11,
                    Rr: -11,
                    d: 43,
                    h: '100.0',
                    m: 'c5',
                    mb: '+0+0+0+0+0',
                    mt: 343204,
                    n: 48818131317,
                    ph: '0.0',
                    ply: 17,
                    pv: '9...c5 10. c3 Ne7',
                    s: 142242314,
                    sd: 43,
                    tb: 2074,
                    tl: 5066796,
                    wv: '0.72',
                },
                {
                    R50: 50,
                    Rd: -11,
                    Rr: -11,
                    d: 42,
                    h: '92.4',
                    m: 'c3',
                    mb: '+0+0+0+0+0',
                    mt: 16209,
                    n: 4684667,
                    pd: 'c5',
                    ph: '100.0',
                    ply: 18,
                    pv: '10. c3 Nh4 11. Nxh4 Qxh4 12. Bb5 a6 13. Bxd7+ Kxd7 14. dxc5 Bxc5 15. Be3 Qg4 16. Qd2 Be7 17. Ng3 Rhd8 18. Bb6 Rh8 19. a4 Rc6 20. a5 Rhc8 21. f3 Qg5 22. Be3 Qg6 23. Ra4 h6 24. Rf4 Bd3 25. Ne4 Bc4 26. b4 Ke8 27. Rg4 Qh7 28. Nc5 Bb5 29. Qd1',
                    s: 289034,
                    sd: 57,
                    tb: 0,
                    tl: 5131837,
                    wv: '0.57',
                },
            ],
            WhiteEngineOptions: {
                Cache: '20000000',
                CommandLineOptions: '',
                GPUCores: '4',
                MaxBatchSize: '160',
                MoveOverhead: '2000',
                OpeningTimeFactor: '2.22',
                Protocol: 'uci',
                SyzygyPath: '/home/syzygy/',
                TryPlayoutLimit: '80',
                UseCustomWinograd: 'true',
                UseFP16: 'true',
            },
        },
    ],
    [
        `
        [Event "Div3 promo engines gauntlet"]
        [Site "http://tcec.chessdom.com"]
        [Date "2019.03.22"]
        [Round "1.17"]
        [White "AllieStein dev"]
        [Black "Stockfish 210219[4cores]"]
        [Result "0-1"]
        [BlackElo "3521"]
        [ECO "B00"]
        [GameDuration "00:43:47"]
        [GameEndTime "2019-03-22T01:36:21.872 UTC"]
        [GameStartTime "2019-03-22T00:52:34.550 UTC"]
        [Opening "KP"]
        [PlyCount "408"]
        [Termination "adjudication"]
        [TerminationDetails "SyzygyTB"]
        [TimeControl "300+5"]
        [Variation "Nimzovich defence"]
        [WhiteElo "3200"]

        {WhiteEngineOptions: Protocol=uci; GPUCores=2; Hash=7168; MoveOverhead=2000; TreeSize=7168; MaxBatchSize=160; UseFP16=true; SyzygyPath=C:/Tb;, BlackEngineOptions: Protocol=uci; Hash=2048; Threads=4; SyzygyPath=/home/syzygy/; SyzygyProbeLimit=6; Move Overhead=1000; OwnBook=false; Ponder=false;}
        1. e4 {book, mb=+0+0+0+0+0,} Nc6 {book, mb=+0+0+0+0+0,}
        2. d4 {d=16, sd=33, mt=11501, tl=293499, s=50868, n=565352, pv=d4 d5 e5 Bf5 c3 e6 Nd2 Qd7 h4 h6 h5 f6 g4 Bh7 f4 O-O-O Ndf3 g6 hxg6 Bxg6 Nh3 h5 g5 fxg5 fxg5 Be4 Nf2 Nge7, tb=0, h=4.1, ph=0.0, wv=0.75, R50=50, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        d5 {d=25, sd=41, mt=23927, tl=281073, s=3763108, n=90043659, pv=d5 e5 Bf5 c3 e6 Be2 f6 f4 Nh6 Nf3 Be7 O-O O-O exf6 Bxf6 Nbd2 Be7 Nb3 Qd7 Ne5 Nxe5 fxe5 Bg6 Bxh6 gxh6 Rf3 Rxf3, tb=0, h=31.0, ph=0.0, wv=0.23, R50=50, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        3. e5 {d=21, sd=36, pd=d5, mt=11367, tl=287132, s=50349, n=478414, pv=e5 Bf5 c3 e6 Nd2 f6 f4 g5 Ndf3 gxf4 Bb5 fxe5 Nxe5 Qh4+ Kf1 Ne7 Ngf3 Qh5 Bxf4 Bg7 Kg1 O-O Nd7 Rf7 Ng5 Bg4 Qd2 Rxf4 Qxf4 e5, tb=0, h=7.6, ph=100.0, wv=0.62, R50=50, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        Bf5 {d=23, sd=36, pd=e5, mt=3567, tl=282506, s=3912544, n=13959958, pv=Bf5 Bb5 e6 Ne2 Qd7 c3 a6 Ba4 f6 O-O O-O-O f4 Nge7 Be3 Kb8 Nd2 Bg4 h3 Nf5 Bf2 Bxe2 Qxe2 Ncxd4 cxd4 Qxa4, tb=0, h=6.9, ph=100.0, wv=0.11, R50=49, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        `,
        {
            BlackEngineOptions: {
                Hash: '2048',
                'Move Overhead': '1000',
                OwnBook: 'false',
                Ponder: 'false',
                Protocol: 'uci',
                SyzygyPath: '/home/syzygy/',
                SyzygyProbeLimit: '6',
                Threads: '4',
            },
            Headers: {
                Black: 'Stockfish 210219[4cores]',
                BlackElo: '3521',
                Date: '2019.03.22',
                ECO: 'B00',
                Event: 'Div3 promo engines gauntlet',
                GameDuration: '00:43:47',
                GameEndTime: '2019-03-22T01:36:21.872 UTC',
                GameStartTime: '2019-03-22T00:52:34.550 UTC',
                Opening: 'KP',
                PlyCount: '408',
                Result: '0-1',
                Round: '1.17',
                Site: 'http://tcec.chessdom.com',
                Termination: 'adjudication',
                TerminationDetails: 'SyzygyTB',
                TimeControl: '300+5',
                Variation: 'Nimzovich defence',
                White: 'AllieStein dev',
                WhiteElo: '3200',
            },
            Moves: [
                {
                    book: true,
                    m: 'e4',
                    mb: '+0+0+0+0+0',
                    ply: 0,
                },
                {
                    book: true,
                    m: 'Nc6',
                    mb: '+0+0+0+0+0',
                    ply: 1,
                },
                {
                    R50: 50,
                    Rd: -11,
                    Rr: -11,
                    d: 16,
                    h: '4.1',
                    m: 'd4',
                    mb: '+0+0+0+0+0',
                    mt: 11501,
                    n: 565352,
                    ph: '0.0',
                    ply: 2,
                    pv: '2. d4 d5 3. e5 Bf5 4. c3 e6 5. Nd2 Qd7 6. h4 h6 7. h5 f6 8. g4 Bh7 9. f4 O-O-O 10. Ndf3 g6 11. hxg6 Bxg6 12. Nh3 h5 13. g5 fxg5 14. fxg5 Be4 15. Nf2 Nge7',
                    s: 50868,
                    sd: 33,
                    tb: 0,
                    tl: 293499,
                    wv: '0.75',
                },
                {
                    R50: 50,
                    Rd: -11,
                    Rr: -11,
                    d: 25,
                    h: '31.0',
                    m: 'd5',
                    mb: '+0+0+0+0+0',
                    mt: 23927,
                    n: 90043659,
                    ph: '0.0',
                    ply: 3,
                    pv: '2...d5 3. e5 Bf5 4. c3 e6 5. Be2 f6 6. f4 Nh6 7. Nf3 Be7 8. O-O O-O 9. exf6 Bxf6 10. Nbd2 Be7 11. Nb3 Qd7 12. Ne5 Nxe5 13. fxe5 Bg6 14. Bxh6 gxh6 15. Rf3 Rxf3',
                    s: 3763108,
                    sd: 41,
                    tb: 0,
                    tl: 281073,
                    wv: '0.23',
                },
                {
                    R50: 50,
                    Rd: -11,
                    Rr: -11,
                    d: 21,
                    h: '7.6',
                    m: 'e5',
                    mb: '+0+0+0+0+0',
                    mt: 11367,
                    n: 478414,
                    pd: 'd5',
                    ph: '100.0',
                    ply: 4,
                    pv: '3. e5 Bf5 4. c3 e6 5. Nd2 f6 6. f4 g5 7. Ndf3 gxf4 8. Bb5 fxe5 9. Nxe5 Qh4+ 10. Kf1 Ne7 11. Ngf3 Qh5 12. Bxf4 Bg7 13. Kg1 O-O 14. Nd7 Rf7 15. Ng5 Bg4 16. Qd2 Rxf4 17. Qxf4 e5',
                    s: 50349,
                    sd: 36,
                    tb: 0,
                    tl: 287132,
                    wv: '0.62',
                },
                {
                    R50: 49,
                    Rd: -11,
                    Rr: -11,
                    d: 23,
                    h: '6.9',
                    m: 'Bf5',
                    mb: '+0+0+0+0+0',
                    mt: 3567,
                    n: 13959958,
                    pd: 'e5',
                    ph: '100.0',
                    ply: 5,
                    pv: '3...Bf5 4. Bb5 e6 5. Ne2 Qd7 6. c3 a6 7. Ba4 f6 8. O-O O-O-O 9. f4 Nge7 10. Be3 Kb8 11. Nd2 Bg4 12. h3 Nf5 13. Bf2 Bxe2 14. Qxe2 Ncxd4 15. cxd4 Qxa4',
                    s: 3912544,
                    sd: 36,
                    tb: 0,
                    tl: 282506,
                    wv: '0.11',
                },
            ],
            WhiteEngineOptions: {
                GPUCores: '2',
                Hash: '7168',
                MaxBatchSize: '160',
                MoveOverhead: '2000',
                Protocol: 'uci',
                SyzygyPath: 'C',
                TreeSize: '7168',
                UseFP16: 'true',
            },
        },
    ],
    [
        `
        [Event "TCEC Cup 2 - Round 4 - Match 30"]
        [Site "http://tcec.chessdom.com"]
        [Date "2019.02.02"]
        [Round "8.1"]
        [White "LCZero v20.1-32742"]
        [Black "Komodo 2246.00"]
        [Result "1/2-1/2"]
        [BlackElo "3512"]
        [PlyCount "284"]
        [Termination "adjudication"]
        [TerminationDetails "TCEC draw rule"]
        [TimeControl "1800+5"]
        [WhiteElo "3404"]

        1. e4 e6 2. d4 d5 3. e5 c5 4. c3 Nc6 5. Nf3 Bd7 6. a3 c4 7. Be2 Nge7 8. Nbd2 Na5
        1/2-1/2
        `,
        {
            Headers: {
                Black: "Komodo 2246.00",
                BlackElo: "3512",
                Date: "2019.02.02",
                Event: "TCEC Cup 2 - Round 4 - Match 30",
                PlyCount: "284",
                Result: "1/2-1/2",
                Round: "8.1",
                Site: "http://tcec.chessdom.com",
                Termination: "adjudication",
                TerminationDetails: "TCEC draw rule",
                TimeControl: "1800+5",
                White: "LCZero v20.1-32742",
                WhiteElo: "3404",
            },
            Moves: [
                {m: 'e4', ply: 0},
                {m: 'e6', ply: 1},
                {m: 'd4', ply: 2},
                {m: 'd5', ply: 3},
                {m: 'e5', ply: 4},
                {m: 'c5', ply: 5},
                {m: 'c3', ply: 6},
                {m: 'Nc6', ply: 7},
                {m: 'Nf3', ply: 8},
                {m: 'Bd7', ply: 9},
                {m: 'a3', ply: 10},
                {m: 'c4', ply: 11},
                {m: 'Be2', ply: 12},
                {m: 'Nge7', ply: 13},
                {m: 'Nbd2', ply: 14},
                {m: 'Na5', ply: 15, },
            ],
        },
    ],
    [
        `
        [Round "23.2"]
        [White "LCZero v0.26.0-sv-t60-4229-mlh"]
        [Black "Stockfish 202007032109"]
        [Result "*"]
        [Termination "unterminated"]
        [TimeControl "3600+5"]

        1. a3 e5 2. c4 d6 3. g3 g6 4. Nc3 Bg7 5. Bg2 Ne7 6. Nf3 f5 7. O-O O-O 8. b4 h6 9. Bb2 Be6 10. d3 c6
        11. Nd2 Nd7 12. a4 g5 13. b5 Qc7 14. Qc2 Rad8 15. Ba3 Nf6 16. a5 c5 17. b6 axb6 18. Rfb1 Nc6 19. Rxb6 Nxa5 20. Rab1 Bc8
        21. Nd5 Qd7 22. Bb2 Kh8 23. Bc3 Nc6 24. Qb2 Qf7 25. Nxf6 Qxf6 26. Bxc6 bxc6 27. Rxc6 Rd7
        *
        `,
        {
            Headers: {
                White: 'LCZero v0.26.0-sv-t60-4229-mlh',
                Black: 'Stockfish 202007032109',
                Result: '*',
                Round: '23.2',
                Termination: 'unterminated',
                TimeControl: '3600+5',
            },
            Moves: [
                {m: 'a3', ply: 0},
                {m: 'e5', ply: 1},
                {m: 'c4', ply: 2},
                {m: 'd6', ply: 3},
                {m: 'g3', ply: 4},
                {m: 'g6', ply: 5},
                {m: 'Nc3', ply: 6},
                {m: 'Bg7', ply: 7},
                {m: 'Bg2', ply: 8},
                {m: 'Ne7', ply: 9},
                {m: 'Nf3', ply: 10},
                {m: 'f5', ply: 11},
                {m: 'O-O', ply: 12},
                {m: 'O-O', ply: 13},
                {m: 'b4', ply: 14},
                {m: 'h6', ply: 15},
                {m: 'Bb2', ply: 16},
                {m: 'Be6', ply: 17},
                {m: 'd3', ply: 18},
                {m: 'c6', ply: 19},
                {m: 'Nd2', ply: 20},
                {m: 'Nd7', ply: 21},
                {m: 'a4', ply: 22},
                {m: 'g5', ply: 23},
                {m: 'b5', ply: 24},
                {m: 'Qc7', ply: 25},
                {m: 'Qc2', ply: 26},
                {m: 'Rad8', ply: 27},
                {m: 'Ba3', ply: 28},
                {m: 'Nf6', ply: 29},
                {m: 'a5', ply: 30},
                {m: 'c5', ply: 31},
                {m: 'b6', ply: 32},
                {m: 'axb6', ply: 33},
                {m: 'Rfb1', ply: 34},
                {m: 'Nc6', ply: 35},
                {m: 'Rxb6', ply: 36},
                {m: 'Nxa5', ply: 37},
                {m: 'Rab1', ply: 38},
                {m: 'Bc8', ply: 39},
                {m: 'Nd5', ply: 40},
                {m: 'Qd7', ply: 41},
                {m: 'Bb2', ply: 42},
                {m: 'Kh8', ply: 43},
                {m: 'Bc3', ply: 44},
                {m: 'Nc6', ply: 45},
                {m: 'Qb2', ply: 46},
                {m: 'Qf7', ply: 47},
                {m: 'Nxf6', ply: 48},
                {m: 'Qxf6', ply: 49},
                {m: 'Bxc6', ply: 50},
                {m: 'bxc6', ply: 51},
                {m: 'Rxc6', ply: 52},
                {m: 'Rd7', ply: 53},
            ],
        },
    ],
].forEach(([data, answer], id) => {
    test(`parse_pgn:${id}`, () => {
        expect(parse_pgn(data)).toEqual(answer);
    });
});

// update_live_eval
[
    [
        `
        [Round "23.2"]
        [White "LCZero v0.26.0-sv-t60-4229-mlh"]
        [Black "Stockfish 202007032109"]
        [Result "*"]
        [Termination "unterminated"]
        [TimeControl "3600+5"]

        1. a3 e5 2. c4 d6 3. g3 g6 4. Nc3 Bg7 5. Bg2 Ne7 6. Nf3 f5 7. O-O O-O 8. b4 h6 9. Bb2 Be6 10. d3 c6
        11. Nd2 Nd7 12. a4 g5 13. b5 Qc7 14. Qc2 Rad8 15. Ba3 Nf6 16. a5 c5 17. b6 axb6 18. Rfb1 Nc6 19. Rxb6 Nxa5 20. Rab1 Bc8
        21. Nd5 Qd7 22. Bb2 Kh8 23. Bc3 Nc6 24. Qb2 Qf7 25. Nxf6 Qxf6 26. Bxc6 bxc6 27. Rxc6 Rd7
        *
        `,
        'live',
        {
            depth: '16/45',
            desc: '1x2080 Ti 7Men TB',
            engine: 'LCZero v0.26_dev-MLH-63653',
            eval: 0.14,
            nodes: 8526571,
            ply: 54,
            pv: '28. Rb6 Kh7 29. Rb8 Qf7 30. Qb5 Rc7 31. Qb6 Qd7 32. Qb5 Qe7 33. Qb6 Rf7 34. Ra1 e4 35. Bxg7 e3 36. Bc3 exd2 37. Qb2 Qxe2 38. Qxd2 Qxd2 39. Bxd2 f4 40. gxf4 gxf4 41. f3 Rg7+ 42. Kf2 Bh3 43. Rg1 Rxg1 44. Kxg1 Rg7+ 45. Kf2 Rg2+ 46. Ke1 Rg1+ 47. Ke2 Rg2+ 48. Kd1 Rf2',
            round: '23.2',
            speed: '33kn/s',
            tbhits: 0,
        },
        0,
        undefined,
        true,
    ],
    [
        `
        [Round "23.3"]
        [White "LCZero v0.26.0-sv-t60-4229-mlh"]
        [Black "Stockfish 202007032109"]
        [Result "*"]
        [Termination "unterminated"]
        [TimeControl "3600+5"]

        1. a3 e5 2. c4 d6 3. g3 g6 4. Nc3 Bg7 5. Bg2 Ne7 6. Nf3 f5 7. O-O O-O 8. b4 h6 9. Bb2 Be6 10. d3 c6
        11. Nd2 Nd7 12. a4 g5 13. b5 Qc7 14. Qc2 Rad8 15. Ba3 Nf6 16. a5 c5 17. b6 axb6 18. Rfb1 Nc6 19. Rxb6 Nxa5 20. Rab1 Bc8
        21. Nd5 Qd7 22. Bb2 Kh8 23. Bc3 Nc6 24. Qb2 Qf7 25. Nxf6 Qxf6 26. Bxc6 bxc6 27. Rxc6 Rd7
        *
        `,
        'live',
        {
            depth: '16/45',
            desc: '1x2080 Ti 7Men TB',
            engine: 'LCZero v0.26_dev-MLH-63653',
            eval: 0.14,
            nodes: 8526571,
            ply: 54,
            pv: '28. Rb6 Kh7 29. Rb8 Qf7 30. Qb5 Rc7 31. Qb6 Qd7 32. Qb5 Qe7 33. Qb6 Rf7 34. Ra1 e4 35. Bxg7 e3 36. Bc3 exd2 37. Qb2 Qxe2 38. Qxd2 Qxd2 39. Bxd2 f4 40. gxf4 gxf4 41. f3 Rg7+ 42. Kf2 Bh3 43. Rg1 Rxg1 44. Kxg1 Rg7+ 45. Kf2 Rg2+ 46. Ke1 Rg1+ 47. Ke2 Rg2+ 48. Kd1 Rf2',
            round: '23.2',
            speed: '33kn/s',
            tbhits: 0,
        },
        0,
        undefined,
        false,
    ],
].forEach(([data, section, edata, eid, force_ply, answer], id) => {
    test(`update_live_eval:${id}`, () => {
        update_pgn(section, data);
        expect(update_live_eval(section, edata, eid, force_ply)).toEqual(answer);
    });
});

// update_materials
[
    [{}, undefined],
    [{mb: '+1-1-1+2+0'}, '+1-1-1+2+0'],
    [{fen: '4q1k1/1p3p1n/4pB1p/1p1pP1pP/2r2P2/P5RR/1P3QPK/8 w - - 3 36', mb: '-1-1+1+1+0'}, '-1-1+1+1+0'],
    [{fen: '4q1k1/1p3p1n/4pB1p/1p1pP1pP/2r2P2/P5RR/1P3QPK/8 w - - 3 36', mb: '-1-1+5+5+0'}, '-1-1+5+5+0'],
    [{fen: '4q1k1/1p3p1n/4pB1p/1p1pP1pP/2r2P2/P5RR/1P3QPK/8 w - - 3 36'}, '-1-1+1+1+0'],
    [{fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1'}, '+0+0+0+0+0'],
    [{fen: '4b1k1/4q1R1/8/p2Pn3/5pQ1/7P/6P1/6RK b - - 0 43'}, '+1-1-1+2+0'],
].forEach(([move, answer], id) => {
    test(`update_materials:${id}`, () => {
        update_materials(move);
        expect(move.mb).toEqual(answer);
    });
});

// update_pgn
[
    ['live', null, false, 0],
    ['live', '', false, 0],
    ['live', 'HELP ME\n\n1 2 3\n*', false, 0],
    ['live', '[Round "0.7"]', false, 0],
    ['live', '[Round "0.8"]\n\n1. a3', true, 0],
    ['live', '[Round "0.9"]\n\n1. a3\n*', true, 1],
    [
        'live',
        `
        [Round "23.1"]
        [White "LCZero v0.26.0-sv-t60-4229-mlh"]
        [Black "Stockfish 202007032109"]
        [Result "*"]
        [Termination "unterminated"]
        [TimeControl "3600+5"]

        1. a3 e5 2. c4 d6 3. g3 g6 4. Nc3 Bg7 5. Bg2 Ne7 6. Nf3 f5 7. O-O O-O 8. b4 h6 9. Bb2 Be6 10. d3 c6
        11. Nd2 Nd7 12. a4 g5 13. b5 Qc7 14. Qc2 Rad8 15. Ba3 Nf6 16. a5 c5 17. b6 axb6 18. Rfb1 Nc6 19. Rxb6 Nxa5 20. Rab1 Bc8
        21. Nd5 Qd7 22. Bb2 Kh8 23. Bc3 Nc6 24. Qb2 Qf7 25. Nxf6 Qxf6 26. Bxc6 bxc6 27. Rxc6 Rd7
        *
        `,
        true,
        54,
    ],
].forEach(([section, data, answer, num_move], id) => {
    test(`update_pgn:${id}`, () => {
        let main = xboards[section];
        main.moves.length = 0;
        expect(update_pgn(section, data)).toEqual(answer);
        expect(main.moves.length).toEqual(num_move);
    });
});

// update_player_eval
[
    [
        {x: 'archive'},
        'live',
        {
            color: 0,
            depth: '10/41',
            engine: 'Stoofvlees II a14',
            eval: '0.41',
            nodes: '1.06k',
            plynum: 54,
            pv: '28. Rh1 Kg8 29. Rag1 Qe7 30. Ra1 Ng5 31. Ke2 Kf8 32. Rag1 Ke8 33. Rg2 Kd7 34. Kd1 Kc7 35. Kc2 Kb7 36. Bf4 Rh8 37. Kb2 Rg8 38. Kc2 Rh8',
            speed: '21.2 knps',
            tbhits: '0',
            time: 0.05,
        },
        false,
    ],
    [
        {x: 'live'},
        'live',
        {
            color: 0,
            depth: '10/41',
            engine: 'Stoofvlees II a14',
            eval: '0.41',
            nodes: '1.06k',
            plynum: 54,
            pv: '28. Rh1 Kg8 29. Rag1 Qe7 30. Ra1 Ng5 31. Ke2 Kf8 32. Rag1 Ke8 33. Rg2 Kd7 34. Kd1 Kc7 35. Kc2 Kb7 36. Bf4 Rh8 37. Kb2 Rg8 38. Kc2 Rh8',
            speed: '21.2 knps',
            tbhits: '0',
            time: 0.05,
        },
        true,
    ],
].forEach(([states, section, data, answer], id) => {
    test(`update_player_eval:${id}`, () => {
        Assign(Y, states);
        expect(update_player_eval(section, data)).toEqual(answer);
    });
});
