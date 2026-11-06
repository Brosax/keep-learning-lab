/* Shared drawing primitives only; each CS229 lesson defines its own model and experiment. */
(() => {
  'use strict';
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = (n,digits=3) => Number.isFinite(n) ? Number(n).toFixed(digits) : '超出范围';
  const text = (x,y,value,cls='') => `<text x="${x}" y="${y}" class="${esc(cls)}">${esc(value)}</text>`;
  const line = (x1,y1,x2,y2,cls='v-edge') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${esc(cls)}"/>`;
  const arrow = (x1,y1,x2,y2,cls='v-yellow') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${esc(cls)}" marker-end="url(#visual-arrow)"/>`;
  const rect = (x,y,w,h,cls='v-node',rx=8) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${esc(cls)}"/>`;
  const node = (x,y,w,label,sub,active=false) => `${rect(x,y,w,66,active?'v-node active':'v-node')}${text(x+w/2,y+27,label,'v-center v-node-title')}${text(x+w/2,y+48,sub,'v-center v-small')}`;
  const point = (x,y,r=5,cls='v-dot') => `<circle cx="${x}" cy="${y}" r="${r}" class="${esc(cls)}"/>`;
  const softmax = values => {const m=Math.max(...values),exp=values.map(v=>Math.exp(v-m)),sum=exp.reduce((a,b)=>a+b,0);return exp.map(v=>v/sum);};
  window.MLVis={esc,fmt,text,line,arrow,rect,node,point,softmax};
  window.COURSE_VISUALS=window.COURSE_VISUALS||{};
  window.COURSE_CODE=window.COURSE_CODE||{};
})();
