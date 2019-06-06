var evalChart;
var timeChart;
var speedChart;
var depthChart;
var tbHitsChart;
var evalLimit = 10;

var evalChartData = {
  labels: [],
  datasets: [{
    label: 'White',
    lineTension: 0,
    borderColor: '#EFEFEF',
    backgroundColor: '#EFEFEF',
    fill: false,
    data: [
    ]
  }, {
    label: 'Black',
    lineTension: 0,
    borderColor: '#000000',
    backgroundColor: '#000000',
    fill: false,
    data: [
    ]
  }, {
    label: 'Live engine',
    lineTension: 0,
    borderColor: '#007bff',
    backgroundColor: '#007bff',
    
    fill: false,
    data: [
    ]
  }
  ]
};

var timeChartData = {
  labels: [],
  datasets: [{
    label: 'White Engine Time',
    lineTension: 0,
    borderColor: '#EFEFEF',
    backgroundColor: '#EFEFEF',
    fill: false,
    data: [
    ]
  }, {
    label: 'Black Engine Time',
    lineTension: 0,
    borderColor: '#000000',
    backgroundColor: '#000000',
    fill: false,
    data: [
    ]
  }]
};

var speedChartData = {
  labels: [],
  datasets: [{
    label: 'White Engine Speeds',
    lineTension: 0,
    borderColor: '#EFEFEF',
    backgroundColor: '#EFEFEF',
    fill: false,
    data: [
    ],
    yAxisID: 'y-axis-1',
  }, {
    label: 'Black Engine Speed',
    lineTension: 0,
    borderColor: '#000000',
    backgroundColor: '#000000',
    fill: false,
    data: [
    ],
    yAxisID: 'y-axis-2'
  }]
};

var depthChartData = {
  labels: [],
  datasets: [{
    label: 'White Engine Depth',
    lineTension: 0,
    borderColor: '#EFEFEF',
    backgroundColor: '#EFEFEF',
    fill: false,
    data: [
    ]
  }, {
    label: 'Black Engine Depth',
    lineTension: 0,
    borderColor: '#000000',
    backgroundColor: '#000000',
    fill: false,
    data: [
    ]
  }]
};

var tbHitsChartData = {
  labels: [],
  datasets: [{
    label: 'White Engine TB Hits',
    lineTension: 0,
    borderColor: '#EFEFEF',
    backgroundColor: '#EFEFEF',
    fill: false,
    yAxisID: 'tb-y-axis-1',
    data: [
    ]
  }, {
    label: 'Black Engine TB Hits',
    lineTension: 0,
    borderColor: '#000000',
    backgroundColor: '#000000',
    fill: false,
    yAxisID: 'tb-y-axis-2',
    data: [
    ]
  }]
};


