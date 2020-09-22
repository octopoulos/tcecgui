#!/usr/bin/env python3

from time import time

import chess

board = chess.Board()

ITERATIONS = 200
san_list = '1. d4 d5 2. c4 c6 3. Nc3 Nf6 4. e3 e6 5. Bd3 dxc4 6. Bxc4 a6 7. a4 c5 8. Nf3 Nc6 9. O-O Be7 10. dxc5 Qxd1 11. Rxd1 Bxc5 12. h3 Ke7 13. e4 Rd8 14. Rxd8 Kxd8 15. e5 Nd7 16. Bf4 Be7 17. Ne4 Nb6 18. Bb3 Na5 19. Ba2 Nxa4 20. Be3 Kc7 21. Rc1 Nc6 22. Rc2 b6 23. Bb3 Nc5 24. Nxc5 bxc5 25. Bxc5 Bxc5 26. Rxc5 Kb6 27. Rc3 Bb7 28. Ng5 Rf8 29. Nxh7 Rd8 30. Ng5 Nxe5 31. Re3 Bd5 32. f4 Nc4 33. Rc3 Nd6 34. f5 Nxf5 35. Nxf7 Rd7 36. Ne5 Rc7 37. Rd3 Kc5 38. Bxd5 exd5 39. Rc3 Kb6 40. Rd3 Kc5 41. Rc3 Kb6 42. Rxc7 Kxc7 43. Kf2 a5 44. g4 Kd6 45. Nf3'
uci_list = 'd2d4 d7d5 c2c4 c7c6 b1c3 g8f6 e2e3 e7e6 f1d3 d5c4 d3c4 a7a6 a2a4 c6c5 g1f3 b8c6 e1g1 f8e7 d4c5 d8d1 f1d1 e7c5 h2h3 e8e7 e3e4 h8d8 d1d8 e7d8 e4e5 f6d7 c1f4 c5e7 c3e4 d7b6 c4b3 c6a5 b3a2 b6a4 f4e3 d8c7 a1c1 a5c6 c1c2 b7b6 a2b3 a4c5 e4c5 b6c5 e3c5 e7c5 c2c5 c7b6 c5c3 c8b7 f3g5 a8f8 g5h7 f8d8 h7g5 c6e5 c3e3 b7d5 f2f4 e5c4 e3c3 c4d6 f4f5 d6f5 g5f7 d8d7 f7e5 d7c7 c3d3 b6c5 b3d5 e6d5 d3c3 c5b6 c3d3 b6c5 d3c3 c5b6 c3c7 b6c7 g1f2 a6a5 g2g4 c7d6 e5f3'
length = len(uci_list.split()) * ITERATIONS

# 1) SAN
moves = [san for san in san_list.split() if san[0] not in '123456789']
start = time()
for step in range(ITERATIONS):
    board.reset()
    result = []
    for text in moves:
        move = board.parse_san(text)
        result.append([move, board.fen()])
        board.push(move)

end = time()
elapsed = end - start
print(f'SAN : pychess : {elapsed} : {length / elapsed}pps')

# 2) UCI
moves = uci_list.split()
start = time()
for step in range(ITERATIONS):
    board.reset()
    result = []
    for text in moves:
        move = board.parse_uci(text)
        result.append([move, board.san(move), board.fen()])
        board.push(move)

end = time()
elapsed = end - start
print(f'UCI : pychess : {elapsed} : {length / elapsed}pps')

# 3) moves
fen = '1nkr2nr/1ppb1pbp/p6q/3PB3/3R4/2N2Q2/PPP1B1PP/1K5R w - - 1 16'
board.set_fen(fen)
start = time()
nodes = 0
for step in range(ITERATIONS * 10):
    nodes += board.legal_moves.count()
    # moves = [move for move in board.pseudo_legal_moves]
    # nodes += len(moves)

end = time()
elapsed = end - start
print(f'MOV : pychess : {elapsed} : {nodes} nodes : {nodes / elapsed}nps')
