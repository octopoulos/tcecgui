// worker.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-21
/*
globals
Assign, Chess, FormatUnit, HTML, importScripts, LS, Now, Random, self, Undefined
*/
'use strict';

importScripts('common.js');
importScripts('chess.js');

let I8 = array => new Int8Array(array),
    PIECE_SCORES = I8([0, 1, 3, 3, 5, 9, 100, 0, 0, 1, 3, 3, 5, 9, 128]),
    PROMOTE_SCORES = I8([0, 0, 2, 2, 4, 8, 0, 0, 0, 0, 2, 2, 4, 8, 0]),
    SQUARES_INV = [
        'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8', '??', '??', '??', '??', '??', '??', '??', '??',
        'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7', '??', '??', '??', '??', '??', '??', '??', '??',
        'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6', '??', '??', '??', '??', '??', '??', '??', '??',
        'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5', '??', '??', '??', '??', '??', '??', '??', '??',
        'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4', '??', '??', '??', '??', '??', '??', '??', '??',
        'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3', '??', '??', '??', '??', '??', '??', '??', '??',
        'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2', '??', '??', '??', '??', '??', '??', '??', '??',
        'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1', '??', '??', '??', '??', '??', '??', '??', '??',
    ];

// CLASS
////////

class ChessWoker {
    constructor() {
        this.chess = new Chess();
        this.count = 0;
        this.elapsed = 0;
        this.max_depth = 4;
        this.max_nodes = 1e7;
    }

    /**
     * Basic tree search
     * @param {Move[]} moves
     * @param {number} depth
     * @returns {[number, number]}
     */
    search(moves, depth) {
        let best = 0,
            best_depth = depth,
            chess = this.chess,
            coeff = 8 / (8 + depth),
            id = 0,
            length = moves.length,
            valid = 0;

        this.count += length;
        let again = (this.count < this.max_nodes);

        for (let move of moves) {
            move.depth = depth;
            chess.moveRaw(move, false);

            // invalid move?
            if (chess.checked(3))
                move.score = -999;
            else {
                move.score = (PIECE_SCORES[move.capture | 0] + PROMOTE_SCORES[move.promote | 0]) * coeff;
                valid ++;

                // look deeper
                if (depth < this.max_depth && again) {
                    let moves2 = chess.moves(this.frc, false, -1),
                        [score, depth2] = this.search(moves2, depth + 1, this.max_depth);
                    move.score -= score;
                    move.depth = depth2;
                }
            }

            chess.undo();

            if (move.score > -900 && (!id || best < move.score)) {
                id ++;
                best = move.score;
                best_depth = move.depth;
                if (depth >= 3 && best > 128)
                    break;
            }
        }

        // checkmate?
        if (!valid && chess.checked(2))
            return [-256 * coeff, depth];

        for (let move of moves)
            if (move.score > -900)
                move.score += valid * 0.007 * coeff;

        return [best, best_depth];
    }

    /**
     * Think ...
     * @param {string} fen
     * @param {Move[]} moves moves to analyse, from depth=0
     * @returns {[Move, number, number]} best_move, score, depth
     */
    think(fen, moves) {
        this.chess.load(fen);
        this.count = 0;

        let start = Now(true),
            [best, depth] = this.search(moves, 1);
        this.elapsed = Now(true) - start;

        for (let move of moves) {
            move.m = `${SQUARES_INV[move.from]}${SQUARES_INV[move.to]}`;
            move.score = Undefined(move.score, 0) + Random() * 0.1;
        }
        moves.sort((a, b) => b.score - a.score);
        return [moves, best, depth];
    }
}

// COMMUNICATION
////////////////

let chess_worker = new ChessWoker();

self.onconnect = () => {
};

self.onmessage = e => {
    let data = e.data;
    if (data.func == 'think') {
        Assign(chess_worker, {
            max_depth: data.max_depth,
            max_nodes: data.max_nodes,
        });

        let [moves, score, depth] = chess_worker.think(data.fen, data.moves, data.max_depth, data.max_moves);
        self.postMessage({
            count: chess_worker.count,
            depth: depth,
            elapsed: chess_worker.elapsed,
            fen: data.fen,
            id: data.id,
            moves: moves,
            score: score,
            suggest: data.suggest,
        });
    }
};
