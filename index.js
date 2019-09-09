const args = require('args');
const { inspect } = require('util');

const LEFT = -1;
const RIGHT = 1;

function pairOf(dir) {
  switch (dir) {
    case LEFT:
      return RIGHT;
    case RIGHT:
      return LEFT;
    default:
      throw 'Not A Valid Direction';
  }
}

function dumpNodes(nodes) {
  console.log(inspect(nodes, { showHidden: false, depth: null }));
}

args
  .option([ 'c', 'circuits' ], 'The number of circuits the labyrinth is to span', 3)
  .option([ 'a', 'arms' ], 'The number of arms the labyrinth is to have', 2);

const { arms, circuits } = args.parse(process.argv);

const targetMoves = arms * circuits + 2;

console.log({ arms, circuits, targetMoves });

const nArray = [ ...Array(circuits) ];
const entryEdge = { circuit: 0, side: LEFT, followed: false };
const leftEdges = nArray.map((_, i) => ({ circuit: i + 1, side: LEFT, followed: false }));
const rightEdges = nArray.map((_, i) => ({ circuit: circuits - i, side: RIGHT, followed: false }));
const exitEdge = { circuit: circuits + 1, side: RIGHT, followed: false };

const initialNodes = Array.from({ length: arms + 1 }, (_, arm) => ({
  arm,
  edges: [ ...(arm === 0 ? [ entryEdge ] : leftEdges), ...(arm === arms ? [ exitEdge ] : rightEdges) ],
}));

const cloneNodes = nodes => {
  const newNodes = [];
  for (let node of nodes) {
    const { arm, edges } = node;
    const newEdges = edges.map(edge => ({ ...edge }));
    const newNode = { arm, edges: newEdges };
    newNodes.push(newNode);
  }
  return newNodes;
};

let globalPathId = 0;
const candidatePaths = [];
const takenPaths = [];
const forbiddenMoves = [];
const completedPaths = [];

const initialPath = {
  pathId: globalPathId++,
  parentPathId: null,
  arm: -1,
  circuit: 0,
  move: RIGHT,
  taken: [],
  // taken: '',
  nodes: initialNodes,
};
candidatePaths.push(initialPath);

// dumpNodes({ candidatePaths });

while (candidatePaths.length > 0) {
  const path = candidatePaths.pop();
  takenPaths.push(path);
  // console.log('.');

  const { pathId, arm, circuit, move, nodes } = path;
  // const taken = `${path.taken},${move * circuit}`;
  let taken = [ ...path.taken, move * circuit ];

  const nextArm = arm + move;

  if (nextArm === arms + 1) {
    if (taken.length === targetMoves) {
      completedPaths.push(path);
      // console.log(1);
      continue;
    }

    const forbidden = {
      path,
      move,
      reason: 'early completion',
    };
    forbiddenMoves.push(forbidden);
    // console.log(2);
    continue;
  }

  const nextNode = nodes[nextArm];

  if (nextNode === undefined) {
    const forbidden = {
      path,
      move,
      reason: 'no node (arm) in that direction',
    };
    forbiddenMoves.push(forbidden);
    // console.log(3);
    continue;
  }

  const nextEdgeIdx = nextNode.edges.findIndex(
    edge => edge.circuit === circuit && edge.side === pairOf(move) && edge.followed === false,
  );

  if (nextEdgeIdx === -1) {
    const forbidden = {
      path,
      move,
      reason: 'destination edge unavailable',
    };
    forbiddenMoves.push(forbidden);
    // console.log(4);
    continue;
  }

  const newNodes = cloneNodes(nodes);
  newNodes[nextArm].edges[nextEdgeIdx].followed = true;

  const thisArm = nodes[arm];
  if (thisArm !== undefined) {
    const thisEdgeIdx = thisArm.edges.findIndex(edge => edge.circuit === circuit && edge.side === move);
    newNodes[arm].edges[thisEdgeIdx].followed = true;
  }

  for (let { circuit: nextCircuit, side: nextMove } of newNodes[nextArm].edges.filter(edge => !edge.followed)) {
    const nextPath = {
      pathId: globalPathId++,
      parentPathId: pathId,
      move: nextMove,
      arm: nextArm,
      circuit: nextCircuit,
      taken,
      nodes: newNodes,
    };

    candidatePaths.push(nextPath);
    // console.log(5);
  }
}

dumpNodes({
  // candidatePaths,
  // takenPaths,
  // forbiddenMoves: forbiddenMoves.filter(move=>move.reason!=='early completion'),
  completedPaths: completedPaths.map(path => path.taken.join(',')),
});
