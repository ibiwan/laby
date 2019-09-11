var workerpool = require('workerpool');

var pool = workerpool.pool(__dirname + '/worker.js');

const args = require('args');

const { LEFT, RIGHT, dumpNodes } = require('./defs');

args
  .option([ 'c', 'circuits' ], 'The number of circuits the labyrinth is to span', 3)
  .option([ 'a', 'arms' ], 'The number of arms the labyrinth is to have', 2);

const { arms, circuits } = args.parse(process.argv);

const targetMoves = arms * circuits + 2;

console.log({ arms, circuits, targetMoves });

const nArray = [ ...Array(circuits) ];
const templateEdge = {
  circuit: null,
  side: null,
  followed: false,
};
const entryEdge = {
  ...templateEdge,
  circuit: 0,
  side: LEFT,
};
const leftEdges = nArray.map((_, i) => ({
  ...templateEdge,
  circuit: i + 1,
  side: LEFT,
}));
const rightEdges = nArray.map((_, i) => ({
  ...templateEdge,
  circuit: circuits - i,
  side: RIGHT,
}));
const exitEdge = {
  ...templateEdge,
  circuit: circuits + 1,
  side: RIGHT,
};

const initialNodes = Array.from({ length: arms + 1 }, (_, arm) => {
  const left = arm === 0 ? [ entryEdge ] : leftEdges;
  const right = arm === arms ? [ exitEdge ] : rightEdges;
  return {
    arm,
    crossings: [],
    edges: [ ...left, ...right ],
  };
});

const candidatePaths = [];
const completedPaths = [];

const initialPath = {
  arm: -1,
  circuit: 0,
  move: RIGHT,
  taken: [],
  nodes: initialNodes,
  crossings: [],
};
candidatePaths.push(initialPath);

function driver() {
  if (candidatePaths.length > 0) {
    // console.log(pool.stats());

    const path = candidatePaths.pop();

    pool
      .proxy()
      .then(worker => worker.evaluatePath(path, arms, targetMoves))
      .then(function({completed, continuing}) {
        for (nextPath of continuing) {
          candidatePaths.push(nextPath);
        }
        if(completed){
          completedPaths.push(completed);
        }
      })
      .catch(function(err) {
        console.error(err);
      });

    setTimeout(driver, 1);
  } else {
    const { busyWorkers, pendingTasks } = pool.stats();
    if (busyWorkers > 0 || pendingTasks > 0) {
      setTimeout(driver, 1);
    } else {
      dumpNodes({
        completedPaths: completedPaths.map(path => path.taken.join(',')),
        count: completedPaths.length,
      });

      pool.terminate();
    }
  }
}

driver();

