// chess.cpp
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-09-26
// - wasm implementation, 2x faster than fast chess.js
// - FRC support
// - emcc --bind -o ../js/chess-wasm.js chess.cpp -s WASM=1 -Wall -s MODULARIZE=1 -O3 --closure 1

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <algorithm>
#include <iostream>
#include <map>
#include <regex>
#include <set>
#include <stdio.h>

using namespace emscripten;

// specific
#define DELETE(x) {if (x) delete x; x = nullptr;}
#define DELETE_ARRAY(x) {if (x) delete [] x; x = nullptr;}
constexpr int       Max(int a, int b) {return (a >= b)? a: b;}
constexpr int       Min(int a, int b) {return (a <= b)? a: b;}
constexpr uint8_t   Max(uint8_t a, uint8_t b) {return (a >= b)? a: b;}
constexpr uint8_t   Min(uint8_t a, uint8_t b) {return (a <= b)? a: b;}

// types
typedef uint64_t    Bitboard;
typedef uint64_t    Hash;
typedef uint32_t    Move;
typedef uint8_t     Piece;
typedef uint8_t     Square;

// defines
constexpr Piece     BISHOP = 3;
constexpr uint8_t   BITS_CASTLE = 1;
constexpr uint8_t   BITS_EN_PASSANT = 2;
constexpr uint8_t   BLACK = 1;
constexpr uint8_t   BOUND_EXACT = 0;
constexpr uint8_t   BOUND_LOWER = 1;
constexpr uint8_t   BOUND_UPPER = 2;
constexpr uint8_t   COLOR(uint8_t piece) {return piece >> 3;}
constexpr char      COLOR_TEXT(uint8_t color) {return (color == 0)? 'w': 'b';}
constexpr Piece     COLORIZE(uint8_t color, uint8_t type) {return type + (color << 3);}
#define DEFAULT_POSITION "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
constexpr Square    EMPTY = 255;
constexpr Square    File(uint8_t square) {return square & 15;}
constexpr Piece     KING = 6;
constexpr Piece     KNIGHT = 2;
constexpr uint8_t   MAX_DEPTH = 64;
constexpr Piece     MoveCapture(Move move) {return (move >> 10) & 7;};
constexpr uint8_t   MoveFlag(Move move) {return (move >> 13) & 3;};
constexpr Square    MoveFrom(Move move) {return (move >> 15) & 127;};
constexpr uint8_t   moveOrder(Move move) {return (move & 1023);};
constexpr Piece     MovePromote(Move move) {return (move >> 22) & 7;};
constexpr Square    MoveTo(Move move) {return (move >> 25) & 127;};
constexpr Piece     PAWN = 1;
#define PIECE_LOWER " pnbrqk  pnbrqk"
#define PIECE_NAMES " PNBRQK  pnbrqk"
#define PIECE_UPPER " PNBRQK  PNBRQK"
constexpr Piece     QUEEN = 5;
constexpr Square    Rank(uint8_t square) {return square >> 4;}
constexpr Square    RELATIVE_RANK(int color, int square) {return color? 7 - (square >> 4): (square >> 4);}
constexpr Piece     ROOK = 4;
constexpr int       SCORE_INFINITY = 31001;
constexpr int       SCORE_MATE = 31000;
constexpr int       SCORE_NONE = 31002;
constexpr Square    SQUARE_A8 = 0;
constexpr Square    SQUARE_H1 = 119;
constexpr int       TT_SIZE = 4096;
constexpr Piece     TYPE(uint8_t piece) {return piece & 7;}
constexpr uint8_t   WHITE = 0;

// tables
int MOBILITY_LIMITS[] = {
        0,
        8,          // P
        32,         // N
        24,         // B
        24,         // R
        24,         // Q
        1,          // K
        0,
        0,
        8,          // p
        32,         // n
        24,         // b
        24,         // r
        24,         // q
        1,          // k
        0,
    },
    MOBILITY_SCORES[] = {
        0,
        2,          // P
        4,          // N
        3,          // B
        3,          // R
        2,          // Q
        1,          // K
        0,
        0,
        2,          // p
        4,          // n
        3,          // b
        3,          // r
        2,          // q
        1,          // k
        0,
    },
    PAWN_OFFSETS[2][3] = {
        {-17, -16, -15},
        {17, 16, 15},
    },
    // attacks + defenses
    // those values could be optimized automatically
    PIECE_ATTACKS[16][16] = {
        //  .   P   N   B   R   Q   K   .   .   p   n   b   r   q   k   .
        {0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0},
        {0,  7, 15, 10,  2,  1,  0,  0,  0,  1,  1,  1,  1,  1,  5,  0},    // P
        {0,  5,  9,  9,  8,  8,  0,  0,  0,  5,  2,  9,  5,  5,  5,  0},    // N
        {0,  5,  9,  9,  8,  8,  0,  0,  0,  5,  9,  2,  5,  5,  5,  0},    // B
        {0, 10,  4,  4, 18, 14,  0,  0,  0,  5,  5,  5,  2,  5,  5,  0},    // R
        {0,  5,  5,  5, 14,  1,  0,  0,  0,  5,  5,  5,  5,  2,  5,  0},    // Q
        {0,  5,  9,  9,  9,  9,  0,  0,  0, 10,  5,  5,  5,  0,  0,  0},    // K
        {0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0},
        {0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0},
        {0,  1,  1,  1,  1,  1,  5,  0,  0,  7, 15, 10,  2,  1,  0,  0},    // p
        {0,  5,  2,  9,  5,  5,  5,  0,  0,  5,  9,  9,  8,  8,  0,  0},    // n
        {0,  5,  9,  2,  5,  5,  5,  0,  0,  5,  9,  9,  8,  8,  0,  0},    // b
        {0,  5,  5,  5,  2,  5,  5,  0,  0,  5, 10,  4, 18, 14,  0,  0},    // r
        {0,  5,  5,  5,  5,  2,  5,  0,  0,  5,  5,  5, 14,  1,  0,  0},    // q
        {0, 10,  5,  5,  5,  0,  0,  0,  0,  5,  9,  9,  9,  9,  9,  0},    // k
        {0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0},
    },
    // move ordering
    PIECE_CAPTURES[] = {
        0,
        20100,      // P
        20300,      // N
        20300,      // B
        20500,      // R
        20900,      // Q
        32800,      // K
        0,
        0,
        20100,      // p
        20300,      // n
        20300,      // b
        20500,      // r
        20900,      // q
        32800,      // k
        0,
    },
    // for move generation
    PIECE_OFFSETS[7][8] = {
        {  0,   0,   0,   0,  0,  0,  0,  0},
        {  0,   0,   0,   0,  0,  0,  0,  0},
        {-18, -33, -31, -14, 18, 33, 31, 14},
        {-17, -15,  17,  15,  0,  0,  0,  0},
        {-16,   1,  16,  -1,  0,  0,  0,  0},
        {-17, -16, -15,   1, 17, 16, 15, -1},
        {-17, -16, -15,   1, 17, 16, 15, -1},
    },
    // move ordering
    PIECE_ORDERS[] = {
        0,
        4,          // P
        1,          // N
        1,          // B
        2,          // R
        3,          // Q
        5,          // K
        0,
        0,
        4,          // p
        1,          // n
        1,          // b
        2,          // r
        3,          // q
        5,          // k
        0,
    },
    // material eval
    PIECE_SCORES[] = {
        0,
        160,        // P
        720,        // N
        750,        // B
        1200,       // R
        2500,       // Q
        5000,       // K
        0,
        0,
        160,        // p
        720,        // n
        750,        // b
        1200,       // r
        2500,       // q
        5000,       // k
        0,
    },
    PROMOTE_SCORES[] = {
        0,
        0,          // P
        600,        // N
        590,        // B
        1040,       // R
        2340,       // Q
        0,          // K
        0,
        0,
        0,          // p
        600,        // n
        590,        // b
        1040,       // r
        2340,       // q
        0,          // k
        0,
    };

// extras
std::map<std::string, int> EVAL_MODES = {
    {"att", 1 + 2 + 4},
    {"hce", 1 + 2},
    {"mat", 1},
    {"mob", 2},
    {"nn", 1 + 2 + 32},
    {"null", 0},
};
// piece names for print
std::map<char, Piece> PIECES = {
    {'P', 1},
    {'N', 2},
    {'B', 3},
    {'R', 4},
    {'Q', 5},
    {'K', 6},
    {'p', 9},
    {'n', 10},
    {'b', 11},
    {'r', 12},
    {'q', 13},
    {'k', 14},
};
std::map<std::string, int> SEARCH_MODES = {
    {"ab", 2},
    {"mm", 1},
    {"rnd", 0},
};

