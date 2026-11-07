/** Independent numerical checks for CS229's lesson-scoped labs (moved from test-cs229.mjs).
 * Expected values come from fixed textbook examples, never from the implementation under test. */
export default function verify({metrics,logged,outputObjects,check,eq,close,plain,mark,deep}){
 let m;
// 01: an independent population table: 100 diseased / 9,900 healthy.
mark('01');
m=metrics('01');close(m.truePositive,90,1e-10,'01 true positives');close(m.falsePositive,495,1e-10,'01 false positives');close(m.posterior,2/13,1e-12,'01 Bayes posterior');close(logged('01','posterior').posterior,2/13,1e-12,'01 executable Bayes posterior');
close(metrics('01',undefined,10).posterior,2/3,1e-12,'01 posterior responds to a larger base rate');
// 02: residuals [-1,-3,-5] imply grad_w=-13/3, grad_b=-3.
mark('02');
m=metrics('02',3,.1);close(m.w,13/30,1e-12,'02 first simultaneous weight update');close(m.b,.3,1e-12,'02 first simultaneous bias update');close(m.loss,3.387037037037037,1e-12,'02 first-step half mean squared loss');
const regressionLogs=outputObjects('02');const firstRegression=regressionLogs.find(value=>value.step===1);check(firstRegression,'02 prints first update');close(firstRegression.w,13/30,1e-12,'02 executable simultaneous update');check(regressionLogs.find(value=>value.step===20).loss<firstRegression.loss,'02 further fitting lowers loss');
// 03: sigmoid(log 3)=3/4; changing a decision threshold is not retraining.
mark('03');
m=metrics('03');close(m.probability,.75,1e-12,'03 sigmoid probability');close(m.loss,Math.log(4/3),1e-12,'03 Bernoulli log loss');close(m.gradient,-.25,1e-12,'03 logit gradient');eq(m.prediction,1,'03 default threshold predicts positive');
m=metrics('03',undefined,.8);close(m.probability,.75,1e-12,'03 threshold does not change probability');eq(m.prediction,0,'03 higher threshold changes only decision');close(logged('03','probability').probability,.75,1e-12,'03 code probability');
// 04: Poisson natural-parameter gradient e^theta-y is 2-3=-1.
mark('04');
m=metrics('04');close(m.theta,Math.log(2),1e-12,'04 initial natural parameter');close(m.gradient,-1,1e-12,'04 Poisson gradient');close(m.nextTheta,Math.log(2)+.1,1e-12,'04 natural parameter update');close(m.nextMean,2*Math.exp(.1),1e-12,'04 recomputed count mean');close(logged('04','nextMean').nextMean,2*Math.exp(.1),1e-12,'04 code log-link update');
// 05: equal-variance Gaussian log density ratio at x=1.5 is one.
mark('05');
m=metrics('05');close(m.posteriorOne,1/(1+Math.exp(-1)),1e-12,'05 Gaussian class posterior');close(metrics('05',undefined,1).posteriorOne,.5,1e-12,'05 class midpoint posterior');close(logged('05','posteriorOne').posteriorOne,1/(1+Math.exp(-1)),1e-12,'05 code posterior');
// 06: (1*3+2*4)^2=121 and feature products are 9,48,64.
mark('06');
m=metrics('06');close(m.linearDot,11,1e-12,'06 original-space inner product');close(m.kernel,121,1e-10,'06 quadratic kernel');close(m.explicit,121,1e-10,'06 explicit feature inner product');m.contributions.forEach((value,i)=>close(value,[9,48,64][i],1e-10,`06 feature contribution ${i}`));
const kernelLog=logged('06','direct');close(kernelLog.direct,121,1e-10,'06 code direct kernel');close(kernelLog.absoluteError,0,1e-10,'06 code explicit/kernel equivalence');
// 07: points +/-2 are always two units from the boundary x=0; norm cost changes.
mark('07');
m=metrics('07');close(m.functionalMargin,1,1e-12,'07 canonical functional margin');close(m.geometricMargin,2,1e-12,'07 geometric distance');close(m.objective,.125,1e-12,'07 canonical objective');
close(metrics('07',undefined,1).geometricMargin,2,1e-12,'07 geometric distance is scale invariant');close(metrics('07',undefined,.2).hinge,.6,1e-12,'07 correct classification can still violate margin');close(logged('07','bestWeight').bestWeight,.5,1e-10,'07 code finds the minimum-norm separating solution');
// 08: central difference is compared with an independent chain-rule calculation.
mark('08');
const sigmoidValue=1/(1+Math.exp(-.4)),chain=4*(sigmoidValue-1)*sigmoidValue*(1-sigmoidValue);
m=metrics('08');close(m.activation,sigmoidValue,1e-12,'08 activation');close(m.loss,(sigmoidValue-1)**2,1e-12,'08 unscaled square loss');close(m.analytic,chain,1e-12,'08 chain rule');close(m.numeric,chain,1e-8,'08 independent central difference');close(logged('08','analytic').analytic,chain,1e-12,'08 executable chain rule');
// 09: splitting 3/3 produces two 2:1 nodes; a 2/4 split gives gain 1/4.
mark('09');
m=metrics('09');close(m.parentGini,.5,1e-12,'09 balanced parent Gini');close(m.weightedGini,4/9,1e-12,'09 weighted child Gini');close(m.gain,1/18,1e-12,'09 default Gini improvement');eq(m.bestSplit,2,'09 ties choose the leftmost optimum');
close(metrics('09',undefined,2).gain,.25,1e-12,'09 best split gain');close(metrics('09',undefined,4).gain,.25,1e-12,'09 symmetric optimum has equal gain');close(logged('09','selected').selected.gain,1/18,1e-12,'09 executable default split');
// 10: the ridge stationary condition is (1+lambda)w=2.
mark('10');
m=metrics('10');close(m.weight,1,1e-12,'10 ridge optimum');close(m.dataLoss,.5,1e-12,'10 fit cost at optimum');close(m.penalty,.5,1e-12,'10 regularizer cost');close(m.total,1,1e-12,'10 total objective');
close(metrics('10',undefined,0).weight,2,1e-12,'10 unregularized optimum');close(metrics('10',undefined,4).weight,.4,1e-12,'10 larger penalty shrinks weight');close(logged('10','gradient').gradient,0,1e-12,'10 executable stationary point');
// 11: 2H exp(-2m epsilon^2) <= delta first holds at m=415.
mark('11');
m=metrics('11');eq(m.required,415,'11 sample bound rounds upward');close(m.unionBound,200*Math.exp(-8.3),1e-12,'11 union bound includes hypothesis count');check(metrics('11',undefined,414).unionBound>.05,'11 414 samples do not meet the guarantee');check(m.unionBound<=.05,'11 415 samples meet the guarantee');
eq(logged('11','required').required,415,'11 executable sample complexity');const boundLogs=outputObjects('11').filter(value=>Object.hasOwn(value,'failureBound'));eq(boundLogs.length,2,'11 prints both sides of the integer boundary');check(boundLogs[0].failureBound>.05&&boundLogs[1].failureBound<=.05,'11 executable bound brackets target');
// 12: at the second point, zero margin must trigger an update.
mark('12');
m=metrics('12');eq(m.secondScore,0,'12 second point lies on current boundary');eq(m.updatedSecond,1,'12 zero margin updates');deep(m.weights,[3,-1],'12 two updates give exact weights');close(m.positiveMargin,5,1e-12,'12 retained first-point margin');close(m.negativeMargin,5,1e-12,'12 corrected second-point margin');
const noUpdate=metrics('12',undefined,4);eq(noUpdate.updatedSecond,0,'12 positive signed margin skips update');deep(noUpdate.weights,[4,1],'12 skipped update preserves weights');deep(logged('12','finalWeights').finalWeights,[3,-1],'12 executable update trace');
// 13: centroid means 1 and 9 reduce four squared errors from 8 to 4.
mark('13');
m=metrics('13');deep(m.centers,[1,9],'13 final centers are cluster means');deep(m.labels,[0,0,1,1],'13 final partition');close(metrics('13',0).sse,8,1e-12,'13 initial assignment objective');close(m.sse,4,1e-12,'13 minimized within-cluster SSE');
const kmeansLogs=outputObjects('13').filter(value=>Object.hasOwn(value,'sse'));check(kmeansLogs.length>=2,'13 code shows alternating phases');kmeansLogs.slice(1).forEach((value,index)=>check(value.sse<=kmeansLogs[index].sse+1e-12,'13 assignment and mean updates never increase SSE'));close(kmeansLogs.at(-1).sse,4,1e-12,'13 executable converged SSE');
// 14: the middle point's log odds are 3/2; endpoints have log odds +/-9/2.
mark('14');
m=metrics('14');const leftResponsibility=1/(1+Math.exp(-4.5)),middleResponsibility=1/(1+Math.exp(-1.5));
close(m.responsibilities[0][0],leftResponsibility,1e-12,'14 left-point responsibility');close(m.responsibilities[1][0],middleResponsibility,1e-12,'14 middle-point responsibility');close(m.responsibilities[2][0],1-leftResponsibility,1e-12,'14 right-point responsibility');
m.responsibilities.forEach((row,index)=>close(row[0]+row[1],1,1e-12,`14 responsibilities normalize for point ${index}`));close(m.weights[0]+m.weights[1],1,1e-12,'14 mixture weights normalize');close(m.weights[0]*m.means[0]+m.weights[1]*m.means[1],1/3,1e-12,'14 updated mixture preserves empirical mean');
close(m.means[0],-.532049269383,1e-10,'14 first weighted mean');close(m.means[1],1.66356284815,1e-10,'14 second weighted mean');close(m.variances[0],.285241870249,1e-10,'14 variance centers on updated first mean');close(m.variances[1],.587559952442,1e-10,'14 variance centers on updated second mean');close(m.logLikelihoodBefore,-5.112748373614,1e-10,'14 initial observed likelihood');close(m.logLikelihoodAfter,-4.07626334746,1e-10,'14 complete M-step observed likelihood');check(m.improvement>1,'14 complete EM improves likelihood');
const emCode=logged('14','responsibilities');close(emCode.responsibilities[1][0],middleResponsibility,1e-12,'14 executable responsibilities');close(emCode.after,-4.07626334746,1e-10,'14 executable complete M-step');
// 15: Lambda=(2,1), Psi=diag(1,4) gives posterior precision 21/4.
mark('15');
m=metrics('15');deep(m.covariance,[[5,2],[2,5]],'15 correlated observations from diagonal noise plus rank-one factor');close(m.posteriorMean,17/21,1e-12,'15 latent posterior mean');close(m.posteriorVariance,4/21,1e-12,'15 latent posterior uncertainty');close(metrics('15',undefined,9).posteriorMean,25/61,1e-12,'15 noisier first coordinate receives less weight');close(metrics('15',undefined,9).posteriorVariance,36/61,1e-12,'15 noisier measurement increases uncertainty');close(logged('15','posteriorPrecision').posteriorPrecision,21/4,1e-12,'15 executable posterior precision');
// 16: diagonal covariance diag(2,1/2) has total variance 5/2.
mark('16');
m=metrics('16');close(m.projectedVariance,2,1e-12,'16 principal-axis variance');close(m.reconstructionMSE,.5,1e-12,'16 rank-one reconstruction error');close(m.retainedFraction,.8,1e-12,'16 explained-variance fraction');const orthogonal=metrics('16',undefined,90);close(orthogonal.projectedVariance,.5,1e-12,'16 orthogonal direction variance');close(orthogonal.reconstructionMSE,2,1e-12,'16 orthogonal reconstruction error');close(logged('16','projectedVariance').projectedVariance,2,1e-12,'16 executable PCA geometry');
// 17: a 45-degree rotation has zero covariance but never both coordinates nonzero.
mark('17');
m=metrics('17');close(m.varianceU,1,1e-12,'17 whitened first variance');close(m.varianceV,1,1e-12,'17 whitened second variance');close(m.covariance,0,1e-12,'17 whitened covariance');close(m.fourthCrossMoment,0,1e-12,'17 higher-order dependence is visible');close(m.kurtosisU,-1,1e-12,'17 mixed-signal excess kurtosis');close(m.contrast,2,1e-12,'17 mixed-signal kurtosis contrast');
const independent=metrics('17',undefined,0);close(independent.fourthCrossMoment,1,1e-12,'17 original independent coordinates factorize fourth moment');close(independent.contrast,4,1e-12,'17 independent directions maximize this contrast');close(logged('17','fourthCrossMoment').fourthCrossMoment,0,1e-12,'17 executable non-independence witness');
// 18: Bellman updates are synchronous; A does not see B's new value immediately.
mark('18');
m=metrics('18',2);close(m.currentA,2.5,1e-12,'18 first synchronous A update');close(m.currentB,2,1e-12,'18 first synchronous B update');m=metrics('18',3);close(m.currentA,2.5,1e-12,'18 second update uses old B');close(m.currentB,3,1e-12,'18 second B update');m=metrics('18');close(m.fixedA,3,1e-12,'18 optimal A value');close(m.fixedB,4,1e-12,'18 geometric-series B value');close(metrics('18',undefined,.2).fixedA,2.5,1e-12,'18 smaller discount switches to immediate reward');close(logged('18','fixedA').A,3,1e-8,'18 executable Bellman iteration converges');
// 19: distinguish max backup, sampled-action backup, and terminal reward.
mark('19');
m=metrics('19');close(m.target,4.6,1e-12,'19 Q-learning target');close(m.tdError,2.6,1e-12,'19 temporal difference');close(m.qNew,3.3,1e-12,'19 half-step Q update');close(m.sarsaTarget,3.7,1e-12,'19 SARSA follows selected action');close(m.sarsaNew,2.85,1e-12,'19 SARSA update');close(m.terminalNew,1.5,1e-12,'19 terminal state suppresses bootstrap');close(metrics('19',undefined,0).qNew,2,1e-12,'19 zero learning rate preserves value');close(metrics('19',undefined,1).qNew,4.6,1e-12,'19 full learning rate reaches target');close(logged('19','qNew').qNew,3.3,1e-12,'19 executable off-policy update');
// 20: enumerate the four state paths independently: .021, .054, .0016, .0144.
mark('20');
m=metrics('20');close(m.alpha10,.3,1e-12,'20 first forward component');close(m.alpha11,.04,1e-12,'20 second forward component');close(m.alpha20,.0226,1e-12,'20 summed paths ending in state zero');close(m.alpha21,.0684,1e-12,'20 summed paths ending in state one');close(m.sequenceProbability,.021+.054+.0016+.0144,1e-12,'20 forward probability sums all paths');close(m.viterbiProbability,.054,1e-12,'20 Viterbi selects one best path');eq(m.bestStart,0,'20 best path begins in zero');eq(m.bestEnd,1,'20 best path ends in one');check(m.sequenceProbability>m.viterbiProbability,'20 sum and max produce different quantities');eq(metrics('20',undefined,.9).bestEnd,0,'20 changing transition probability changes best path');close(logged('20','sequenceProbability').sequenceProbability,.091,1e-12,'20 executable forward recursion');close(logged('20','viterbi').viterbi.probability,.054,1e-12,'20 executable Viterbi enumeration');
// 21: conditioning a joint Gaussian uses a Schur complement, then adds new noise.
mark('21');
m=metrics('21');close(m.posteriorMean,.64,1e-12,'21 GP conditional mean');close(m.latentVariance,.488,1e-12,'21 latent-function uncertainty');close(m.observationVariance,.738,1e-12,'21 new observation includes noise');close(m.observationVariance-m.latentVariance,.25,1e-12,'21 variance difference equals noise variance');const noisyGP=metrics('21',undefined,1);close(noisyGP.posteriorMean,.4,1e-12,'21 noisier observation shrinks conditional mean');close(noisyGP.latentVariance,.68,1e-12,'21 noisier observation increases latent uncertainty');close(logged('21','observationVariance').observationVariance,.738,1e-12,'21 executable predictive variance');
// 22: rare-event evaluation must distinguish accuracy, precision, recall and cost.
mark('22');
m=metrics('22');for(const [key,value] of Object.entries({TP:8,FN:2,FP:4,TN:86,accuracy:.94,precision:2/3,recall:.8,cost:14}))close(m[key],value,1e-12,`22 default ${key}`);
const strictThreshold=metrics('22',undefined,.9);eq(strictThreshold.TP,2,'22 threshold equality counts positive');eq(strictThreshold.FP,1,'22 stricter threshold removes false positives');eq(strictThreshold.cost,41,'22 strict threshold increases asymmetric cost despite fewer false positives');close(logged('22','precision').precision,2/3,1e-12,'22 executable precision');eq(logged('22','cost').cost,14,'22 executable error cost');
}
