/** Independent checks for CS329Z's lecture-aligned code demos (03 BM25, 06 tool-calling loop).
 * Expected values were derived separately (by hand and in a standalone Python script), not by re-running the lab code. */
export default function verify({logged,check,eq,close,deep,mark}){
 const near=(a,b,message,tolerance=1e-4)=>close(a,b,tolerance,message);
 let m;
 // 03. Lecture 3 p.41 BM25 vs HW1 Problem 3 (k1 = 1.5, b = 0.75, Lucene IDF ln(1 + (N − n + 0.5)/(n + 0.5))).
 // Five documents tokenized on non-alphanumerics have lengths 14, 10, 9, 7, 11, so avgdl = 51/5 = 10.2.
 mark('03');
 m=logged('03','avgdl');eq(m.N,5,'03 five documents');near(m.avgdl,10.2,'03 average document length');deep(m.lengths,[14,10,9,7,11],'03 token counts per document');
 const idf=Object.fromEntries(logged('03','idf').idf.map(row=>[row.term,row]));
 eq(idf.the.n,4,'03 "the" occurs in four of five documents');
 near(idf.the.original,Math.log(1.5/4.5),'03 original IDF of "the" is ln(1.5/4.5) < 0');check(idf.the.original<0,'03 original IDF goes negative for common terms');
 near(idf.the.lucene,Math.log(1+1.5/4.5),'03 Lucene IDF of "the" stays positive');
 near(idf.milestone.original,Math.log(3.5/2.5),'03 original IDF for n = 2');near(idf.milestone.lucene,Math.log(1+3.5/2.5),'03 Lucene IDF for n = 2');
 eq(idf.when.n,0,'03 "when" matches no document');
 // Hand-derived d1 Lucene score: tf factor = 2.5/(1 + 1.5·(0.25 + 0.75·10/10.2)) for each of the, milestone, is, due.
 const tf1=2.5/(1+1.5*(0.25+0.75*10/10.2));
 deep(logged('03','lucene').lucene.map(row=>row.doc),['d1','d3','d2','d4'],'03 Lucene ranking');
 near(logged('03','lucene').lucene[0].score,(Math.log(1+1/3)+3*Math.log(2.4))*tf1,'03 Lucene score of d1',1e-4);
 near(logged('03','lucene').lucene[1].score,2.373735,'03 Lucene score of d3 (Python reference)');
 near(logged('03','lucene').lucene[3].score,0.400868,'03 Lucene score of d4 (only "the", twice)');
 m=logged('03','original').original;deep(m.map(row=>row.doc),['d1','d3','d2','d4'],'03 original-IDF ranking');
 near(m[0].score,(Math.log(1/3)+3*Math.log(1.4))*tf1,'03 original-IDF score of d1 is negative',1e-4);check(m.every(row=>row.score<0),'03 every original-IDF score is pulled below zero by "the"');
 // Document length equal to avgdl: f·(k1 + 1)/(f + k1) = 2.5f/(f + 1.5).
 deep(logged('03','tfSaturation').tfSaturation,[1,1.4286,1.6667,1.8182,2.1739],'03 term-frequency saturation toward k1 + 1 = 2.5');
 // 06. Lecture 6 p.34 ReAct trace, HW1 Problems 5–7: validate before executing, feed errors back, stop on limits; p.66–68 observation masking.
 mark('06');
 m=logged('06','full').full;
 eq(m.status,'done','06 loop ends with a final answer');eq(m.answer,'keyboard function keys','06 answer from the ReAct example');eq(m.turns,5,'06 five model calls');
 deep(m.statuses,['ok','ok','invalid_args','ok'],'06 misnamed argument is rejected before execution, then corrected');
 // Word counts of the context before each model call, counted by hand from the user message, replies and observations.
 deep(m.contextWords,[20,55,84,99,134],'06 context grows with every observation');
 m=logged('06','masked').masked;
 eq(m.answer,'keyboard function keys','06 masking keeps the same answer');deep(m.contextWords,[20,55,61,59,90],'06 masking older observations shrinks the context from the third call');
 m=logged('06','budget').budget;
 eq(m.status,'max_turns','06 turn budget stops the loop');eq(m.answer,null,'06 exhausted budget is not a completed task');eq(m.turns,3,'06 three model calls under the budget');
}
