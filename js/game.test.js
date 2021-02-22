// game.test.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2021-02-21
/*
globals
expect, global, require, test
*/
'use strict';

let {Assign, FromTimestamp, IsArray, IsString, Keys, ParseJSON, Stringify, Undefined} = require('./common.js'),
    {DEV, load_defaults, set_section, Y} = require('./engine.js'),
    {
        analyse_log, calculate_h2h, calculate_probability, calculate_score, calculate_seeds, check_adjudication,
        check_boom, check_explosion, check_explosion_boom, copy_pgn, create_boards, create_game_link,
        current_archive_link, extract_threads, fix_header_opening, format_engine, format_fen, format_hhmmss,
        format_opening, format_percent, get_short_name, parse_date_time, parse_pgn, parse_time_control, tour_info,
        update_live_eval, update_materials, update_pgn, update_player_eval,
    } = require('./game.js'),
    {get_fen_ply, xboards} = require('./global.js'),
    {create_chart_data} = require('./graph.js'),
    {prepare_settings} = require('./startup.js'),
    {START_FEN} = require('./xboard.js');

global.T = null;

let PGN_HEADERS = [
    '[Event "TCEC Event"]',
    '[Site "https://tcec-chess.com"]',
    '[Date "{DATE}"]',
    '[Round "?"]',
    '[White "?"]',
    '[Black "?"]',
    '[Result "*"]',
    '[FEN "{FEN}"]',                        // 7
    '[SetUp "1"]',                          // 8
    '[Annotator "pv0"]',
    '',
    '',
];

