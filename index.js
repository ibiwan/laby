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

const pathsCross = (path1, path2) => {
  const { arm:arm1, lo: lo1, hi: hi1 } = path1;
  const { arm:arm2, lo: lo2, hi: hi2 } = path2;

  if(arm1 !== arm2){
    return false;
  };

  if (lo1 === lo2 || lo1 === hi2 || hi1 === lo2 || hi1 === hi2) {
    return true;
  }
  const lo2between = lo1 < lo2 && lo2 < hi1;
  const hi2between = lo1 < hi2 && hi2 < hi1;
  if (lo2between !== hi2between) {
    return true;
  }

  return false;
};

const cloneNodes = nodes => {
  return nodes.map(({ arm, edges }) => ({ arm, edges: edges.map(edge => ({ ...edge })) }));
};

let globalPathId = 0;
const candidatePaths = [];
// const takenPaths = [];
// const forbiddenMoves = [];
const completedPaths = [];

const initialPath = {
  pathId: globalPathId++,
  parentPathId: null,
  arm: -1,
  circuit: 0,
  move: RIGHT,
  taken: [],
  nodes: initialNodes,
  crossings: [],
};
candidatePaths.push(initialPath);

while (candidatePaths.length > 0) {
  // #region extract move info from queue
  const path = candidatePaths.pop();
  // takenPaths.push(path);

  const { pathId, arm: oldArm, circuit, move, nodes, crossings } = path;
  let taken = [ ...path.taken, move * circuit ];

  // console.log({ oldArm, circuit, move, taken: taken.join(',') });
  // #endregion

  // #region compute new location
  const currentArm = oldArm + move;

  if (currentArm === arms + 1) {
    if (taken.length === targetMoves) {
      completedPaths.push(path);
      continue;
    }

    const forbidden = {
      path,
      move,
      reason: 'early completion',
    };
    // forbiddenMoves.push(forbidden);
    continue;
  }

  let currentNode = nodes[currentArm];
  // #endregion

  // #region check for invalid source for last move
  const arrivalEdgeDestIdx = currentNode.edges.findIndex(
    edge => edge.circuit === circuit && edge.side === pairOf(move) && edge.followed === false,
  );
  if (arrivalEdgeDestIdx === -1) {
    const forbidden = {
      path,
      move,
      reason: 'arrival edge unavailable',
    };
    // forbiddenMoves.push(forbidden);
    continue;
  }
  // #endregion

  // #region update nodes to indicate paths followed
  const newNodes = cloneNodes(nodes);
  currentNode = newNodes[currentArm]; // update currentNode reference too

  currentNode.edges[arrivalEdgeDestIdx].followed = true;

  const oldNode = nodes[oldArm];
  if (oldNode !== undefined) {
    const arrivalEdgeSourceIdx = oldNode.edges.findIndex(edge => edge.circuit === circuit && edge.side === move);
    newNodes[oldArm].edges[arrivalEdgeSourceIdx].followed = true;
  }
  // #endregion

  // #region generate possible next moves
  const departureEdges = currentNode.edges;
  departureEdges.forEach((departureEdge, departureEdgeSrcIdx) => {
    const { circuit: nextCircuit, side: nextMove, followed } = departureEdge;
    if (followed) {
      return;
    }

    // #region check crossings rule
    const newCrossing = {
      arm: currentArm,
      lo: Math.min(arrivalEdgeDestIdx, departureEdgeSrcIdx),
      hi: Math.max(arrivalEdgeDestIdx, departureEdgeSrcIdx),
    };

    for (oldCrossing of crossings) {
      if (pathsCross(oldCrossing, newCrossing)) {
        return;
      }
    }
    // #endregion

    const nextPath = {
      pathId: globalPathId++,
      parentPathId: pathId,
      move: nextMove,
      arm: currentArm,
      circuit: nextCircuit,
      taken,
      nodes: newNodes,
      crossings: [...crossings, newCrossing],
    };
    // console.log({nextCircuit, nextMove})
    candidatePaths.push(nextPath);
  });
  // #endregion
}

dumpNodes({
  // candidatePaths,
  // takenPaths,
  // forbiddenMoves: forbiddenMoves.filter(move=>move.reason!=='early completion'),
  completedPaths: completedPaths.map(path => path.taken.join(',')),
  count: completedPaths.length,
});