// piece-square for move ordering
int PIECE_SQUARES[2][8][128] = {
    // white
    {
        {0},
        // pawn
        {
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            50, 50, 50, 50, 50, 50, 50, 50, 0, 0, 0, 0, 0, 0, 0, 0,
            25, 25, 25, 25, 25, 25, 25, 25, 0, 0, 0, 0, 0, 0, 0, 0,
            12, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0, 15, 20, 20, 15,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            10, 20, 10, 15, 15,  0, 20, 10, 0, 0, 0, 0, 0, 0, 0, 0,
            25, 25, 25,  0,  0, 25, 25, 25, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
        },
        // knight
        {
             0, 20, 25, 25, 25, 25, 20,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 25, 40, 60, 60, 40, 25, 20, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 25, 35, 45, 45, 35, 25, 20, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 25, 32, 40, 40, 32, 25, 20, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 25, 30, 30, 30, 30, 25, 20, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 25, 40, 30, 30, 40, 25, 20, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 25, 28, 28, 28, 25, 25, 20, 0, 0, 0, 0, 0, 0, 0, 0,
             0, 20, 20, 20, 20, 20, 20,  0, 0, 0, 0, 0, 0, 0, 0, 0,
        },
        // bishop
        {
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
        },
        // rook
        {
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 20, 20, 20, 20, 20, 20, 20, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
        },
        // queen
        {
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
        },
        // king
        {
            20, 30,  0,  0,  0,  0, 30, 20, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
             0,  0,  0,  0,  0,  0,  0,  0, 0, 0, 0, 0, 0, 0, 0, 0,
            20, 30,  0,  0,  0,  0, 30, 20, 0, 0, 0, 0, 0, 0, 0, 0,
        },
        {0},
    },
    // black
    {
        {0},
        {0},
        {0},
        {0},
        {0},
        {0},
        {0},
        {0},
    },

};

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

struct MoveObject {
    Piece   capture;
    uint8_t flag;
    Square  from;
    Piece   promote;
    Square  to;
};

struct MoveText: MoveObject {
    std::string fen;
    std::string m;
    int     ply;
    std::string pv;
    int     score;

    MoveText(): MoveObject() {}
    MoveText(const Move move) {
        capture = MoveCapture(move);
        flag = MoveFlag(move);
        from = MoveFrom(move);
        promote = MovePromote(move);
        to = MoveTo(move);
        ply = -2;
        score = 0;
    }
    MoveText(const MoveObject &move) {
        memcpy(this, &move, sizeof(MoveObject));
        ply = -2;
        score = 0;
    }
};

struct PV {
    int     length;
    Move    moves[MAX_DEPTH];
};

struct State {
    uint8_t castling[4];
    Square  ep_square;
    uint8_t half_moves;
    Move    move;
};

struct Table {
    Hash    hash;       // 64 bit
    int16_t score;      // 16
    uint8_t bound;      // 8
    uint8_t depth;      // 8
    Move    move;       // 32
};

MoveObject NULL_MOVE = {0, 0, 0, 0, 0};
MoveText NULL_TEXT = NULL_MOVE;

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * 64bit pseudo random generator
 * https://en.wikipedia.org/wiki/Xorshift
 * + WeissNNUE
 */
