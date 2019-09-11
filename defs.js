const { inspect } = require('util');

const LEFT = -1;
const RIGHT = 1;

function dumpNodes(nodes) {
  console.log(inspect(nodes, { showHidden: false, depth: null }));
}

const pathsCross = (path1, path2) => {
  const { arm: arm1, lo: lo1, hi: hi1 } = path1;
  const { arm: arm2, lo: lo2, hi: hi2 } = path2;

  if (arm1 !== arm2) {
    return false;
  }

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

module.exports = { LEFT, RIGHT, dumpNodes, pathsCross, cloneNodes, pairOf };
