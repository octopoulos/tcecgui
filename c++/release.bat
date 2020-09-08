emcc --bind -o ../js/chess-wasm.js chess.cpp -s WASM=1 -Wall -s MODULARIZE=1 -O3 --closure 1
