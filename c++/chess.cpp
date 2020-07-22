// chess.cpp
// @author octopoulo <polluxyz@gmail.com>
// @version 2020-07-21
// - wasm implementation, 25x faster than original, and 1.3x faster than fast chess.js
// - FRC support
// - emcc --bind -o ../js/chess-wasm.js chess.cpp -s WASM=1 -Wall -s MODULARIZE=1 -O3 --closure 1

#include <emscripten/bind.h>
#include <emscripten/val.h>
#include <iostream>
#include <map>
#include <stdio.h>

using namespace emscripten;

#define DELETE(x) {if (x) delete x; x = nullptr;}
#define DELETE_ARRAY(x) {if (x) delete [] x; x = nullptr;}

// defines
#define BISHOP 3
#define BITS_BIG_PAWN 4
#define BITS_CAPTURE 2
#define BITS_CASTLE 96
#define BITS_EP_CAPTURE 8
#define BITS_KSIDE_CASTLE 32
#define BITS_NORMAL 1
#define BITS_PROMOTION 16
#define BITS_QSIDE_CASTLE 64
#define BLACK 1
#define COLOR(piece) (piece >> 3)
#define COLOR_TEXT(color) ((color == 0)? 'w': 'b')
#define COLORIZE(color, type) ((color == 0)? type: (type | 8))
#define DEFAULT_POSITION "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
#define EMPTY -1
#define FILE(square) (square & 15)
#define FILE_ALGEBRAIC(square) ('a' + FILE(square))
#define KING 6
#define KNIGHT 2
#define PAWN 1
#define PIECE_LOWER " pnbrqk  pnbrqk"
#define PIECE_NAMES " PNBRQK  pnbrqk"
#define PIECE_UPPER " PNBRQK  PNBRQK"
#define QUEEN 5
#define RANK(square) (square >> 4)
#define RANK_ALGEBRAIC(square) ('8' - RANK(square))
#define ROOK 4
#define SQUARE_A8 0
#define SQUARE_H1 119
#define TYPE(piece) (piece & 7)
#define WHITE 0

// tables
int ATTACKS[] = {
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
    },
    ATTACK_BITS[] = {0, 1, 2, 4, 8, 16, 32},
    PAWN_OFFSETS[2][4] = {
        {-16, -32, -17, -15},
        {16, 32, 17, 15},
    },
    PIECE_OFFSETS[7][8] = {
        {  0,   0,   0,   0,  0,  0,  0,  0},
        {  0,   0,   0,   0,  0,  0,  0,  0},
        {-18, -33, -31, -14, 18, 33, 31, 14},
        {-17, -15,  17,  15,  0,  0,  0,  0},
        {-16,   1,  16,  -1,  0,  0,  0,  0},
        {-17, -16, -15,   1, 17, 16, 15, -1},
        {-17, -16, -15,   1, 17, 16, 15, -1},
    },
    PIECE_SCORES[] = {
        0,
        100,        // P
        300,        // N
        300,        // B
        500,        // R
        900,        // Q
        12800,      // K
        0,
        0,
        100,        // p
        300,        // n
        300,        // b
        500,        // r
        900,        // q
        12800,      // k
    },
    PROMOTE_SCORES[] = {
        0,
        0,          // P
        200,        // N
        200,        // B
        400,        // R
        800,        // Q
        11800,      // K
        0,
        0,
        0,          // p
        200,        // n
        200,        // b
        400,        // r
        800,        // q
        11800,      // k
    },
    RAYS[] = {
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
    };

