/* Keep Learning Lab's compact home. Full course catalogs live inside each course. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const catalog=JSON.parse($('catalog-data').textContent);
const courses=catalog.published || [];
const localCourses=courses.filter(course=>course.localOnly);
const localSlugs=new Set(localCourses.map(course=>course.slug));
const cards=[...document.querySelectorAll('.course-card')];
const articles=[...document.querySelectorAll('.article-row')];
const labs=[...document.querySelectorAll('.lab-card')];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const read=(key,fallback={})=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'&&!Array.isArray(v)?v:fallback;}catch{return fallback;}};
const strings={zh:{skip:'跳到内容',courses:'课程',articles:'文章',labs:'交互实验',myLearning:'学习记录',chapterMatches:'匹配的章节',search:'搜索课程、章节和文章',clear:'清空',hero:'理解原理，动手验证。',intro:'关于 AI、计算机、嵌入式系统与语言学习的开放课程和笔记。',explore:'浏览课程',path:'AI 学习路径',resume:'继续学习',courseUnit:'门开放课程',lessons:'讲',all:'全部',ai:'人工智能',systems:'计算机与嵌入式',language:'语言学习',localCourse:'仅本地保存',showAll:'查看全部 {count} 门课程 ↓',collapse:'收起课程 ↑',articleHint:'从课程中精选，适合单篇阅读。',labHint:'改一个参数，看看会发生什么。',noResults:'没有找到相关内容，试试其他关键词。',noCourses:'当前分类下没有匹配的课程。',footer:'开放学习，持续更新。社区笔记，非官方课程。',progressIntro:'进度保存在当前浏览器，可以导出备份。',export:'导出备份',import:'导入备份',cloud:'账号与云端同步',syncNow:'立即同步',logout:'退出登录',searchPlaceholder:'搜索课程、章节或关键词…',local:'当前为本地模式，登录后可合并已有学习进度。',noSync:'云端同步暂不可用，本地学习和备份仍可使用。',downloaded:'备份已导出。',imported:'备份已导入。',invalid:'无法导入，请选择有效的 Keep Learning Lab 备份文件。',unavailable:'浏览器未允许保存，请检查隐私或存储设置。',started:'学习中',done:'已掌握'},en:{skip:'Skip to content',courses:'Courses',articles:'Articles',labs:'Playground',myLearning:'My learning',chapterMatches:'Matching lessons',search:'Search courses, lessons and articles',clear:'Clear',hero:'Understand it. Build it.',intro:'Open courses and learning notes on AI, computing, embedded systems, and languages.',explore:'Explore courses',path:'AI learning path',resume:'Continue',courseUnit:'open courses',lessons:'lessons',all:'All',ai:'Artificial intelligence',systems:'Computing & embedded',language:'Languages',localCourse:'Local only',showAll:'View all {count} courses ↓',collapse:'Show fewer ↑',articleHint:'Selected course notes, one idea at a time.',labHint:'Change a parameter. See what happens.',noResults:'No results found. Try another keyword.',noCourses:'No matching courses in this category.',footer:'Open learning, always evolving. Community notes, not official courses.',progressIntro:'Your progress is saved in this browser. Export a backup to keep a copy.',export:'Export backup',import:'Import backup',cloud:'Account & cloud sync',syncNow:'Sync now',logout:'Sign out',searchPlaceholder:'Search courses, lessons, or keywords…',local:'Local mode. Sign in to merge existing learning progress.',noSync:'Cloud sync is unavailable. Local learning and backups still work.',downloaded:'Backup exported.',imported:'Backup imported.',invalid:'Unable to import. Choose a valid Keep Learning Lab backup file.',unavailable:'Browser storage is unavailable. Check your privacy or storage settings.',started:'In progress',done:'Completed'}};
let lang='zh';try{lang=new URLSearchParams(location.search).get('lang')||localStorage.getItem('open-seei-home-lang')||'zh';}catch{}lang=lang==='en'?'en':'zh';
let filter='all',expanded=false,query='',chapterLimit=6;
const text=key=>(strings[lang][key]||key).replace('{count}',String(cards.length));
function courseLink(course, language = lang) {
 const edition = (language === 'en' && course.has_en) || (language === 'es' && course.has_es) ? language : 'zh';
 return edition + '/' + course.slug + '/';
}
function chapterTitle(course, chapter) {
 if (lang === 'zh') return chapter.zh;
 return chapter.en_desc || course.en_chapters?.[chapter.code] || chapter.es || chapter.zh;
}
const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const chapterIndex = courses.flatMap(course => {
 const category = cards.find(card => card.dataset.course === course.slug)?.dataset.category;
 return (course.chapters || []).map(chapter => ({
  course, chapter, category,
  keywords: normalize([course.code, course.slug, chapter.code, chapter.zh, chapter.es, chapter.en_desc, course.en_chapters?.[chapter.code]].join(' '))
 }));
});
function showChapterResults(matches) {
 const section = $('chapter-results');
 section.hidden = !matches.length;
 $('chapter-count').textContent = matches.length ? (lang === 'zh' ? matches.length + ' 节' : matches.length + (matches.length === 1 ? ' lesson' : ' lessons')) : '';
 $('chapter-links').innerHTML = matches.slice(0, chapterLimit).map(({course, chapter}) =>
  `<a class="chapter-result" href="${esc(courseLink(course) + chapter.file)}"><small>${esc(course.code)} · ${esc(chapter.code)}</small><span>${esc(chapterTitle(course, chapter))}</span></a>`
 ).join('');
 const more = $('more-chapters');
 more.hidden = matches.length <= chapterLimit;
 more.textContent = lang === 'zh' ? '显示更多章节' : 'Show more lessons';
}
function setLanguage(){
 document.documentElement.lang=lang==='en'?'en':'zh-CN';
 document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=text(el.getAttribute('data-i18n'));});
 document.querySelectorAll('[data-zh][data-en]').forEach(el=>{el.textContent=el.dataset[lang];});
 $('language-toggle').textContent=lang==='zh'?'EN':'中文';$('language-toggle').setAttribute('aria-label',lang==='zh'?'Switch to English':'切换为中文');
 $('global-search').placeholder=text('searchPlaceholder');$('search-toggle').setAttribute('aria-label',text('search'));
 $('theme-toggle').setAttribute('aria-label',lang==='zh'?'切换深浅主题':'Toggle color theme');$('progress-close').setAttribute('aria-label',lang==='zh'?'关闭面板':'Close panel');
 document.title=lang==='zh'?'Keep Learning Lab · 开放课程与学习笔记':'Keep Learning Lab · Open courses & learning notes';
 document.querySelector('.brand-note').textContent=lang==='zh'?'学习笔记':'Learning notes';
 cards.forEach(el=>{const c=courses.find(c=>c.slug===el.dataset.course);if(c)el.href=courseLink(c);});
 articles.forEach(el=>{if(el.getAttribute('href').includes('/emp/'))el.href=`${lang==='en'?'en':'zh'}/emp/t2.html`;});
 renderResults();renderProgress();
}
function renderResults(){
 const q = normalize(query.trim());
 const words = q ? q.split(/\s+/) : [];
 const matches = words.length ? chapterIndex.filter(item => (filter === 'all' || item.category === filter) && words.every(word => item.keywords.includes(word))) : [];
 showChapterResults(matches);
 const matchingCourses = new Set(matches.map(item => item.course.slug));
 let visible=0,courseMatches=0;
 cards.forEach(card=>{const matches=(filter==='all'||card.dataset.category===filter)&&(!q||matchingCourses.has(card.dataset.course)||normalize(card.dataset.search).includes(q));if(matches)courseMatches++;card.hidden=!matches||(!q&&filter==='all'&&!expanded&&courseMatches>6);if(!card.hidden)visible++;});
 $('course-count').textContent=courseMatches;$('course-empty').hidden=courseMatches>0;
 $('show-all-courses').hidden=!!q||filter!=='all'||courseMatches<=6;
 $('show-all-courses').textContent=text(expanded?'collapse':'showAll');$('show-all-courses').setAttribute('aria-expanded',String(expanded));
 for(const [items,section] of [[articles,'articles'],[labs,'labs']]){
  let count=0;items.forEach(el=>{el.hidden=!!q&&!normalize(el.dataset.search).includes(q);if(!el.hidden){count++;visible++;}});$(section).hidden=!!q&&count===0;
 }
 $('global-empty').hidden=!q||visible>0;
 document.querySelectorAll('[data-filter]').forEach(btn=>{const active=btn.dataset.filter===filter;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});
}
function stats(course) {
 const raw = read(course.key);
 const marked = Object.keys(raw.obj || {}).filter(id => raw.obj[id] === true);
 const completed = (course.chapters || []).reduce((sum, chapter) => {
  const count = marked.filter(id => id.startsWith(chapter.obj)).length;
  return sum + Math.min(chapter.n || 0, count);
 }, 0);
 return {raw, k: completed, n: course.total || 0};
}
function courseResume(course, progress, activity) {
 const chapters = course.chapters || [];
 const saved = chapters.find(chapter => chapter.code === progress.raw.resume || chapter.code === 'L' + progress.raw.resume);
 let best = saved ? {chapter: saved, href: courseLink(course) + saved.file, at: Number(progress.raw.resumeAt) || 0} : null;
 for (const visit of [activity?.last, activity?.byCurso?.[course.slug]]) {
  if (visit?.slug !== course.slug) continue;
  const chapter = chapters.find(item => item.file === visit.file);
  const at = Number(visit.ts) || 0;
  if (chapter && (!best || at >= best.at)) best = {chapter, href: courseLink(course, visit.lang) + chapter.file, at};
 }
 if (best) return {...best, title: course.code + ' · ' + chapterTitle(course, best.chapter)};
 if (progress.k > 0) return {href: courseLink(course), title: lang === 'en' ? course.en : course.zh, at: -1};
 return null;
}
function renderProgress() {
 const activity = window.SeeiSync?.activity?.() || read('open-seei-activity');
 let latest = null;
 const rows = [];
 for (const card of cards) {
  const course = courses.find(item => item.slug === card.dataset.course);
  if (!course) continue;
  const progress = stats(course);
  const resume = courseResume(course, progress, activity);
  if (resume && (!latest || resume.at > latest.at)) latest = resume;
  card.querySelector('.progress-label').textContent = progress.k && progress.n ? `· ${Math.round(progress.k / progress.n * 100)}%` : '';
  const name = card.querySelector('h3').textContent;
  rows.push(`<a class="learning-row" href="${esc(resume?.href || courseLink(course))}"><span><small>${esc(course.code)}${course.localOnly ? ' · ' + esc(text('localCourse')) : ''}</small>${esc(name)}</span><span class="learning-count">${progress.k} / ${progress.n}</span></a>`);
 }
 $('learning-list').innerHTML = rows.join('');
 $('resume-link').hidden = !latest;
 if (latest) {
  $('resume-link').href = latest.href;
  $('resume-title').textContent = latest.title;
 }
}
function updateSync(){const api=window.SeeiSync;if(!api?.status){$('sync-status').textContent=text('noSync');return;}const s=api.status();$('sync-status').textContent=s.on?`${s.user?.name||s.user?.email||'Google'} · ${s.text||''}`:text('local');$('sync-now').hidden=!s.on;$('sign-out').hidden=!s.on;$('google-btn-slot').hidden=!!s.on;}
const dialog=$('learning-dialog');
function openProgress() {
 renderProgress();
 updateSync();
 if (!dialog.open) dialog.showModal();
}
function openLinkedSync() {
 if (location.hash !== '#sync') return;
 openProgress();
 document.querySelector('.sync-details').open = true;
}
$('progress-open').addEventListener('click',openProgress);
$('progress-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
dialog.addEventListener('close',()=>{
 if (location.hash === '#sync') history.replaceState(history.state, '', location.pathname + location.search);
 $('progress-open').focus();
});
let loginMounted=false;document.querySelector('.sync-details').addEventListener('toggle',async event=>{if(event.target.open&&!loginMounted&&window.SeeiSync?.renderGoogleButton){loginMounted=await window.SeeiSync.renderGoogleButton($('google-btn-slot'));}});
$('sync-now').addEventListener('click',async()=>{const b=$('sync-now');b.disabled=true;try{await window.SeeiSync?.sync?.();}finally{b.disabled=false;updateSync();renderProgress();}});
$('sign-out').addEventListener('click',()=>{window.SeeiSync?.logout?.();loginMounted=false;updateSync();window.SeeiSync?.renderGoogleButton?.($('google-btn-slot'));});
$('export-progress').addEventListener('click',()=>{
 const api=window.SeeiSync;
 const base=api?.exportBackup?api.exportBackup():{version:1,courses:Object.fromEntries(courses.map(c=>[c.slug,{raw:read(c.key)}]))};
 const payload={...base,courses:{...base.courses}};
 // Local-only course records are backed up without entering the cloud sync schema.
 for(const c of localCourses){const raw=read(c.key);if(Object.keys(raw).length)payload.courses[c.slug]={raw};}
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='keep-learning-lab-progress.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$('backup-message').textContent=text('downloaded');
});
$('import-progress').addEventListener('change',async event=>{
 const input=event.target,file=input.files?.[0];if(!file)return;
 try{
  const data=JSON.parse(await file.text());
  if(!data||!data.courses||typeof data.courses!=='object'||Array.isArray(data.courses))throw Error('invalid');
  let success=false;
  if(window.SeeiSync?.importBackup){
   const cloudCourses=Object.fromEntries(Object.entries(data.courses).filter(([slug])=>!localSlugs.has(slug)));
   if(Object.keys(cloudCourses).length)success=window.SeeiSync.importBackup({...data,courses:cloudCourses});
  }
  for(const c of courses){
   if(!c.localOnly&&window.SeeiSync?.importBackup)continue;
   const item=data.courses[c.slug]?.raw;
   if(!item||typeof item!=='object'||Array.isArray(item))continue;
   if(c.localOnly&&(item.version!==1||!['questions','tasks','observed'].every(key=>item[key]&&typeof item[key]==='object'&&!Array.isArray(item[key]))))continue;
   localStorage.setItem(c.key,JSON.stringify(item));success=true;
  }
  if(!success)throw Error('invalid');
  $('backup-message').textContent=text('imported');renderProgress();
 }catch{$('backup-message').textContent=text('invalid');}
 input.value='';
});
$('show-all-courses').addEventListener('click',()=>{expanded=!expanded;renderResults();});
document.querySelectorAll('[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{filter=btn.dataset.filter;expanded=false;chapterLimit=6;renderResults();}));
$('global-search').addEventListener('input',event=>{query=event.target.value;chapterLimit=6;renderResults();});
$('more-chapters').addEventListener('click',()=>{
 const firstNew = chapterLimit;
 chapterLimit += 12;
 renderResults();
 $('chapter-links').children[firstNew]?.focus();
});
function clearSearch(){query='';$('global-search').value='';renderResults();}
$('search-clear').addEventListener('click',()=>{clearSearch();$('global-search').focus();});
function openSearch(open){$('search-panel').hidden=!open;$('search-toggle').setAttribute('aria-expanded',String(open));if(open)$('global-search').focus();else{clearSearch();$('search-toggle').focus();}}
$('search-toggle').addEventListener('click',()=>openSearch($('search-panel').hidden));
document.addEventListener('keydown',event=>{if(event.key==='/'&&!/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName||'')&&!dialog.open){event.preventDefault();openSearch(true);}if(event.key==='Escape'&&!dialog.open&&!$('search-panel').hidden)openSearch(false);});
$('theme-toggle').addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=next;try{localStorage.setItem('open-seei-theme',next);}catch{}});
$('language-toggle').addEventListener('click',()=>{lang=lang==='zh'?'en':'zh';try{localStorage.setItem('open-seei-home-lang',lang);}catch{}setLanguage();});
document.addEventListener('seei-sync-state',updateSync);document.addEventListener('seei-sync',renderProgress);window.addEventListener('storage',renderProgress);window.addEventListener('pageshow',renderProgress);
window.addEventListener('hashchange',openLinkedSync);
setLanguage();
openLinkedSync();
})();

