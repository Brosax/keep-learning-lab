/* Lecture 15, pp. 84–88: repeated attempts and per-task aggregation. */
(() => {
  'use strict';
  const demos = window.COURSE_CODE ||= {};
  demos['cs329z-15'] = {
    name: '同是 50% 成功率，重试能帮多少？',
    instructions: [
      '运行，比较两组任务的单次成功率、至少一次成功率和全部成功率。',
      '试把 k 改为 1 或 4。观察两种指标如何随预算改变。',
      '把“均匀”的两个成功次数改为 [3, 1]，比较任务之间的差异。'
    ],
    expected: '默认 k=2：两组单次成功率都为 0.5。均匀组 pass@2=5/6、pass²=1/6，两极组两者均为 0.5。',
    code: `const trials = 4;
const k = 2;
const groups = [
  {name: '均匀', successes: [2, 2]},
  {name: '两极', successes: [4, 0]}
];

if (!Number.isInteger(k) || k < 1 || k > trials) {
  throw new RangeError('k 必须是 1 到尝试次数之间的整数');
}

// 不放回抽 k 次，每次抽到同一类结果的条件概率依次相乘。
function allMatch(count) {
  if (count < k) return 0;
  let probability = 1;
  for (let i = 0; i < k; i++) {
    probability *= (count - i) / (trials - i);
  }
  return probability;
}

const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

for (const {name, successes} of groups) {
  if (successes.some(count => !Number.isInteger(count) || count < 0 || count > trials)) {
    throw new RangeError('每项成功次数必须是 0 到尝试次数之间的整数');
  }
  console.log({
    name, trials, k,
    passOne: mean(successes.map(count => count / trials)),
    passAtK: mean(successes.map(count => 1 - allMatch(trials - count))),
    passPowerK: mean(successes.map(allMatch))
  });
}`
  };
})();
