/** Independent numerical checks for CS229's lecture-aligned modules:
 * 02 visual (notes1 batch LMS), 06 code (main_notes §5.3 kernel LMS), 07 visual (notes3 margins), 12 code (notes6 perceptron bound),
 * 13 code (notes7a k-means), 14 visual (notes7b/8 EM), 16 visual (notes10 PCA), 18 code (notes12 value/policy iteration).
 * Expected values are derived by hand or separately in NumPy, never by re-running the lab code. */
export default function verify({metrics,logged,outputObjects,check,eq,close,deep,mark}){
 let m;

 // 02. cs229-notes1 p.4–11: batch LMS on the five Portland rows (x in 1000 ft², y in $1000).
 // Reference values computed separately in NumPy via θ_k = θ* + (I − αXᵀX)^k (θ₀ − θ*), not by the lab loop:
 // XᵀX = [[5, 10.52], [10.52, 23.751872]], Xᵀy = [1871, 4203.712], θ* = (26.78988053, 165.11887808), J* = 3124.46216868.
 mark('02');m=metrics('02');
 close(m.thetaStar[0],26.78988053,1e-6,'02 normal-equation intercept');close(m.thetaStar[1],165.11887808,1e-6,'02 normal-equation slope');
 close(m.jStar,3124.46216868,1e-6,'02 least-squares cost at θ*');
 close(m.lambdaMax,28.46772708,1e-6,'02 largest eigenvalue of XᵀX');close(m.lambdaMin,0.28414492,1e-6,'02 smallest eigenvalue of XᵀX');
 // α = 0.03: first step = α·Xᵀy = (56.13, 126.11136); within 0.1% of J* first at k = 260.
 close(m.first[0],56.13,1e-9,'02 first batch step θ₀');close(m.first[1],126.11136,1e-9,'02 first batch step θ₁');
 eq(m.diverged,false,'02 α = 0.03 converges');eq(m.firstNear,260,'02 α = 0.03 reaches 0.1% of J* at step 260');eq(m.zigzag,false,'02 α < 1/λ_max does not zig-zag');
 close(m.last[0],26.7974095,1e-6,'02 θ₀ after 1000 steps');close(m.last[1],165.11550302,1e-6,'02 θ₁ after 1000 steps');
 m=metrics('02',undefined,.005);eq(m.firstNear,-1,'02 α = 0.005 is still outside 0.1% after 1000 steps');close(m.last[0],36.27909663,1e-6,'02 slow θ₀ after 1000 steps');close(m.lastCost,3139.82586574,1e-6,'02 slow cost after 1000 steps');
 m=metrics('02',undefined,.07);eq(m.zigzag,true,'02 α > 1/λ_max overshoots the valley');eq(m.firstNear,803,'02 α = 0.07 converges slowly while oscillating');close(m.first[1],294.25984,1e-9,'02 α = 0.07 first step overshoots');
 m=metrics('02',undefined,.075);eq(m.diverged,true,'02 α > 2/λ_max ≈ 0.07025 diverges');eq(m.divergedAt,70,'02 |θ| exceeds 10⁶ at step 70');
 // 06. main_notes §5.3: θ after 200 batch steps, computed separately in NumPy via β_{t+1} = (I − αK)β_t + αy and θ = Φᵀβ.
 mark('06');
m=logged('06','theta');
 [0.72379447,-0.46565941,-0.30913824,0.41455895].forEach((v,i)=>close(m.theta[i],v,1e-6,`06 θ_${i} after 200 steps`));
 [1.02233182,0.43399076,-0.451857,-0.66108886,0.38041775].forEach((v,i)=>close(m.beta[i],v,1e-6,`06 β_${i} after 200 steps`));
 close(m.J,0.09489991874942509,1e-6,'06 training cost after 200 steps');
 m=logged('06','maxGap');check(m.maxGap<1e-12,'06 θ = Σβᵢφ(x⁽ⁱ⁾) holds to rounding error');
 close(m.predExplicit,0.37555170767970225,1e-9,'06 explicit prediction at x = 0.75');close(m.predKernel,0.37555170767970225,1e-9,'06 kernel prediction Σβᵢ K(x⁽ⁱ⁾, x) at x = 0.75');
 // ⟨x, z⟩ = 0.5 + 2 − 2 = 0.5 ⇒ 1 + 0.5 + 0.25 + 0.125 = 1.875; 1 + 3 + 9 + 27 = 40 features.
 m=logged('06','featureDim');close(m.featureDim,40,0,'06 1 + d + d² + d³ monomials');close(m.explicitInner,1.875,1e-12,'06 explicit 40-dim inner product');close(m.kernelInner,1.875,1e-12,'06 kernel (5.9) inner product');
 // 07. cs229-notes3 p.3–7. Hand derivation: the closest opposite pair is +1 = (2, 2) and −4 = (0, 0.5), difference (2, 1.5) ∝ (4, 3).
 // With u = (0.8, 0.6): positive projections 2.8, 4.1, 3.7; negative 0.3, −0.2, −0.2 ⇒ γ* = (2.8 − 0.3)/2 = 1.25, b = −1.55,
 // canonical ‖w‖ = 1/γ* = 0.8 and ½‖w‖² = 0.32. The optimum direction is atan(3/4) = 36.8699°.
 mark('07');m=metrics('07');
 close(m.optimalGamma,1.25,1e-6,'07 optimal geometric margin');close(m.optimalDegree,36.87,0.006,'07 optimal direction atan(3/4)');close(m.optimalObjective,.32,1e-5,'07 half squared norm at the optimum');
 // 45°: u = (1, 1)/√2; positive projections 4/√2, 6/√2, 5/√2; negative 0.5/√2, −0.5/√2, 0 ⇒ γ = 3.5/(2√2).
 close(m.gamma,3.5/(2*Math.SQRT2),1e-12,'07 geometric margin at 45 degrees');close(m.b,-4.5/(2*Math.SQRT2),1e-12,'07 best offset at 45 degrees');
 deep(m.support,[0,3],'07 closest points at 45 degrees are +1 and -4');
 close(Math.min(...m.functional),1,1e-12,'07 canonical functional margin');m.functional.forEach((v,i)=>close(m.functional2[i],2*v,1e-12,`07 doubling (w,b) doubles functional margin ${i}`));
 close(m.normW,2*Math.SQRT2/3.5,1e-12,'07 canonical norm equals 1/gamma');
 // 0°: positive x₁ min 2, negative x₁ max 0.5 ⇒ γ = 0.75. 180°: projections −x₁ ⇒ γ = (−3.5 − 1)/2 = −2.25 (not separable).
 m=metrics('07',undefined,0);close(m.gamma,.75,1e-12,'07 margin at 0 degrees');eq(m.separable,true,'07 0 degrees separates');
 m=metrics('07',undefined,180);close(m.gamma,-2.25,1e-12,'07 margin at 180 degrees is negative');eq(m.separable,false,'07 reversed direction misclassifies');
 m=metrics('07',undefined,90);close(m.gamma,.25,1e-12,'07 margin at 90 degrees');
 check(metrics('07',undefined,35).gamma<1.25&&metrics('07',undefined,40).gamma<1.25,'07 grid directions stay below the optimum');
 // 12. cs229-notes6 p.1–3. Hand simulation (θ starts at 0, g(0) = 1):
 // pass 1: mistakes on (1,−2), (−2,−1), (−3,1) → θ = (−1,2), (1,3), (4,2); pass 2: mistake on (1,−2) → θ = (3,4); pass 3: none.
 // ‖x‖ ≤ √10, u = (0.6, 0.8) gives margins 2, 1, 1, 2, 1, 1 ⇒ γ = 1 and (D/γ)² = 10.
 mark('12');
m=logged('12','bound');close(m.D,Math.sqrt(10),1e-4,'12 D = max norm');close(m.gamma,1,1e-12,'12 margin of u');close(m.bound,10,1e-4,'12 mistake bound (D/γ)²');
 m=logged('12','totalMistakes');eq(m.totalMistakes,4,'12 perceptron makes four mistakes');deep(m.perPass,[3,1,0],'12 mistakes per pass');deep(m.finalTheta,[3,4],'12 final θ');eq(m.withinBound,true,'12 mistakes stay within the bound');
 const rows=outputObjects('12').filter(row=>Object.hasOwn(row,'thetaU'));
 eq(rows.length,4,'12 one trace row per mistake');
 deep(rows.map(r=>r.thetaU),[1,3,4,5],'12 θᵀu after each mistake');deep(rows.map(r=>r.normSq),[5,10,20,25],'12 ‖θ‖² after each mistake');
 rows.forEach(r=>{check(r.thetaU>=r.kGamma-1e-9,`12 inequality (3) θᵀu ≥ kγ at k=${r.k}`);check(r.normSq<=r.kD2+1e-9,`12 inequality (5) ‖θ‖² ≤ kD² at k=${r.k}`);});
 // 13. cs229-notes7a p.1–3. Hand derivation:
 // init {0,3,6} = (0,0),(8,0),(4,7): every point already goes to its own blob; J = 1+1 + 1+1 + 1+1 = 6, means (1/3,1/3), (25/3,1/3), (13/3,22/3)
 // each blob then contributes 2/9 + 5/9 + 5/9 = 4/3, so J = 4, and the next assignment is unchanged.
 // init {0,1,5} = (0,0),(1,0),(8,1): blob A splits {(0,0),(0,1)} / {(1,0)}, (8,1) takes blobs B and C:
 // J₀ = 0+0+1 + 1+2+0 + 52+45+65 = 166; means (0,.5), (1,0), (38/6, 23/6) give J = .5 + 302/3 − .5 = 302/3 ≈ 100.6667.
 mark('13');
 const runs=outputObjects('13').filter(r=>Object.hasOwn(r,'initIndex'));
 eq(runs.length,2,'13 two initialisations');
 const [good,bad]=runs;
 deep(good.initIndex,[0,3,6],'13 first run uses one point per blob');
 deep(good.history.map(h=>[h.Jassign,h.Jupdate]),[[6,4],[4,4]],'13 good run distortion trace');
 close(good.finalJ,4,1e-9,'13 good run converges to J = 4');deep(good.assignment,[0,0,0,1,1,1,2,2,2],'13 good run recovers the three blobs');
 deep(bad.history.map(h=>[h.Jassign,h.Jupdate]),[[166,100.6667],[100.6667,100.6667]],'13 bad run distortion trace');
 close(bad.finalJ,302/3,1e-4,'13 bad run is stuck in a local optimum');deep(bad.assignment,[0,1,0,2,2,2,2,2,2],'13 bad run merges two blobs');
 deep(bad.centroids[2],[6.3333,3.8333],'13 merged centroid is the mean of six points');
 eq(good.nonIncreasing,true,'13 J never increases (good run)');eq(bad.nonIncreasing,true,'13 J never increases (bad run)');
 const best=logged('13','best');deep(best.best,[0,3,6],'13 keep the run with the lowest distortion');close(best.bestJ,4,1e-9,'13 best distortion');
 // 14. cs229-notes7b p.2–3 and cs229-notes8 p.5–8. Reference values computed separately in NumPy.
 // At θ⁽⁰⁾ the two components share σ² = 1 and φ = ½, so w₁⁽ⁱ⁾ = σ(−x⁽ⁱ⁾) (log-ratio −x): e.g. x = −2 gives σ(2) = 0.880797.
 mark('14');m=metrics('14',undefined,0);
 [0.880797,0.817574,0.731059,0.622459,0.182426,0.119203,0.075858,0.029312].forEach((v,i)=>close(m.w1[i],v,1e-6,`14 initial responsibility ${i}`));
 close(m.loglik,-21.219024,1e-6,'14 initial log-likelihood');
 close(m.next.phi[0],0.432336,1e-6,'14 first M-step mixing weight');close(m.next.mu[0],-0.932712,1e-6,'14 first M-step mean 1');close(m.next.mu[1],1.701262,1e-6,'14 first M-step mean 2');
 close(m.next.v[0],1.434349,1e-6,'14 first M-step variance 1');close(m.next.v[1],2.45221,1e-6,'14 first M-step variance 2');
 m=metrics('14');eq(m.t,1,'14 default shows one completed iteration');close(m.loglik,-15.930212,1e-6,'14 log-likelihood after one iteration');
 m=metrics('14',undefined,3);close(m.mu[0],-1.276333,1e-6,'14 mean 1 after three iterations');close(m.v[0],0.33708,1e-6,'14 variance 1 after three iterations');close(m.loglik,-13.971744,1e-6,'14 log-likelihood after three iterations');
 m=metrics('14',undefined,12);close(m.loglik,-13.362287,1e-6,'14 converged log-likelihood');close(m.mu[1],2.374261,1e-6,'14 converged mean 2');close(m.phi[0],0.499873,1e-6,'14 converged mixing weight');
 m.loglikPath.forEach((l,i)=>{if(i)check(l>=m.loglikPath[i-1]-1e-12,`14 EM never decreases ℓ (${i})`);});
 // 16. cs229-notes10 p.2–5. Reference values computed separately in NumPy:
 // mean (5.5, 2.9125), σ = (√5.25, 0.8823796), correlation ρ = 0.8686628109; for a 2×2 correlation matrix the eigenvalues are 1 ± ρ
 // with eigenvectors at 45° and 135°, and uᵀΣu = 1 + ρ·sin(2·angle).
 mark('16');const rho=0.8686628109217006;m=metrics('16');
 close(m.mean[0],5.5,1e-12,'16 mean of x1');close(m.mean[1],2.9125,1e-12,'16 mean of x2');close(m.sd[0],Math.sqrt(5.25),1e-12,'16 sd of x1');close(m.sd[1],0.8823796,1e-6,'16 sd of x2');
 close(m.Sigma[0][0],1,1e-12,'16 normalised variance 1');close(m.Sigma[1][1],1,1e-12,'16 normalised variance 2');close(m.Sigma[0][1],rho,1e-9,'16 correlation');
 close(m.lambda[0],1+rho,1e-9,'16 top eigenvalue 1 + ρ');close(m.lambda[1],1-rho,1e-9,'16 second eigenvalue 1 − ρ');close(m.principalDeg,45,1e-6,'16 principal direction at 45 degrees');
 close(m.projectedVariance,1,1e-12,'16 variance along x1 axis');close(m.residual,1,1e-12,'16 residual along x1 axis');
 m=metrics('16',undefined,45);close(m.projectedVariance,1+rho,1e-9,'16 variance along the principal eigenvector');close(m.residual,1-rho,1e-9,'16 minimum reconstruction error');
 m=metrics('16',undefined,30);close(m.projectedVariance,1+rho*Math.sin(Math.PI/3),1e-9,'16 variance at 30 degrees');
 m=metrics('16',undefined,135);close(m.projectedVariance,1-rho,1e-9,'16 variance along the minor direction');
 for(const d of [0,20,60,90,120,180])check(metrics('16',undefined,d).projectedVariance<=1+rho+1e-12,`16 no direction beats λ₁ (${d})`);
 // 18. cs229-notes12 p.2–6. Closed form for the optimal "always →" policy (γ = 0.9, slip 0.2):
 // V(4) = 10, V(3) = γ(0.8·10 + 0.2·V(3)) ⇒ V(3) = 7.2/0.82; V(s) = 0.72·V(s+1)/0.82 for s = 2, 1; V(0) = 1, V(5) = 0.
 // Iteration counts (22 synchronous sweeps, 19 right-to-left asynchronous sweeps, tolerance 1e−10) were reproduced separately in NumPy.
 mark('18');
 const v3=7.2/0.82,v2=0.72*v3/0.82,v1=0.72*v2/0.82,expected=[1,v1,v2,v3,10,0];
m=logged('18','Vsync');eq(m.gamma,.9,'18 default discount');
 m.Vsync.forEach((v,s)=>close(v,expected[s],1e-4,`18 synchronous value iteration V*(${s})`));
 m.Vasync.forEach((v,s)=>close(v,expected[s],1e-4,`18 asynchronous value iteration V*(${s})`));
 eq(m.syncIters,22,'18 synchronous sweeps to converge');eq(m.asyncIters,19,'18 right-to-left asynchronous sweeps to converge');
 check(m.asyncIters<m.syncIters,'18 asynchronous updates reuse fresh values');
 m=logged('18','Vpi');m.Vpi.forEach((v,s)=>close(v,expected[s],1e-4,`18 policy iteration V^π(${s})`));
 eq(m.piIters,4,'18 policy evaluations until the policy is stable');deep(m.policyHistory,['←←←','←←→','←→→','→→→'],'18 greedy improvements spread from the big reward');
 deep(m.optimalPolicy,['→','→','→'],'18 optimal policy heads to the reward 10');check(m.maxGap<1e-9,'18 value and policy iteration agree');
}