Hash xorshift64() {
    static Hash seed = 1070372ull;
    seed ^= seed >> 12;
    seed ^= seed << 25;
    seed ^= seed >> 27;
    return seed * 2685821657736338717ull;
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// chess class
class Chess {
private:
    // PRIVATE
    //////////

    uint8_t     attacks[16];
    int         avg_depth;
    Piece       board[128];
    Hash        board_hash;
    Square      castling[4];
    int         debug;
    uint8_t     defenses[16];
    Square      ep_square;
    int         eval_mode;                      // 0:null, &1:mat, &2:hc2, &4:qui, &8:nn
    std::string fen;
    int         fen_ply;
    bool        frc;
    uint8_t     half_moves;
    Square      kings[4];
    int         materials[2];
    int         max_depth;
    int         max_extend;
    int         max_nodes;
    int         max_quiesce;
    int         max_time;
    uint8_t     mobilities[16];
    int         move_number;
    int         nodes;
    Square      pawns[8];
    Square      pieces[2][16];
    int         ply;
    State       ply_states[128];
    int         positions[2];
    int         pv_mode;
    int         search_mode;                    // 1:minimax, 2:alpha-beta
    int         sel_depth;
    Table       table[TT_SIZE];
    std::string trace;
    int         tt_adds;
    int         tt_adds2;
    int         tt_hits;
    int         tt_hits2;
    int         turn;
    Hash        zobrist[15][128];
    bool        zobrist_ready;

    /**
     * Add an entry to the transposition table
     */
    void addEntry(Hash hash, int score, uint8_t depth, uint8_t bound, Move move) {
        tt_adds2 ++;
        auto exist = findEntry(hash, depth);
        if (exist && exist->depth >= depth)
            return;
        // TODO: convert the array to a number + save the move too (when it's converted to a number)
        exist = &table[(hash % TT_SIZE)];
        exist->hash = hash;
        exist->score = score;
        exist->depth = depth;
        exist->bound = bound;
        exist->move = move;
        tt_adds ++;
    }

    /**
     * Add a single move
     */
    void addMove(std::vector<MoveObject> &moves, uint8_t piece, uint8_t from, uint8_t to, uint8_t flag, uint8_t promote, uint8_t value) {
        uint8_t capture = (flag & BITS_EN_PASSANT)? PAWN: (flag & BITS_CASTLE? 0: TYPE(value));
        moves.push_back({
            capture,
            flag,
            from,
            TYPE(piece),
            promote,
            to,
        });

        if (!promote) {
            // TODO:
            // empty => give bonus for controlling the square, especially if near the other king (or in the center)
            mobilities[piece] ++;
        }
    }

    /**
     * Add a pawn move + promote moves
     */
    void addPawnMove(std::vector<MoveObject> &moves, Piece piece, Square from, Square to, uint8_t flag, Piece value, bool only_capture) {
        auto rank = Rank(to);
        if (rank == 0 || rank == 7) {
            if (only_capture)
                addMove(moves, piece, from, to, flag, QUEEN, value);
            else
                for (auto promote = QUEEN; promote >= KNIGHT; promote --)
                    addMove(moves, piece, from, to, flag, promote, value);
            mobilities[piece] ++;
        }
        else
            addMove(moves, piece, from, to, flag, 0, value);
    }

    /**
     * Add a ply state
     */
    void addState(MoveObject &move) {
        auto &state = ply_states[ply & 127];
        memcpy(state.castling, castling, sizeof(castling));
        state.ep_square = ep_square;
        state.half_moves = half_moves;
        memcpy(&state.move, &move, sizeof(MoveObject));
    }

    /**
     * Alpha beta tree search
     */
    int alphaBeta(int alpha, int beta, int depth, int max_depth, PV *pv) {
        // extend depth if in check
        if ((max_nodes & 1) && max_depth < max_extend && kingAttacked(turn))
            max_depth ++;

        if (depth >= max_depth) {
            pv->length = 0;
            if (!max_quiesce) {
                nodes ++;
                return evaluate();
            }
            return quiesce(alpha, beta, max_quiesce);
        }

        // statistics
        nodes ++;
        if (ply >= avg_depth)
            avg_depth = ply + 1;

        // check all moves
        auto alpha0 = alpha,
            best = -SCORE_INFINITY;
        Move best_move = 0;
        PV line;
        auto moves = createMoves(false);
        auto num_valid = 0;

        for (auto &move : moves) {
            if (!makeMove(move))
                continue;
            num_valid ++;
            auto score = -alphaBeta(-beta, -alpha, depth + 1, max_depth, &line);
            undoMove();

            if (score >= beta)
                return beta;
            if (score > best) {
                best = score;
                best_move = move;

                if (score > alpha) {
                    alpha = score;

                    // update pv
                    if (pv_mode) {
                        pv->length = line.length + 1;
                        pv->moves[0] = packMove(move);
                        memcpy(pv->moves + 1, line, line.length * sizeof(int));
                    }
                }
            }

            // checkmate found
            if (ply > 3 && score > 20000)
                break;
        }

        // mate + stalemate
        if (!num_valid)
            return kingAttacked(turn)? -SCORE_MATE + ply: 0;

        if (max_nodes & 2) {
            auto bound = (best >= beta)? BOUND_LOWER: ((alpha != alpha0)? BOUND_EXACT: BOUND_UPPER);
            addEntry(board_hash, best, max_depth, bound, best_move);
        }
        return best;
    }

    /**
     * Move ordering for alpha-beta
     * - captures
     * - castle
     * - nb/r/q/r/p
     */
    static bool compareMoves(const MoveObject &a, const MoveObject &b) {
        // capture a big piece with a small one = good
        auto apiece = board[a.from],
            bpiece = board[b.from];
        if (a.capture | b.capture | a.promote | b.promote)
            return ((PIECE_CAPTURES[b.capture] - PIECE_CAPTURES[a.capture] + PROMOTE_SCORES[b.promote] - PROMOTE_SCORES[a.promote]) << 3)
                + PIECE_SCORES[apiece] - PIECE_SCORES[bpiece] < 0;

        // castle
        auto castle = !!(b.flag & BITS_CASTLE) - !!(a.flag & BITS_CASTLE);
        if (castle)
            return castle < 0;

        // piece squares
        // auto asquares = PIECE_SQUARES[turn][apiece],
        //     bsquares = PIECE_SQUARES[turn][bpiece];
        // return (bsquares[b.to] - bsquares[b.from]) < (asquares[a.to] - asquares[a.from]);
        return false;
    }

    /**
     * Uniquely identify ambiguous moves
     */
    std::string disambiguate(MoveObject &move, std::vector<MoveObject> &moves) {
        uint8_t ambiguities = 0,
            from = move.from,
            same_file = 0,
            same_rank = 0,
            to = move.to,
            type = board[from];

        for (auto &move2 : moves) {
            int ambig_from = move2.from,
                ambig_to = move2.to;

            // if a move of the same piece type ends on the same to square,
            // we'll need to add a disambiguator to the algebraic notation
            if (type == board[ambig_from] && from != ambig_from && to == ambig_to) {
                ambiguities ++;

                if (Rank(from) == Rank(ambig_from))
                    same_rank ++;
                if (File(from) == File(ambig_from))
                    same_file ++;
            }
        }

        if (!ambiguities)
            return "";

        auto an = squareToAn(from, false);
        if (same_rank > 0 && same_file > 0)
            return an;
        else
            return an.substr((same_file > 0)? 1: 0, 1);
    }

    /**
     * Find an entry in the transposition table
     */
    Table *findEntry(Hash hash, int depth) {
        auto entry = &table[(hash % TT_SIZE)];
        if (entry->hash == hash && entry->depth >= depth)
            return entry;
        return nullptr;
    }

    /**
     * Initialise piece squares
     */
    void initSquares() {
        for (auto piece = PAWN; piece <= KING; piece ++) {
            auto bsquares = PIECE_SQUARES[1][piece],
                wsquares = PIECE_SQUARES[0][piece];
            for (auto i = SQUARE_A8; i <= SQUARE_H1; i ++)
                bsquares[((7 - Rank(i)) << 4) + File(i)] = wsquares[i];
        }
    }

    /**
     * Mini max tree search
     */
    int miniMax(int depth, int max_depth, PV *pv) {
        if (depth >= max_depth) {
            nodes ++;
            pv->length = 0;
            return evaluate();
        }

        // statistics
        nodes ++;
        if (ply >= avg_depth)
            avg_depth = ply + 1;

        // check all moves
        auto best = -SCORE_INFINITY,
            best_move = 0;
        PV line;
        auto moves = createMoves(false);
        int num_valid = 0;

        for (auto &move : moves) {
            if (!makeMove(move))
                continue;
            num_valid ++;
            auto score = -miniMax(depth + 1, max_depth);
            undoMove();

            if (score > best) {
                best = score;
                best_move = move;

                // update pv
                if (pv_mode) {
                    pv->length = line.length + 1;
                    pv->moves[0] = packMove(move);
                    memcpy(pv->moves + 1, line, line.length * sizeof(int));
                }
            }

            // checkmate found
            if (ply > 3 && score > 20000)
                break;
        }

        // mate + stalemate
        if (!num_valid)
            return kingAttacked(turn)? -SCORE_MATE + ply: 0;

        if (max_nodes & 2)
            addEntry(board_hash, best, max_depth, BOUND_EXACT, best_move);
        return best;
    }

    /**
     * Get the move list
     */
    std::string moveList() {
        std::string text;
        for (auto i = 0 ; i <= ply; i ++) {
            auto state = ply_states[i & 127];
            if (text.size())
                text += " ";
            text += ucify(state.move);
        }
        return text;
    }

    /**
     * Null search, used by perft
     */
    void nullSearch(int depth) {
        if (depth <= 0) {
            nodes ++;
            return;
        }

        auto moves = createMoves(false);
        for (auto &move : moves) {
            if (!makeMove(move))
                continue;
            nullSearch(depth - 1);
            undoMove();
        }
    }

    /**
     * Quiescence search
     * https://www.chessprogramming.org/Quiescence_Search
     */
    int quiesce(int alpha, int beta, int depth_left) {
        auto delta = PIECE_SCORES[QUEEN];
        nodes ++;
        auto score = evaluate();
        if (depth_left <= 0)
            return score;
        if (score >= beta)
            return beta;
        if (score + delta < alpha)
            return alpha;
        if (score > alpha)
            alpha = score;

        auto best = score,
            futility = best + PIECE_SCORES[PAWN];

        if (ply >= sel_depth)
            sel_depth = ply + 1;

        auto moves = createMoves(true);
        for (auto &move : moves) {
            if (futility + PIECE_SCORES[move.capture] <= alpha
                    && (board[move.from] != PAWN || RELATIVE_RANK(turn, move.to) <= 5))
                continue;

            if (!makeMove(move))
                continue;
            auto score = -quiesce(-beta, -alpha, depth_left - 1);
            undoMove();

            if (score > best) {
                best = score;
                if (score > alpha) {
                    alpha = score;
                    if (score >= beta)
                        break;
                }
            }
        }

        return best;
    }

public:
    // PUBLIC
    /////////

    Chess() {
        configure(false, "", 4);
        clear();
        load(DEFAULT_POSITION, false);
        initSquares();
    }
    ~Chess() {
    }

    /**
     * Convert AN to square
     * - 'a' = 97
     * - '8' = 56
     * @param an c2
     * @return 98
     */
    uint8_t anToSquare(std::string an) {
        if (an.size() < 2)
            return EMPTY;
        uint8_t file = an[0] - 'a',
            rank = '8' - an[1];
        return file + (rank << 4);
    }

    /**
     * Check if a square is attacked by a color
     * @param color attacking color
     * @param square .
     * @returns true if the square is attacked
     */
    bool attacked(int color, Square square) {
        // knight
        auto target = COLORIZE(color, KNIGHT);
        for (auto offset : PIECE_OFFSETS[KNIGHT]) {
            auto pos = square + offset;
            if (pos & 0x88)
                continue;
            if (board[pos] == target)
                return true;
        }

        // bishop + pawn + rook + queen
        auto offsets = PIECE_OFFSETS[QUEEN];
        for (auto j = 0; j < 8; j ++) {
            auto offset = offsets[j];
            Square pos = square;
            Piece target = BISHOP + (j & 1);

            for (auto k = 0; ; k ++) {
                pos += offset;
                if (pos & 0x88)
                    break;

                auto value = board[pos];
                if (!value)
                    continue;
                if (COLOR(value) != color)
                    break;

                auto piece_type = TYPE(value);
                if (piece_type == QUEEN || piece_type == target)
                    return true;
                if (k == 0) {
                    if (piece_type == KING)
                        return true;
                    if (target == BISHOP && piece_type == PAWN) {
                        if (color == ((j < 4)? BLACK: WHITE))
                            return true;
                    }
                }
                break;
            }
        }

        return false;
    }

    /**
     * Remove decorators from the SAN
     * @param san Bxe6+!!
     * @return clean san Bxe6
     */
    std::string cleanSan(std::string san) {
        int i = san.size() - 1;
        for (; i >= 0 && strchr("+#?!", san[i]); i --)
            san.erase(i, 1);
        for (; i >= 0; i --)
            if (san[i] == '=') {
                san.erase(i, 1);
                break;
            }

        return san;
    }

    /**
     * Clear the board
     */
    void clear() {
        memset(attacks, 0, sizeof(attacks));
        avg_depth = 0;
        memset(board, 0, sizeof(board));
        board_hash = 0;
        memset(castling, EMPTY, sizeof(castling));
        memset(defenses, 0, sizeof(defenses));
        ep_square = EMPTY;
        fen = "";
        fen_ply = -1;
        half_moves = 0;
        memset(kings, EMPTY, sizeof(kings));
        memset(materials, 0, sizeof(materials));
        memset(mobilities, 0, sizeof(mobilities));
        move_number = 1;
        nodes = 0;
        memset(pawns, EMPTY, sizeof(pawns));
        memset(pieces, 0, sizeof(pieces));
        memset(positions, 0, sizeof(positions));
        ply = 0;
        memset(ply_states, 0, sizeof(ply_states));
        sel_depth = 0;
        turn = WHITE;
    }

    /**
     * Configure parameters
     * @param frc_
     * @param options
     * @param depth this overrides max_depth if > 0
     */
    void configure(bool frc_, std::string options, int depth) {
        debug = 0;
        eval_mode = 1;
        frc = frc_;
        max_depth = 4;
        max_extend = 20;
        max_nodes = 1e9;
        max_quiesce = 0;
        max_time = 0;
        pv_mode = 0;
        search_mode = 0;

        // parse the line
        std::regex re("\\s+");
        std::sregex_token_iterator it(options.begin(), options.end(), re, -1);
        std::sregex_token_iterator reg_end;
        for (; it != reg_end; it ++) {
            auto option = it->str();
            if (option.size() < 3 || option.at(1) != '=')
                continue;
            auto left = option.at(0);
            auto right = option.substr(2);
            auto value = std::atoi(right.c_str());
            switch (left) {
            case 'd':
                max_depth = value;
                break;
            case 'D':
                debug = value;
                break;
            case 'e': {
                    auto eit = EVAL_MODES.find(right);
                    if (eit != EVAL_MODES.end())
                        eval_mode = eit->second;
                }
                break;
            case 'n':
                max_nodes = value;
                break;
            case 'p':
                pv_mode = value;
                break;
            case 'q':
                max_quiesce = value;
                break;
            case 's': {
                    auto sit = SEARCH_MODES.find(right);
                    if (sit != SEARCH_MODES.end())
                        search_mode = sit->second;
                }
                break;
            case 't':
                max_time = value;
                break;
            case 'x':
                max_extend = value;
                break;
            }
        }

        if (depth > 0)
            max_depth = depth;
        max_extend = Max(max_extend, max_depth);
    }

    /**
     * Create the FEN
     * @return fen
     */
    std::string createFen() {
        auto empty = 0;
        fen = "";

        for (auto i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            auto piece = board[i];
            if (!piece)
                empty ++;
            else {
                if (empty > 0) {
                    fen += ('0' + empty);
                    empty = 0;
                }
                fen += PIECE_NAMES[piece];
            }

            // off board
            if ((i + 1) & 0x88) {
                if (empty > 0)
                    fen += ('0' + empty);
                if (i != SQUARE_H1)
                    fen += '/';

                empty = 0;
                i += 8;
            }
        }

        std::string castle;
        if (frc) {
            for (auto square : castling)
                if (square != EMPTY) {
                    auto file = File(square),
                        rank = Rank(square);
                    if (rank > 0)
                        castle += (file + 'A');
                    else
                        castle += (file + 'a');
                }
        }
        else {
            if (castling[0] != EMPTY) castle += 'K';
            if (castling[1] != EMPTY) castle += 'Q';
            if (castling[2] != EMPTY) castle += 'k';
            if (castling[3] != EMPTY) castle += 'q';
        }

        // empty castling flag?
        if (castle.empty())
            castle = "-";
        std::string epflags = (ep_square == EMPTY)? "-": squareToAn(ep_square, false);

        fen = fen + " " + COLOR_TEXT(turn) + " " + castle + " " + epflags + " " + std::to_string(half_moves) + " " + std::to_string(move_number);
        return fen;
    }

    /**
     * Create a Fischer Random 960 FEN
     * http://www.russellcottrell.com/Chess/Chess960.htm
     * @param index between 0 and 959
     */
    std::string createFen960(int index) {
        if (index < 0 || index >= 960)
            return "";

        int i, n1, n2, q;
        std::string line = "        ";

        line[(index & 3) * 2 + 1] = 'B';
        index /= 4;
        line[(index & 3) * 2] = 'B';
        index /= 4;
        q = index % 6;
        index /= 6;

        for (n1 = 0; n1 < 4; n1 ++) {
            n2 = index + ((3 - n1) * (4 - n1)) / 2 - 5;
            if (n1 < n2 && n2 > 0 && n2 < 5)
                break;
        }

        // queen
        for (i = 0; i < 8; i ++)
            if (line[i] == ' ') {
                if (!q) {
                    line[i] = 'Q';
                    break;
                }
                q --;
            }

        // knights
        for (i = 0; i < 8; i ++)
            if (line[i] == ' ') {
                if (!n1 || !n2)
                    line[i] = 'N';
                n1 --;
                n2 --;
            }

        // rook - king - rook
        std::string castle, castle2;
        i = 7;
        for (auto type : "RKR")
            for (; i >= 0; i --) {
                if (line[i] == ' ') {
                    line[i] = type;
                    if (type == 'R') {
                        castle += 'A' + i;
                        castle2 += 'a' + i;
                    }
                    break;
                }
            }

        std::string result;
        for (auto letter : line)
            result += letter + 'a' - 'A';

        result = result + "/pppppppp/8/8/8/8/PPPPPPPP/" + line + " w " + castle + castle2 + " - 0 1";
        return result;
    }

    /**
     * Create the moves
     * @param only_capture
     * @return moves
     */
    std::vector<MoveObject> createMoves(bool only_capture) {
        std::vector<MoveObject> moves;
        auto second_rank = 6 - turn * 5,
            us = turn,
            us8 = us << 3,
            them = us ^ 1;

        for (auto i = us8; i < us8 + 8; i ++) {
            attacks[i] = 0;
            defenses[i] = 0;
            mobilities[i] = 0;
        }

        // 1) collect all moves
        for (auto i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            auto piece = board[i];
            if (!piece || COLOR(piece) != us)
                continue;

            auto piece_type = TYPE(piece);
            // pawn
            if (piece_type == PAWN) {
                auto offsets = PAWN_OFFSETS[us],
                    piece_attacks = PIECE_ATTACKS[piece];

                // single square, non-capturing
                auto square = i + offsets[1];
                if (!only_capture) {
                    if (!board[square]) {
                        addPawnMove(moves, piece, i, square, 0, 0, false);

                        // double square
                        square += offsets[1];
                        if (second_rank == Rank(i) && !board[square])
                            addMove(moves, piece, i, square, 0, 0, 0);
                    }
                }
                else if (Rank(square) % 7 == 0)
                    addMove(moves, piece, i, square, 0, QUEEN, 0);

                // pawn captures
                for (auto j : {0, 2}) {
                    auto square = i + offsets[j];
                    if (square & 0x88)
                        continue;
                    auto value = board[square];

                    if (value) {
                        if (COLOR(value) == them) {
                            addPawnMove(moves, piece, i, square, 0, value, only_capture);
                            attacks[piece] += piece_attacks[value];
                        }
                        else
                            defenses[piece] += piece_attacks[value];
                    }
                    // en passant
                    else if (square == ep_square)
                        addPawnMove(moves, piece, i, square, BITS_EN_PASSANT, value, false);
                }
            }
            // other pieces
            // TODO: separate by piece_type?
            else {
                auto offsets = PIECE_OFFSETS[piece_type],
                    piece_attacks = PIECE_ATTACKS[piece];
                for (auto j = 0; j < 8; j ++) {
                    auto offset = offsets[j];
                    auto square = i;
                    if (!offset)
                        break;

                    while (true) {
                        square += offset;
                        if (square & 0x88)
                            break;
                        auto value = board[square];

                        if (!value) {
                            if (!only_capture)
                                addMove(moves, piece, i, square, 0, 0, 0);
                        }
                        else {
                            if (COLOR(value) == us)
                                defenses[piece] += piece_attacks[value];
                            else {
                                addMove(moves, piece, i, square, 0, 0, value);
                                attacks[piece] += piece_attacks[value];
                            }
                            break;
                        }

                        // break if knight or king
                        if (piece_type == KING || piece_type == KNIGHT)
                            break;
                    }
                }
            }
        }

        // 2) castling
        if (!only_capture) {
            Square king = kings[us],
                pos0 = Rank(king) << 4;

            // q=0: king side, q=1: queen side
            for (auto q = 0; q < 2; q ++) {
                auto rook = castling[(us << 1) + q];
                if (rook == EMPTY)
                    continue;

                auto error = false;
                Square king_to = pos0 + 6 - (q << 2),
                    rook_to = king_to - 1 + (q << 1),
                    max_king = Max(king, king_to),
                    min_king = Min(king, king_to),
                    max_path = Max(max_king, Max(rook, rook_to)),
                    min_path = Min(min_king, Min(rook, rook_to));

                // check that all squares are empty along the path
                for (auto j = min_path; j <= max_path; j ++)
                    if (j != king && j != rook && board[j]) {
                        error = true;
                        break;
                    }
                if (error)
                    continue;

                // check that the king is not attacked
                for (auto j = min_king; j <= max_king; j ++)
                    if (attacked(them, j)) {
                        error = true;
                        break;
                    }

                // add castle, always in FRC format
                if (!error)
                    addMove(moves, COLORIZE(us, KING), king, rook, BITS_CASTLE, 0, 0);
            }
        }

        // move ordering for alpha-beta
        if (search_mode == 2)
            orderMoves(moves);
        return moves;
    }

    /**
     * Decorate the SAN with + or #
     */
    std::string decorateMove(MoveText &move) {
        auto text = move.m;
        char last = text[text.size() - 1];
        if (last != '+' && last != '#' && kingAttacked(turn)) {
            auto moves = legalMoves();
            text += moves.size()? '+': '#';
            move.m = text;
        }
        return text;
    }

    /**
     * Evaluate the current position
     * - eval_mode: 0:null, 1:mat, 2:hc2, &4:qui, 8:nn
     * - 8/5q2/8/3K4/8/8/8/7k w - - 0 1 KQ vs K
     * - 8/5r2/8/3K4/8/8/8/7k w - - 0 1 KR vs K
     * - 8/5n2/8/3K4/8/8/b7/7k w - - 0 1  KNB vs K
     */
    int evaluate() {
        if (half_moves >= 100)
            return 0;
        int score = 0;

        if (eval_mode & 1)
            score += materials[WHITE] - materials[BLACK];

        // mobility
        if (eval_mode & 2) {
            if (!materials[WHITE]) {
                auto king = kings[WHITE],
                    king2 = kings[BLACK];
                score -= (std::abs(File(king) * 2 - 7) + std::abs(Rank(king) * 2 - 7)) * 15;
                score += (std::abs(File(king) - File(king2)) + std::abs(Rank(king) - Rank(king2))) * 10;
                score += mobilities[6] * 15;
            }
            else
                for (auto i = 1; i < 7; i ++)
                    score += Min(mobilities[i] * MOBILITY_SCORES[i], MOBILITY_LIMITS[i]);

            if (!materials[BLACK]) {
                auto king = kings[BLACK],
                    king2 = kings[WHITE];
                score -= (std::abs(File(king) * 2 - 7) + std::abs(Rank(king) * 2 - 7)) * 15;
                score += (std::abs(File(king) - File(king2)) + std::abs(Rank(king) - Rank(king2))) * 10;
                score += mobilities[6] * 15;
            }
            else
                for (auto i = 9; i < 15; i ++)
                    score -= Min(mobilities[i] * MOBILITY_SCORES[i], MOBILITY_LIMITS[i]);
        }

        // attacks + defenses
        if (eval_mode & 4) {
            for (auto i = 1; i < 7; i ++)
                score += attacks[i] + defenses[i];
            for (auto i = 9; i < 15; i ++)
                score -= attacks[i] + defenses[i];
        }

        return score * (1 - (turn << 1));
    }

    /**
     * Evaluate every piece position, done when starting a search
     */
    void evaluatePositions() {
        memset(positions, 0, sizeof(positions));

        for (auto i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            auto piece = board[i];
            if (!piece)
                continue;
            auto color = COLOR(piece);
            positions[color] += PIECE_SQUARES[color][TYPE(piece)][i];
        }
    }

    /**
     * Hash the current board
     */
    void hashBoard() {
        if (!zobrist_ready)
            init_zobrist();

        board_hash = 0;
        for (auto square = SQUARE_A8; square <= SQUARE_H1; square ++) {
            if (square & 0x88) {
                square += 7;
                continue;
            }
            auto piece = board[square];
            if (piece)
                board_hash ^= zobrist[piece][square];
        }
    }

    /**
     * Modify the board hash
     * https://en.wikipedia.org/wiki/Zobrist_hashing
     * @param {number} square
     * @param {number} piece
     */
    inline void hashSquare(Square square, Piece piece) {
        board_hash ^= zobrist[piece][square];
    }

    /**
     * Initialise the zobrist table
     */
    void init_zobrist() {
        auto collision = 0;

        xorshift64();
        std::set<Hash> seens;

        for (auto i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            if (i & 0x88) {
                i += 7;
                continue;
            }
            for (auto j = 1; j <= 14; j ++) {
                if (!PIECE_ORDERS[j])
                    continue;
                auto x = xorshift64();
                if (seens.find(x) != seens.end()) {
                    collision ++;
                    break;
                }
                zobrist[j][i] = x;
                seens.insert(x);
            }
        }

        if (collision)
            std::cout << "init_zobrist:" << collision << "collisions\n";
        zobrist_ready = true;
    }

    /**
     * Check if the king is attacked
     * @param color 0, 1 + special cases: 2, 3
     * @return true if king is attacked
     */
    bool kingAttacked(int color) {
        if (color > 1)
            color = (color == 2)? turn: turn ^ 1;
        return attacked(color ^ 1, kings[color]);
    }

    /**
     * Get a list of all legal moves
     */
    std::vector<MoveObject> legalMoves() {
        auto moves = createMoves(false);
        std::vector<MoveObject> legals;
        for (auto &move : moves) {
            if (!makeMove(move))
                continue;
            undoMove();
            legals.push_back(std::move(move));
        }
        return legals;
    }

    /**
     * Load a FEN
     * @param fen valid or invalid FEN
     * @param hash must_hash the board?
     * @return empty on error, and the FEN may be corrected
     */
    std::string load(std::string fen_, bool must_hash) {
        if (fen_.empty())
            return "";

        clear();
        fen = fen_;

        int half = 0,
            move = 0,
            step = 0,
            step2 = 0,
            step3 = 0,
            square = 0;
        std::string castle, ep;

        for (auto i = 0; i < fen.size(); i ++) {
            auto value = fen[i];
            if (value == ' ') {
                step ++;
                if (step == 2)
                    step2 = i;
                else if (step == 3)
                    step3 = i;
                continue;
            }

            switch (step) {
            // pieces
            case 0:
                if (value == '/')
                    square += 8;
                else if (value >= '1' && value <= '9')
                    square += value - '0';
                else {
                    put(PIECES[value], square);
                    square ++;
                }
                break;
            // turn
            case 1:
                turn = (value == 'w')? 0: 1;
                break;
            // castle
            case 2:
                castle += value;
                break;
            // en passant
            case 3:
                ep += value;
                break;
            // 50 moves rule
            case 4:
                half = (half * 10) + value - '0';
                break;
            // move #
            case 5:
                move = (move * 10) + value - '0';
                break;
            }
        }

        ep_square = (ep == "-")? EMPTY: anToSquare(ep);
        half_moves = half;
        move_number = Max(move, 1);
        fen_ply = (move_number << 1) - 3 + turn;
        ply = 0;

        auto start = (!turn && move_number == 1);
        if (start)
            frc = false;

        // can detect FRC if castle is not empty
        if (castle != "-") {
            auto error = false;
            for (auto letter : castle) {
                auto lower = (letter < 'a')? letter + 'a' - 'A': letter,
                    final = (lower == 'k')? 'h': (lower == 'q')? 'a': lower,
                    color = (letter == lower)? 1: 0,
                    square = final - 'a' + ((color? 0: 7) << 4),
                    index = color * 2 + ((square < kings[color])? 1: 0);

                castling[index] = square;
                if (start && TYPE(board[square]) != ROOK)
                    error = true;
                if (final == lower)
                    frc = true;
            }

            // fix corrupted FEN (only for the initial board)
            if (error) {
                castle = "";
                for (auto color = 0; color < 2; color ++) {
                    char file_letter = color? 'a': 'A';
                    auto king = kings[color];

                    for (int i = king + 1; File(i) <= 7; i ++)
                        if (TYPE(board[i]) == ROOK) {
                            castling[color * 2] = i;
                            castle += file_letter + File(i);
                            break;
                        }

                    for (int i = king - 1; File(i) >= 0; i --)
                        if (TYPE(board[i]) == ROOK) {
                            castling[color * 2 + 1] = i;
                            castle += file_letter + File(i);
                            break;
                        }
                }
                fen = fen.substr(0, step2) + " " + castle + fen.substr(step3);
                frc = true;
            }
        }

        if (must_hash)
            hashBoard();
        else
            board_hash = 0;
        return fen;
    }

    /**
     * Make a raw move, no verification is being performed
     * @returns false if the move is not legal
     */
    bool makeMove(MoveObject &move) {
        // null move
        auto move_from = move.from,
            move_to = move.to;
        if (move_from == move_to) {
            // addState(move);
            // ply ++;
            // turn ^= 1;
            return false;
        }

        auto us = turn,
            them = us ^ 1;

        Piece capture = move.capture;
        uint8_t is_castle = (move.flag & BITS_CASTLE),
            passant = (move.flag & BITS_EN_PASSANT)? move_to + 16 - (turn << 5): EMPTY;
        Square piece_from = board[move_from],
            piece_to = board[move_to],
            piece_type = TYPE(piece_from);
        Piece promote = move.promote? COLORIZE(us, move.promote): 0;
        auto squares = PIECE_SQUARES[us];

        // 1) check if move is legal
        // castle is always legal because the checks were made in makeMove
        if (!is_castle) {
            // quick makeMove
            if (piece_type == KING)
                kings[us] = move_to;
            board[move_from] = 0;
            board[move_to] = promote? promote: piece_from;
            if (passant)
                board[passant] = 0;

            if (kingAttacked(us)) {
                // quick undoMove
                if (piece_type == KING)
                    kings[us] = move_from;
                board[move_from] = piece_from;
                board[move_to] = piece_to;
                if (passant)
                    board[passant] = COLORIZE(them, PAWN);
                return false;
            }
        }

        // 2) move is legal => do all other stuff
        addState(move);

        half_moves ++;
        ep_square = EMPTY;

        // castle?
        if (is_castle) {
            uint8_t q = (move.to < move.from)? 1: 0,
                king = kings[us],
                king_piece = COLORIZE(us, KING),
                king_to = (Rank(king) << 4) + 6 - (q << 2),
                rook = castling[(us << 1) + q],
                rook_piece = COLORIZE(us, ROOK),
                rook_to = king_to - 1 + (q << 1);

            hashSquare(king, king_piece);
            hashSquare(rook, rook_piece);
            hashSquare(king_to, king_piece);
            hashSquare(rook_to, rook_piece);
            board[king] = 0;
            board[rook] = 0;
            board[king_to] = king_piece;
            board[rook_to] = rook_piece;

            kings[us] = king_to;
            castling[us << 1] = EMPTY;
            castling[(us << 1) + 1] = EMPTY;
        }
        else {
            hashSquare(move_from, piece_from);
            hashSquare(move_to, piece_to);
            hashSquare(move_to, promote? promote: piece_from);

            // remove castling if we capture a rook
            if (capture) {
                materials[them] -= PIECE_SCORES[capture];
                if (capture == ROOK) {
                    if (move_to == castling[them << 1])
                        castling[them << 1] = EMPTY;
                    else if (move_to == castling[(them << 1) + 1])
                        castling[(them << 1) + 1] = EMPTY;
                }
                half_moves = 0;
            }

            // remove castling if we move a king/rook
            if (piece_type == KING) {
                castling[us << 1] = EMPTY;
                castling[(us << 1) + 1] = EMPTY;
            }
            else if (piece_type == ROOK) {
                if (move_from == castling[us << 1])
                    castling[us << 1] = EMPTY;
                else if (move_from == castling[(us << 1) + 1])
                    castling[(us << 1) + 1] = EMPTY;
            }
            // pawn + update 50MR
            else if (piece_type == PAWN) {
                if (passant != EMPTY)
                    hashSquare(passant, COLORIZE(them, PAWN));
                else if (promote)
                    materials[us] += PROMOTE_SCORES[promote];
                // pawn moves 2 squares
                else if (std::abs(Rank(move_to) - Rank(move_from)) == 2)
                    ep_square = move_to + 16 - (turn << 5);
                half_moves = 0;
            }

            // score
            auto psquares = PIECE_SQUARES[us][piece_type];
            positions[turn] += psquares[piece_to] - psquares[piece_from];
        }

        ply ++;
        if (turn == BLACK)
            move_number ++;
        turn ^= 1;
        return true;
    }

    /**
     * Try an object move
     * @param move {from: 23, to: 7, promote: 5}
     * @param decorate add + # decorators
     */
    MoveText moveObject(MoveObject &move, bool decorate) {
        uint8_t flag = 0;
        MoveText move_obj;
        auto moves = legalMoves();

        // castle
        if (move.from == kings[turn]) {
            auto piece = board[move.to];

            // regular notation => change .to to rook position
            if (!piece) {
                if (std::abs(File(move.from) - File(move.to)) == 2) {
                    if (move.to > move.from)
                        move.to ++;
                    else
                        move.to -= 2;
                }
            }
            // frc notation
            else if (piece == COLORIZE(turn, ROOK))
                flag = BITS_CASTLE;
        }

        // find an existing match + add the SAN
        if (flag) {
            for (auto &move2 : moves)
                if (move2.flag & flag) {
                    move_obj = move2;
                    move_obj.m = moveToSan(move2, moves);
                    break;
                }
        }
        else
            for (auto &move2 : moves) {
                if (move.from == move2.from && move.to == move2.to
                        && (!move2.promote || move.promote == move2.promote)) {
                    move_obj = move2;
                    move_obj.m = moveToSan(move2, moves);
                    break;
                }
            }

        // no suitable move?
        if (move_obj.from != move_obj.to) {
            makeMove(move_obj);
            if (decorate)
                decorateMove(move_obj);
        }

        move_obj.ply = fen_ply + ply;
        return move_obj;
    }

    /**
     * Try a SAN move
     * @param text Nxb7, a8=Q
     * @param decorate add + # decorators
     * @param sloppy allow sloppy parser
     */
    MoveText moveSan(std::string text, bool decorate, bool sloppy) {
        auto moves = legalMoves();
        auto move = sanToMove(text, moves, sloppy);
        if (move.from != move.to) {
            makeMove(move);
            if (decorate)
                decorateMove(move);
        }
        return move;
    }

    /**
     * Convert a move to SAN
     * https://github.com/jhlywa/chess.js
     * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
     * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
     * 4. ... Ne7 is technically the valid SAN
     * @param move
     * @param moves
     */
    std::string moveToSan(MoveObject &move, std::vector<MoveObject> &moves) {
        if (move.flag & BITS_CASTLE)
            return (move.to > move.from)? "O-O": "O-O-O";

        std::string disambiguator = disambiguate(move, moves);
        auto move_type = TYPE(board[move.from]);
        std::string output;

        if (move_type != PAWN)
            output += PIECE_UPPER[move_type] + disambiguator;

        if (move.capture || (move.flag & BITS_EN_PASSANT)) {
            if (move_type == PAWN)
                output += squareToAn(move.from, false)[0];
            output += 'x';
        }

        output += squareToAn(move.to, false);

        if (move.promote) {
            output += '=';
            output += PIECE_UPPER[move.promote];
        }
        return output;
    }

    /**
     * Try an UCI move
     * @param text c2c4, a7a8a
     * @param decorate add + # decorators
     */
    MoveText moveUci(std::string text, bool decorate) {
        MoveObject move = {
            0,
            0,
            anToSquare(text.substr(0, 2)),
            0,
            PIECES[text[4]],
            anToSquare(text.substr(2, 2)),
        };
        return moveObject(move, decorate);
    }

    /**
     * Parse a list of SAN moves + create FEN for each move
     * @param text c2c4 a7a8a ...
     * @param sloppy allow sloppy parser
     */
    std::vector<MoveText> multiSan(std::string multi, bool sloppy) {
        std::vector<MoveText> result;
        int prev = 0,
            size = multi.size();
        for (int i = 0; i <= size; i ++) {
            if (i < size && multi[i] != ' ')
                continue;

            if (multi[prev] >= 'A') {
                auto text = multi.substr(prev, i - prev);
                auto moves = legalMoves();
                auto move = sanToMove(text, moves, sloppy);
                if (move.from == move.to)
                    break;
                makeMove(move);
                move.fen = createFen();
                move.ply = fen_ply + ply;
                move.score = 0;
                result.emplace_back(move);
            }
            prev = i + 1;
        }
        return result;
    }

    /**
     * Parse a list of UCI moves + create SAN + FEN for each move
     * @param text c2c4 a7a8a ...
     */
    std::vector<MoveText> multiUci(std::string multi) {
        std::vector<MoveText> result;
        int prev = 0,
            size = multi.size();
        for (int i = 0; i <= size; i ++) {
            if (i < size && multi[i] != ' ')
                continue;

            if (multi[prev] >= 'A') {
                auto text = multi.substr(prev, i - prev);
                auto move = moveUci(text, true);
                if (move.from != move.to) {
                    move.fen = createFen();
                    move.ply = fen_ply + ply;
                    move.score = 0;
                    result.emplace_back(move);
                }
            }
            prev = i + 1;
        }
        return result;
    }

    /**
     * Move ordering for alpha-beta
     * - captures
     * - castle
     * - nb/r/q/r/p
     */
    void orderMoves(std::vector<MoveObject> &moves) {
        std::stable_sort(moves.begin(), moves.end(), compareMoves);
    }

    /**
     * Pack a move to a number
     * - 0-9 : order
     * - 10-12 : capture
     * - 13-14 : flag
     * - 15-21 : from
     * - 22-24 : promote
     * - 25-31 : to
     * @param {MoveObject} move
     */
    Move packMove(MoveObject &move) {
        return 0
            + (move.capture << 10)
            + (move.flag << 13)
            + ((move.from & 127) << 15)
            + (move.promote << 22)
            + ((move.to & 127) << 25);
    }

    /**
     * Get params
     */
    std::vector<int> params() {
        std::vector<int> result = {
            max_depth,          // 0
            eval_mode,          // 1
            max_nodes,          // 2
            search_mode,        // 3
            max_time,           // 4
            max_quiesce,        // 5
        };
        return result;
    }

    /**
     * Perform perft and divide
     * @param {string} fen
     * @param {number} depth
     * @returns {string}
     */
    std::string perft(std::string fen, int depth) {
        if (fen.size())
            load(fen, false);
        auto moves = legalMoves();
        std::vector<std::string> lines;
        lines.push_back(std::to_string(1) + "=" +std::to_string(moves.size()));

        for (auto &move : moves) {
            makeMove(move);
            auto prev = nodes;
            nullSearch(depth - 1);
            auto delta = nodes - prev;
            lines.push_back(ucify(move) + ":" + std::to_string(delta));
            prev = nodes;
            undoMove();
        }

        if (depth > 1)
            lines.push_back(std::to_string(depth) + "=" + std::to_string(nodes));
        std::sort(lines.begin(), lines.end());

        std::string result;
        for (auto &line : lines) {
            if (result.size())
                result += " ";
            result += line;
        }
        return result;
    }

    /**
     * Print the board
     */
    std::string print(bool console) {
        std::string text;
        for (auto i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                text += '\n';
                continue;
            }
            text += PIECE_NAMES[board[i]];
        }
        if (console)
            std::cout << text;
        return text;
    }

    /**
     * Put a piece on a square
     */
    void put(Piece piece, Square square) {
        board[square] = piece;
        if (TYPE(piece) == KING)
            kings[COLOR(piece)] = square;
        else
            materials[COLOR(piece)] += PIECE_SCORES[piece];
    }

    /**
     * Reset the board to the default position
     */
    void reset() {
        frc = false;
        load(DEFAULT_POSITION, false);
    }

    /**
     * Convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
     * @param san Nf3, Nf3+?!
     * @param moves list of moves to match the san against
     * @param sloppy allow sloppy parser
     */
    MoveText sanToMove(std::string san, std::vector<MoveObject> &moves, bool sloppy) {
        // 1) try exact matching
        auto clean = cleanSan(san);
        for (auto &move : moves)
            if (clean == cleanSan(moveToSan(move, moves))) {
                MoveText move_obj = move;
                move_obj.m = san;
                move_obj.ply = fen_ply + ply + 1;
                return move_obj;
            }

        // 2) try sloppy matching
        if (!sloppy)
            return NULL_TEXT;

        auto from_file = EMPTY,
            from_rank = EMPTY;
        Piece promote = 0;
        auto to = EMPTY;
        Piece type = 0;

        auto i = clean.size() - 1;
        if (i < 2)
            return NULL_TEXT;

        // analyse backwards
        if (strchr("bnrqBNRQ", clean[i])) {
            promote = TYPE(PIECES[clean[i]]);
            i --;
        }
        // to
        if (clean[i] < '1' || clean[i] > '8')
            return NULL_TEXT;
        i --;
        if (clean[i] < 'a' || clean[i] > 'j')
            return NULL_TEXT;
        to = clean[i] - 'a' + (('8' - clean[i + 1]) << 4);
        i --;
        //
        if (i >= 0 && clean[i] == 'x')
            i --;
        // from
        if (i >= 0 && clean[i] >= '1' && clean[i] <= '8') {
            from_rank = '8' - clean[i];
            i --;
        }
        if (i >= 0 && clean[i] >= 'a' && clean[i] <= 'j') {
            from_file = clean[i] - 'a';
            i --;
        }
        // type
        type = TYPE(PIECES[clean[i]]);

        for (auto &move : moves) {
            if (to == move.to
                    && (!type || type == TYPE(board[move.from]))
                    && (from_file == EMPTY || from_file == File(move.from))
                    && (from_rank == EMPTY || from_rank == Rank(move.from))
                    && (!promote || promote == move.promote)) {
                MoveText move_obj = move;
                move_obj.m = moveToSan(move, moves);
                move_obj.ply = fen_ply + ply + 1;
                return move_obj;
            }
        }
        return NULL_TEXT;
    }

    /**
     * Basic tree search with mask
     * https://www.chessprogramming.org/Principal_Variation_Search
     * @param moves
     * @param mask moves to search, ex: 'b8c6 b8a6 g8h6'
     * @return updated moves
     */
    std::vector<MoveText> search(std::vector<MoveObject> &moves, std::string mask) {
        hashBoard();
        evaluatePositions();

        nodes = 0;
        sel_depth = 0;
        tt_adds = 0;
        tt_adds2 = 0;
        tt_hits = 0;
        tt_hits2 = 0;

        auto average = 0,
            count = 0;
        auto empty = !mask.size();
        std::vector<MoveText> masked;

        for (auto &move : moves) {
            auto uci = ucify(move);
            if (!empty && mask.find(uci) == std::string::npos)
                continue;

            PV pv;
            auto score = 0;
            avg_depth = 1;

            if (max_depth > 0) {
                if (!makeMove(move))
                    continue;
                if (search_mode == 1)
                    score = -miniMax(1, max_depth, &pv);
                else
                    score = -alphaBeta(-SCORE_INFINITY, SCORE_INFINITY, 1, max_depth, &pv);
                undoMove();
            }

            std::string pv_string = ucifyMove(move);
            for (auto &item : pv.moves) {
                pv_string += " ";
                pv_string += ucifyMove(item);
            }

            MoveText move_obj = move;
            move_obj.pv = pv_string;
            move_obj.score = score;
            masked.emplace_back(move_obj);

            average += avg_depth;
            count ++;
            if (debug & 2)
                std::cout << move.score << ":" << pv_string << "\n";
        }

        avg_depth = count? average / count: 0;
        if (debug & 1)
            std::cout << turn << ":" << (max_nodes & 1) << "\n";
        return masked;
    }

    /**
     * Convert a square number to an algebraic notation
     * - 'a' = 97
     * - '8' = 56
     * @param square 112
     * @param check check the boundaries
     * @return a1
     */
    std::string squareToAn(Square square, bool check) {
        auto file = File(square),
            rank = Rank(square);
        if (check && (file < 0 || file > 7 || rank < 0 || rank > 7))
            return "";
        std::string text;
        text += ('a' + file);
        text += ('8' - rank);
        return text;
    }

    /**
     * Get the UCI of a move
     * @param {MoveObject} move
     * @returns {string}
     */
    std::string ucify(MoveObject &move) {
        auto uci = squareToAn(move.from, false) + squareToAn(move.to, false);
        if (move.promote)
            uci += PIECE_LOWER[move.promote];
        return uci;
    }

    /**
     * Get the UCI of a move number
     */
    std::string ucifyMove(Move move) {
        return squareToAn(MoveFrom(move)) + squareToAn(MoveTo(move));
    }

    /**
     * Undo a move
     */
    bool undoMove() {
        if (ply <= 0)
            return false;
        ply --;

        auto &state = ply_states[ply & 127];
        memcpy(castling, state.castling, sizeof(castling));
        ep_square = state.ep_square;
        half_moves = state.half_moves;
        MoveObject &move = state.move;

        turn ^= 1;
        if (turn == BLACK)
            move_number --;

        auto move_from = move.from,
            move_to = move.to;
        auto squares = PIECE_SQUARES[turn];
        auto us = turn,
            them = turn ^ 1;

        if (move_from == move_to) {
            // null move
            return true;
        }

        // undo castle
        if (move.flag & BITS_CASTLE) {
            uint8_t q = (move_to < move_from)? 1: 0,
                king = move_from,
                king_piece = COLORIZE(us, KING),
                king_to = (Rank(king) << 4) + 6 - (q << 2),
                rook_piece = COLORIZE(us, ROOK),
                rook_to = king_to - 1 + (q << 1);

            hashSquare(king_to, king_piece);
            hashSquare(rook_to, rook_piece);
            hashSquare(king, king_piece);
            hashSquare(move_to, rook_piece);
            board[king_to] = 0;
            board[rook_to] = 0;
            board[king] = king_piece;
            board[move_to] = rook_piece;
            kings[us] = king;

            // score
            positions[us]
                += squares[KING][king] - squares[KING][king_to]
                + squares[ROOK][move_to] - squares[ROOK][rook_to];
        }
        else {
            auto piece = board[move_to];
            hashSquare(move_to, piece);
            if (move.promote) {
                piece = COLORIZE(us, PAWN);
                materials[us] -= PROMOTE_SCORES[move.promote];
            }
            hashSquare(move_from, piece);
            board[move_to] = 0;
            board[move_from] = piece;

            auto piece_type = TYPE(piece);
            if (piece_type == KING)
                kings[us] = move_from;

            if (move.flag & BITS_EN_PASSANT) {
                auto capture = COLORIZE(them, PAWN);
                Square target = move_to + 16 - (us << 5);
                hashSquare(target, capture);
                board[target] = capture;
                materials[them] += PIECE_SCORES[PAWN];
            }
            else if (move.capture) {
                auto capture = COLORIZE(them, move.capture);
                hashSquare(move_to, capture);
                board[move_to] = capture;
                materials[them] += PIECE_SCORES[move.capture];
            }

            // score
            auto psquares = squares[piece_type];
            positions[turn] += psquares[move_from] - psquares[move_to];
        }

        return true;
    }

    /**
     * Unpack a move
     * - 0-9 : order
     * - 10-12 : capture
     * - 13-14 : flag
     * - 15-21 : from
     * - 22-24 : promote
     * - 25-31 : to
     */
    MoveObject unpackMove(Move move) {
        return {
            MoveCapture(move),
            MoveFlag(move),
            MoveFrom(move),
            MovePromote(move),
            MoveTo(move),
        };
    }

    // EMSCRIPTEN INTERFACES
    ////////////////////////

    val em_attacks() {
        return val(typed_memory_view(16, attacks));
    }

    int em_avgDepth() {
        return avg_depth;
    }

    val em_board() {
        return val(typed_memory_view(128, board));
    }

    int32_t em_boardHash() {
        return (int32_t)board_hash;
    }

    val em_castling() {
        return val(typed_memory_view(4, castling));
    }

    bool em_checked(int color) {
        return kingAttacked(color);
    }

    val em_defenses() {
        return val(typed_memory_view(16, defenses));
    }

    std::string em_fen() {
        return fen;
    }

    bool em_frc() {
        return frc;
    }

    int em_material(int color) {
        return materials[color];
    }

    val em_mobilities() {
        return val(typed_memory_view(16, mobilities));
    }

    int em_nodes() {
        return nodes;
    }

    uint8_t em_piece(std::string text) {
        if (text.size() != 1)
            return 0;
        auto it = PIECES.find(text.at(0));
        return (it != PIECES.end())? it->second: 0;
    }

    int em_selDepth() {
        return Max(avg_depth, sel_depth);
    }

    std::string em_trace() {
        return trace;
    }

    int em_turn() {
        return turn;
    }

    std::string em_version() {
        return "20200926";
    }
};

