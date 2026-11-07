/** Independent numerical checks for CS230's lecture-aligned modules.
 * 03 code (C1M3 p.28 backprop + C2M1 p.38 gradient check), 04 visual + code (C2M2 p.19–25),
 * 05 visual (C2M1 p.31), 08 visual (C3M1 p.30), 10 code (C4M1 slide numbers), 12 code (C5M4 p.7).
 * Expected values are slide numbers, closed forms, or were computed separately in Python — not by re-running the lab code. */
export default function verify({metrics,logged,check,eq,close,deep,mark}){
 const near=(a,b,message,tolerance=1e-10)=>close(a,b,tolerance,message);
 let m;

 // 03. X=[[1,2,-1],[.5,-1,2]], Y=[1,0,1], tanh hidden (3 units), sigmoid output; reference values from a per-example Python loop.
 mark('03');m=logged('03','cost');
 near(m.cost,0.696640175940341,'03 cross-entropy cost of the supplementary network',1e-12);
 [0.11957260345067344,-0.10269531143055327,-0.1126260716884292].forEach((v,i)=>near(m.dW2[i],v,`03 dW2[${i}] = (1/m) dZ2 A1ᵀ`,1e-12));
 near(m.db2,-0.2513715706951127,'03 db2 = mean of A2 − Y',1e-12);
 [[0.03622977062698281,-0.13788592599293123],[-0.10537780237011088,0.26981933439110284],[-0.006716046306283641,-0.1464555611618228]].forEach((row,i)=>row.forEach((v,j)=>near(m.dW1[i][j],v,`03 dW1[${i}][${j}] includes g′(Z1) = 1 − A1²`,1e-12)));
 m=logged('03','relativeDifference');
 eq(m.bug,'none','03 default run is the correct implementation');
 check(m.relativeDifference<1e-7,`03 correct backprop passes the 1e−7 grad check (got ${m.relativeDifference})`);
 check(m.relativeDifference>0,'03 finite differences are not bit-identical to the analytic gradient');

 // 04 visual. J = ½(w₁² + 20w₂²) from (−4, 1). Plain GD is closed form: w₁ = −4(1−α)^t, w₂ = (1−20α)^t.
 mark('04');m=metrics('04');
 near(m.alpha,.08,'04 default learning rate');near(m.stabilityLimit,.1,'04 GD is stable only for α < 2/20');
 near(m.gdJ,.5*(16*.92**80+20*(-.6)**80),'04 GD cost after 40 steps (closed form)',1e-12);
 eq(m.gdDiverged,false,'04 α = 0.08 converges for plain GD');
 near(m.momJ,0.17266474847788177,'04 momentum (β = 0.9) cost after 40 steps (Python reference)',1e-10);
 check(m.gdJ<m.momJ,'04 at small α plain GD is ahead of momentum after 40 steps (warm-up)');
 const slow=metrics('04',undefined,.02);near(slow.gdJ,.5*(16*.98**80+20*.6**80),'04 α = 0.02 GD closed form',1e-12);near(slow.momJ,1.9277747281644941,'04 α = 0.02 momentum',1e-10);
 const fast=metrics('04',undefined,.3);
 eq(fast.gdDiverged,true,'04 α = 0.3 makes GD diverge (vertical factor −5)');eq(fast.gdDivergedAt,5,'04 |w₂| = 5^t first exceeds 1000 at t = 5');
 eq(fast.momDiverged,false,'04 momentum stays bounded at α = 0.3');near(fast.momJ,0.11276010496478416,'04 α = 0.3 momentum cost',1e-10);

 // 04 code. Adam's first corrected step is α·sign(g); without correction it is α·0.1/√0.001 ≈ 3.162α.
 m=logged('04','adamFirstStep');
 deep(m.firstGradient,[-4,20],'04 gradient at the start');
 near(m.adamFirstStep[0],.1,'04 Adam first step moves w₁ by α',1e-8);near(m.adamFirstStep[1],-.1,'04 Adam first step moves w₂ by −α',1e-8);
 near(m.uncorrectedFirstStep[0],.1*.1/Math.sqrt(.001),'04 uncorrected first step ≈ 3.16α',1e-7);
 m=logged('04','finalCost').finalCost;
 near(m.gd,10+8*.9**80,'04 GD at α = 0.1 oscillates with |w₂| = 1 (closed form)',1e-12);
 near(m.momentum,0.2853701454602695,'04 momentum final cost',1e-10);
 near(m.adam,0.3131705401458402,'04 Adam final cost',1e-10);
 near(m.adamNoCorrection,0.005637457173138757,'04 Adam without bias correction',1e-10);
 check(m.rmsprop>=0&&m.rmsprop<1e-30,'04 RMSprop reaches the minimum on this bowl');

 // 05. W[l] = w·I, x = (1,1): a[149] = w^149, gradient to layer 1 ∝ w^148.
 mark('05');m=metrics('05');
 near(m.w,1.5,'05 default is the slide example 1.5');eq(m.layers,149,'05 L − 1 = 149 hidden layers');
 near(m.log10Final,149*Math.log10(1.5),'05 log10 of 1.5^149',1e-10);near(m.log10GradientToFirst,148*Math.log10(1.5),'05 log10 of 1.5^148',1e-10);
 near(m.safeLow,0.9846652027941233,'05 lower gain for ≤ 10× change over 149 layers',1e-12);near(m.safeHigh,1.0155736154404178,'05 upper gain',1e-12);
 eq(m.withinTenfold,false,'05 w = 1.5 explodes');
 const vanish=metrics('05',undefined,.5);near(vanish.log10Final,-44.8534693539332,'05 0.5^149 vanishes',1e-10);check(vanish.finalActivation>0,'05 vanishing value stays representable');
 const unit=metrics('05',undefined,1);near(unit.log10Final,0,'05 identity weights keep the scale');eq(unit.withinTenfold,true,'05 w = 1 is stable');

 // 08. C3M1 p.30: train 8 %, dev 10 %; scenario A (human 1 %) vs B (human 7.5 %).
 mark('08');m=metrics('08');
 near(m.avoidableBias,7,'08 scenario A avoidable bias');near(m.variance,2,'08 scenario A variance');eq(m.focus,'bias','08 scenario A: focus on bias');
 const b=metrics('08',undefined,7.5);near(b.avoidableBias,.5,'08 scenario B avoidable bias');eq(b.focus,'variance','08 scenario B: focus on variance');
 eq(metrics('08',undefined,6).focus,'tie','08 the conclusion flips at human-level 6 %');

 // 10. C4M1 slide numbers (p.17 recomputed: the handwritten 83 and 127 are 88 and 117).
 mark('10');m=logged('10','edge');
 deep(m.edge,[[-5,-4,0,8],[-10,-2,2,3],[0,-2,-4,-7],[-3,-2,-3,-16]],'10 p.7 vertical edge output');
 deep(m.edgeOnStep,[[0,30,30,0],[0,30,30,0],[0,30,30,0],[0,30,30,0]],'10 p.8 bright-to-dark edge');
 eq(m.sameSize,6,'10 p = 1 keeps a 6×6 output (same convolution)');
 deep(m.strided,[[91,100,88],[69,91,117],[44,72,74]],'10 p.17 stride-2 output');
 m=logged('10','maxPool');deep(m.maxPool,[[9,9,5],[9,9,5],[8,6,9]],'10 p.33 max pooling f=3 s=1');deep(m.avgPool,[[3.75,1.25],[4,2]],'10 p.34 average pooling');
 m=logged('10','flatten');eq(m.flatten,1960,'10 p.29 flatten 7×7×40');eq(m.tenFilters3x3x3,280,'10 p.26 parameters');eq(m.fullyConnected,14450688,'10 p.40 fully connected weights');eq(m.convSixFilters5x5x3,456,'10 p.40 conv parameters with 3 input channels');

 // 12. Query l'Afrique: raw scores [0,3,1,1,1]; scaled by √4 → softmax([0,1.5,.5,.5,.5]).
 mark('12');m=logged('12','weights');
 deep(m.rawScores,[0,3,1,1,1],'12 q<3>·k<i>');eq(m.mostAttended,'visite','12 largest weight on visite (q<3>·k<2>)');
 [0.09589701842496266,0.4297806193531632,0.15810745407395804,0.15810745407395804,0.15810745407395804].forEach((v,i)=>near(m.weights[i],v,`12 scaled weight ${i}`,1e-12));
 near(m.output[0],0.5702193806468367,'12 A<3> first value',1e-12);near(m.output[1],0.9041029815750373,'12 A<3> second value',1e-12);
 near(logged('12','weightsUnscaled').weightsUnscaled[1],0.6869108838092491,'12 without √d_k the softmax is sharper',1e-12);
 logged('12','rowSums').rowSums.forEach((s,i)=>near(s,1,`12 row ${i} weights sum to one`,1e-12));
}