// extras
std::map<char, uint8_t> PIECES = {
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

struct Move {
    uint8_t capture;
    uint8_t depth;
    std::string fen;
    uint8_t flags;
    int     from;
    std::string m;          // san
    uint8_t piece;
    int     ply;
    uint8_t promote;
    int     score;
    int     to;

    Move() {
        capture = 0;
        depth = 0;
        flags = 0;
        from = EMPTY;
        piece = 0;
        ply = -1;
        promote = 0;
        score = 0;
        to = EMPTY;
    }
};

struct History {
    int     castling[4];
    int     ep_square;
    int     half_moves;
    int     kings[2];
    int     materials[2];
    Move    move;
    int     move_number;
    uint8_t turn;
};

class Chess {
private:
    // PRIVATE
    //////////

    uint8_t *board;
    int     castling[4];
    int     ep_square;
    std::string fen;
    bool    frc;
    int     half_moves;
    std::vector<History> histories;
    int     kings[2];
    int     materials[2];
    int     max_depth;
    int     max_extend;
    int     max_nodes;
    int     move_number;
    int     nodes;
    int     sel_depth;
    uint8_t turn;

    /**
     * Add a move to the history
     */
    void addHistory(Move &move) {
        History history;
        memcpy(&history.castling, &castling, sizeof(castling));
        history.ep_square = ep_square;
        history.half_moves = half_moves;
        memcpy(&history.kings, &kings, sizeof(kings));
        memcpy(&history.materials, &materials, sizeof(materials));
        memcpy(&history.move, &move, sizeof(Move));
        history.move_number = move_number;
        histories.push_back(history);
    }

    /**
     * Add a move + promote moves
     */
    void addMove(std::vector<Move> &moves, int from, int to, uint8_t flags) {
        // pawn promotion?
        int rank = RANK(to);
        if (TYPE(board[from]) == PAWN && (rank % 7) == 0) {
            for (uint8_t piece = QUEEN; piece >= KNIGHT; piece --)
                addSingleMove(moves, from, to, flags | BITS_PROMOTION, piece);
        }
        else
            addSingleMove(moves, from, to, flags, 0);
    }

    /**
     * Add a single move
     */
    void addSingleMove(std::vector<Move> &moves, int from, int to, uint8_t flags, uint8_t promote) {
        uint8_t piece = board[from];
        Move move;
        move.flags = flags;
        move.from = from;
        move.piece = piece;
        move.ply = move_number * 2 + turn - 2;
        move.to = to;

        if (!(flags & BITS_CASTLE)) {
            if (promote)
                move.promote = promote;
            if (board[to])
                move.capture = TYPE(board[to]);
            else if (flags & BITS_EP_CAPTURE)
                move.capture = PAWN;
        }
        moves.push_back(move);
    }

    /**
     * Uniquely identify ambiguous moves
     */
    std::string disambiguate(Move &move, std::vector<Move> &moves) {
        int ambiguities = 0,
            from = move.from,
            same_file = 0,
            same_rank = 0,
            to = move.to;
        uint8_t type = TYPE(move.piece);

        for (auto &move2 : moves) {
            int ambig_from = move2.from,
                ambig_to = move2.to;

            // if a move of the same piece type ends on the same to square,
            // we'll need to add a disambiguator to the algebraic notation
            if (type == TYPE(move2.piece) && from != ambig_from && to == ambig_to) {
                ambiguities ++;

                if (RANK(from) == RANK(ambig_from))
                    same_rank ++;
                if (FILE(from) == FILE(ambig_from))
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

public:
    // PUBLIC
    /////////

    Chess() {
        board = new uint8_t[128];
        frc = false;
        max_depth = 4;
        max_extend = 0;
        max_nodes = 1e8;

        clear();
        load(DEFAULT_POSITION);
    }

    ~Chess() {
        DELETE_ARRAY(board);
    }

    /**
     * Convert AN to square
     * @param an c2
     * @return 98
     */
    int anToSquare(std::string an) {
        int file = an[0] - 'a',
            rank = '8' - an[1];
        return file + (rank << 4);
    }

    /**
     * Check if a square is attacked by a color
     * @param color attacking color
     * @param square .
     * @return true if the square is attacked
     */
    bool attacked(uint8_t color, int square) {
        for (int i = SQUARE_A8; i <= SQUARE_H1; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            // if empty square or wrong color
            auto piece = board[i];
            if (!piece)
                continue;

            auto piece_color = COLOR(piece);
            if (piece_color != color)
                continue;

            int difference = i - square,
                index = difference + 119;
            auto piece_type = TYPE(piece);

            if (ATTACKS[index] & ATTACK_BITS[piece_type]) {
                // pawn
                if (piece_type == PAWN) {
                    if (difference > 0) {
                        if (piece_color == WHITE)
                            return true;
                    }
                    else if (piece_color == BLACK)
                        return true;
                    continue;
                }

                // knight + king
                if (piece_type == KING || piece_type == KNIGHT)
                    return true;

                // others => cannot be blocked
                bool blocked = false;
                int offset = RAYS[index],
                    j = i + offset;

                while (j != square) {
                    if (board[j]) {
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
        memset(board, 0, 128 * sizeof(uint8_t));
        memset(castling, EMPTY, 4 * sizeof(int));
        ep_square = EMPTY;
        fen = "";
        half_moves = 0;
        histories.clear();
        kings[0] = EMPTY;
        kings[1] = EMPTY;
        materials[0] = 0;
        materials[1] = 0;
        move_number = 1;
        nodes = 0;
        sel_depth = 0;
        turn = WHITE;
    }

    /**
     * Configure some parameters
     */
    void configure(bool frc_, int max_depth_, int max_extend_, int max_nodes_) {
        frc = frc_;
        max_depth = max_depth_;
        max_extend = max_extend_;
        max_nodes = max_nodes_;
    }

    /**
     * Create the FEN
     * @return fen
     */
    std::string createFen() {
        int empty = 0;
        fen = "";

        for (int i = SQUARE_A8; i <= SQUARE_H1; i ++) {
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
                    int file = FILE(square),
                        rank = RANK(square);
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

        std::string epflags;
        if (ep_square == EMPTY)
            epflags += "-";
        else {
            epflags += FILE_ALGEBRAIC(ep_square);
            epflags += RANK_ALGEBRAIC(ep_square);
        }

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

        line[(index % 4) * 2 + 1] = 'B';
        index /= 4;
        line[(index % 4) * 2] = 'B';
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
        std::string rooks, rooks2;
        i = 7;
        for (auto type : "RKR")
            for (; i >= 0; i --) {
                if (line[i] == ' ') {
                    line[i] = type;
                    if (type == 'R') {
                        rooks += 'A' + i;
                        rooks2 += 'a' + i;
                    }
                    break;
                }
            }

        std::string result;
        for (auto letter : line)
            result += letter + 'a' - 'A';

        result = result + "/pppppppp/8/8/8/8/PPPPPPPP/" + line + " w " + rooks + rooks2 + " - 0 1";
        return result;
    }

    /**
     * Create the moves
     * @param frc Fisher Random Chess
     * @param legal only consider legal moves
     * @param single_square calculate moves from a specific square
     * @return moves
     */
    std::vector<Move> createMoves(bool frc, bool legal, int single_square) {
        bool is_single = (single_square != EMPTY);
        int first_sq = is_single? single_square: SQUARE_A8,
            last_sq = is_single? single_square: SQUARE_H1;
        std::vector<Move> moves;
        int second_rank[] = {6, 1};
        uint8_t us = turn,
            them = us ^ 1;

        for (int i = first_sq; i <= last_sq; i ++) {
            // off board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            auto piece = board[i];
            if (!piece || COLOR(piece) != us)
                continue;

            auto piece_type = TYPE(piece);
            if (piece_type == PAWN) {
                int *offsets = PAWN_OFFSETS[us];

                // single square, non-capturing
                int square = i + offsets[0];
                if (!board[square]) {
                    addMove(moves, i, square, BITS_NORMAL);

                    // double square
                    square = i + offsets[1];
                    if (second_rank[us] == RANK(i) && !board[square])
                        addMove(moves, i, square, BITS_BIG_PAWN);
                }

                // pawn captures
                for (int j = 2; j < 4; j ++) {
                    square = i + offsets[j];
                    if (square & 0x88)
                        continue;

                    if (board[square] && COLOR(board[square]) == them)
                        addMove(moves, i, square, BITS_CAPTURE);
                    else if (square == ep_square)
                        addMove(moves, i, ep_square, BITS_EP_CAPTURE);
                }
            }
            else {
                int *offsets = PIECE_OFFSETS[piece_type];
                for (int j = 0; j < 8; j ++) {
                    int offset = offsets[j],
                        square = i;
                    if (!offset)
                        break;

                    while (true) {
                        square += offset;
                        if (square & 0x88)
                            break;

                        if (!board[square])
                            addMove(moves, i, square, BITS_NORMAL);
                        else {
                            if (COLOR(board[square]) == us)
                                break;
                            addMove(moves, i, square, BITS_CAPTURE);
                            break;
                        }

                        // break if knight or king
                        if (piece_type == KING || piece_type == KNIGHT)
                            break;
                    }
                }
            }
        }

        // castling
        int king = kings[us];
        if (king != EMPTY && (!is_single || single_square == king)) {
            auto pos0 = RANK(king) << 4;

            // q=0: king side, q=1: queen side
            for (auto q = 0; q < 2; q ++) {
                auto rook = castling[us * 2 + q];
                if (rook == EMPTY)
                    continue;

                int error = false,
                    flags = q? BITS_QSIDE_CASTLE: BITS_KSIDE_CASTLE,
                    king_to = pos0 + (q? 2: 6),
                    rook_to = king_to + (q? 1: -1),
                    max_king = std::max(king, king_to),
                    min_king = std::min(king, king_to),
                    max_path = std::max(max_king, std::max(rook, rook_to)),
                    min_path = std::min(min_king, std::min(rook, rook_to));

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

                // add castle + detect FRC even if not set
                if (!error)
                    addMove(moves, king, (frc || FILE(king) != 4 || FILE(rook) % 7)? rook: king_to, flags);
            }
        }

        // return pseudo-legal moves
        if (!legal)
            return moves;

        // filter out illegal moves
        std::vector<Move> legal_moves;
        for (auto &move : moves) {
            moveRaw(move, false);
            if (!kingAttacked(us))
                legal_moves.push_back(move);
            undoMove();
        }
        return legal_moves;
    }

    /**
     * Check if the king is attacked
     * @param color 0, 1 + special cases: 2, 3
     * @return true if king is attacked
     */
    bool kingAttacked(uint8_t color) {
        if (color > 1)
            color = (color == 2)? turn: turn ^ 1;
        return attacked(color ^ 1, kings[color]);
    }

    /**
     * Load a FEN
     * @param fen valid or invalid FEN
     * @return empty on error, and the FEN may be corrected
     */
    std::string load(std::string fen_) {
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
        move_number = move;

        bool start = (!turn && move_number == 1);
        if (start)
            frc = false;

        // can detect FRC if castle is not empty
        if (castle != "-") {
            bool error = false;
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
                for (uint8_t color = 0; color < 2; color ++) {
                    char file_letter = color? 'a': 'A';
                    auto king = kings[color];

                    for (int i = king + 1; FILE(i) <= 7; i ++)
                        if (TYPE(board[i]) == ROOK) {
                            castling[color * 2] = i;
                            castle += file_letter + FILE(i);
                            break;
                        }

                    for (int i = king - 1; FILE(i) >= 0; i --)
                        if (TYPE(board[i]) == ROOK) {
                            castling[color * 2 + 1] = i;
                            castle += file_letter + FILE(i);
                            break;
                        }
                }
                fen = fen.substr(0, step2) + " " + castle + fen.substr(step3);
                frc = true;
            }
        }
        return fen;
    }

    /**
     * Try an object move
     * @param move {from: 23, to: 7, promote: 5}
     * @param frc Fisher Random Chess
     * @param decorate add + # decorators
     */

    Move moveObject(Move &move, bool frc, bool decorate) {
        uint8_t flags = 0;
        Move move_obj;
        auto moves = createMoves(frc, true, EMPTY);     // move.from);

        // FRC castle?
        if (frc && move.from == kings[turn]) {
            if (move.to == castling[turn * 2] || move.to == move.from + 2)
                flags = BITS_KSIDE_CASTLE;
            else if (move.to == castling[turn * 2 + 1] || move.to == move.from - 2)
                flags = BITS_QSIDE_CASTLE;
        }

        // find an existing match + add the SAN
        if (flags) {
            for (auto &move2 : moves)
                if (move2.flags & flags) {
                    move2.m = moveToSan(move2, moves);
                    move_obj = move2;
                    break;
                }
        }
        else
            for (auto &move2 : moves) {
                if (move.from == move2.from && move.to == move2.to
                        && (!move2.promote || TYPE(move.promote) == move2.promote)) {
                    move2.m = moveToSan(move2, moves);
                    move_obj = move2;
                    break;
                }
            }

        // no suitable move?
        if (move_obj.piece)
            moveRaw(move_obj, decorate);
        return move_obj;
    }

    /**
     * Make a raw move, no verification is being performed
     * @param move
     * @param decorate add + # decorators
     */
    void moveRaw(Move &move, bool decorate) {
        uint8_t us = turn,
            them = us ^ 1;

        // not smart to do it for every move
        addHistory(move);

        int capture = move.capture,
            flags = move.flags,
            is_castle = (flags & BITS_CASTLE),
            move_from = move.from,
            move_to = move.to;
        auto move_type = TYPE(move.piece);

        half_moves ++;
        ep_square = EMPTY;

        // moved king?
        if (move_type == KING) {
            if (is_castle) {
                int q = (flags & BITS_QSIDE_CASTLE)? 1: 0,
                    king = kings[us],
                    king_to = (RANK(king) << 4) + (q? 2: 6),
                    rook = castling[us * 2 + q];

                board[king] = 0;
                board[rook] = 0;
                board[king_to] = COLORIZE(us, KING);
                board[king_to + (q? 1: -1)] = COLORIZE(us, ROOK);
                move_to = king_to;
            }

            kings[us] = move_to;
            castling[us * 2] = EMPTY;
            castling[us * 2 + 1] = EMPTY;
        }

        if (!is_castle) {
            if (move_from != move_to) {
                board[move_to] = board[move_from];
                board[move_from] = 0;
            }

            // remove castling if we capture a rook
            if (capture) {
                materials[them] -= PIECE_SCORES[capture];
                if (capture == ROOK) {
                    if (move_to == castling[them * 2])
                        castling[them * 2] = EMPTY;
                    else if (move_to == castling[them * 2 + 1])
                        castling[them * 2 + 1] = EMPTY;
                }
            }

            // remove castling if we move a rook
            if (move_type == ROOK) {
                if (move_from == castling[us * 2])
                    castling[us * 2] = EMPTY;
                else if (move_from == castling[us * 2 + 1])
                    castling[us * 2 + 1] = EMPTY;
            }
            // pawn + update 50MR
            else if (move_type == PAWN) {
                // pawn moves 2 squares
                if (flags & BITS_BIG_PAWN)
                    ep_square = move_to + (turn == BLACK? -16: 16);
                else {
                    if (flags & BITS_EP_CAPTURE)
                        board[move_to + (turn == BLACK? -16: 16)] = 0;
                    if (flags & BITS_PROMOTION) {
                        board[move_to] = COLORIZE(us, move.promote);
                        materials[us] += PROMOTE_SCORES[move.promote];
                    }
                }
                half_moves = 0;
            }
            else if (flags & BITS_CAPTURE)
                half_moves = 0;
        }

        if (turn == BLACK)
            move_number ++;
        turn ^= 1;

        // decorate the SAN with + or #
        if (decorate) {
            char last = move.m[move.m.size() - 1];
            if (last != '+' && last != '#' && kingAttacked(turn)) {
                auto moves = createMoves(frc, true, EMPTY);
                move.m += moves.size()? '+': '#';
            }
        }
    }

    /**
     * Try a SAN move
     * @param text Nxb7, a8=Q
     * @param frc Fisher Random Chess
     * @param decorate add + # decorators
     * @param sloppy allow sloppy parser
     */
    Move moveSan(std::string text, bool frc, bool decorate, bool sloppy) {
        auto moves = createMoves(frc, true, EMPTY);
        Move move = sanToMove(text, moves, sloppy);
        if (move.piece)
            moveRaw(move, decorate);
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
    std::string moveToSan(Move &move, std::vector<Move> &moves) {
        if (move.flags & BITS_KSIDE_CASTLE)
            return "O-O";
        if (move.flags & BITS_QSIDE_CASTLE)
            return "O-O-O";

        std::string disambiguator = disambiguate(move, moves);
        auto move_type = TYPE(move.piece);
        std::string output;

        if (move_type != PAWN)
            output += PIECE_UPPER[move_type] + disambiguator;

        if (move.flags & (BITS_CAPTURE | BITS_EP_CAPTURE)) {
            if (move_type == PAWN)
                output += squareToAn(move.from, false)[0];
            output += 'x';
        }

        output += squareToAn(move.to, false);

        if (move.flags & BITS_PROMOTION) {
            output += '=';
            output += PIECE_UPPER[move.promote];
        }
        return output;
    }

    /**
     * Try an UCI move
     * @param text c2c4, a7a8a
     * @param frc Fisher Random Chess
     * @param decorate add + # decorators
     */
    Move moveUci(std::string text, bool frc, bool decorate) {
        Move move;
        move.from = anToSquare(text.substr(0, 2));
        move.promote = PIECES[text[4]];
        move.to = anToSquare(text.substr(2, 2));
        return moveObject(move, frc, decorate);
    }

    /**
     * Parse a list of SAN moves + create FEN for each move
     * @param text c2c4 a7a8a ...
     * @param frc Fisher Random Chess
     * @param sloppy allow sloppy parser
     */
    std::vector<Move> multiSan(std::string multi, bool frc, bool sloppy) {
        std::vector<Move> result;
        int prev = 0,
            size = multi.size();
        for (int i = 0; i <= size; i ++) {
            if (i < size && multi[i] != ' ')
                continue;

            if (multi[prev] >= 'A') {
                auto text = multi.substr(prev, i - prev);
                auto moves = createMoves(frc, true, EMPTY);
                Move move = sanToMove(text, moves, sloppy);
                if (!move.piece)
                    break;
                moveRaw(move, false);
                move.fen = createFen();
                result.push_back(move);
            }
            prev = i + 1;
        }
        return result;
    }

    /**
     * Parse a list of UCI moves + create SAN + FEN for each move
     * @param text c2c4 a7a8a ...
     * @param frc Fisher Random Chess
     */
    std::vector<Move> multiUci(std::string multi, bool frc) {
        std::vector<Move> result;
        int prev = 0,
            size = multi.size();
        for (int i = 0; i <= size; i ++) {
            if (i < size && multi[i] != ' ')
                continue;

            if (multi[prev] >= 'A') {
                auto text = multi.substr(prev, i - prev);
                auto move = moveUci(text, frc, true);
                if (move.piece) {
                    move.fen = createFen();
                    result.push_back(move);
                }
            }
            prev = i + 1;
        }
        return result;
    }

    /**
     * Print the board
     */
    std::string print() {
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
        return text;
    }

    /**
     * Put a piece on a square
     */
    void put(uint8_t piece, int square) {
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
        load(DEFAULT_POSITION);
    }

    /**
     * Convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
     * @param san Nf3, Nf3+?!
     * @param moves list of moves to match the san against
     * @param sloppy allow sloppy parser
     */
    Move sanToMove(std::string san, std::vector<Move> &moves, bool sloppy) {
        // 1) try exact matching
        auto clean = cleanSan(san);
        for (auto &move : moves)
            if (clean == cleanSan(moveToSan(move, moves))) {
                move.m = san;
                return move;
            }

        // 2) try sloppy matching
        Move null_move;
        if (!sloppy)
            return null_move;

        int from_file = -1,
            from_rank = -1,
            i = clean.size() - 1,
            to = EMPTY;
        uint8_t promote = 0,
            type = 0;

        if (i < 2)
            return null_move;

        // analyse backwards
        if (strchr("bnrqBNRQ", clean[i])) {
            promote = TYPE(PIECES[clean[i]]);
            i --;
        }
        // to
        if (clean[i] < '1' || clean[i] > '8')
            return null_move;
        i --;
        if (clean[i] < 'a' || clean[i] > 'j')
            return null_move;
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
                    && (!type || type == TYPE(move.piece))
                    && (from_file < 0 || from_file == FILE(move.from))
                    && (from_rank < 0 || from_rank == RANK(move.from))
                    && (!promote || promote == move.promote)) {
                move.m = moveToSan(move, moves);
                return move;
            }
        }
        return null_move;
    }

    /**
     * Basic tree search with mask
     * @param moves
     * @param mask moves to search, ex: 01100
     * @return updated moves
     */
    std::vector<Move> search(std::vector<Move> &moves, std::string mask) {
        nodes = 0;
        sel_depth = 0;

        int result[2] = {0, 0};
        if (mask.empty()) {
            searchMoves(moves, 1, result);
            return moves;
        }

        std::vector<Move> masked;
        int length = std::min(moves.size(), mask.size());
        for (auto i = 0; i < length; i ++)
            if (mask[i] != '0')
                masked.push_back(moves[i]);

        searchMoves(masked, 1, result);
        return masked;
    }

    /**
     * Basic tree search
     * @param moves
     * @param depth
     * @param result
     */
    void searchMoves(std::vector<Move> &moves, int depth, int *result) {
        int best = -99999;
        int best_depth = depth;
        auto length = moves.size();
        bool look_deeper = (depth < max_depth && nodes < max_nodes);
        int temp[] = {0, 0};
        int valid = 0;

        nodes += length;
        if (depth > sel_depth)
            sel_depth = depth;

        for (auto &move : moves) {
            if (half_moves >= 50) {
                move.score = 0;
                break;
            }

            move.depth = depth;
            moveRaw(move, false);

            // invalid move?
            if (kingAttacked(3))
                move.score = -99900;
            else {
                move.score = materials[turn ^ 1] - materials[turn];
                valid ++;

                // look deeper
                if (look_deeper || (depth < max_extend && move.capture && PIECE_SCORES[move.capture] < PIECE_SCORES[move.piece])) {
                    auto moves2 = createMoves(frc, false, -1);
                    searchMoves(moves2, depth + 1, temp);

                    // stalemate? good if we're losing, otherwise BAD!
                    if (temp[0] < -80000)
                        move.score = 0;
                    else
                        move.score -= temp[0];
                    move.depth = temp[1];
                }
            }

            undoMove();
            if (depth >= 3 && move.score > 20000)
                break;
        }

        // checkmate?
        if (!valid && kingAttacked(2)) {
            best = -51200 + depth * 4000;
            best_depth = depth;
        }
        else {
            for (auto &move : moves) {
                move.score += int(valid * 0.7 + 0.5f);
                if (best < move.score) {
                    best = move.score;
                    best_depth = move.depth;
                }
            }
        }

        result[0] = best;
        result[1] = best_depth;
    }

    /**
     * Convert a square number to an algebraic notation
     * @param square 112
     * @param check check the boundaries
     * @return a1
     */
    std::string squareToAn(int square, bool check) {
        int file = FILE(square),
            rank = RANK(square);
        if (check && (file < 0 || file > 7 || rank < 0 || rank > 7))
            return "";
        std::string text;
        text += ('a' + file);
        text += ('8' - rank);
        return text;
    }

    /**
     * Add UCI to a move
     * @param {Move} move
     * @returns {string}
     */
    std::string ucify(Move &move) {
        move.m = squareToAn(move.from, false) + squareToAn(move.to, false);
        if (move.promote)
            move.m += PIECE_LOWER[move.promote];
        return move.m;
    }

    /**
     * Undo a move
     */
    void undoMove() {
        if (histories.empty())
            return;
        History &old = histories.back();

        Move &move = old.move;
        memcpy(castling, &old.castling, sizeof(castling));
        ep_square = old.ep_square;
        half_moves = old.half_moves;
        memcpy(&kings, &old.kings, sizeof(kings));
        memcpy(&materials, &old.materials, sizeof(materials));
        move_number = old.move_number;
        turn ^= 1;

        uint8_t us = turn,
            them = turn ^ 1;

        // undo castle
        if (move.flags & BITS_CASTLE) {
                int q = (move.flags & BITS_QSIDE_CASTLE)? 1: 0,
                    king = kings[us],
                    king_to = (RANK(king) << 4) + (q? 2: 6),
                    rook = castling[us * 2 + q];

                board[king_to] = 0;
                board[king_to + (q? 1: -1)] = 0;
                board[king] = COLORIZE(us, KING);
                board[rook] = COLORIZE(us, ROOK);
        }
        else {
            if (move.from != move.to) {
                board[move.from] = move.piece;
                board[move.to] = 0;
            }

            if (move.flags & BITS_CAPTURE)
                board[move.to] = COLORIZE(them, move.capture);
            else if (move.flags & BITS_EP_CAPTURE) {
                int index = move.to + (us == BLACK? -16: 16);
                board[index] = COLORIZE(them, PAWN);
            }
        }

        histories.pop_back();
    }

    // EMSCRIPTEN INTERFACES
    ////////////////////////

    val em_board() {
        return val(typed_memory_view(128, board));
    }

    val em_castling() {
        return val(typed_memory_view(4, castling));
    }

    bool em_checked(uint8_t color) {
        return kingAttacked(color);
    }

    std::string em_fen() {
        return fen;
    }

    bool em_frc() {
        return frc;
    }

    int em_material(uint8_t color) {
        return materials[color];
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
        return sel_depth;
    }

    uint8_t em_turn() {
        return turn;
    }
};

// BINDING CODE
///////////////

EMSCRIPTEN_BINDINGS(chess) {
    // MOVE BINDINGS
    value_object<Move>("Move")
        .field("capture", &Move::capture)
        .field("depth", &Move::depth)
        .field("fen", &Move::fen)
        .field("flags", &Move::flags)
        .field("from", &Move::from)
        .field("m", &Move::m)
        .field("piece", &Move::piece)
        .field("ply", &Move::ply)
        .field("promote", &Move::promote)
        .field("score", &Move::score)
        .field("to", &Move::to)
        ;

    // CHESS BINDINGS
    class_<Chess>("Chess")
        .constructor()
        .function("anToSquare", &Chess::anToSquare)
        .function("attacked", &Chess::attacked)
        .function("board", &Chess::em_board)
        .function("castling", &Chess::em_castling)
        .function("checked", &Chess::em_checked)
        .function("cleanSan", &Chess::cleanSan)
        .function("clear", &Chess::clear)
        .function("configure", &Chess::configure)
        .function("currentFen", &Chess::em_fen)
        .function("fen", &Chess::createFen)
        .function("frc", &Chess::em_frc)
        .function("fen960", &Chess::createFen960)
        .function("load", &Chess::load)
        .function("material", &Chess::em_material)
        .function("moveObject", &Chess::moveObject)
        .function("moveRaw", &Chess::moveRaw)
        .function("moveSan", &Chess::moveSan)
        .function("moveToSan", &Chess::moveToSan)
        .function("moveUci", &Chess::moveUci)
        .function("moves", &Chess::createMoves)
        .function("multiSan", &Chess::multiSan)
        .function("multiUci", &Chess::multiUci)
        .function("nodes", &Chess::em_nodes)
        .function("piece", &Chess::em_piece)
        .function("print", &Chess::print)
        .function("put", &Chess::put)
        .function("reset", &Chess::reset)
        .function("sanToMove", &Chess::sanToMove)
        .function("search", &Chess::search)
        .function("selDepth", &Chess::em_selDepth)
        .function("squareToAn", &Chess::squareToAn)
        .function("turn", &Chess::em_turn)
        .function("ucify", &Chess::ucify)
        .function("undo", &Chess::undoMove)
        ;

    register_vector<int>("vector<int>");
    register_vector<Move>("vector<Move>");
}