$(function() {
	evalChart = Chart.Line($('#eval-graph'), {
	  data: evalChartData,
	  options: {
	    responsive: true,
	    bezierCurve: false,
	    hoverMode: 'index',
	    stacked: false,
	    legend: {
	      display: true,
         labels: {
            boxWidth: 1
         },
	    },
	    title: {
	      display: false
	    },
        tooltips: {
	      callbacks: {
	            label: function(tooltipItem, data) {
	            	eval = [];
	            	if (typeof data.datasets[0].data[tooltipItem.index] != 'undefined') {
	            		eval = _.union(eval, ['White Eval: ' + data.datasets[0].data[tooltipItem.index].eval]);
	            	}
	            	if (typeof data.datasets[1].data[tooltipItem.index] != 'undefined') {
	            		eval = _.union(eval, ['Black Eval: ' + data.datasets[1].data[tooltipItem.index].eval]);
	            	}
	            	if (typeof data.datasets[2].data[tooltipItem.index] != 'undefined') {
	            		eval = _.union(eval, ['Live Eval: ' + data.datasets[2].data[tooltipItem.index].eval]);
	            	}
	                return eval;
	            }
	      } // end callbacks:
	    },
	    scales: {
	      yAxes: [{
	        type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
	        display: true,
	        position: 'left',
	        id: 'e-y-axis-1',
	      }],
	      xAxes: [{
	      	ticks: {
		        autoSkip: true,
		        maxTicksLimit: 25
		    }
	      }]
	    }
	  }
	});

	timeChart = Chart.Line($('#time-graph'), {
	  data: timeChartData,
	  options: {
	    responsive: true,
	    hoverMode: 'index',
	    stacked: false,
	    legend: {
	      display: false
	    },
	    title: {
	      display: false
	    },
	    scales: {
	      yAxes: [{
	        type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
	        display: true,
	        position: 'left',
	        id: 't-y-axis-1',
	      }],
	      xAxes: [{
	      	ticks: {
		        autoSkip: true,
		        maxTicksLimit: 25
		    }
	      }]
	    }
	  }
	});

	speedChart = Chart.Line($('#speed-graph'), {
	  data: speedChartData,
	  options: {
	    responsive: true,
	    hoverMode: 'index',
	    stacked: false,
	    legend: {
	      display: false
	    },
	    title: {
	      display: false
	    },
        tooltips: {
	      callbacks: {
	            label: function(tooltipItem, data) {
	                var value = parseInt(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].y);
	                if (value >= 1000000) {
			  			value = Math.round (value / 10000) / 100;
				  		value += 'Mnps'
				  	} else {
				  		value = Math.round (value / 10) / 100;
				  		value += 'Knps'
				  	}

				  	var nodes = parseInt(data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index].nodes);
	                if (nodes >= 1000000000) {
			  			nodes = Math.round (nodes / 100000000) / 10;
				  		nodes += 'B'
				  	} else {
				  		nodes = Math.round (nodes / 100000) / 10;
				  		nodes += 'M'
				  	}
				    return value + ' (' + nodes + ' nodes)';
	            }
	      } // end callbacks:
	    },
	    scales: {
	      yAxes: [{
	        type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
	        display: true,
	        position: 'left',
	        id: 'y-axis-1',
	        ticks: {
			  callback: function(value, index, values) {
			  	if (value >= 1000000) {
			  		value = Math.round (value / 100000) / 10;
			  		value += 'M'
			  	} else {
			  		value = Math.round (value / 100) / 10;
			  		value += 'K'
			  	}
			    return value;
			  }
			}
	      }, {
	        type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
	        display: true,
	        position: 'right',
	        id: 'y-axis-2',

	        // grid line settings
	        gridLines: {
	          drawOnChartArea: false, // only want the grid lines for one axis to show up
	        },
	        ticks: {
			  callback: function(value, index, values) {
			  	if (value >= 1000000) {
			  		value = Math.round (value / 100000) / 10;
			  		value += 'M'
			  	} else {
			  		value = Math.round (value / 100) / 10;
			  		value += 'K'
			  	}
			    return value;
			  }
			}
	      }],
	      xAxes: [{
	      	ticks: {
		        autoSkip: true,
		        maxTicksLimit: 25
		    }
	      }]
	    }
	  }
	});

	depthChart = Chart.Line($('#depth-graph'), {
	  data: depthChartData,
	  options: {
	    responsive: true,
	    hoverMode: 'index',
	    stacked: false,
	    legend: {
	      display: false
	    },
	    title: {
	      display: false
	    },
	    scales: {
	      yAxes: [{
	        type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
	        display: true,
	        position: 'left',
	        id: 'd-y-axis-1',
	      }],
	      xAxes: [{
	      	ticks: {
		        autoSkip: true,
		        maxTicksLimit: 25
		    }
	      }]
	    }
	  }
	});

	tbHitsChart = Chart.Line($('#tbhits-graph'), {
	  data: tbHitsChartData,
	  options: {
	    responsive: true,
	    hoverMode: 'index',
	    stacked: false,
	    legend: {
	      display: false
	    },
	    title: {
	      display: false
	    },
	    scales: {
	      yAxes: [{
	        type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
	        display: true,
	        position: 'left',
	        id: 'tb-y-axis-1',
	        ticks: {
			  callback: function(value, index, values) {
			  	if (value >= 1000000) {
			  		value = Math.round (value / 100000) / 10;
			  		value += 'M'
			  	} else {
			  		value = Math.round (value / 100) / 10;
			  		value += 'K'
			  	}
			    return value;
			  }
			}
	      }, {
	        type: 'linear', // only linear but allow scale type registration. This allows extensions to exist solely for log scale for instance
	        display: true,
	        position: 'right',
	        id: 'tb-y-axis-2',
	        // grid line settings
	        gridLines: {
	          drawOnChartArea: false, // only want the grid lines for one axis to show up
	        },
	        ticks: {
			  callback: function(value, index, values) {
			  	if (value >= 1000000) {
			  		value = Math.round (value / 100000) / 10;
			  		value += 'M'
			  	} else {
			  		value = Math.round (value / 100) / 10;
			  		value += 'K'
			  	}
			    return value;
			  }
			}
	      }],
	      xAxes: [{
	      	ticks: {
		        autoSkip: true,
		        maxTicksLimit: 25
		    }
	      }]
	    }
	  }
	});
});

