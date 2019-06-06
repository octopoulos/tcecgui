var roundDate = [];
/* All times in GST, maintain proper formatting, if date is not decide just put 0 */
var roundDateMan = [
0, /* 1 */
0, /* 2 */
0, /* 3 */
0, /* 4 */
0, /* 5 */
0, /* 6 */
0, /* 7 */
0, /* 8 */
0, /* 9 */
0, /* 10 */
0, /* 11 */
0, /* 12 */
0, /* 13 */
0, /* 14 */
0, /* 15 */
0, /* 16 */
0, /* 17 */
0, /* 18 */
0, /* 19 */
0, /* 20 */
0, /* 15 */
0, /* 16 */
0, /* 17 */
0, /* 18 */
0, /* 19 */
0, /* 19 */
0, /* 27 */
0, /* 28 */
0, /* 29 */
0, /* 30 */
0, /* 30 */
0, /* 32 */
0, /* 30 */
0, /* 34 */
];

var startDateR1 = '17:00:00 on 2019.01.21';
var startDateR2 = 0;
var roundNo = 2;
var teamsx = 
 [[["Stockfish ", 1], ["Rodent III ", 32]],
 [["Booot ", 16], ["Nirvana ", 17]],
 [["Fizbo ", 9], ["rofChade ", 24]],
 [["KomodoMCTS ", 8], ["Nemorino ",25]],
 [["Houdini ", 4], ["Wasp ", 29]],
 [["Fritz ", 13], ["Texel ", 20]],
 [["Jonny ", 12], ["Arasan ", 21]],
 [["Fire ", 5], ["Pirarucu ", 28]],
 [["LcZero ", 2], ["Tucano ", 31]],
 [["Xiphos ", 15], ["ChessBrainVB ", 18]],
 [["Chiron ", 10], ["Pedone ", 23]],
 [["Andscacs ", 7], ["Hannibal ", 26]],
 [["Komodo ", 3], ["Demolito ", 30]],
 [["Ginkgo ", 14], ["Gull ", 19]],
 [["Laser ", 11], ["Vajolet2 ", 22]],
 [["Ethereal ", 6], ["Schooner ", 27]]
 ];

var bigData = {           
 teams : [            
 ],            
 results : [[ /* WINNER BRACKET */          
 [[0,0, "empty-bye"], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0, "arun"], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0]],
 [[0,0, "arun"], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0], [0,0]],        
 [[0,0], [0,0], [0,0], [0,0]],          
 [[0,0], [0,0]],           
 [[0,0]]            
 ]            
 ]            
}            

var roundResults = []

var dummyCross = 
{
	"Event" : "",
	"Order" : [
		"Engine1",
		"Engine2"
	],
	"Table" : {
		"Engine1" : {
			"Abbreviation" : "E1",
			"Elo" : 0,
			"Games" : 0,
			"GamesAsBlack" : 0,
			"GamesAsWhite" : 0,
			"Neustadtl" : 0,
			"Performance" : 0,
			"Rank" : 1,
			"Rating" : 0,
			"Results" : {
				"Engine2" : {
					"Scores" : [],
					"Text" : ""
				}
			},
			"Score" : 0,
			"Strikes" : 0,
			"WinsAsBlack" : 0,
			"WinsAsWhite" : 0
		},
		"Engine2" : {
			"Abbreviation" : "E2",
			"Elo" : 0,
			"Games" : 0,
			"GamesAsBlack" : 0,
			"GamesAsWhite" : 0,
			"Neustadtl" : 0,
			"Performance" : 0,
			"Rank" : 2,
			"Rating" : 0,
			"Results" : {
				"Engine1" : {
					"Scores" : [],
					"Text" : ""
				}
			},
			"Score" : 0,
			"Strikes" : 0,
			"WinsAsBlack" : 0,
			"WinsAsWhite" : 0
		}
	}
}
