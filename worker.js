var workerpool = require('workerpool');

const { cloneNodes, pairOf, pathsCross } = require('./defs');

function evaluatePath(path, arms, targetMoves) {
  const { arm: oldArm, circuit, move, nodes, crossings } = path;
  let taken = [ ...path.taken, move * circuit ];

  // console.log({ oldArm, circuit, move, nodes, crossings });

  // #region compute new location
  const currentArm = oldArm + move;

  if (currentArm === arms + 1) {
    if (taken.length === targetMoves) {
      return {completed:path, continuing:[]};
    }

    // console.log('early completion');
    return {continuing:[]};
  }

  let currentNode = nodes[currentArm];
  // #endregion

  // #region check for invalid source for last move
  const arrivalEdgeDestIdx = currentNode.edges.findIndex(
    edge => edge.circuit === circuit && edge.side === pairOf(move) && edge.followed === false,
  );
  if (arrivalEdgeDestIdx === -1) {
    // console.log('arrival edge unavailable');
    return {continuing:[]};
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
  const nextMoves = [];
  departureEdges.forEach((departureEdge, departureEdgeSrcIdx) => {
    const { circuit: nextCircuit, side: nextMove, followed } = departureEdge;
    if (followed) {
      return {continuing:[]};
    }

    // #region check crossings rule
    const newCrossing = {
      arm: currentArm,
      lo: Math.min(arrivalEdgeDestIdx, departureEdgeSrcIdx),
      hi: Math.max(arrivalEdgeDestIdx, departureEdgeSrcIdx),
    };

    for (oldCrossing of crossings) {
      if (pathsCross(oldCrossing, newCrossing)) {
        return {continuing:[]};
      }
    }
    // #endregion

    const nextPath = {
      move: nextMove,
      arm: currentArm,
      circuit: nextCircuit,
      taken,
      nodes: newNodes,
      crossings: [ ...crossings, newCrossing ],
    };

    nextMoves.push(nextPath);
  });

  return { continuing: nextMoves };
}

workerpool.worker({ evaluatePath });
