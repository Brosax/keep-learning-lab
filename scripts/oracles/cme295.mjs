/** Independent numerical checks for CME295's lecture-aligned modules (02 visual, 04 visual, 05 code).
 * Expected values are derived by hand / separately in Python, not by re-running the lab code. */
export default function verify({metrics,logged,check,eq,close,deep,mark}){
 const near=(a,b,message,tolerance=1e-10)=>close(a,b,tolerance,message);
 let m;
 // 02. Lecture 2 (2026) p.107–114: temperature, then top-p (p = 0.8) as the smallest prefix reaching the threshold.
 mark('02');m=metrics('02');
 m.distribution.forEach((v,i)=>near(v,[.6,.25,.1,.05][i],`02 temperature-one probability ${i}`));
 deep(m.topPIndices,[0,1],'02 top-p keeps the token that crosses the threshold');
 near(m.retainedMass,.85,'02 retained mass may exceed p');
 m.topPDistribution.forEach((v,i)=>near(v,[12/17,5/17,0,0][i],`02 renormalized top-p probability ${i}`));
 m.topKDistribution.forEach((v,i)=>near(v,[12/17,5/17,0,0][i],`02 top-k=2 coincides with top-p at T=1 ${i}`));
 // T = 0.5 squares the probabilities: .36/.435 = 24/29.
 const cold=metrics('02',undefined,.5);near(cold.distribution[0],24/29,'02 half temperature squares unnormalized probabilities');deep(cold.topPIndices,[0],'02 sharp distribution keeps one token');
 // T = 2 takes square roots: sqrt(.6)+sqrt(.25) < .8·Σ sqrt(p), so a third token is needed.
 const warm=metrics('02',undefined,2),roots=[.6,.25,.1,.05].map(Math.sqrt),rootSum=roots.reduce((a,b)=>a+b,0);
 deep(warm.topPIndices,[0,1,2],'02 flatter distribution keeps three tokens');near(warm.distribution[0],roots[0]/rootSum,'02 temperature-two first probability');
 near(warm.topKDistribution[0],roots[0]/(roots[0]+roots[1]),'02 top-k still keeps exactly two tokens');
 // 04. Lecture 4 (2026) p.34–36: g = (R − b)·∇log π with ∇log π(good)=+.5, ∇log π(bad)=−.5.
 mark('04');m=metrics('04');
 near(m.gGood,50.5,'04 no-baseline good gradient (slide value)');near(m.gBad,-50,'04 no-baseline bad gradient (slide value)');
 near(m.mean,.25,'04 expected gradient without baseline');near(m.variance,50.25**2,'04 variance without baseline');
 const slide=metrics('04',undefined,100.5);
 near(slide.goodMinusBaseline,.5,'04 R(good) − b on slide p.35');near(slide.badMinusBaseline,-.5,'04 R(bad) − b on slide p.35');
 near(slide.gGood,.25,'04 baseline good gradient (slide value)');near(slide.gBad,.25,'04 baseline bad gradient (slide value)');
 near(slide.mean,.25,'04 baseline keeps the expected gradient');near(slide.variance,0,'04 baseline 100.5 removes the variance');
 const atHundred=metrics('04',undefined,100);near(atHundred.gBad,0,'04 bad sample has no gradient at b = R(bad)');near(atHundred.variance,.0625,'04 variance at b = 100');
 const atMax=metrics('04',undefined,101);near(atMax.gGood,0,'04 good sample has no gradient at b = R(good)');near(atMax.gBad,.5,'04 bad gradient changes sign past b = 100');near(atMax.mean,.25,'04 expectation is independent of b');
 eq(m.sameSign,false,'04 without baseline the two samples push θ in opposite directions');eq(slide.sameSign,true,'04 with baseline 100.5 both samples push θ the same way');
 // 05. Lecture 5 (2026) p.30–47: online softmax with running max. Reference values computed separately:
 // (10e^{-2} + 20 + 30e^{-1}) / (e^{-2} + 1 + e^{-1}) = 21.54697897884417.
 mark('05');m=logged('05','online');
 near(m.online,21.54697897884417,'05 online softmax output equals the max-shifted reference',1e-9);
 eq(m.naiveOverflow,true,'05 e^{1001} overflows double precision');
 eq(m.trace.length,3,'05 one update per score');
 deep(m.trace.map(row=>row.m),[1001,1003,1003],'05 running maximum');
 deep(m.trace.map(row=>row.alpha),[0,.1353,1],'05 rescaling factor α_t = e^{m_t − m_{t+1}}');
 deep(m.trace.map(row=>row.N),[10,21.3534,32.3897],'05 running numerator');
 deep(m.trace.map(row=>row.D),[1,1.1353,1.5032],'05 running denominator');
 check(Math.abs(m.trace[2].N/m.trace[2].D-21.54697897884417)<1e-3,'05 final N/D matches the rounded trace');
}