prepare_settings();
load_defaults();
Y.volume = 0;
create_boards('text');
create_chart_data();

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function init_players(ply, players, evals) {
    evals.forEach((eval_, id) => {
        let player = players[id];
        Assign(player, {
            boom_ply: -1,
            boomed: 0,
            eval: eval_[ply],
            evals: [],
            short: `P${id}`,
        });
        Keys(eval_).forEach(key => {
            player.evals[key] = eval_[key];
        });
    });
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// analyse_log
[
    [
        'Q7/8/8/1k3p2/3Q4/3n4/6P1/6K1 b - - 2 73',
        [
            {name: 'Stockfish 202011101829_nn-c3ca321c51c9'},
            {name: 'Komodo 14.1'},
        ],
        '128877364 Komodo 14.1(71): info depth 91 time 568 nodes 2508046 score mate -4 nps 4407815 hashfull 0 tbhits 123007 pv d3c5 a8b8 c5b7 b8e8 b5a6 e8c6 a6a5 c6b6',
        1,
        {
            depth: 91, engine: 'Komodo 14.1', eval: 'M8', hashfull: 0, id: 1, mate: -4, nodes: 2508046, nps: 4407815,
            ply: 145, tbhits: 123007, time: 568,
            pv: 'd3c5 a8b8 c5b7 b8e8 b5a6 e8c6 a6a5 c6b6',
            pvs: {
                d3c5: [
                    'd3c5 a8b8 c5b7 b8e8 b5a6 e8c6 a6a5 c6b6',
                    'Nc5 Qb8+ Nb7 Qe8+ Ka6 Qc6+ Ka5 Qcb6#',
                ],
            },
        },
        'Nc5 Qb8+ Nb7 Qe8+ Ka6 Qc6+ Ka5 Qcb6#',
    ],
    [
        '8/P6R/3k3P/2nb1pp1/8/5P2/6P1/6K1 w - - 1 65',
        [
            {name: 'Stockfish 202011101829_nn-c3ca321c51c9'},
            {name: 'Komodo 14.1'},
        ],
        '128814060 Stockfish 202011101829_nn-c3ca321c51c9(70): info depth 77 seldepth 26 multipv 1 score mate 13 wdl 1000 0 0 nodes 575877930 nps 258009825 hashfull 21 tbhits 6492754 time 2232 pv h7g7 c5e6 g7g6 d6d7 h6h7 e6f8 g6g7 d7d6 h7h8q f8e6 g7g6 d6c5 g6e6 c5c4 e6d6 f5f4 h8c8 c4b5',
        0,
        {
            depth: 77, engine: 'Stockfish 202011101829_nn-c3ca321c51c9', eval: 'M25', hashfull: 21, id: 0, mate: 13,
            nodes: 575877930, nps: 258009825, ply: 128, seldepth: 26, tbhits: 6492754, time: 2232, wdl: '1000 0 0',
            pv: 'h7g7 c5e6 g7g6 d6d7 h6h7 e6f8 g6g7 d7d6 h7h8q f8e6 g7g6 d6c5 g6e6 c5c4 e6d6 f5f4 h8c8 c4b5',
            pvs: {
                h7g7: [
                    'h7g7 c5e6 g7g6 d6d7 h6h7 e6f8 g6g7 d7d6 h7h8q f8e6 g7g6 d6c5 g6e6 c5c4 e6d6 f5f4 h8c8 c4b5',
                    'Rg7 Ne6 Rg6 Kd7 h7 Nf8 Rg7+ Kd6 h8=Q Ne6 Rg6 Kc5 Rxe6 Kc4 Rd6 f4 Qc8+ Kb5',
                ],
            },
        },
        'Rg7 Ne6 Rg6 Kd7 h7 Nf8 Rg7+ Kd6 h8=Q Ne6 Rg6 Kc5 Rxe6 Kc4 Rd6 f4 Qc8+ Kb5',
    ],
    [
        '2kr2rn/ppppb2p/2n1p1b1/8/6B1/2N1P2N/PPPP3P/2KRBR2 w - - 6 11',
        [
            {name: 'Demolito dev-20201019'},
            {name: 'AllieStein v0.8-120f959_net-15.0'},
        ],
        '30158367 Demolito dev-20201019(14): info depth 27 score cp -7 time 16216 nodes 1793674384 hashfull 194 pv h3f4 d8f8 e1g3 g6f5 g4f5 f8f5 d2d4 g8f8 d4d5 e6d5 c3d5 e7d6 f1h1 d6f4 e3f4 h8g6 h1e1 d7d6',
        0,
        {
            cp: -7, depth: 27, engine: 'Demolito dev-20201019', eval: -0.07, hashfull: 194, id: 0, nodes: 1793674384,
            ply: 20, time: 16216,
            pv: 'h3f4 d8f8 e1g3 g6f5 g4f5 f8f5 d2d4 g8f8 d4d5 e6d5 c3d5 e7d6 f1h1 d6f4 e3f4 h8g6 h1e1 d7d6',
            pvs: {
                h3f4: [
                    'h3f4 d8f8 e1g3 g6f5 g4f5 f8f5 d2d4 g8f8 d4d5 e6d5 c3d5 e7d6 f1h1 d6f4 e3f4 h8g6 h1e1 d7d6',
                    'Nf4 Rdf8 Bg3 Bf5 Bxf5 Rxf5 d4 Rgf8 d5 exd5 Ncxd5 Bd6 Rh1 Bxf4 exf4 Ng6 Rhe1 d6',
                ],
            },
        },
        'Nf4 Rdf8 Bg3 Bf5 Bxf5 Rxf5 d4 Rgf8 d5 exd5 Ncxd5 Bd6 Rh1 Bxf4 exf4 Ng6 Rhe1 d6',
    ],
    [
        '2r3k1/1p2rpp1/6p1/2n3P1/p1P4P/P7/1P3PB1/3R1RK1 w - - 0 32',
        [
            {info: {pv: 'd1d6 g8f8 f1d1'}, name: 'KomodoDragon 2647.00'},
            {name: 'Stockfish 20201225'},
        ],
        '187833610 KomodoDragon 2647.00(50): info depth 32 time 17830 nodes 3285889668 score cp 226 lowerbound nps 184279613 hashfull 145 tbhits 139607 pv d1d6 e7e6 f1d1',
        0,
        {
            cp: 226, depth: 32, eval: 2.26, engine: 'KomodoDragon 2647.00', hashfull: 145, id: 0, nodes: 3285889668,
            nps: 184279613, ply: 62, tbhits: 139607, time: 17830,
            pv: 'd1d6 e7e6 f1d1',
            pvs: {d1d6: ['d1d6 e7e6 f1d1', 'Rd6 Re6 Rfd1']},
        },
        'Rd6 Re6 Rfd1',
    ],
    [
        '2r3k1/1p2rpp1/6p1/2n3P1/p1P4P/P7/1P3PB1/3R1RK1 w - - 0 32',
        [
            {
                info: {
                    pv: 'd1d6 e7e6 f1d1 e6d6',
                    pvs: {d1d6: ['d1d6 e7e6 f1d1 e6d6', 'Rd6 Re6 Rfd1 Rxd6']},
                },
                name: 'KomodoDragon 2647.00',
            },
            {name: 'Stockfish 20201225'},
        ],
        '187833610 KomodoDragon 2647.00(50): info depth 32 time 17830 nodes 3285889668 score cp 226 lowerbound nps 184279613 hashfull 145 tbhits 139607 pv d1d6 e7e6 f1d1',
        0,
        {
            cp: 226, depth: 32, eval: 2.26, engine: 'KomodoDragon 2647.00', hashfull: 145, id: 0, nodes: 3285889668,
            nps: 184279613, ply: 62, tbhits: 139607, time: 17830,
            pv: 'd1d6 e7e6 f1d1 e6d6',
            pvs: {d1d6: ['d1d6 e7e6 f1d1 e6d6', 'Rd6 Re6 Rfd1 Rxd6']},
        },
        'Rd6 Re6 Rfd1 | Rxd6',
    ],
    // 5
    [
        '2r3k1/1p2rpp1/6p1/2n3P1/p1P4P/P7/1P3PB1/3R1RK1 w - - 0 32',
        [
            {
                info: {
                    pv: 'e8e7 d1d6 e7e6 f1d1 e6d6',
                    pvs: {e8e7: ['e8e7 d1d6 e7e6 f1d1 e6d6', 'Re7 Rd6 Re6 Rfd1 Rxd6']},
                },
                name: 'KomodoDragon 2647.00',
            },
            {name: 'Stockfish 20201225'},
        ],
        '187833610 KomodoDragon 2647.00(50): info depth 32 time 17830 nodes 3285889668 score cp 226 lowerbound nps 184279613 hashfull 145 tbhits 139607 pv d1d6 e7e6',
        0,
        {
            cp: 226, depth: 32, eval: 2.26, engine: 'KomodoDragon 2647.00', hashfull: 145, id: 0, nodes: 3285889668,
            nps: 184279613, ply: 62, tbhits: 139607, time: 17830,
            pv: 'd1d6 e7e6',
            pvs: {
                e8e7: ['e8e7 d1d6 e7e6 f1d1 e6d6', 'Re7 Rd6 Re6 Rfd1 Rxd6'],
                d1d6: ['d1d6 e7e6', 'Rd6 Re6'],
            },
        },
        'Rd6 Re6',
    ],
    [
        '2r3k1/1p2rpp1/6p1/2n3P1/p1P4P/P7/1P3PB1/3R1RK1 w - - 0 32',
        [
            {
                info: {
                    ply: 60, pv: 'h2h4 e8e7 d1d6 e7e6 f1d1 e6d6',
                    pvs: {h2h4: ['h2h4 e8e7 d1d6 e7e6 f1d1 e6d6', 'h4 Re7 Rd6 Re6 Rfd1 Rxd6']},
                },
                name: 'KomodoDragon 2647.00',
            },
            {name: 'Stockfish 20201225'},
        ],
        '187833610 KomodoDragon 2647.00(50): info depth 32 time 17830 nodes 3285889668 score cp 226 lowerbound nps 184279613 hashfull 145 tbhits 139607 pv d1d6 e7e6',
        0,
        {
            cp: 226, depth: 32, eval: 2.26, engine: 'KomodoDragon 2647.00', hashfull: 145, id: 0, nodes: 3285889668,
            nps: 184279613, ply: 62, tbhits: 139607, time: 17830,
            pv: 'd1d6 e7e6 f1d1 e6d6',
            pvs: {
                h2h4: ['h2h4 e8e7 d1d6 e7e6 f1d1 e6d6', 'h4 Re7 Rd6 Re6 Rfd1 Rxd6'],
                d1d6: ['d1d6 e7e6 f1d1 e6d6', 'Rd6 Re6 Rfd1 Rxd6'],
            },
        },
        'Rd6 Re6 | Rfd1 Rxd6',
    ],
    [
        '2rb2kr/q4p2/b1n1pBp1/p2pP2p/2nP3P/P4NPN/2B2P2/1R1QR1K1 b - - 7 28',
        [
            {name: 'Stoofvlees II a16'},
            {
                info: {
                    ply: 53, pv: 'b6c4 g5f6 c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                    pvs: {
                        b6c4: [
                            'b6c4 g5f6 c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                            'Nc4 Bf6 Nxa3 Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
                        ],
                    },
                },
                name: 'Ethereal TCEC S20 DivP',
            },
        ],
        '219974502 Ethereal TCEC S20 DivP(59): info depth 32 seldepth 53 multipv 1 score cp -177 upperbound time 101648 nodes 14484705179 nps 142497000 tbhits 107098 hashfull 155 pv h8h7',
        1,
        {
            cp: -177, depth: 32, engine: 'Ethereal TCEC S20 DivP', eval: 1.77, hashfull: 155, id: 1, nodes: 14484705179,
            nps: 142497000, ply: 55, seldepth: 53, tbhits: 107098, time: 101648,
            pv: 'h8h7',
            pvs: {
                b6c4: [
                    'b6c4 g5f6 c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                    'Nc4 Bf6 Nxa3 Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
                ],
                h8h7: ['h8h7', 'Rh7'],
            },
        },
        'Rh7',
    ],
    [
        '2rb2kr/q4p2/b1n1pBp1/p2pP2p/2nP3P/P4NPN/2B2P2/1R1QR1K1 b - - 7 28',
        [
            {name: 'Stoofvlees II a16'},
            {
                info: {
                    ply: 53, pv: 'b6c4 g5f6 c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                    pvs: {
                        b6c4: [
                            'b6c4 g5f6 c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                            'Nc4 Bf6 Nxa3 Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
                        ],
                    },
                },
                name: 'Ethereal TCEC S20 DivP',
            },
        ],
        '219974502 Ethereal TCEC S20 DivP(59): info depth 32 seldepth 53 multipv 1 score cp -177 upperbound time 101648 nodes 14484705179 nps 142497000 tbhits 107098 hashfull 155 pv c4a3',
        1,
        {
            cp: -177, depth: 32, engine: 'Ethereal TCEC S20 DivP', eval: 1.77, hashfull: 155, id: 1, nodes: 14484705179,
            nps: 142497000, ply: 55, seldepth: 53, tbhits: 107098, time: 101648,
            pv: 'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
            pvs: {
                b6c4: [
                    'b6c4 g5f6 c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                    'Nc4 Bf6 Nxa3 Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
                ],
                c4a3: [
                    'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                    'Nxa3 Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
                ],
            },
        },
        'Nxa3 | Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
    ],
    [
        '2rb2kr/q4p2/b1n1pBp1/p2pP2p/2nP3P/P4NPN/2B2P2/1R1QR1K1 b - - 7 28',
        [
            {name: 'Stoofvlees II a16'},
            {
                info: {
                    ply: 55, pv: 'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                    pvs: {
                        c4a3: [
                            'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                            'Nxa3 Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
                        ],
                    },
                },
                name: 'Ethereal TCEC S20 DivP',
            },
        ],
        '219974502 Ethereal TCEC S20 DivP(59): info depth 32 seldepth 53 multipv 1 score cp -177 upperbound time 101648 nodes 14484705179 nps 142497000 tbhits 107098 hashfull 156 pv c4a3 b1c1',
        1,
        {
            cp: -177, depth: 32, engine: 'Ethereal TCEC S20 DivP', eval: 1.77, hashfull: 156, id: 1, nodes: 14484705179,
            nps: 142497000, ply: 55, seldepth: 53, tbhits: 107098, time: 101648,
            pv: 'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
            pvs: {
                c4a3: [
                    'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                    'Nxa3 Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
                ],
            },
        },
        'Nxa3 Rc1 | Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
    ],
    // 10
    [
        '2rb2kr/q4p2/b1n1pBp1/p2pP2p/2nP3P/P4NPN/2B2P2/1R1QR1K1 b - - 7 28',
        [
            {name: 'Stoofvlees II a16'},
            {
                info: {
                    ply: 55, pv: 'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                    pvs: {
                        c4a3: [
                            'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                            'Nxa3 Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
                        ],
                    },
                },
                name: 'Ethereal TCEC S20 DivP',
            },
        ],
        '219974502 Ethereal TCEC S20 DivP(59): info depth 32 seldepth 53 multipv 1 score cp -177 upperbound time 101648 nodes 14484705178 nps 142497000 tbhits 107098 hashfull 155 pv c4a3 b1b8',
        1,
        {
            cp: -177, depth: 32, engine: 'Ethereal TCEC S20 DivP', eval: 1.77, hashfull: 155, id: 1, nodes: 14484705178,
            nps: 142497000, ply: 55, seldepth: 53, tbhits: 107098, time: 101648,
            pv: 'c4a3 b1b8',
            pvs: {c4a3: ['c4a3 b1b8', 'Nxa3 Rb8']},
        },
        'Nxa3 Rb8',
    ],
    [
        '2rb2kr/q4p2/b1n1pBp1/p2pP2p/2nP3P/P4NPN/2B2P2/1R1QR1K1 b - - 7 28',
        [
            {name: 'Stoofvlees II a16'},
            {
                info: {
                    ply: 55, pv: 'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                    pvs: {
                        c4a3: [
                            'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                            'Nxa3 Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
                        ],
                    },
                },
                name: 'Ethereal TCEC S20 DivP',
            },
        ],
        '219974502 Ethereal TCEC S20 DivP(59): info depth 32 seldepth 53 multipv 1 score cp -177 upperbound time 101648 nodes 14484705177 nps 142497000 tbhits 107098 hashfull 155 pv ',
        1,
        {
            cp: -177, depth: 32, engine: 'Ethereal TCEC S20 DivP', eval: 1.77, hashfull: 155, id: 1, nodes: 14484705177,
            nps: 142497000, ply: 55, seldepth: 53, tbhits: 107098, time: 101648,
            pv: 'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
            pvs: {
                c4a3: [
                    'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                    'Nxa3 Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
                ],
            },
        },
        'Nxa3 Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
    ],
    [
        '2rb2kr/q4p2/b1n1pBp1/p2pP2p/2nP3P/P4NPN/2B2P2/1R1QR1K1 b - - 7 28',
        null,
        '219974502 Ethereal TCEC S20 DivP(59): info depth 32 seldepth 53 multipv 1 score cp -177 upperbound time 101648 nodes 14484705176 nps 142497000 tbhits 107098 hashfull 155 pv c4a3',
        1,
        {
            cp: -177, depth: 32, engine: 'Ethereal TCEC S20 DivP', eval: 1.77, hashfull: 155, id: 1, nodes: 14484705176,
            nps: 142497000, ply: 55, seldepth: 53, tbhits: 107098, time: 101648,
            pv: 'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
            pvs: {
                c4a3: [
                    'c4a3 b1c1 a3c2 c1c2 a6c4 d1d2 h8h7 h3g5 d8e7',
                    'Nxa3 Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
                ],
            },
        },
        'Nxa3 | Rc1 Nxc2 Rxc2 Bc4 Qd2 Rh7 Nhg5 Be7',
    ],
    [
        START_FEN,
        [
            {name: 'One'},
            {
                info: {
                    ply: -1, pv: 'e2e4 e7e5 b1c3',
                    pvs: {d2d4: ['d2d4 d7d5 g1f3', 'd4 d5 Nf3'], e2e4: ['e2e4 e7e5 b1c3', 'e4 e5 Nc3']},
                },
                name: 'Two',
            },
        ],
        '1000 Two(10): info depth 3 cp 50 pv d2d4',
        1,
        {
            cp: 50, depth: 3, engine: 'Two', eval: -0.5, id: 1, ply: 0,
            pv: 'd2d4 d7d5 g1f3',
            pvs: {
                d2d4: ['d2d4 d7d5 g1f3', 'd4 d5 Nf3'],
                e2e4: ['e2e4 e7e5 b1c3', 'e4 e5 Nc3'],
            },
        },
        'd4 | d5 Nf3',
    ],
    [
        START_FEN,
        [
            {name: 'One'},
            {
                info: {
                    ply: -1, pv: 'e2e4 e7e5 b1c3',
                    pvs: {d2d4: ['d2d4 d7d5 g1f3', 'd4 d5 Nf3'], e2e4: ['e2e4 e7e5 b1c3', 'e4 e5 Nc3']},
                },
                name: 'Two',
            },
        ],
        '1000 Two(10): info depth 3 cp 50 pv e2e4',
        1,
        {
            cp: 50, depth: 3, engine: 'Two', eval: -0.5, id: 1, ply: 0,
            pv: 'e2e4 e7e5 b1c3',
            pvs: {
                d2d4: ['d2d4 d7d5 g1f3', 'd4 d5 Nf3'],
                e2e4: ['e2e4 e7e5 b1c3', 'e4 e5 Nc3'],
            },
        },
        'e4 | e5 Nc3',
    ],
].forEach(([fen, players_, line, player_id, answer, answer_san], id) => {
    test(`analyse_log:${id}`, () => {
        let main = xboards.live,
            players = xboards.live.players,
            ply = get_fen_ply(fen);

        main.moves.length = 0;
        if (ply >= 0)
            main.moves[ply] = {fen: fen, ply: ply};
        if (players_) {
            for (let player of players_) {
                let info = player.info;
                if (!info)
                    continue;
                if (!info.pvs) {
                    let pv = info.pv;
                    if (pv)
                        info.pvs = {[pv.split(' ')[0]]: pv};
                }
                let pvs = info.pvs;
                Keys(pvs).forEach(key => {
                    let [pv, moves] = pvs[key];
                    if (IsString(moves))
                        pvs[key] = [pv, moves.split(' ').map(item => ({m: item}))];
                });
            }
            players[0] = players_[0];
            players[1] = players_[1];
        }
        main.set_fen(fen);

        analyse_log(line);
        let info = ParseJSON(Stringify(players[player_id].info || {})),
            pvs = info.pvs,
            moves = info.moves,
            san_list =
                moves? (IsArray(moves)? moves.map(move => `${move.fail? '| ': ''}${move.m}`).join(' '): moves): null;
        delete info.moves;

        if (pvs)
            Keys(pvs).forEach(key => {
                let pv = pvs[key];
                if (IsArray(pv[1]))
                    pv[1] = pv[1].map(move => move.m).join(' ');
            });

        expect(info.id).toEqual(player_id);
        expect(info).toEqual(answer);
        expect(san_list).toEqual(answer_san);
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
    [2, 0, [1, 2]],
    [4, 0, [1, 4, 2, 3]],
    [8, 0, [1, 8, 4, 5, 2, 7, 3, 6]],
    [16, 0, [1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]],
    [32, 0, [1, 32, 16, 17, 8, 25, 9, 24, 4, 29, 13, 20, 5, 28, 12, 21, 2, 31, 15, 18, 7, 26, 10, 23, 3, 30, 14, 19, 6, 27, 11, 22]],
    // non power of 2
    [3, 0, [1, 0, 2, 3]],
    [6, 0, [1, 0, 4, 5, 2, 0, 3, 6]],
    [13, 0, [1, 0, 8, 9, 4, 13, 5, 12, 2, 0, 7, 10, 3, 0, 6, 11]],
    [14, 0, [1, 0, 8, 9, 4, 13, 5, 12, 2, 0, 7, 10, 3, 14, 6, 11]],
    [15, 0, [1, 0, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]],
    //
    [0, 0, [1, 2]],
    [1, 0, [1, 2]],
    // new mode (cup6)
    [2, 1, [1, 2]],
    [4, 1, [1, 3, 2, 4]],
    [8, 1, [1, 5, 3, 7, 2, 6, 4, 8]],
    [16, 1, [1, 9, 5, 13, 3, 11, 7, 15, 2, 10, 6, 14, 4, 12, 8, 16]],
    [32, 1, [1, 17, 9, 25, 5, 21, 13, 29, 3, 19, 11, 27, 7, 23, 15, 31, 2, 18, 10, 26, 6, 22, 14, 30, 4, 20, 12, 28, 8, 24, 16, 32]],
].forEach(([num_team, new_mode, answer], id) => {
    test(`calculate_seeds:${id}`, () => {
        expect(calculate_seeds(num_team, new_mode)).toEqual(answer);
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

// check_boom
[
    [12, {boom_threshold: 1.2}, [{9: 3, 10: 3, 11: 5, 12: 5.5}], 2, 0, null],
    [11, {}, [{10: 3, 11: 5}], 2, 0, null],
    [11, {}, [{8: 3, 9: 3, 10: 3, 11: 4.5}], 0, 1.4771, [54.824, 0.184, 0.304]],
    [11, {}, [{8: 5, 9: 5, 10: 5, 11: 3.5}], 0, -1.3036, [58.738, 0.133, 0.240]],
    [13, {}, [{11: 1, 12: 1.1, 13: 2.2}], 2, 0, null],
    [13, {}, [{10: 1, 11: 1, 12: 1.1, 13: 2.2}], 0, 1.8262, [49.247, 0.275, 0.415]],
    [13, {}, [{10: 1, 11: 1, 12: 1.1, 13: 2.2}, {10: 1, 11: 1, 12: 1.2, 13: 3.5}], 0, 1.8262, [34.427, 0.516, 0.711]],
    [43, {}, [{35: 2.13, 36: 1.96, 37: 1.96, 38: 1.83, 39: 1.45, 40: -1.54, 43: 2.05}], 2, 0, null],
    [40, {}, [{37: 10.55, 38: 10.53, 39: 12.44, 40: 6.5}], 0, -1.2501, [59.381, 0.116, 0.220]],
    [41, {}, [{38: 8.37, 39: 8.53, 40: 9.36, 41: 7.69}], 2, 0, null],
    // 10
    [41, {}, [{38: 7.69, 39: 8.15, 40: 8.31, 41: 37.37}], 0, 1.25155, [58.982, 0.117, 0.220]],
    [46, {}, [{38: 7.69, 39: 8.15, 40: 8.31, 41: 37.37, 45: 8.54, 46: 'M19'}], 2, 0, null],
    [46, {}, [{40: 5.0, 41: 4.5, 45: 5.5, 46: 'M19'}], 0, 2.5284, [40.587, 0.415, 0.588]],
    [46, {}, [{40: 7.0, 41: 4.5, 45: 5.5, 46: 'M19'}], 0, 1.7377, [50.570, 0.253, 0.389]],
    [46, {}, [{40: 8.0, 41: 4.5, 45: 5.5, 46: 'M19'}], 0, 1.3534, [57.048, 0.148, 0.259]],
    [46, {}, [{40: 9.0, 41: 4.5, 45: 5.5, 46: 'M19'}], 2, 0, null],
    [46, {}, [{40: 10.0, 41: 4.5, 45: 5.5, 46: 'M19'}], 2, 0, null],
    [46, {}, [{40: 15.0, 41: 4.5, 45: 5.5, 46: 'M19'}], 2, 0, null],
    [46, {}, [{40: 7.5, 41: 4.5, 45: 5.5, 46: '-M19'}], 0, 16.7534, [20.017, 0.750, 1.000]],
    [47, {}, [{40: 7.5, 41: 4.5, 45: 5.5, 46: 'M19', 47: '-M19'}], 0, 16.7534, [20.017, 0.750, 1.000]],
    // 20
    [47, {}, [{40: 7.5, 41: 4.5, 45: 5.5, 46: '-M19', 47: -5}], 0, -2.8650, [45.874, 0.467, 0.652]],
    [46, {}, [{40: 7.5, 41: 4.5, 45: 5.5, 46: 5.0}], 2, 0, null],
    [46, {}, [{40: 7.5, 41: 4.5, 45: 5.5, 46: 3.0}], 0, -1.4771, [56.765, 0.184, 0.304]],
    [46, {}, [{40: 7.5, 41: 4.5, 45: 5.5, 46: 2.0}], 0, -2.8188, [46.128, 0.461, 0.644]],
    [46, {}, [{40: 7.5, 41: 4.5, 45: 5.5, 46: 1.0}], 0, -4.5415, [39.703, 0.628, 0.850]],
    [46, {}, [{40: 7.5, 41: 4.5, 45: 5.5, 46: 0.0}], 0, -6.7535, [36.556, 0.710, 0.950]],
    [46, {}, [{40: 7.5, 41: 4.5, 45: 5.5, 46: -1.0}], 0, -8.9655, [35.515, 0.737, 0.984]],
    [46, {}, [{40: 7.5, 41: 4.5, 45: 5.5, 46: -2.0}], 0, -10.6882, [35.218, 0.744, 0.993]],
    [46, {}, [{40: 7.5, 41: 4.5, 45: 5.5, 46: -3.0}], 0, -12.0298, [35.111, 0.747, 0.996]],
    [46, {}, [{40: 7.5, 41: 4.5, 45: 5.5, 46: -5.0}], 0, 13.8884, [20.070, 0.749, 0.999]],
    // 30
    [6, {}, [{0: 'book', 2: 'book', 4: 'book', 6: "0.92"}], 2, 0, null],
].forEach(([ply, y, evals, answer, answer_boomed, answer_more], id) => {
    test(`check_boom:${id}`, () => {
        DEV.boom = (id >= 31)? 3: 0;
        let main = xboards.live,
            players = main.players;
        init_players(ply, players, evals);
        main.moves.length = ply;
        Assign(Y, y);

        let player = players[0],
            result = check_boom('live', 0);
        expect(result[0]).toEqual(answer);
        expect(player.boomed).toBeCloseTo(answer_boomed, 3);
        if (player.boomed)
            expect(player.boom_ply).toEqual(ply);
        if (answer_more) {
            let text = result.slice(1, -1).map(x => x.toFixed(3)).join(', ');
            expect(text).toEqual(answer_more.map(x => x.toFixed(3)).join(', '));
        }
    });
});

// check_explosion
[
    [0, 0, {explosion_threshold: 0, x: 'live'}, {exploded: 0}, [5, 5, 0.5, 0.5], [], 1, 0],
    [0, 0, {explosion_threshold: 2.3, x: 'archive'}, {exploded: 0}, [5, 5, 0.5, 0.5], [], 2, 0],
    [0, 0, {explosion_buildup: 1, x: 'live'}, {exploded: 0}, [5, 3, 0.5, 0.5], [], 2, 0],
    [0, 0, {}, {exploded: 0, seens: new Set()}, [5, 3, 2.5, 0.5], [], 5, 3.5],
    [0, 0, {}, {exploded: 0, seens: new Set([-4, -3, -2, -1])}, [5, 3, 2.5, 0.5], [], 0, 3.5],
    [0, 0, {}, {}, [15, 5, 0.5, 0.5], [], 2, 3.5],
    [0, 0, {}, {}, [-8, -3, -5, -0.5], [], 0, -5.333],
    [0, 0, {}, {}, [-1, 1, -1, -0.5], [], 2, -5.333],
    [0, 0, {}, {}, [5, 5, 5, -10], [], 0, 5],
    [0, 0, {}, {}, [5, 5, 5, 0], [], 3, 5],
    // 10
    [0, 0, {}, {}, [-5, -5, -5, 1], [], 0, -5],
    [0, 0, {}, {}, [8, 3, 5, 5], [], 0, 5.25],
    [0, 0, {}, {exploded: 0}, [8, 3, 5, 5], [], 0, 5.25],
    [0, 0, {}, {exploded: 0}, [8, 0.5, 8, 0.5], [], 2, 0],
    [0, 0, {}, {exploded: 0}, ['M41', 0.5, 8, 0], [], 2, 0],
    [0, 0, {}, {exploded: 0}, ['M41', 0.5, 8, 5], [], 0, 47],
    [0, 0, {}, {exploded: 0}, [8, 0.5, 8, 5], ['lczero', 'x', 'lczero', 'lczero'], 2, 0],
    [0, 0, {}, {exploded: 0}, [8, 5, 8, 5], ['lczero', 'x', 'lczero', 'lczero'], 0, 6.5],
    [0, 0, {}, {exploded: 0}, [8, 0.5, 8, 5], ['lczero', 'x', 'lczero', 'y'], 0, 6.5],
    [0, 0, {}, {exploded: 0}, [8, 0.5, 8, 5], ['lczero', 'x', 'allie', 'y'], 0, 7],
    // 20
    [0, 0, {explosion_sound: 0}, {exploded: 0}, [8, 3, 5, 5], [], 0, 5.25],
    [0, 0, {explosion_sound: 'random'}, {exploded: 0}, [8, 3, 5, 5], [], 0, 5.25],
    [0, 0, {explosion_threshold: 0}, {exploded: 0}, [8, 3, 5, 5], [], 1, 0],
    [0, 0, {explosion_threshold: 2.3}, {exploded: 0}, [5, 5, 5, 0], [], 0, 5],
    [0, 0, {}, {exploded: 0}, [5, 0, 5, 5], [], 2, 0],
    [0, 0, {}, {}, [5, 0.1, 5, 5], [], 0, 5],
    [0, 0, {explosion_buildup: 3}, {exploded: 0}, [5, 5, 5, 5], [], 4, 0],
    [1, 0, {}, {}, [5, 5, 5, 5], [], 4, 0],
    [2, 0, {}, {}, [5, 5, 5, 5], [], 0, 5],
    [2, 1, {}, {exploded: 0}, [8, 8, 8, 8], [], 0, 8],
    // 30
    [2, 0, {explosion_buildup: 1}, {}, [5, 5, 5, 5], [], 3, 8],
    [76, 0, {}, {exploded: 0}, ['10.01', '1.56', 10.92, 6.31], ['LCZero', 'Stoofvlees', 'LCZero', 'Crystal'], 0, 8.16],
].forEach(([ply, is_boom, y, states, evals, shorts, answer, answer_boomed], id) => {
    test(`check_explosion:${id}`, () => {
        DEV.explode = (id >= 32)? 1: 0;
        let main = xboards.live,
            players = main.players;
        evals.forEach((eval_, id) => {
            Assign(players[id], {
                eval: eval_,
                short: Undefined(shorts[id], `P${id}`),
            });
        });
        main.moves.length = ply;
        Assign(main, states);
        Assign(Y, y);
        if (y.x)
            set_section(y.x);

        expect(check_explosion('live', !!is_boom)).toEqual(answer);
        expect(main.exploded).toBeCloseTo(answer_boomed, 3);
    });
});

// check_explosion_boom
[
    [1, 11, {boom_threshold: 1.2, x: 'archive'}, 0, 3, [{8: 3, 9: 3, 10: 3, 11: 5}], 0, 0],
    [1, 11, {x: 'live'}, 0, 3, [{8: 3, 9: 3, 10: 3, 11: 5}], 1, 1.8586],
    [0, 11, {}, 0, 3, [{8: 3, 9: 3, 10: 3, 11: 5}], 1, 1.8586],
    [0, 11, {}, -1, 3, [{8: 3, 9: 3, 10: 3, 11: 5}], 0, 0],
    [0, 12, {}, -1, 3, [{8: 3, 9: 3, 10: 3, 11: 5}], 1, 1.8586],
    [0, 12, {}, -1, 3, [{8: 3, 9: 3, 10: 3, 11: 8.9}], 0, 0],
    [1, 12, {}, -1, 3, [{8: 3, 9: 3, 10: 3, 11: 8.9}], 1, 3.643],
    [0, 13, {}, -2, 3, [{8: 3, 9: 3, 10: 3, 11: 8.9}], 0, 0],
    [0, 13, {}, -1, 3, [{8: 3, 9: 3, 10: 3, 11: 8.9, 12: 14.5}], 0, 0],
    [1, 13, {}, -1, 3, [{8: 3, 9: 3, 10: 3, 11: 8.9, 12: 'M25'}], 0, 0],
    [1, 13, {boom_threshold: 0.5}, -1, 3, [{8: 3, 9: 3, 10: 3, 11: 8.9, 12: 'M25'}], 1, 1.0807],
].forEach(([reset, ply, y, offset, mode, evals, answer, answer_boomed], id) => {
    test(`check_explosion_boom:${id}`, () => {
        DEV.boom = 0;
        let main = xboards.live,
            players = main.players;
        init_players(ply, players, evals);
        main.moves.length = ply;
        Assign(Y, y);
        if (y.x)
            set_section(y.x);
        if (reset)
            main.seens.clear();

        let player = players[0],
            result = check_explosion_boom(Y.x, offset, mode);
        if (IsArray(result))
            result = result[0];
        expect(result).toEqual(answer);
        expect(player.boomed).toBeCloseTo(answer_boomed, 3);
    });
});

// copy_pgn
[
    [START_FEN, [], [], '', ''],
    [START_FEN, [], [{m: 'e4', ply: 0}, {m: 'e5', ply: 1}], '', '1. e4 e5\n*'],
    [
        START_FEN,
        [],
        [
            {fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', ply: 1},
            {m: 'Nf3', ply: 2},
            {m: 'd6', ply: 3},
        ],
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        '2. Nf3 d6\n*',
    ],
    [
        START_FEN,
        [],
        [
            {fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', m: 'e5', ply: 1},
            {m: 'Nf3', ply: 2},
            {m: 'd6', ply: 3},
        ],
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        '2. Nf3 d6\n*',
    ],
    [
        START_FEN,
        [
            {fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', m: 'e4', ply: 0},
            {fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', m: 'e5', ply: 1},
        ],
        [
            {fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', m: 'e5', ply: 1},
            {m: 'Nf3', ply: 2},
            {m: 'd6', ply: 3},
        ],
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        '1... e5 2. Nf3 d6\n*',
    ],
    [
        START_FEN,
        [
            {fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', m: 'e4', ply: 0},
            {fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', m: 'e5', ply: 1},
        ],
        [
            {fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2', m: 'Nc3', ply: 2},
            {m: 'Nf6', ply: 3},
            {m: 'd3', ply: 4},
        ],
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        '2. Nc3 Nf6 3. d3\n*',
    ],
    [
        START_FEN,
        [],
        [
            {fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2', m: 'Nc3', ply: 2},
            {m: 'Nf6', ply: 3},
            {m: 'd3', ply: 4},
        ],
        'rnbqkbnr/pppp1ppp/8/4p3/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2',
        '2... Nf6 3. d3\n*',
    ],
].forEach(([start_fen, main_moves, board_moves, fen, answer], id) => {
    test(`copy_pgn:${id}`, () => {
        set_section('live');
        for (let [name, moves] of [['live', main_moves], ['pv0', board_moves]]) {
            let board = xboards[name];
            board.start_fen = start_fen;
            board.reset(Y.x);
            for (let move of moves)
                board.moves[move.ply] = move;
        }

        let headers = [...PGN_HEADERS];
        if (!fen)
            headers.splice(7, 2);

        let header = headers.join('\n')
                .replace('{DATE}', FromTimestamp()[0].replace(/-/g, '.'))
                .replace('{FEN}', fen),
            text = copy_pgn(xboards.pv0, false, false);
        expect(text).toEqual(header + answer);
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

// fix_header_opening
[
    [{FEN: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}, 'FRC #518'],
    [{FEN: 'rqnbbknr/pppppppp/8/8/8/8/PPPPPPPP/RQNBBKNR w KQkq - 0 1'}, 'FRC #505'],
    [{FEN: 'rknqnbbr/pppppppp/8/8/8/8/PPPPPPPP/RKNQNBBR w KQkq - 0 1'}, 'FRC #734'],
    [{FEN: 'nrbnkbqr/pppppppp/8/8/8/8/PPPPPPPP/NRBNKBQR w HBhb - 0 1'}, 'FRC #166'],
    [{FEN: '2k5/3nRp1r/r1p2n2/1p1pBPRp/pP3P1P/P6K/2P1B3/8 b - - 18 42'}, undefined],
].forEach(([headers, answer], id) => {
    test(`fix_header_opening:${id}`, () => {
        let board = xboards.live;
        fix_header_opening(board, headers);
        expect(headers.Opening).toEqual(answer);
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
    [null, '-'],
    [NaN, '-'],
    [Infinity, '-'],
    ['', '-'],
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
    [NaN, '-'],
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
        7,
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
        7,
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
        7,
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
        7,
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
        7,
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
        7,
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
    [
        `
        [Event "TCEC Season 16 - FRC Sufi"]
        [Site "https://tcec-chess.com"]
        [Date "2019.11.07"]
        [Round "3.1"]
        [White "AllieStein v0.5_c328142-n11.1"]
        [Black "Stockfish 191107"]
        [Result "0-1"]
        [BlackElo "3917"]
        [BlackTimeControl "1800+5"]
        [FEN "rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w KQkq - 0 1"]
        [GameDuration "00:55:26"]
        [GameEndTime "2019-11-07T20:22:46.486 CST"]
        [GameStartTime "2019-11-07T19:27:20.106 CST"]
        [PlyCount "105"]
        [SetUp "1"]
        [Termination "adjudication"]
        [TerminationDetails "TCEC win rule"]
        [Variant "fischerandom"]
        [WhiteElo "3853"]
        [WhiteTimeControl "1800+5.232"]

        {WhiteEngineOptions: Protocol=uci; GPUCores=2; Hash=7168; MoveOverhead=2000; TreeSize=7168; MaxBatchSize=160; UseFP16=true; SyzygyPath=C:/Tb; CommandLineOptions=;, BlackEngineOptions: Protocol=uci; Hash=16384; Threads=256; SyzygyPath=/home/syzygy/; Move Overhead=1000; OwnBook=false; Ponder=false;}
        1. e4 {d=11, sd=29, mt=43274, tl=1761958, s=263995, n=11230595, pv=e4 a5 a4 e6 Nb3 d5 g3 Nge7 f4 Nb6 d4 Bxa4 Nxa5 g6 e5 Qe8 Bf3 Bb5 Be2 Nc4, tb=0, h=27.2, ph=0.0, wv=0.54, R50=50, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        d6 {d=34, sd=55, mt=138857, tl=1666143, s=87176274, n=12102420613, pv=d6 g3 f5 Nb3 fxe4 Bxe4 Nb6 d4 Nf6 Bg2 g5 a4 a6 a5 Bb5 Ne2 Nc4 Nbc1 d5 Bb4 g4 Nd3 Ne4 Qe1 Qf7 Nc3 Nxc3+ Bxc3 e6 Qe2 Qg8 Qe1, tb=1, h=100.0, ph=0.0, wv=0.00, R50=50, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        2. a4 {d=12, sd=35, pd=a5, mt=43360, tl=1723830, s=249188, n=10538392, pv=a4 f5 g3 g5 d4 fxe4 Bxe4 Nf6 Bg2 a6 Nge2 Qg8 a5 e6 f4 h6 Ra3 Ne7 Nd3 Bb5 Nc3 Bc6 Bf2, tb=0, h=53.6, ph=0.0, wv=0.72, R50=50, Rd=-11, Rr=-11, mb=+0+0+0+0+0,}
        `,
        1,
        {
            Headers: {
                Black: 'Stockfish 191107',
                BlackElo: '3917',
                BlackTimeControl: '1800+5',
                Date: '2019.11.07',
                Event: 'TCEC Season 16 - FRC Sufi',
                FEN: 'rknrbqnb/pppppppp/8/8/8/8/PPPPPPPP/RKNRBQNB w DAda - 0 1',
                GameDuration: '00:55:26',
                GameEndTime: '2019-11-07T20:22:46.486 CST',
                GameStartTime: '2019-11-07T19:27:20.106 CST',
                Opening: 'FRC #843',
                PlyCount: '105',
                Result: '0-1',
                Round: '3.1',
                SetUp: '1',
                Site: 'https://tcec-chess.com',
                Termination: 'adjudication',
                TerminationDetails: 'TCEC win rule',
                Variant: 'fischerandom',
                White: 'AllieStein v0.5_c328142-n11.1',
                WhiteElo: '3853',
                WhiteTimeControl: '1800+5.232',
            },
        },
    ],
    [
        `


        [Event "TCEC Season 20 - QL L4 L3 vs Gull Testing 3"]
        [Site "https://tcec-chess.com"]
        [Date "2020.11.30"]
        [Round "1.2"]
        [White "Gull_20170410_CCRL 64-bit 4CPU"]
        [Black "MrBob 1.0.0_dev"]
        [Result "1-0"]
        [ECO "A01"]
        [FEN "6Q1/k7/q6P/8/1p6/1P3P2/6P1/5K2 w - - 0 59"]
        [GameDuration "00:58:45"]
        [GameEndTime "2020-11-30T10:50:36.291 UTC"]
        [GameStartTime "2020-11-30T09:51:51.093 UTC"]
        [Opening "Nimzovich-Larsen attack"]
        [PlyCount "128"]
        [Termination "adjudication"]
        [TerminationDetails "SyzygyTB"]
        [TimeControl "1800+5"]
        [Variation "symmetrical variation"]
        [WhiteElo "3148"]

        {WhiteEngineOptions: Protocol=uci; Threads=4; Hash=1024; SyzygyPath=/home/syzygy/; OwnBook=false; Ponder=false;, BlackEngineOptions: Protocol=uci; Threads=176; Hash=65536;}
        59. Qc4 {d=19, sd=33, mt=17109, tl=680589, s=11257078, n=191370334, pv=Qc4 Qxc4+ bxc4 b3 h7 b2 h8=Q b1=Q+ Ke2 Qc2+ Ke3 Qc1+ Ke4 Qb1+ Kf4 Qc1+ Kg4 Qc2 Qd4+ Kb8 f4 Qg6+ Kf3 Qh5+ g4 Qh1+ Kg3 Qe1+ Kg2 Qe2+ Kh3 Qf1+ Kh4 Qe1+ Kg5 Qe7+ Kg6 Qe8+ Kf5 Qc8+ Ke4 Qb7+ Qd5 Qh7+ f5 Qh4 Qe5+ Kc8 Qe6+ Kc7 f6 Qe1+ Kf5 Qf2+ Kg6 Qc2+ Kg7 Qf2 f7, tb=679591, h=0.0, ph=0.0, wv=3.25, R50=49, Rd=-11, Rr=-1000, mb=+3+0+0+0+0,}
        Qxc4+ {d=27, sd=52, mt=6610, tl=116677, s=146562326, n=763882844, pv=Qxc4+ bxc4 b3 h7 b2 h8=Q b1=Q+ Kf2 Qc2+ Kg3 Kb7 Qd4 Qh7 c5 Qc7+ Kg4 Qc6 Kf5 Qc7 c6+ Kc8 Qc4 Qh7+ Kf6 Qh6+ Kf7 Qh5+ Ke6 Qg6+ Kd5 Qf7+ Kd4 Qg7+ Kc5 Qa7+ Kd6 Qc7+ Ke6 Kb8 Qe4 Qh2 Kf7 Qh5+ Kf8 Kc7 Kg8, tb=null, h=100.0, ph=0.0, wv=4.24, R50=50, Rd=-11, Rr=-1000, mb=+3+0+0+0-1,}
        1-0
        `,
        7,
        {
            BlackEngineOptions: {
                Hash: '65536',
                Protocol: 'uci',
                Threads: '176',
            },
            Headers: {
                Black: 'MrBob 1.0.0_dev',
                Date: '2020.11.30',
                ECO: 'A01',
                Event: 'TCEC Season 20 - QL L4 L3 vs Gull Testing 3',
                FEN: '6Q1/k7/q6P/8/1p6/1P3P2/6P1/5K2 w - - 0 59',
                GameDuration: '00:58:45',
                GameEndTime: '2020-11-30T10:50:36.291 UTC',
                GameStartTime: '2020-11-30T09:51:51.093 UTC',
                Opening: 'Nimzovich-Larsen attack',
                PlyCount: '128',
                Result: '1-0',
                Round: '1.2',
                Site: 'https://tcec-chess.com',
                Termination: 'adjudication',
                TerminationDetails: 'SyzygyTB',
                TimeControl: '1800+5',
                Variation: 'symmetrical variation',
                White: 'Gull_20170410_CCRL 64-bit 4CPU',
                WhiteElo: '3148',
            },
            Moves: [
                {
                    R50: 49,
                    Rd: -11,
                    Rr: -1000,
                    d: 19,
                    h: '0.0',
                    m: 'Qc4',
                    mb: '+3+0+0+0+0',
                    mt: 17109,
                    n: 191370334,
                    ph: '0.0',
                    ply: 116,
                    pv: '59. Qc4 Qxc4+ 60. bxc4 b3 61. h7 b2 62. h8=Q b1=Q+ 63. Ke2 Qc2+ 64. Ke3 Qc1+ 65. Ke4 Qb1+ 66. Kf4 Qc1+ 67. Kg4 Qc2 68. Qd4+ Kb8 69. f4 Qg6+ 70. Kf3 Qh5+ 71. g4 Qh1+ 72. Kg3 Qe1+ 73. Kg2 Qe2+ 74. Kh3 Qf1+ 75. Kh4 Qe1+ 76. Kg5 Qe7+ 77. Kg6 Qe8+ 78. Kf5 Qc8+ 79. Ke4 Qb7+ 80. Qd5 Qh7+ 81. f5 Qh4 82. Qe5+ Kc8 83. Qe6+ Kc7 84. f6 Qe1+ 85. Kf5 Qf2+ 86. Kg6 Qc2+ 87. Kg7 Qf2 88. f7',
                    s: 11257078,
                    sd: 33,
                    tb: 679591,
                    tl: 680589,
                    wv: '3.25',
                },
                {
                    R50: 50,
                    Rd: -11,
                    Rr: -1000,
                    d: 27,
                    h: '100.0',
                    m: 'Qxc4+',
                    mb: '+3+0+0+0-1',
                    mt: 6610,
                    n: 763882844,
                    ph: '0.0',
                    ply: 117,
                    pv: '59...Qxc4+ 60. bxc4 b3 61. h7 b2 62. h8=Q b1=Q+ 63. Kf2 Qc2+ 64. Kg3 Kb7 65. Qd4 Qh7 66. c5 Qc7+ 67. Kg4 Qc6 68. Kf5 Qc7 69. c6+ Kc8 70. Qc4 Qh7+ 71. Kf6 Qh6+ 72. Kf7 Qh5+ 73. Ke6 Qg6+ 74. Kd5 Qf7+ 75. Kd4 Qg7+ 76. Kc5 Qa7+ 77. Kd6 Qc7+ 78. Ke6 Kb8 79. Qe4 Qh2 80. Kf7 Qh5+ 81. Kf8 Kc7 82. Kg8',
                    s: 146562326,
                    sd: 52,
                    tb: 'null',
                    tl: 116677,
                    wv: '4.24',
                }
            ],
            WhiteEngineOptions: {
                Hash: '1024',
                OwnBook: 'false',
                Ponder: 'false',
                Protocol: 'uci',
                SyzygyPath: '/home/syzygy/',
                Threads: '4',
            },
        },
    ],
    [
        `
        [FEN "2k5/3nRp1r/r1p2n2/1p1pBPRp/pP3P1P/P6K/2P1B3/8 b - - 18 42"]
        [Setup "1"]

        42... Kd8 43. Rxd7+ Nxd7 44. f6 Rh8 *
        `,
        7,
        {
            Headers: {
                FEN: '2k5/3nRp1r/r1p2n2/1p1pBPRp/pP3P1P/P6K/2P1B3/8 b - - 18 42',
                Setup: '1',
            },
            Moves: [
                {m: 'Kd8', ply: 83}, {m: 'Rxd7+', ply: 84}, {m: 'Nxd7', ply: 85}, {m: 'f6', ply: 86},
                {m: 'Rh8', ply: 87},
            ],
        },
    ],
    [
        `
        [FEN "2k5/3nRp1r/r1p2n2/1p1pBPRp/pP3P1P/P6K/2P1B3/8 b - - 18 42"]
        [Setup "1"]

        42. ... Kd8 43. Rxd7+ Nxd7 44. f6 Rh8 *
        `,
        7,
        {
            Headers: {
                FEN: '2k5/3nRp1r/r1p2n2/1p1pBPRp/pP3P1P/P6K/2P1B3/8 b - - 18 42',
                Setup: '1',
            },
            Moves: [
                {m: 'Kd8', ply: 83}, {m: 'Rxd7+', ply: 84}, {m: 'Nxd7', ply: 85}, {m: 'f6', ply: 86},
                {m: 'Rh8', ply: 87},
            ],
        },
    ],
].forEach(([data, mode, answer], id) => {
    test(`parse_pgn:${id}`, () => {
        if (answer.Moves) {
            let moves = [];
            for (let move of answer.Moves)
                moves[move.ply] = move;
            answer.Moves = moves;
        }
        expect(parse_pgn('archive', data, mode)).toEqual(answer);
    });
});

// parse_time_control
[
    ['900+5', {dico: {tc: 900, tc2: 5, tc3: 0}, text: `15'+5"`}],
    ['40/900', {dico: {tc: 900, tc2: 0, tc3: 40}, text: `40/900'`}],
].forEach(([value, answer], id) => {
    test(`parse_time_control:${id}`, () => {
        expect(parse_time_control(value)).toEqual(answer);
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
        if (states.x)
            set_section(states.x);
        expect(update_player_eval(section, data)).toEqual(answer);
    });
});
