// chess.js
// - modified for speed
// - temporary file, it will soon be removed once XBoard is improved

/* @license
 * Copyright (c) 2016, Jeff Hlywa (jhlywa@gmail.com)
 * Released under the BSD license
 * https://github.com/jhlywa/chess.js/blob/master/LICENSE
 */
/*
globals
define, exports
*/
'use strict';

var Chess = function(fen) {
    var BLACK = 'b';
    var WHITE = 'w';

    var EMPTY = -1;

    var PAWN = 'p';
    var KNIGHT = 'n';
    var BISHOP = 'b';
    var ROOK = 'r';
    var QUEEN = 'q';
    var KING = 'k';

    var SYMBOLS = 'pnbrqkPNBRQK';

    var DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    var PAWN_OFFSETS = {
        b: [16, 32, 17, 15],
        w: [-16, -32, -17, -15]
    };

    var PIECE_OFFSETS = {
        n: [-18, -33, -31, -14,  18, 33, 31,  14],
        b: [-17, -15,  17,  15],
        r: [-16,   1,  16,  -1],
        q: [-17, -16, -15,   1,  17, 16, 15,  -1],
        k: [-17, -16, -15,   1,  17, 16, 15,  -1]
    };

    var BITS = {
        NORMAL: 1,
        CAPTURE: 2,
        BIG_PAWN: 4,
        EP_CAPTURE: 8,
        PROMOTION: 16,
        KSIDE_CASTLE: 32,
        QSIDE_CASTLE: 64
    };

    var RANK_1 = 7;
    var RANK_2 = 6;
    var RANK_7 = 1;
    var RANK_8 = 0;

    var SQUARES = {
        a8:   0, b8:   1, c8:   2, d8:   3, e8:   4, f8:   5, g8:   6, h8:   7,
        a7:  16, b7:  17, c7:  18, d7:  19, e7:  20, f7:  21, g7:  22, h7:  23,
        a6:  32, b6:  33, c6:  34, d6:  35, e6:  36, f6:  37, g6:  38, h6:  39,
        a5:  48, b5:  49, c5:  50, d5:  51, e5:  52, f5:  53, g5:  54, h5:  55,
        a4:  64, b4:  65, c4:  66, d4:  67, e4:  68, f4:  69, g4:  70, h4:  71,
        a3:  80, b3:  81, c3:  82, d3:  83, e3:  84, f3:  85, g3:  86, h3:  87,
        a2:  96, b2:  97, c2:  98, d2:  99, e2: 100, f2: 101, g2: 102, h2: 103,
        a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
    };

    var ROOKS = {
        w: [{square: SQUARES.a1, flag: BITS.QSIDE_CASTLE},
                {square: SQUARES.h1, flag: BITS.KSIDE_CASTLE}],
        b: [{square: SQUARES.a8, flag: BITS.QSIDE_CASTLE},
                {square: SQUARES.h8, flag: BITS.KSIDE_CASTLE}]
    };

    var board = new Array(128);
    var kings = {w: EMPTY, b: EMPTY};
    var turn = WHITE;
    var castling = {w: 0, b: 0};
    var ep_square = EMPTY;
    var half_moves = 0;
    var move_number = 1;
    var history = [];

    // if the user passes in a fen string, load it, else default to starting position
    load((fen == undefined)? DEFAULT_POSITION: fen);

    function clear() {
        board = new Array(128);
        kings = {w: EMPTY, b: EMPTY};
        turn = WHITE;
        castling = {w: 0, b: 0};
        ep_square = EMPTY;
        half_moves = 0;
        move_number = 1;
        history = [];
    }

    function reset() {
        load(DEFAULT_POSITION);
    }

    function load(fen) {
        var tokens = fen.split(/\s+/);
        var position = tokens[0];
        var square = 0;

        clear();

        for (let i = 0; i < position.length; i++) {
            var piece = position.charAt(i);

            if (piece === '/') {
                square += 8;
            } else if (is_digit(piece)) {
                square += parseInt(piece, 10);
            } else {
                var color = (piece < 'a') ? WHITE : BLACK;
                put({type: piece.toLowerCase(), color: color}, algebraic(square));
                square++;
            }
        }

        turn = tokens[1];

        if (tokens[2].indexOf('K') > -1) {
            castling.w |= BITS.KSIDE_CASTLE;
        }
        if (tokens[2].indexOf('Q') > -1) {
            castling.w |= BITS.QSIDE_CASTLE;
        }
        if (tokens[2].indexOf('k') > -1) {
            castling.b |= BITS.KSIDE_CASTLE;
        }
        if (tokens[2].indexOf('q') > -1) {
            castling.b |= BITS.QSIDE_CASTLE;
        }

        ep_square = (tokens[3] === '-') ? EMPTY : SQUARES[tokens[3]];
        half_moves = parseInt(tokens[4], 10);
        move_number = parseInt(tokens[5], 10);
        return true;
    }

    function generate_fen() {
        var empty = 0;
        var fen = '';

        for (let i = SQUARES.a8; i <= SQUARES.h1; i++) {
            if (board[i] == null) {
                empty++;
            } else {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                var color = board[i].color;
                var piece = board[i].type;

                fen += (color === WHITE) ?
                                 piece.toUpperCase() : piece.toLowerCase();
            }

            if ((i + 1) & 0x88) {
                if (empty > 0) {
                    fen += empty;
                }

                if (i !== SQUARES.h1) {
                    fen += '/';
                }

                empty = 0;
                i += 8;
            }
        }

        var cflags = '';
        if (castling[WHITE] & BITS.KSIDE_CASTLE) { cflags += 'K'; }
        if (castling[WHITE] & BITS.QSIDE_CASTLE) { cflags += 'Q'; }
        if (castling[BLACK] & BITS.KSIDE_CASTLE) { cflags += 'k'; }
        if (castling[BLACK] & BITS.QSIDE_CASTLE) { cflags += 'q'; }

        /* do we have an empty castling flag? */
        cflags = cflags || '-';
        var epflags = (ep_square === EMPTY) ? '-' : algebraic(ep_square);

        return [fen, turn, cflags, epflags, half_moves, move_number].join(' ');
    }

    function put(piece, square) {
        /* check for valid piece object */
        if (!('type' in piece && 'color' in piece)) {
            return false;
        }

        /* check for piece */
        if (SYMBOLS.indexOf(piece.type.toLowerCase()) === -1) {
            return false;
        }

        /* check for valid square */
        if (!(square in SQUARES)) {
            return false;
        }

        var sq = SQUARES[square];

        board[sq] = {type: piece.type, color: piece.color};
        if (piece.type === KING) {
            kings[piece.color] = sq;
        }
        return true;
    }

    function build_move(board, from, to, flags, promotion) {
        var move = {
            color: turn,
            from: from,
            to: to,
            flags: flags,
            piece: board[from].type
        };

        if (promotion) {
            move.flags |= BITS.PROMOTION;
            move.promotion = promotion;
        }

        if (board[to]) {
            move.captured = board[to].type;
        } else if (flags & BITS.EP_CAPTURE) {
                move.captured = PAWN;
        }
        return move;
    }

    function generate_moves(options) {
        function add_move(board, moves, from, to, flags) {
            /* if pawn promotion */
            if (board[from].type === PAWN &&
                 (rank(to) === RANK_8 || rank(to) === RANK_1)) {
                    var pieces = [QUEEN, ROOK, BISHOP, KNIGHT];
                    for (let i = 0, len = pieces.length; i < len; i++) {
                        moves.push(build_move(board, from, to, flags, pieces[i]));
                    }
            } else {
             moves.push(build_move(board, from, to, flags));
            }
        }

        var moves = [];
        var us = turn;
        var them = swap_color(us);
        var second_rank = {b: RANK_7, w: RANK_2};

        var first_sq = SQUARES.a8;
        var last_sq = SQUARES.h1;
        var single_square = false;

        /* are we generating moves for a single square? */
        if (typeof options !== 'undefined' && 'square' in options) {
            if (options.square in SQUARES) {
                first_sq = last_sq = SQUARES[options.square];
                single_square = true;
            } else {
                /* invalid square */
                return [];
            }
        }

        for (let i = first_sq; i <= last_sq; i++) {
            /* did we run off the end of the board */
            if (i & 0x88) { i += 7; continue; }

            var piece = board[i];
            if (piece == null || piece.color !== us) {
                continue;
            }

            if (piece.type === PAWN) {
                /* single square, non-capturing */
                let square = i + PAWN_OFFSETS[us][0];
                if (board[square] == null) {
                        add_move(board, moves, i, square, BITS.NORMAL);

                    /* double square */
                    square = i + PAWN_OFFSETS[us][1];
                    if (second_rank[us] === rank(i) && board[square] == null) {
                        add_move(board, moves, i, square, BITS.BIG_PAWN);
                    }
                }

                /* pawn captures */
                for (let j = 2; j < 4; j++) {
                    square = i + PAWN_OFFSETS[us][j];
                    if (square & 0x88) continue;

                    if (board[square] != null &&
                            board[square].color === them) {
                            add_move(board, moves, i, square, BITS.CAPTURE);
                    } else if (square === ep_square) {
                            add_move(board, moves, i, ep_square, BITS.EP_CAPTURE);
                    }
                }
            } else {
                for (let j = 0, len = PIECE_OFFSETS[piece.type].length; j < len; j++) {
                    var offset = PIECE_OFFSETS[piece.type][j];
                    var square = i;

                    while (true) {
                        square += offset;
                        if (square & 0x88) break;

                        if (board[square] == null) {
                            add_move(board, moves, i, square, BITS.NORMAL);
                        } else {
                            if (board[square].color === us) break;
                            add_move(board, moves, i, square, BITS.CAPTURE);
                            break;
                        }

                        /* break, if knight or king */
                        if (piece.type === 'n' || piece.type === 'k') break;
                    }
                }
            }
        }

        /* check for castling if: a) we're generating all moves, or b) we're doing
         * single square move generation on the king's square
         */
        if ((!single_square) || last_sq === kings[us]) {
            /* king-side castling */
            if (castling[us] & BITS.KSIDE_CASTLE) {
                let castling_from = kings[us],
                    castling_to = castling_from + 2;

                if (board[castling_from + 1] == null && board[castling_to] == null) {
                    add_move(board, moves, kings[us] , castling_to, BITS.KSIDE_CASTLE);
                }
            }

            /* queen-side castling */
            if (castling[us] & BITS.QSIDE_CASTLE) {
                let castling_from = kings[us],
                    castling_to = castling_from - 2;

                if (board[castling_from - 1] == null &&
                        board[castling_from - 2] == null &&
                        board[castling_from - 3] == null) {
                    add_move(board, moves, kings[us], castling_to, BITS.QSIDE_CASTLE);
                }
            }
        }

        return moves;
    }

    /* convert a move from 0x88 coordinates to Standard Algebraic Notation
     * (SAN)
     *
     * @param {boolean} sloppy Use the sloppy SAN generator to work around over
     * disambiguation bugs in Fritz and Chessbase.    See below:
     *
     * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
     * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
     * 4. ... Ne7 is technically the valid SAN
     */
    function move_to_san(move, sloppy) {

        var output = '';

        if (move.flags & BITS.KSIDE_CASTLE) {
            output = 'O-O';
        } else if (move.flags & BITS.QSIDE_CASTLE) {
            output = 'O-O-O';
        } else {
            var disambiguator = get_disambiguator(move, sloppy);

            if (move.piece !== PAWN) {
                output += move.piece.toUpperCase() + disambiguator;
            }

            if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
                if (move.piece === PAWN) {
                    output += algebraic(move.from)[0];
                }
                output += 'x';
            }

            output += algebraic(move.to);

            if (move.flags & BITS.PROMOTION) {
                output += '=' + move.promotion.toUpperCase();
            }
        }

        make_move(move);
        undo_move();

        return output;
    }

    // parses all of the decorators out of a SAN string
    function stripped_san(move) {
        return move.replace(/=/,'').replace(/[+#]?[?!]*$/,'');
    }

    function push(move) {
        history.push({
            move: move,
            kings: {b: kings.b, w: kings.w},
            turn: turn,
            castling: {b: castling.b, w: castling.w},
            ep_square: ep_square,
            half_moves: half_moves,
            move_number: move_number
        });
    }

    function make_move(move) {
        var us = turn;
        var them = swap_color(us);
        push(move);

        board[move.to] = board[move.from];
        board[move.from] = null;

        /* if ep capture, remove the captured pawn */
        if (move.flags & BITS.EP_CAPTURE) {
            if (turn === BLACK) {
                board[move.to - 16] = null;
            } else {
                board[move.to + 16] = null;
            }
        }

        /* if pawn promotion, replace with new piece */
        if (move.flags & BITS.PROMOTION) {
            board[move.to] = {type: move.promotion, color: us};
        }

        /* if we moved the king */
        if (board[move.to].type === KING) {
            kings[board[move.to].color] = move.to;

            /* if we castled, move the rook next to the king */
            if (move.flags & BITS.KSIDE_CASTLE) {
                var castling_to = move.to - 1;
                var castling_from = move.to + 1;
                board[castling_to] = board[castling_from];
                board[castling_from] = null;
            } else if (move.flags & BITS.QSIDE_CASTLE) {
                let castling_to = move.to + 1,
                    castling_from = move.to - 2;
                board[castling_to] = board[castling_from];
                board[castling_from] = null;
            }

            /* turn off castling */
            castling[us] = '';
        }

        /* turn off castling if we move a rook */
        if (castling[us]) {
            for (let i = 0, len = ROOKS[us].length; i < len; i++) {
                if (move.from === ROOKS[us][i].square &&
                        castling[us] & ROOKS[us][i].flag) {
                    castling[us] ^= ROOKS[us][i].flag;
                    break;
                }
            }
        }

        /* turn off castling if we capture a rook */
        if (castling[them]) {
            for (let i = 0, len = ROOKS[them].length; i < len; i++) {
                if (move.to === ROOKS[them][i].square &&
                        castling[them] & ROOKS[them][i].flag) {
                    castling[them] ^= ROOKS[them][i].flag;
                    break;
                }
            }
        }

        /* if big pawn move, update the en passant square */
        if (move.flags & BITS.BIG_PAWN) {
            if (turn === 'b') {
                ep_square = move.to - 16;
            } else {
                ep_square = move.to + 16;
            }
        } else {
            ep_square = EMPTY;
        }

        /* reset the 50 move counter if a pawn is moved or a piece is captured */
        if (move.piece === PAWN) {
            half_moves = 0;
        } else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
            half_moves = 0;
        } else {
            half_moves++;
        }

        if (turn === BLACK) {
            move_number++;
        }
        turn = swap_color(turn);
    }

    function undo_move() {
        var old = history.pop();
        if (old == null) { return null; }

        var move = old.move;
        kings = old.kings;
        turn = old.turn;
        castling = old.castling;
        ep_square = old.ep_square;
        half_moves = old.half_moves;
        move_number = old.move_number;

        var us = turn;
        var them = swap_color(turn);

        board[move.from] = board[move.to];
        board[move.from].type = move.piece;    // to undo any promotions
        board[move.to] = null;

        if (move.flags & BITS.CAPTURE) {
            board[move.to] = {type: move.captured, color: them};
        } else if (move.flags & BITS.EP_CAPTURE) {
            var index;
            if (us === BLACK) {
                index = move.to - 16;
            } else {
                index = move.to + 16;
            }
            board[index] = {type: PAWN, color: them};
        }


        if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
            var castling_to, castling_from;
            if (move.flags & BITS.KSIDE_CASTLE) {
                castling_to = move.to + 1;
                castling_from = move.to - 1;
            } else if (move.flags & BITS.QSIDE_CASTLE) {
                castling_to = move.to - 2;
                castling_from = move.to + 1;
            }

            board[castling_to] = board[castling_from];
            board[castling_from] = null;
        }

        return move;
    }

    /* this function is used to uniquely identify ambiguous moves */
    function get_disambiguator(move, sloppy) {
        var moves = generate_moves({legal: !sloppy});

        var from = move.from;
        var to = move.to;
        var piece = move.piece;

        var ambiguities = 0;
        var same_rank = 0;
        var same_file = 0;

        for (let i = 0, len = moves.length; i < len; i++) {
            var ambig_from = moves[i].from;
            var ambig_to = moves[i].to;
            var ambig_piece = moves[i].piece;

            /* if a move of the same piece type ends on the same to square, we'll
             * need to add a disambiguator to the algebraic notation
             */
            if (piece === ambig_piece && from !== ambig_from && to === ambig_to) {
                ambiguities++;

                if (rank(from) === rank(ambig_from)) {
                    same_rank++;
                }

                if (file(from) === file(ambig_from)) {
                    same_file++;
                }
            }
        }

        if (ambiguities > 0) {
            /* if there exists a similar moving piece on the same rank and file as
             * the move in question, use the square as the disambiguator
             */
            if (same_rank > 0 && same_file > 0) {
                return algebraic(from);
            }
            /* if the moving piece rests on the same file, use the rank symbol as the
             * disambiguator
             */
            else if (same_file > 0) {
                return algebraic(from).charAt(1);
            }
            /* else use the file symbol */
            else {
                return algebraic(from).charAt(0);
            }
        }

        return '';
    }

    // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
    function move_from_san(move) {
        // strip off any move decorations: e.g Nf3+?!
        var clean_move = stripped_san(move);

        let from, matches, piece, promotion, to;

        var moves = generate_moves();
        for (let i = 0, len = moves.length; i < len; i++) {
            // try the strict parser first, then the sloppy parser if requested
            // by the user
            if (clean_move === stripped_san(move_to_san(moves[i]))) {
                return moves[i];
            } else {
                if (matches &&
                        (!piece || piece.toLowerCase() == moves[i].piece) &&
                        SQUARES[from] == moves[i].from &&
                        SQUARES[to] == moves[i].to &&
                        (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
                    return moves[i];
                }
            }
        }

        return null;
    }


    /*****************************************************************************
     * UTILITY FUNCTIONS
     ****************************************************************************/
    function rank(i) {
        return i >> 4;
    }

    function file(i) {
        return i & 15;
    }

    function algebraic(i){
        var f = file(i), r = rank(i);
        return 'abcdefgh'.substring(f,f+1) + '87654321'.substring(r,r+1);
    }

    function swap_color(c) {
        return c === WHITE ? BLACK : WHITE;
    }

    function is_digit(c) {
        return '0123456789'.indexOf(c) !== -1;
    }

    return {
        /***************************************************************************
         * PUBLIC API
         **************************************************************************/
        load: function(fen) {
            return load(fen);
        },

        reset: function() {
            return reset();
        },

        fen: function() {
            return generate_fen();
        },

        /**
         * Move
         * @param {string|Object} move ex: Nxb7, {from: 'h7', to: 'h8', promotion: 'q'}
         */
        move: function(move) {
            var move_obj = null;

            if (typeof move === 'string')
                move_obj = move_from_san(move);
            else if (typeof move === 'object') {
                var moves = generate_moves();

                // convert the pretty move object to an ugly move object
                for (let i = 0, len = moves.length; i < len; i++) {
                    if (move.from === algebraic(moves[i].from) &&
                            move.to === algebraic(moves[i].to) &&
                            (!('promotion' in moves[i]) ||
                            move.promotion === moves[i].promotion)) {
                        move_obj = moves[i];
                        break;
                    }
                }
            }

            // failed to find move
            if (!move_obj)
                return null;

            make_move(move_obj);
            return move_obj;
        },

        clear: function() {
            return clear();
        },

        put: function(piece, square) {
            return put(piece, square);
        },
    };
};

if (typeof exports !== 'undefined') exports.Chess = Chess;
if (typeof define !== 'undefined') define( function () {return Chess;});