function updateChartData()
{
	evalChart.data.labels = [];
	evalChart.data.datasets[0].data = [];
	evalChart.data.datasets[1].data = [];

	timeChart.data.labels = [];
	timeChart.data.datasets[0].data = [];
	timeChart.data.datasets[1].data = [];

	speedChart.data.labels = [];
	speedChart.data.datasets[0].data = [];
	speedChart.data.datasets[1].data = [];

	depthChart.data.labels = [];
	depthChart.data.datasets[0].data = [];
	depthChart.data.datasets[1].data = [];

	tbHitsChart.data.labels = [];
	tbHitsChart.data.datasets[0].data = [];
	tbHitsChart.data.datasets[1].data = [];
	
	evalLabels = [];
	labels = [];

	whiteEval = [];
	blackEval = [];
	liveEval = [];

	whiteTime = [];
	blackTime = [];

	whiteSpeed = [];
	blackSpeed = [];

	whiteDepth = [];
	blackDepth = [];

	whiteTBHits = [];
	blackTBHits = [];

   var plyNum = 0;

	_.each(loadedPgn.Moves, function(move, key) {
		 if (!move.book) {
			moveNumber = Math.round(key / 2) + 1;

			if (key % 2 != 0) {
            plyNum = key + 1;
				moveNumber--;
			}
         else
         {
            plyNum = key + 1;
         }

			depth = move.d;
			if (move.sd > depth) {
            //arun
				//depth = move.sd;
			}

         //arun: cap moves at evalLimit
         move.cwv = move.wv;
         if (!isNaN(move.wv)) 
         {
            move.cwv = move.wv;
            if (move.wv > evalLimit) 
            {
               move.cwv = evalLimit;
            } 
            else if (move.wv < -evalLimit) 
            {
               move.cwv = -evalLimit;
            }
         } 
         else 
         {
            if (move.wv != undefined)
            {
               if (move.wv.substring(0,1) == '-') 
               {
                  move.cwv = -evalLimit;
               } 
               else 
               {
                  move.cwv = evalLimit;
               }
            }
         }
         eval = [
				{
					'x': moveNumber,
					'y': move.cwv,
					'ply': plyNum,
					'eval': move.wv
				}
			];

			time = [
				{
					'x': moveNumber,
					'y': Math.round(move.mt / 1000),
					'ply': plyNum
				}
			];

			speed = [
				{
					'x': moveNumber,
					'y': move.s,
					'nodes': move.n,
					'ply': plyNum
				}
			];

			depth = [
				{
					'x': moveNumber,
					'y': depth,
					'ply': plyNum
				}
			];

			tbHits = [
				{
					'x': moveNumber,
					'y': move.tb,
					'ply': plyNum
				}
			];

			if (key % 2 == 0) {
				labels = _.union(labels, [moveNumber]);
				// evalLabels = _.union(evalLabels, [moveNumber]);

				whiteEval = _.union(whiteEval, eval);
				// whiteEval = _.union(whiteEval, [{'x': moveNumber + 0.5, 'y': move.wv, 'eval': evaluation}]);
				whiteTime = _.union(whiteTime, time);
				whiteSpeed = _.union(whiteSpeed, speed);
				whiteDepth = _.union(whiteDepth, depth);
				whiteTBHits = _.union(whiteTBHits, tbHits);

				evalObject = getLiveEval(key, moveNumber, false);

				if (evalObject != -1) {
					liveEval = _.union(liveEval, evalObject);
				}

			} else {
				// evalLabels = _.union(evalLabels, [moveNumber + 0.5]);

				blackEval = _.union(blackEval, eval);
				// blackEval = _.union(blackEval, [{'x': moveNumber + 0.5, 'y': move.wv, 'eval': evaluation}]);
				blackTime = _.union(blackTime, time);
				blackSpeed = _.union(blackSpeed, speed);
				blackDepth = _.union(blackDepth, depth);
				blackTBHits = _.union(blackTBHits, tbHits);

				// evalObject = getLiveEval(key, moveNumber, true);

				// if (evalObject != -1) {
				// 	liveEval = _.union(liveEval, evalObject);
				// }
			}
		}
	});

	evalChart.data.labels = labels;
	evalChart.data.datasets[0].data = whiteEval;
	evalChart.data.datasets[1].data = blackEval;
	evalChart.data.datasets[2].data = liveEval;

	timeChart.data.labels = labels;
	timeChart.data.datasets[0].data = whiteTime;
	timeChart.data.datasets[1].data = blackTime;

	speedChart.data.labels = labels;
	speedChart.data.datasets[0].data = whiteSpeed;
	speedChart.data.datasets[1].data = blackSpeed;

	depthChart.data.labels = labels;
	depthChart.data.datasets[0].data = whiteDepth;
	depthChart.data.datasets[1].data = blackDepth;

	tbHitsChart.data.labels = labels;
	tbHitsChart.data.datasets[0].data = whiteTBHits;
	tbHitsChart.data.datasets[1].data = blackTBHits;

    evalChart.update();
    timeChart.update();
    speedChart.update();
    depthChart.update();
    tbHitsChart.update();
}

function getLiveEval(key, moveNumber, isBlack)
{
	key++;

	evalObject = _.find(liveEngineEval, function(ev) {
		return ev.ply == key;
	});

	if (_.isObject(evalObject)) {
		eval = evalObject.eval;
		if (!isNaN(evalObject.eval)) {
	        if (evalObject.eval > evalLimit) {
	        	evalObject.eval = evalLimit;
	        } else if (evalObject.eval < -evalLimit) {
	        	evalObject.eval = -evalLimit;
	        }
	    } else {
	    	if (evalObject.eval.substring(0,1) == '-') {
	    		evalObject.eval = -evalLimit;
	    	} else {
	    		evalObject.eval = evalLimit;
	    	}
	    }

	    if (isBlack) {
	    	// moveNumber = moveNumber + 0.5;
	    }

	    return [
				{
					'x': moveNumber,
					'y': evalObject.eval,
					'eval': eval
				}
			];
	}

	return -1;
}