// BINDING CODE
///////////////

EMSCRIPTEN_BINDINGS(chess) {
    // MOVE BINDINGS
    value_object<MoveObject>("MoveObject")
        .field("capture", &MoveObject::capture)
        .field("flag", &MoveObject::flag)
        .field("from", &MoveObject::from)
        .field("promote", &MoveObject::promote)
        .field("to", &MoveObject::to)
        ;

    value_object<MoveText>("MoveText")
        .field("capture", &MoveText::capture)
        .field("flag", &MoveText::flag)
        .field("from", &MoveText::from)
        .field("promote", &MoveText::promote)
        .field("to", &MoveText::to)
        //
        .field("fen", &MoveText::fen)
        .field("m", &MoveText::m)
        .field("ply", &MoveText::ply)
        .field("pv", &MoveText::pv)
        .field("score", &MoveText::score)
        ;

    // CHESS BINDINGS
    class_<Chess>("Chess")
        .constructor()
        //
        .function("anToSquare", &Chess::anToSquare)
        .function("attacked", &Chess::attacked)
        .function("attacks", &Chess::em_attacks)
        .function("avgDepth", &Chess::em_avgDepth)
        .function("board", &Chess::em_board)
        .function("boardHash", &Chess::em_boardHash)
        .function("castling", &Chess::em_castling)
        .function("checked", &Chess::em_checked)
        .function("cleanSan", &Chess::cleanSan)
        .function("clear", &Chess::clear)
        .function("configure", &Chess::configure)
        .function("currentFen", &Chess::em_fen)
        .function("decorate", &Chess::decorateMove)
        .function("defenses", &Chess::em_defenses)
        .function("evaluate", &Chess::evaluate)
        .function("fen", &Chess::createFen)
        .function("fen960", &Chess::createFen960)
        .function("frc", &Chess::em_frc)
        .function("hashBoard", &Chess::hashBoard)
        .function("load", &Chess::load)
        .function("makeMove", &Chess::makeMove)
        .function("material", &Chess::em_material)
        .function("mobilities", &Chess::em_mobilities)
        .function("moveObject", &Chess::moveObject)
        .function("moves", &Chess::legalMoves)
        .function("moveSan", &Chess::moveSan)
        .function("moveToSan", &Chess::moveToSan)
        .function("moveUci", &Chess::moveUci)
        .function("multiSan", &Chess::multiSan)
        .function("multiUci", &Chess::multiUci)
        .function("nodes", &Chess::em_nodes)
        .function("order", &Chess::orderMoves)
        .function("packMove", &Chess::packMove)
        .function("params", &Chess::params)
        .function("perft", &Chess::perft)
        .function("piece", &Chess::em_piece)
        .function("print", &Chess::print)
        .function("put", &Chess::put)
        .function("reset", &Chess::reset)
        .function("sanToMove", &Chess::sanToMove)
        .function("search", &Chess::search)
        .function("selDepth", &Chess::em_selDepth)
        .function("squareToAn", &Chess::squareToAn)
        .function("trace", &Chess::em_trace)
        .function("turn", &Chess::em_turn)
        .function("ucify", &Chess::ucify)
        .function("undo", &Chess::undoMove)
        .function("unpackMove", &Chess::unpackMove)
        .function("version", &Chess::em_version)
        ;

    register_vector<int>("vector<int>");
    register_vector<MoveObject>("vector<MoveObject>");
    register_vector<MoveText>("vector<MoveText>");
}
