#!/usr/bin/env python3

import json
import os
from random import choice
import socket
import sys
from time import sleep, time
from typing import Any, List

from chess import Board

name = 'Chatengine 0.3'
HOST = 'localhost'
PORT = 8090
move_overhead = 1
update_interval = 1
sleep_time = 0.01

class ChatEngine:
    def __init__(self):
        self.board = Board()
        self.data = b''
        self.fen = ''
        self.next_update = time()
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.update = ""

        self.sock.connect((HOST, PORT))
        self.sock.setblocking(0)

    def pr(self, *args):
        print(*args)
        sys.stdout.flush()

    def start_voting(self):
        self.sock.sendall(b'{"voting":"%s"}' % self.fen.encode("utf-8"))

    def stop_voting(self, best_move: str):
        self.sock.sendall(b'{"voting":"","best_move":"%s"}' % best_move.encode('utf-8'))

    def read_votes(self) -> List[Any]:
        try:
            self.data += self.sock.recv(4096)
        except BlockingIOError:
            pass
        if len(self.data) < 4 or int(self.data[:4]) > len(self.data)-4:
            return
        length = int(self.data[:4])
        msg = json.loads(self.data[4:length+4])
        self.data = self.data[length+4:]
        if self.fen != msg.get('fen'):
            return
        return msg.get('votes')

    def send_update(self, force=False):
        if self.update and (force or time() >= self.next_update):
            self.pr(self.update)
            self.update = ""
            self.next_update = time() + update_interval

    def loop(self):
        for line in sys.stdin:
            line = line.strip()
            if not line:
                break
            items = line.split()
            key = items[0]

            if key == "quit":
                break
            elif key == "uci":
                self.pr("id " + name)
                self.pr()
                self.pr("uciok")
            elif key == "ucinewgame":
                self.board.reset()
                self.fen = self.board.fen()
            elif key == "isready":
                self.pr("readyok")
            elif key == "position":
                items.pop(0)
                if items and items[0] == "startpos":
                    items.pop(0)
                    if items and items[0] == "moves":
                        moves = items[1:]
                    else:
                        moves = []
                    self.board.reset()
                    for move in moves:
                        self.board.push_uci(move)
                    self.fen = self.board.fen()
            elif key == "go":
                items.pop(0)
                if len(items) < 2 or items[0] != "movetime":
                    continue

                self.start_voting()
                time_s = int(items[1])/1000.0 - move_overhead
                t0 = time()
                previous_votes = None
                best_move = str(choice(tuple(self.board.legal_moves)))

                while time() - t0 < time_s:
                    votes = self.read_votes()
                    if votes and votes != previous_votes:
                        elapsed = (time() - t0) * 1000
                        best_move, nodes = max(votes, key=lambda x: x[1])
                        nps = round(nodes * 1000 / elapsed) if elapsed > 0 else 0
                        vote_list = ' '.join([f'{x[0]} {x[1]}' for x in votes])

                        self.update = ' '.join([
                            'info depth 1 seldepth 1 score cp 0',
                            f'time {round(elapsed)}',
                            f'nodes {nodes}',
                            f'nps {nps}',
                            f'votes {vote_list}',
                            f'pv {best_move}',
                        ])
                        previous_votes = votes

                    self.send_update()
                    sleep(sleep_time)

                self.send_update(force=True)
                self.pr("bestmove", best_move)
                self.stop_voting(best_move)

        self.quit()

    def quit(self):
        self.sock.close()

if __name__ == "__main__":
    chat_eng = ChatEngine()
    chat_eng.loop()
