// worker.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-10-02
/*
globals
Abs, ArrayJS, Chess, GaussianRandom, importScripts, LS, Now, PAWN, PIECE_SCORES, SCORE_MATING, self, Undefined
*/
'use strict';

importScripts('common.js');
importScripts('chess.js');
importScripts('chess-wasm.js');

let DEV = {},
    engine_classes = {
        js: Chess,
    },
    engines = {};

if (self.Module) {
    self.Module().then(instance => {
        engine_classes.wasm = instance.Chess;
    });
}

let SQUARES_INV = [
        'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8', '??', '??', '??', '??', '??', '??', '??', '??',
        'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', '??', '??', '??', '??', '??', '??', '??', '??',
        'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6', '??', '??', '??', '??', '??', '??', '??', '??',
        'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5', '??', '??', '??', '??', '??', '??', '??', '??',
        'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4', '??', '??', '??', '??', '??', '??', '??', '??',
        'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3', '??', '??', '??', '??', '??', '??', '??', '??',
        'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2', '??', '??', '??', '??', '??', '??', '??', '??',
        'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', '??', '??', '??', '??', '??', '??', '??', '??',
    ];

// FUNCTION
///////////

/**
 * Create a chess engine
 * @param {string} engine
 * @returns {Object}
 */
function create_chess(engine) {
    // 1) use the desired engine
    let engine_class = engine_classes[engine];
    if (!engine_class) {
        engine = 'js';
        engine_class = engine_classes[engine];
    }

    let chess = engines[engine];
    if (!chess) {
        if (DEV.worker)
            LS(`creating "${engine}" engine`);
        engines[engine] = new engine_class();
        chess = engines[engine];
    }
    return chess;
}

/**
 * Think ...
 * @param {string} engine
 * @param {string} fen
 * @param {number[]} moves
 * @returns {[Move, number, number]} best_move, score, depth
 */
function think(engine, fen, moves, scan_all) {
    // 1) generate all moves + analyse them
    let chess = create_chess(engine);
    chess.load(fen, true);

    let start = Now(true),
        objs = ArrayJS(chess.search(moves.join(' '), scan_all)),
        elapsed = Now(true) - start;

    // 2) results
    let pawn_score = PIECE_SCORES[PAWN];
    for (let move of objs) {
        move.m = `${SQUARES_INV[move.from]}${SQUARES_INV[move.to]}`;
        let score = Undefined(move.score, 0);
        if (Abs(score) >= SCORE_MATING)
            score /= 100;
        else {
            score /= pawn_score;
            score +=GaussianRandom() * 0.2;
        }
        move.score = score;
    }
    objs.sort((a, b) => b.score - a.score);
    return [objs, elapsed, chess.nodes(), chess.avgDepth(), chess.selDepth()];
}

// COMMUNICATION
////////////////

self.onconnect = () => {
    // LS('worker connect');
};

self.onmessage = e => {
    let data = e.data,
        func = data.func;

    // 1) create the chess engine
    let chess = create_chess(data.engine);
    if (data.options)
        chess.configure(data.frc, data.options, data.depth);

    // 2) handle the messages
    if (func == 'config') {
        if (data.dev)
            DEV = data.dev;
    }
    if (DEV.worker) {
        LS('worker got message:');
        LS(e);
    }
    if (func == 'think') {
        let [moves, elapsed, nodes, avg_depth, sel_depth] = think(data.engine, data.fen, data.moves, data.scan_all);
        self.postMessage({
            avg_depth: avg_depth,
            elapsed: elapsed,
            fen: data.fen,
            id: data.id,
            moves: moves,
            nodes: nodes,
            sel_depth: sel_depth,
            suggest: data.suggest,
        });
    }
};
