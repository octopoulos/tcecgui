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
    let COLORS = 'wb';
    let BLACK = 1;
    let WHITE = 0;

    let EMPTY = -1;

    let PAWN = 'p';
    let KNIGHT = 'n';
    let BISHOP = 'b';
    let ROOK = 'r';
    let QUEEN = 'q';
    let KING = 'k';

    let SYMBOLS = 'pnbrqkPNBRQK';

    let DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    let PAWN_OFFSETS = [
        [-16, -32, -17, -15],
        [16, 32, 17, 15],
    ];

    let PIECE_OFFSETS = {
        n: [-18, -33, -31, -14,  18, 33, 31,  14],
        b: [-17, -15,  17,  15],
        r: [-16,   1,  16,  -1],
        q: [-17, -16, -15,   1,  17, 16, 15,  -1],
        k: [-17, -16, -15,   1,  17, 16, 15,  -1]
    };

    let ATTACKS = [
        20, 0, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0, 0,20, 0,
         0,20, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0,20, 0, 0,
         0, 0,20, 0, 0, 0, 0,24, 0, 0, 0, 0,20, 0, 0, 0,
         0, 0, 0,20, 0, 0, 0,24, 0, 0, 0,20, 0, 0, 0, 0,
         0, 0, 0, 0,20, 0, 0,24, 0, 0,20, 0, 0, 0, 0, 0,
         0, 0, 0, 0, 0,20, 2,24, 2,20, 0, 0, 0, 0, 0, 0,
         0, 0, 0, 0, 0, 2,53,56,53, 2, 0, 0, 0, 0, 0, 0,
        24,24,24,24,24,24,56, 0,56,24,24,24,24,24,24, 0,
         0, 0, 0, 0, 0, 2,53,56,53, 2, 0, 0, 0, 0, 0, 0,
         0, 0, 0, 0, 0,20, 2,24, 2,20, 0, 0, 0, 0, 0, 0,
         0, 0, 0, 0,20, 0, 0,24, 0, 0,20, 0, 0, 0, 0, 0,
         0, 0, 0,20, 0, 0, 0,24, 0, 0, 0,20, 0, 0, 0, 0,
         0, 0,20, 0, 0, 0, 0,24, 0, 0, 0, 0,20, 0, 0, 0,
         0,20, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0,20, 0, 0,
        20, 0, 0, 0, 0, 0, 0,24, 0, 0, 0, 0, 0, 0,20,
    ];

    let RAYS = [
        17,  0,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0,  0, 15, 0,
         0, 17,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0, 15,  0, 0,
         0,  0, 17,  0,  0,  0,  0, 16,  0,  0,  0,  0, 15,  0,  0, 0,
         0,  0,  0, 17,  0,  0,  0, 16,  0,  0,  0, 15,  0,  0,  0, 0,
         0,  0,  0,  0, 17,  0,  0, 16,  0,  0, 15,  0,  0,  0,  0, 0,
         0,  0,  0,  0,  0, 17,  0, 16,  0, 15,  0,  0,  0,  0,  0, 0,
         0,  0,  0,  0,  0,  0, 17, 16, 15,  0,  0,  0,  0,  0,  0, 0,
         1,  1,  1,  1,  1,  1,  1,  0, -1, -1,  -1,-1, -1, -1, -1, 0,
         0,  0,  0,  0,  0,  0,-15,-16,-17,  0,  0,  0,  0,  0,  0, 0,
         0,  0,  0,  0,  0,-15,  0,-16,  0,-17,  0,  0,  0,  0,  0, 0,
         0,  0,  0,  0,-15,  0,  0,-16,  0,  0,-17,  0,  0,  0,  0, 0,
         0,  0,  0,-15,  0,  0,  0,-16,  0,  0,  0,-17,  0,  0,  0, 0,
         0,  0,-15,  0,  0,  0,  0,-16,  0,  0,  0,  0,-17,  0,  0, 0,
         0,-15,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,-17,  0, 0,
       -15,  0,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,  0,-17,
    ];

    let SHIFTS = { p: 0, n: 1, b: 2, r: 3, q: 4, k: 5 };

    let BITS = {
        NORMAL: 1,
        CAPTURE: 2,
        BIG_PAWN: 4,
        EP_CAPTURE: 8,
        PROMOTION: 16,
        KSIDE_CASTLE: 32,
        QSIDE_CASTLE: 64
    };

    let RANK_1 = 7,
        RANK_2 = 6,
        RANK_7 = 1,
        RANK_8 = 0;

    let SQUARES = {
        a8:   0, b8:   1, c8:   2, d8:   3, e8:   4, f8:   5, g8:   6, h8:   7,
        a7:  16, b7:  17, c7:  18, d7:  19, e7:  20, f7:  21, g7:  22, h7:  23,
        a6:  32, b6:  33, c6:  34, d6:  35, e6:  36, f6:  37, g6:  38, h6:  39,
        a5:  48, b5:  49, c5:  50, d5:  51, e5:  52, f5:  53, g5:  54, h5:  55,
        a4:  64, b4:  65, c4:  66, d4:  67, e4:  68, f4:  69, g4:  70, h4:  71,
        a3:  80, b3:  81, c3:  82, d3:  83, e3:  84, f3:  85, g3:  86, h3:  87,
        a2:  96, b2:  97, c2:  98, d2:  99, e2: 100, f2: 101, g2: 102, h2: 103,
        a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
    };

    let ROOKS = [
        [
            {square: SQUARES.a1, flag: BITS.QSIDE_CASTLE},
            {square: SQUARES.h1, flag: BITS.KSIDE_CASTLE},
        ],
        [
            {square: SQUARES.a8, flag: BITS.QSIDE_CASTLE},
            {square: SQUARES.h8, flag: BITS.KSIDE_CASTLE},
        ],
    ];

    let board = new Array(128);
    let kings = [EMPTY, EMPTY];
    let turn = WHITE;
    let castling = [0, 0];
    let ep_square = EMPTY;
    let half_moves = 0;
    let move_number = 1;
    let history = [];

    // if the user passes in a fen string, load it, else default to starting position
    load((fen == undefined)? DEFAULT_POSITION: fen);

    function clear() {
        board = new Array(128);
        kings = [EMPTY, EMPTY];
        turn = WHITE;
        castling = [0, 0];
        ep_square = EMPTY;
        half_moves = 0;
        move_number = 1;
        history = [];
    }

    function reset() {
        load(DEFAULT_POSITION);
    }

    function load(fen) {
        let tokens = fen.split(/\s+/),
            position = tokens[0],
            square = 0;

        clear();

        for (let i = 0; i < position.length; i ++) {
            let piece = position[i];

            if (piece === '/')
                square += 8;
            else if ('0123456789'.includes(piece))
                square += parseInt(piece, 10);
            else {
                let color = (piece < 'a') ? WHITE : BLACK;
                put({type: piece.toLowerCase(), color: color}, algebraic(square));
                square ++;
            }
        }

        turn = (tokens[1] == 'w')? 0: 1;

        if (tokens[2].indexOf('K') > -1)
            castling[0] |= BITS.KSIDE_CASTLE;
        if (tokens[2].indexOf('Q') > -1)
            castling[0] |= BITS.QSIDE_CASTLE;
        if (tokens[2].indexOf('k') > -1)
            castling[1] |= BITS.KSIDE_CASTLE;
        if (tokens[2].indexOf('q') > -1)
            castling[1] |= BITS.QSIDE_CASTLE;

        ep_square = (tokens[3] === '-') ? EMPTY : SQUARES[tokens[3]];
        half_moves = parseInt(tokens[4], 10);
        move_number = parseInt(tokens[5], 10);
        return true;
    }

    function generate_fen() {
        let empty = 0,
            fen = '';

        for (let i = SQUARES.a8; i <= SQUARES.h1; i ++) {
            if (board[i] == null)
                empty ++;
            else {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                let color = board[i].color,
                    piece = board[i].type;
                fen += (color === WHITE)? piece.toUpperCase() : piece.toLowerCase();
            }

            if ((i + 1) & 0x88) {
                if (empty > 0)
                    fen += empty;
                if (i !== SQUARES.h1)
                    fen += '/';

                empty = 0;
                i += 8;
            }
        }

        let cflags = '';
        if (castling[WHITE] & BITS.KSIDE_CASTLE) cflags += 'K';
        if (castling[WHITE] & BITS.QSIDE_CASTLE) cflags += 'Q';
        if (castling[BLACK] & BITS.KSIDE_CASTLE) cflags += 'k';
        if (castling[BLACK] & BITS.QSIDE_CASTLE) cflags += 'q';

        // do we have an empty castling flag?
        cflags = cflags || '-';
        let epflags = (ep_square === EMPTY) ? '-' : algebraic(ep_square);

        return [fen, COLORS[turn], cflags, epflags, half_moves, move_number].join(' ');
    }

    function put(piece, square) {
        // check for valid piece object
        if (!('type' in piece && 'color' in piece))
            return false;

        // check for piece
        if (!SYMBOLS.includes(piece.type))
            return false;

        // check for valid square
        if (!(square in SQUARES))
            return false;

        let sq = SQUARES[square];

        board[sq] = {type: piece.type, color: piece.color};
        if (piece.type === KING)
            kings[piece.color] = sq;
        return true;
    }

    function build_move(board, from, to, flags, promotion) {
        let move = {
            color: turn,
            flags: flags,
            from: from,
            piece: board[from].type,
            to: to,
        };

        if (promotion) {
            move.flags |= BITS.PROMOTION;
            move.promotion = promotion;
        }

        if (board[to])
            move.captured = board[to].type;
        else if (flags & BITS.EP_CAPTURE)
            move.captured = PAWN;

        return move;
    }

    function add_move(board, moves, from, to, flags) {
        // if pawn promotion
        if (board[from].type === PAWN && (rank(to) === RANK_8 || rank(to) === RANK_1)) {
            for (let piece of [QUEEN, ROOK, BISHOP, KNIGHT])
                moves.push(build_move(board, from, to, flags, piece));
        }
        else
            moves.push(build_move(board, from, to, flags));
    }

    function generate_moves({legal, single_square}={}) {
        let first_sq = SQUARES.a8,
            last_sq = SQUARES.h1,
            moves = [],
            second_rank = [RANK_2, RANK_7],
            us = turn,
            them = 1 - us;

        // are we generating moves for a single square?
        if (single_square != null) {
            first_sq = SQUARES[single_square] || single_square;
            last_sq = first_sq;
        }

        for (let i = first_sq; i <= last_sq; i ++) {
            // did we run off the end of the board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            let piece = board[i];
            if (piece == null || piece.color !== us)
                continue;

            if (piece.type === PAWN) {
                // single square, non-capturing
                let square = i + PAWN_OFFSETS[us][0];
                if (board[square] == null) {
                        add_move(board, moves, i, square, BITS.NORMAL);

                    // double square
                    square = i + PAWN_OFFSETS[us][1];
                    if (second_rank[us] === rank(i) && board[square] == null) {
                        add_move(board, moves, i, square, BITS.BIG_PAWN);
                    }
                }

                // pawn captures
                for (let j = 2; j < 4; j++) {
                    square = i + PAWN_OFFSETS[us][j];
                    if (square & 0x88) continue;

                    if (board[square] != null && board[square].color === them)
                        add_move(board, moves, i, square, BITS.CAPTURE);
                    else if (square === ep_square)
                        add_move(board, moves, i, ep_square, BITS.EP_CAPTURE);
                }
            }
            else {
                for (let j = 0, len = PIECE_OFFSETS[piece.type].length; j < len; j++) {
                    let offset = PIECE_OFFSETS[piece.type][j],
                        square = i;

                    while (true) {
                        square += offset;
                        if (square & 0x88) break;

                        if (board[square] == null)
                            add_move(board, moves, i, square, BITS.NORMAL);
                        else {
                            if (board[square].color === us) break;
                            add_move(board, moves, i, square, BITS.CAPTURE);
                            break;
                        }

                        // break, if knight or king
                        if (piece.type === 'n' || piece.type === 'k') break;
                    }
                }
            }
        }

        // check for castling if: a) we're generating all moves, or b) we're doing
        // single square move generation on the king's square
        if (!single_square || last_sq === kings[us]) {
            // king-side castling
            if (castling[us] & BITS.KSIDE_CASTLE) {
                let castling_from = kings[us],
                    castling_to = castling_from + 2;

                if (
                    board[castling_from + 1] == null &&
                    board[castling_to] == null &&
                    !attacked(them, kings[us]) &&
                    !attacked(them, castling_from + 1) &&
                    !attacked(them, castling_to)
                ) {
                    add_move(board, moves, kings[us], castling_to, BITS.KSIDE_CASTLE);
                }
            }

            // queen-side castling
            if (castling[us] & BITS.QSIDE_CASTLE) {
                let castling_from = kings[us],
                    castling_to = castling_from - 2;

                if (
                    board[castling_from - 1] == null &&
                    board[castling_from - 2] == null &&
                    board[castling_from - 3] == null &&
                    !attacked(them, kings[us]) &&
                    !attacked(them, castling_from - 1) &&
                    !attacked(them, castling_to)
                ) {
                    add_move(board, moves, kings[us], castling_to, BITS.QSIDE_CASTLE);
                }
            }
        }

        // return pseudo-legal moves
        if (!legal)
            return moves;

        // filter out illegal moves
        let legal_moves = [];
        for (let i = 0, len = moves.length; i < len; i ++) {
            make_move(moves[i]);
            if (!king_attacked(us))
                legal_moves.push(moves[i]);
            undo_move();
        }

        return legal_moves;
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
        let output = '';

        if (move.flags & BITS.KSIDE_CASTLE)
            output = 'O-O';
        else if (move.flags & BITS.QSIDE_CASTLE)
            output = 'O-O-O';
        else {
            let disambiguator = get_disambiguator(move, sloppy);

            if (move.piece !== PAWN)
                output += move.piece.toUpperCase() + disambiguator;

            if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
                if (move.piece === PAWN)
                    output += algebraic(move.from)[0];
                output += 'x';
            }

            output += algebraic(move.to);

            if (move.flags & BITS.PROMOTION)
                output += '=' + move.promotion.toUpperCase();
        }

        make_move(move);
        undo_move();

        return output;
    }

    // parses all of the decorators out of a SAN string
    function stripped_san(move) {
        return move.replace(/=/, '').replace(/[+#]?[?!]*$/, '');
    }

    function attacked(color, square) {
        for (let i = SQUARES.a8; i <= SQUARES.h1; i ++) {
            // did we run off the end of the board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            // if empty square or wrong color
            if (board[i] == null || board[i].color !== color)
                continue;

            let difference = i - square,
                index = difference + 119,
                piece = board[i];

            if (ATTACKS[index] & (1 << SHIFTS[piece.type])) {
                if (piece.type === PAWN) {
                    if (difference > 0) {
                        if (piece.color === WHITE)
                            return true;
                    }
                    else if (piece.color === BLACK)
                        return true;
                    continue;
                }

                // if the piece is a knight or a king
                if (piece.type === 'n' || piece.type === 'k')
                    return true;

                let blocked,
                    offset = RAYS[index],
                    j = i + offset;

                while (j !== square) {
                    if (board[j] != null) {
                        blocked = true;
                        break;
                    }
                    j += offset;
                }
                if (!blocked)
                    return true;
            }
        }

        return false;
    }

    function king_attacked(color) {
        return attacked(1 - color, kings[color]);
    }

    function push(move) {
        history.push({
            move: move,
            kings: [...kings],
            turn: turn,
            castling: [...castling],
            ep_square: ep_square,
            half_moves: half_moves,
            move_number: move_number
        });
    }

    function make_move(move) {
        let us = turn,
            them = 1 - us;
        push(move);

        board[move.to] = board[move.from];
        board[move.from] = null;

        // if ep capture, remove the captured pawn
        if (move.flags & BITS.EP_CAPTURE)
            if (turn === BLACK)
                board[move.to - 16] = null;
            else
                board[move.to + 16] = null;

        // if pawn promotion, replace with new piece
        if (move.flags & BITS.PROMOTION)
            board[move.to] = {type: move.promotion, color: us};

        // if we moved the king
        if (board[move.to].type === KING) {
            kings[board[move.to].color] = move.to;

            // if we castled, move the rook next to the king
            if (move.flags & BITS.KSIDE_CASTLE) {
                let castling_from = move.to + 1,
                    castling_to = move.to - 1;
                board[castling_to] = board[castling_from];
                board[castling_from] = null;
            }
            else if (move.flags & BITS.QSIDE_CASTLE) {
                let castling_from = move.to - 2,
                    castling_to = move.to + 1;
                board[castling_to] = board[castling_from];
                board[castling_from] = null;
            }

            // turn off castling
            castling[us] = '';
        }

        // turn off castling if we move a rook
        if (castling[us]) {
            for (let i = 0, len = ROOKS[us].length; i < len; i ++) {
                if (move.from === ROOKS[us][i].square && castling[us] & ROOKS[us][i].flag) {
                    castling[us] ^= ROOKS[us][i].flag;
                    break;
                }
            }
        }

        // turn off castling if we capture a rook
        if (castling[them]) {
            for (let i = 0, len = ROOKS[them].length; i < len; i ++) {
                if (move.to === ROOKS[them][i].square && castling[them] & ROOKS[them][i].flag) {
                    castling[them] ^= ROOKS[them][i].flag;
                    break;
                }
            }
        }

        // if big pawn move, update the en passant square
        if (move.flags & BITS.BIG_PAWN) {
            if (turn === BLACK)
                ep_square = move.to - 16;
            else
                ep_square = move.to + 16;
        }
        else
            ep_square = EMPTY;

        // reset the 50 move counter if a pawn is moved or a piece is captured
        if (move.piece === PAWN)
            half_moves = 0;
        else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE))
            half_moves = 0;
        else
            half_moves ++;

        if (turn === BLACK)
            move_number++;
        turn = 1 - turn;
    }

    function undo_move() {
        let old = history.pop();
        if (old == null)
            return null;

        let move = old.move;
        kings = old.kings;
        turn = old.turn;
        castling = old.castling;
        ep_square = old.ep_square;
        half_moves = old.half_moves;
        move_number = old.move_number;

        let us = turn,
            them = 1 - turn;

        board[move.from] = board[move.to];
        board[move.from].type = move.piece;    // to undo any promotions
        board[move.to] = null;

        if (move.flags & BITS.CAPTURE)
            board[move.to] = {type: move.captured, color: them};
        else if (move.flags & BITS.EP_CAPTURE) {
            let index;
            if (us === BLACK)
                index = move.to - 16;
            else
                index = move.to + 16;
            board[index] = {type: PAWN, color: them};
        }

        if (move.flags & (BITS.KSIDE_CASTLE | BITS.QSIDE_CASTLE)) {
            let castling_to, castling_from;
            if (move.flags & BITS.KSIDE_CASTLE) {
                castling_to = move.to + 1;
                castling_from = move.to - 1;
            }
            else if (move.flags & BITS.QSIDE_CASTLE) {
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
        let ambiguities = 0,
            from = move.from,
            moves = generate_moves({legal: !sloppy}),
            piece = move.piece,
            same_file = 0,
            same_rank = 0,
            to = move.to;

        for (let i = 0, len = moves.length; i < len; i ++) {
            let ambig_from = moves[i].from,
                ambig_piece = moves[i].piece,
                ambig_to = moves[i].to;

            // if a move of the same piece type ends on the same to square,
            // we'll need to add a disambiguator to the algebraic notation
            if (piece === ambig_piece && from !== ambig_from && to === ambig_to) {
                ambiguities ++;

                if (rank(from) === rank(ambig_from))
                    same_rank ++;
                if (file(from) === file(ambig_from))
                    same_file ++;
            }
        }

        if (ambiguities > 0) {
            // if there exists a similar moving piece on the same rank and file as
            // the move in question, use the square as the disambiguator
            if (same_rank > 0 && same_file > 0)
                return algebraic(from);
            // if the moving piece rests on the same file, use the rank symbol as the disambiguator
            else if (same_file > 0)
                return algebraic(from)[1];
            // else use the file symbol
            else
                return algebraic(from)[0];
        }

        return '';
    }

    // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
    function move_from_san(move) {
        // strip off any move decorations: e.g Nf3+?!
        let from, matches, piece, promotion, to,
            clean_move = stripped_san(move),
            moves = generate_moves();

        for (let i = 0, len = moves.length; i < len; i ++) {
            // try the strict parser first, then the sloppy parser if requested by the user
            if (clean_move === stripped_san(move_to_san(moves[i])))
                return moves[i];

            if (matches &&
                    (!piece || piece.toLowerCase() == moves[i].piece) &&
                    SQUARES[from] == moves[i].from && SQUARES[to] == moves[i].to &&
                    (!promotion || promotion.toLowerCase() == moves[i].promotion)) {
                return moves[i];
            }
        }

        return null;
    }

    // UTILITY
    //////////
    function rank(i) {
        return i >> 4;
    }

    function file(i) {
        return i & 15;
    }

    function algebraic(i) {
        let f = file(i),
            r = rank(i);
        return 'abcdefgh'.substring(f,f+1) + '87654321'.substring(r,r+1);
    }

    // API
    //////
    return {
        attacked: (color, square) => {
            return attacked(color, square);
        },

        checked: () => {
            return king_attacked(turn);
        },

        clear: () => {
            return clear();
        },

        fen: () => {
            return generate_fen();
        },

        load: fen => {
            return load(fen);
        },

        /**
         * Move
         * @param {string|Object} move ex: Nxb7, {from: 'h7', to: 'h8', promotion: 'q'}
         */
        move: move => {
            let move_obj = null;

            if (typeof move === 'string')
                move_obj = move_from_san(move);
            else if (typeof move === 'object') {
                let moves = generate_moves();

                // convert the pretty move object to an ugly move object
                for (let i = 0, len = moves.length; i < len; i ++) {
                    if (move.from === algebraic(moves[i].from) &&
                            move.to === algebraic(moves[i].to) &&
                            (!('promotion' in moves[i]) ||
                            move.promotion === moves[i].promotion)) {
                        move_obj = moves[i];
                        move_obj.san = move_to_san(move_obj);
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

        moves: options => {
            return generate_moves(options);
        },

        put: (piece, square) => {
            return put(piece, square);
        },

        reset: () => {
            return reset();
        },
    };
};
