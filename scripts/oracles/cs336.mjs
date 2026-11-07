/** Independent numerical checks for CS336's lecture-aligned modules.
 * Visuals: 02, 05, 08, 09, 10, 14. Code demos: 01, 03, 04, 06, 07, 14, 15, 16. Lessons 11, 12, 13, 17 have no module.
 * Expected values are derived by hand or separately in Python (closed forms, not the lab code).
 */
export default function verify({metrics,logged,outputObjects,check,eq,close,deep,mark}){
 const near=(a,b,message,tolerance=1e-9)=>close(a,b,tolerance,message);
 const rel=(a,b,message,tolerance=1e-6)=>close(a/b,1,tolerance,message);
 let m;

 // 01. lecture_01.py · train_bpe("the cat in the hat", 3): (t,h)→256, (256,e)→257, (257,' ')→258; 18 bytes → 12 indices.
 mark('01');m=logged('01','merges');
 deep(m.merges.map(x=>[x.pair,x.newIndex]),[[[116,104],256],[[256,101],257],[[257,32],258]],'01 merges follow the lecture (first-seen pair wins ties)');
 deep(m.lengths,[18,16,14,12],'01 each merge shortens the training string by two');
 deep(m.trainIndices,[258,99,97,116,32,105,110,32,258,104,97,116],'01 trained indices');
 near(m.compressionRatio,18/12,'01 compression ratio 1.5');
 m=logged('01','testIds');
 deep(m.testIds,[258,113,117,105,99,107,32,98,114,111,119,110,32,102,111,120],'01 encode applies merges in training order');
 eq(m.testBytes,19,'01 test string bytes');near(m.testCompression,19/16,'01 test compression');eq(m.roundTrip,true,'01 decode(encode(s)) = s');

 // 02. lecture_02.py · arithmetic_intensity_matmul(): AI = n²(2n−1)/(6n²) = (2n−1)/6; H100 989.5e12 / 3.35e12 = 295.3731…
 mark('02');m=metrics('02');
 near(m.acceleratorIntensity,989.5e12/3.35e12,'02 H100 accelerator intensity');
 eq(m.bytes,6*1024*1024,'02 bytes for n = 1024');eq(m.flops,1024*1024*2047,'02 FLOPs for n = 1024');
 near(m.arithmeticIntensity,2047/6,'02 intensity n = 1024 (~n/3)');eq(m.computeBound,true,'02 lecture: n = 1024 matmul is compute-bound');eq(m.mfuBound,1,'02 MFU bound saturates');
 m=metrics('02',undefined,64);near(m.arithmeticIntensity,127/6,'02 intensity n = 64');near(m.mfuBound,(127/6)/(989.5e12/3.35e12),'02 MFU bound n = 64');eq(m.computeBound,false,'02 n = 64 is memory-bound');
 eq(metrics('02',undefined,886).computeBound,false,'02 n = 886 still memory-bound (295.17 < 295.37)');
 eq(metrics('02',undefined,887).computeBound,true,'02 n = 887 compute-bound (295.5 > 295.37)');

 // 03. Lecture 3 p.31–35 RoPE; d = 4, Θ = 10000 → θ = [1, 0.01]. Reference values computed separately in numpy.
 mark('03');m=logged('03','rope');
 deep(m.theta,[1,.01],'03 RoPE frequencies');
 deep(m.rope.sameOffset,[-0.904686,-0.904686,-0.904686],'03 RoPE inner product depends only on m − n');
 near(m.rope.offset3,-1.336566,'03 offset 3 gives a different score');
 deep(m.additive.sameOffset,[4.218834,1.526809,0.198712],'03 additive sinusoidal embedding depends on absolute position');
 eq(m.relativeOnly,true,'03 relative-only flag');eq(m.rotationPreservesNorm,true,'03 rotation preserves norm');

 // 04. Lecture 4 p.4–5 linear attention. Hand-computed: QKᵀ = [[1,0,1,2],[1,1,0,0],[2,1,1,2],[0,-1,1,2]].
 mark('04');m=logged('04','unmasked');
 deep(m.unmasked,[[8,3],[1,2],[9,5],[7,1]],'04 (QKᵀ)V');deep(m.reordered,m.unmasked,'04 Q(KᵀV) equals (QKᵀ)V');
 m=logged('04','causalParallel');
 deep(m.causalParallel,[[1,0],[1,2],[3,3],[7,1]],'04 causal masked parallel form');deep(m.recurrent,m.causalParallel,'04 RNN form equals masked parallel form');
 deep(m.finalState,[[8,3],[1,2]],'04 final state S = KᵀV');deep(m.unmaskedRowsMatchingRnn,[false,true,false,true],'04 without the mask only some rows coincide');
 m=logged('04','decayParallel');
 deep(m.decayParallel,[[1,0],[.5,2],[1.5,2],[6.5,2]],'04 RetNet γ = 0.5 parallel');eq(m.decayMatches,true,'04 decayed recurrence matches');
 eq(m.mulsQuadratic,64,'04 n²d_k + n²d_v');eq(m.mulsLinear,32,'04 2n·d_k·d_v');

 // 05. Lecture 5 p.48: tiles = ⌈N/256⌉⌈N/128⌉, 108 SMs.
 mark('05');m=metrics('05');
 eq(m.tiles,98,'05 N = 1792: 7×14 tiles');eq(m.waves,1,'05 N = 1792 fits in one wave');near(m.utilization,98/108,'05 utilization 1792');
 m=metrics('05',undefined,1793);eq(m.tiles,120,'05 N = 1793: 8×15 tiles');eq(m.waves,2,'05 N = 1793 needs two waves');eq(m.lastWaveTiles,12,'05 second wave has 12 tiles');near(m.utilization,120/216,'05 utilization drops');
 m=metrics('05',undefined,2048);eq(m.tiles,128,'05 N = 2048 tiles');eq(m.waves,2,'05 N = 2048 waves in the simplified model');near(m.usefulArea,1,'05 2048 divides evenly');
 m=metrics('05',undefined,1536);eq(m.tiles,72,'05 N = 1536 tiles');near(m.utilization,2/3,'05 N = 1536 utilization');
 m=metrics('05',undefined,2560);eq(m.tiles,200,'05 N = 2560 tiles');near(m.utilization,200/216,'05 N = 2560 utilization');

 // 06. lecture_06.py · matmul_relu_kernel with BLOCK 64/64/32 on 1024³: loads = MNK(1/BLOCK_N + 1/BLOCK_M).
 mark('06');m=logged('06','part1').part1;
 deep(m.grid,[16,16],'06 grid');eq(m.iterationsPerProgram,32,'06 K loop iterations');
 eq(m.tiledLoads,1024**3*(1/64+1/64),'06 tiled loads');eq(m.naiveLoads,2*1024**3,'06 naive loads');eq(m.reuse,64,'06 reuse factor');
 m=logged('06','part2').part2;
 // A[i][k] = i + k, B[k][j] = k − j: (A@B)[i][j] = Σ_k (i+k)(k−j) = 7ij·(−1)… closed form: Σk² + i·Σk − j·(7i + Σk), Σk = 21, Σk² = 91.
 const ref=Array.from({length:5},(_,i)=>Array.from({length:6},(_,j)=>Math.max(0,91+21*i-j*(7*i+21))));
 deep(m.C,ref,'06 tiled ReLU(A@B) equals the closed form');eq(m.maxAbsDiff,0,'06 tiled result matches direct product');
 deep(m.grid,[3,3],'06 non-divisible grid');eq(m.iterationsTotal,18,'06 total iterations');
 // masked slots: A tiles 8 slots × 18 iterations − valid (5 rows × 7 k × 3 column programs) = 144 − 105 = 39; B: 144 − (7 × 6 × 3 row programs) = 144 − 126 = 18.
 eq(m.maskedSlots,57,'06 masked loads');

 // 07. lecture_07.py · collective_operations_main(): data = [0,1,2,3] + rank, world_size 4.
 mark('07');m=logged('07','allReduce');
 deep(m.allReduce,[[6,10,14,18],[6,10,14,18],[6,10,14,18],[6,10,14,18]],'07 all-reduce');
 deep(m.reduceScatter,[[6],[10],[14],[18]],'07 reduce-scatter');eq(m.allReduceEqualsRsThenAg,true,'07 all-reduce = reduce-scatter + all-gather');
 deep(m.allToAll,[[0,4,8,12],[1,5,9,13],[2,6,10,14],[3,7,11,15]],'07 all-to-all transposes blocks');
 deep(m.gather,[0,1,2,3],'07 gather');deep(m.reduce,[6,10,14,18],'07 reduce');
 m=logged('07','ring');eq(m.ringMatches,true,'07 ring all-reduce');deep(m.chunksSentPerRank,[6,6,6,6],'07 ring sends 2(W−1) chunks per rank');
 m=logged('07','benchmark').benchmark;
 eq(m.sizeBytes,419430400,'07 100·1024² float32 bytes');eq(m.allReduceSentBytes,419430400*2*3,'07 all-reduce sent bytes');eq(m.reduceScatterSentBytes,4*4*104857600*3,'07 reduce-scatter sent bytes');

 // 08. Lecture 8 p.34: bubble = (p − 1)/m with p = 4.
 mark('08');m=metrics('08');
 near(m.bubbleRatio,.75,'08 m = 4 bubble');near(m.utilization,4/7,'08 m = 4 utilization');eq(m.totalSlots,14,'08 m = 4 slots');eq(m.idleSlotsPerDevice,6,'08 idle slots are constant');
 m=metrics('08',undefined,1);near(m.bubbleRatio,3,'08 m = 1 bubble');near(m.utilization,.25,'08 naive layer-wise parallel uses 1/4');eq(m.totalSlots,8,'08 m = 1 slots');
 m=metrics('08',undefined,32);near(m.bubbleRatio,3/32,'08 m = 32 bubble');near(m.utilization,32/35,'08 m = 32 utilization');
 check(metrics('08',undefined,30).bubbleRatio<=.1&&metrics('08',undefined,29).bubbleRatio>.1,'08 30 microbatches is the smallest m with bubble ≤ 0.1');

 // 09. Lecture 9 p.52 fit; closed form N_opt = G (C/6)^{β/(α+β)}, G = (αA/(βB))^{1/(α+β)}.
 mark('09');
 const a=.37/.72,G=(.35*482/(.37*2085))**(1/.72),L=(N,D)=>482/N**.35+2085/D**.37+1.82;
 for(const lc of [19,21,24]){
  m=metrics('09',undefined,lc);const C=10**lc,N=G*(C/6)**a,D=C/(6*N);
  rel(m.Nopt,N,`09 N_opt at 1e${lc}`,1e-5);rel(m.Dopt,D,`09 D_opt at 1e${lc}`,1e-5);near(m.Lopt,L(N,D),`09 L_opt at 1e${lc}`,1e-9);
 }
 m=metrics('09');near(m.tokensPerParam,18.7133,'09 tokens per parameter at 1e21',1e-3);near(m.Lopt,2.272877,'09 minimum loss at 1e21',1e-5);
 check(m.lossAtTenthN>m.Lopt&&m.lossAtTenTimesN>m.Lopt,'09 the optimum is a valley');
 near(Math.log10(metrics('09',undefined,22).Nopt/metrics('09',undefined,21).Nopt),a,'09 slope of the frontier ≈ 0.51',1e-5);

 // 10. lecture_10.py · llama2_13b_config(): memory = 26,030,899,200 + 838,860,800·B (K = 40); 22,675,456,000 + 167,772,160·B (K = 8).
 mark('10');m=metrics('10',0,64);
 eq(m.numParams,13015449600,'10 Llama 2 13B parameter count (MHA)');eq(m.memory,26030899200+838860800*64,'10 K = 40, B = 64 memory');
 near(m.latencyMs,79717990400/3.35e12*1e3,'10 K = 40, B = 64 latency');eq(m.fits,true,'10 K = 40, B = 64 just fits in 80 GB');eq(m.maxBatchThatFits,64,'10 K = 40 max batch');
 m=metrics('10',0,256);eq(m.fits,false,'10 lecture: K = 40, B = 256 does not fit');near(m.memoryGB,240.779264,'10 K = 40, B = 256 memory');
 m=metrics('10',1,64);eq(m.memory,22675456000+167772160*64,'10 GQA K = 8, B = 64 memory');near(m.throughput,64/(m.memory/3.35e12),'10 throughput = B / latency',1e-6);
 m=metrics('10',1,256);near(m.throughput,13068.164795877607,'10 GQA B = 256 throughput',1e-6);eq(m.maxBatchThatFits,341,'10 GQA max batch');
 m=metrics('10',0,1);near(m.latencyMs,8.020823880597016,'10 B = 1 latency',1e-9);

 // 14. lecture_14.py: mmh3.hash("hello") = 613153351; Jaccard({1,2,3,4},{1,2,3,5}) = 3/5; LSH 1 − (1 − s^r)^b.
 mark('14');m=logged('14','helloHash');
 eq(m.helloHash,613153351,'14 MurmurHash3 matches mmh3.hash("hello")');
 deep(m.deduped,['hi','bye','hello','hello there','Hello!'],'14 exact dedup keeps one item per hash, sorted by hash');
 m=logged('14','estimatedJaccard');near(m.jaccard,.6,'14 Jaccard 3/5');eq(m.matches,60,'14 60 of 100 seeds collide');near(m.estimatedJaccard,.6,'14 lecture assert |estimate − 0.6| < 0.01');
 const P=(s,b,r)=>1-(1-s**r)**b;
 near(metrics('14',0,10).probAt08,0.43330782041120397,'14 lecture example b = 5, r = 10, s = 0.8');
 near(metrics('14',1,10).probAt08,0.6788599735928997,'14 b = 10, r = 10');near(metrics('14',1,20).probAt08,0.10949086440906874,'14 b = 10, r = 20 moves right');
 near(metrics('14',2,20).probAt08,0.2069934794290924,'14 b = 20, r = 20 moves left');
 m=metrics('14');near(m.threshold,(1/20)**(1/10),'14 threshold (1/b)^(1/r)');m.probs.forEach((p,i)=>near(p,P([.7,.75,.8,.85,.9,.95,.98][i],20,10),`14 S-curve point ${i}`));

 // 15. Lecture 15 p.57–58 DPO: margin = β[(πw − refw) − (πl − refl)], loss = log(1 + e^{−margin}), weight = σ(−margin).
 mark('15');m=logged('15','rows');
 deep(m.rows.map(r=>r.margin),[.2,0,-.3,.4],'15 margins at β = 0.1');
 deep(m.rows.map(r=>r.loss),[.5981,.6931,.8544,.513],'15 per-pair losses');deep(m.rows.map(r=>r.weight),[.4502,.5,.5744,.4013],'15 gradient weights σ(−margin)');
 near(m.meanLoss,.6647,'15 mean loss');near(m.accuracy,.5,'15 preference accuracy (ties are not correct)');

 // 16. Lecture 16 p.20: (r − mean)/(std + 1e-4), population std; hard group std = √(0.125·0.875).
 mark('16');m=logged('16','hard');
 const sd=Math.sqrt(.125*.875);
 near(m.hard.grpo[0],Math.round(.875/(sd+1e-4)*1e4)/1e4,'16 hard group: lone correct answer');near(m.hard.grpo[1],Math.round(-.125/(sd+1e-4)*1e4)/1e4,'16 hard group: wrong answers');
 near(m.hard.drGrpo[0],.875,'16 Dr. GRPO hard correct');near(m.medium.grpo[0],Math.round(.5/(.5+1e-4)*1e4)/1e4,'16 medium group ±0.9998');near(m.medium.drGrpo[4],-.5,'16 Dr. GRPO medium wrong');
 near(m.hard.sampleStd[0],Math.round(.875/(Math.sqrt(.125*.875*8/7)+1e-6)*1e4)/1e4,'16 sample-std variant');
 deep(m.solved.grpo,[0,0,0,0,0,0,0,0],'16 solved group gives no signal');near(m.easy.grpo[7],-m.hard.grpo[0],'16 easy group mirrors hard group');
 m=logged('16','grpoPerToken');
 deep(m.grpoPerToken,[.01,.005,.0033,.0025,-.01,-.005,-.0033,-.0025],'16 GRPO per-token weights shrink with length');
 deep(m.drGrpoPerToken,[.001,.001,.001,.001,-.001,-.001,-.001,-.001],'16 Dr. GRPO constant normalizer');
}
