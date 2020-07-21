// worker.js
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-20
/*
globals
Assign, Chess, FormatUnit, HTML, importScripts, LS, Now, Random, self, Undefined
*/
'use strict';

importScripts('common.js');
importScripts('chess.js');

let I8 = array => new Int8Array(array),
    PIECE_SCORES = I8([0, 1, 3, 3, 5, 9, 100, 0, 0, 1, 3, 3, 5, 9, 128]),
    PROMOTE_SCORES = I8([0, 0, 2, 2, 4, 8, 0, 0, 0, 0, 2, 2, 4, 8, 0]);

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
            length = moves.length;

        // checkmate?
        if (!length && chess.checked(2))
            return [-256 * coeff, depth];

        this.count += length;
        let again = (this.count < this.max_nodes);

        for (let move of moves) {
            move.depth = depth;
            move.score = (PIECE_SCORES[move.capture | 0] + PROMOTE_SCORES[move.promote | 0] + length * 0.005) * coeff;

            if (depth < this.max_depth && again && (depth <= 4 || move.score > 1)) {
                chess.moveObject(move, this.frc, false);
                let moves2 = chess.moves(this.frc, true, -1),
                    [score, depth2] = this.search(moves2, depth + 1, this.max_depth);
                move.score -= score;
                move.depth = depth2;
                chess.undo();
            }

            if (!id || best < move.score) {
                id ++;
                best = move.score;
                best_depth = move.depth;
                if (depth >= 3 && best > 128)
                    break;
            }
        }

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
        for (let move of moves)
            move.score = Undefined(move.score, 0) + Random() * 0.1;

        this.elapsed = Now(true) - start;

        moves.sort((a, b) => b.score - a.score);
        return [moves[0] || {}, best, depth];
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

        let [move, score, depth] = chess_worker.think(data.fen, data.moves, data.max_depth, data.max_moves);
        self.postMessage({
            count: chess_worker.count,
            depth: depth,
            elapsed: chess_worker.elapsed,
            fen: data.fen,
            id: data.id,
            move: move,
            score: score,
            suggest: data.suggest,
        });
    }
};
