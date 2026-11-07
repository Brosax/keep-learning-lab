/* Keep Learning Lab course reader. Content is maintained in each course's data.js. */
(() => {
  'use strict';
  const course = window.COURSE;
  const root = document.getElementById('course-app');
  if (!course || !root) return;
  const lessons = Array.isArray(course.lessons) ? course.lessons : [];
  const courseDirectory = [
    {id: 'cs329z', title: 'CS329Z · AI Agent 工程'},
    {id: 'cs336', title: 'CS336 · 语言模型'},
    {id: 'cme295', title: 'CME295 · Transformer'},
    {id: 'cs229', title: 'CS229 · 机器学习'},
    {id: 'cs230', title: 'CS230 · 深度学习'}
  ];
  const key = `${course.id}-web-v1`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeUrl = value => {
    const url = String(value || '#');
    return /^(?:https?:\/\/|\.?\.?\/|#|[a-zA-Z0-9_-]+(?:\/|\.))/.test(url) && !/[\u0000-\u001f]/.test(url) ? url : '#';
  };
  const link = (url, text, cls = '') => `<a class="${esc(cls)}" href="${esc(safeUrl(url))}"${/^https?:/.test(String(url)) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${text}</a>`;
  let state = {obj: {}, quiz: {}, notes: {}, resume: ''};
  let storageAvailable = true;
  let quizUpdated = false;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      for (const field of ['obj', 'quiz', 'notes']) {
        if (saved[field] && typeof saved[field] === 'object' && !Array.isArray(saved[field])) state[field] = saved[field];
      }
      state.resume = typeof saved.resume === 'string' ? saved.resume : '';
      if (typeof saved.quizRevision === 'string') state.quizRevision = saved.quizRevision;
    }
  } catch (_) { storageAvailable = false; }
  function save() {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (_) { storageAvailable = false; }
  }
  if (course.quizRevision && state.quizRevision !== course.quizRevision) {
    quizUpdated = Object.keys(state.quiz).length > 0;
    state.quiz = {};
    state.quizRevision = course.quizRevision;
    save();
  }
  const objectives = lesson => Array.isArray(lesson.objectives) ? lesson.objectives : [];
  const objKey = (lesson, i) => `L${lesson.id}.${i + 1}`;
  const lessonCount = lesson => objectives(lesson).filter((_, i) => state.obj[objKey(lesson, i)]).length;
  const done = lesson => objectives(lesson).length > 0 && lessonCount(lesson) === objectives(lesson).length;
  const totalObjectives = lessons.reduce((sum, lesson) => sum + objectives(lesson).length, 0);
  const currentCount = () => lessons.reduce((sum, lesson) => sum + lessonCount(lesson), 0);
  const currentPercent = () => totalObjectives ? Math.round(currentCount() / totalObjectives * 100) : 0;
  const resources = [];
  const seenResources = new Set();
  [...(course.resources || []), ...lessons.flatMap(lesson => (lesson.resources || []).map(r => ({...r, lessonId: lesson.id})))].forEach(resource => {
    const id = course.experimentsMode === 'lesson'
      ? resource.local || (resource.url && resource.url.split('#')[0]) || resource.title
      : resource.url || resource.local || resource.title;
    if (!seenResources.has(id)) { seenResources.add(id); resources.push(resource); }
  });
  const modules = (course.modules || []).map(module => ({...module, lessons: lessons.filter(lesson => lesson.module === module.id)}));
  const extra = lessons.filter(lesson => !modules.some(module => module.id === lesson.module));
  if (extra.length) modules.push({id: 'more', title: '课程内容', description: '', lessons: extra});
  let lessonSearch = '';
  let resourceSearch = '';
  let resourceType = 'all';
  let activeLesson = null;
  let route = '';

  let theme = 'light';
  try { theme = localStorage.getItem('open-seei-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); } catch (_) {}
  document.documentElement.dataset.theme = theme === 'dark' ? 'dark' : 'light';

  function sidebar() {
    return `<div class="sidebar-head"><span class="eyebrow">${esc(course.code)} / 学习导航</span><p class="side-course-title">${esc(course.title)}</p><div class="progress-track" role="progressbar" aria-label="课程掌握进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${currentPercent()}"><span style="width:${currentPercent()}%"></span></div><div class="progress-caption"><span id="progress-caption">${currentCount()} / ${totalObjectives} 个目标</span><strong id="progress-percent">${currentPercent()}%</strong></div></div>
      <nav class="course-nav" aria-label="课程目录"><a href="#overview" data-route="overview">课程总览 <span>↗</span></a><a href="#resources" data-route="resources">原始资料库 <span>${resources.length}</span></a>
      ${modules.map((module, index) => `<p class="nav-section-title">${String(index + 1).padStart(2, '0')} / ${esc(module.title)}</p>${module.lessons.map(lesson => `<div class="nav-lesson"><a href="#lesson-${esc(lesson.id)}" data-lesson="${esc(lesson.id)}" class="${done(lesson) ? 'done' : ''}"><span class="nav-num">${done(lesson) ? '✓' : esc(lesson.id)}</span><span>${esc(lesson.title)}</span></a></div>`).join('')}`).join('')}</nav>
      <div class="sidebar-footer">中文社区导学 · 保留英文原始资料<br>进度与笔记保存在当前浏览器</div>`;
  }

  root.innerHTML = `<a class="sr-only skip-link" href="#main-content">跳到课程内容</a>
    <header class="course-header"><a class="brand" href="../../index.html" data-home-link>KEEP LEARNING LAB <span>//</span></a><span class="course-code">OPEN COURSE / ${esc(course.code)}</span><div class="header-links"><div class="course-switch"><label class="sr-only" for="course-switch">切换课程</label><select id="course-switch">${courseDirectory.map(item => `<option value="${esc(item.id)}"${item.id === course.id ? ' selected' : ''}>${esc(item.title)}</option>`).join('')}</select></div><button class="theme-toggle" type="button" aria-label="切换深浅主题">◐</button><button class="menu-toggle" type="button" aria-label="展开课程目录" aria-expanded="false" aria-controls="course-sidebar">目录 ☰</button></div></header>
    <div class="nav-backdrop" aria-hidden="true"></div><div class="course-layout"><aside class="course-sidebar" id="course-sidebar">${sidebar()}</aside><main class="course-main" id="main-content" tabindex="-1"></main></div>`;
  // A course lives at /zh/<course>/; this remains valid on a subpath deployment.
  root.querySelector('[data-home-link]').setAttribute('href', '../../');
  root.querySelector('#course-switch').addEventListener('change', event => {
    if (courseDirectory.some(item => item.id === event.target.value)) location.href = `../${event.target.value}/`;
  });
  const main = root.querySelector('main');
  const menuButton = root.querySelector('.menu-toggle');
  const sidebarElement = root.querySelector('.course-sidebar');
  const compactLayout = window.matchMedia('(max-width: 760px)');
  function updateMenuAccessibility() {
    sidebarElement.inert = compactLayout.matches && !document.body.classList.contains('menu-open');
  }
  function closeMenu() {
    document.body.classList.remove('menu-open');
    menuButton.setAttribute('aria-expanded', 'false');
    updateMenuAccessibility();
  }
  menuButton.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    menuButton.setAttribute('aria-expanded', String(open));
    updateMenuAccessibility();
  });
  compactLayout.addEventListener('change', updateMenuAccessibility);
  root.querySelector('.nav-backdrop').addEventListener('click', closeMenu);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('menu-open')) {
      closeMenu(); menuButton.focus();
    }
  });
  root.querySelector('.theme-toggle').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('open-seei-theme', next); } catch (_) {}
  });

  function footer() {
    return `<footer class="course-footer"><span>KEEP LEARNING LAB / ${esc(course.code)}</span><p>${esc(course.notice || '本页为 Keep Learning Lab 中文社区导学，非 Stanford 官方课程。原始资料版权及许可归原作者；课程安排与要求以官方网站为准。')}</p>${link(course.sourceUrl, '访问官方课程 ↗')}</footer>`;
  }
  function lessonCard(lesson) {
    return `<a class="lesson-card" href="#lesson-${esc(lesson.id)}"><span class="lesson-index">${esc(lesson.id)}</span><div class="lesson-copy"><h3>${esc(lesson.title)}</h3><p>${esc(lesson.summary)}</p><div class="lesson-tags"><span>${esc(lesson.originalTitle || course.code)}</span><span>${objectives(lesson).length} 个目标</span>${(lesson.lab || lesson.visual) ? '<span>交互实验</span>' : ''}</div></div><span class="status-chip">${done(lesson) ? '已掌握 ✓' : lessonCount(lesson) ? '学习中' : '开始学习'}</span><span class="lesson-arrow" aria-hidden="true">↗</span></a>`;
  }
  function renderModuleList() {
    const query = lessonSearch.trim().toLocaleLowerCase();
    const html = modules.map((module, index) => {
      const matched = module.lessons.filter(lesson => !query || [module.title, lesson.id, lesson.title, lesson.originalTitle, lesson.summary, ...objectives(lesson)].join(' ').toLocaleLowerCase().includes(query));
      if (!matched.length) return '';
      return `<section class="module"><div class="module-header"><span class="module-number">${String(index + 1).padStart(2, '0')}</span><div><h3>${esc(module.title)}</h3><p>${esc(module.description || '')}</p></div><span>${matched.length} 讲</span></div><div class="lesson-list">${matched.map(lessonCard).join('')}</div></section>`;
    }).join('');
    const list = main.querySelector('.modules-list');
    if (list) list.innerHTML = html || '<p class="search-empty" role="status">没有找到匹配的讲次，试试其他关键词。</p>';
  }
  function overview() {
    const next = lessons.find(lesson => lesson.id === state.resume) || lessons.find(lesson => !done(lesson)) || lessons[0];
    main.innerHTML = `<section class="hero"><div class="hero-top"><span class="eyebrow">STANFORD / ${esc(course.year)} · 中文社区导学</span><span class="hero-number">${esc(course.code)}</span></div><h1 class="hero-title">${esc(course.title)}</h1><p class="hero-subtitle">${esc(course.subtitle || '')}</p><p class="hero-description">${esc(course.description)}</p><div class="hero-meta">${(course.instructors || []).map(esc).join(' / ')}</div><div class="hero-actions">${next ? `<a class="btn primary" href="#lesson-${esc(next.id)}">${state.resume ? '继续学习' : '开始第一讲'} <span>↗</span></a>` : ''}<a class="btn secondary" href="#resources">浏览原始资料 ↓</a>${link(course.sourceUrl, '官方课程 ↗', 'text-link')}</div><div class="course-stats"><div class="stat"><strong>${lessons.length}</strong><span>课程讲次</span></div><div class="stat"><strong>${modules.length}</strong><span>学习模块</span></div><div class="stat"><strong>${resources.length}</strong><span>资料入口</span></div><div class="stat"><strong>${currentPercent()}<small>%</small></strong><span>目标掌握</span></div></div></section>
      <div class="overview-grid"><section class="info-panel"><span class="eyebrow">BEFORE YOU START</span><h2>开始前，你需要</h2><ul class="prereq-list">${(course.prerequisites || []).map(item => `<li>${esc(item)}</li>`).join('')}</ul></section><section class="info-panel"><span class="eyebrow">HOW TO LEARN</span><h2>把阅读变成实践</h2><ol class="prereq-list"><li>跟随中文导学建立概念，再打开对应原始讲义。</li><li>完成每讲练习，用自测检验理解并查看解析。</li><li>勾选已掌握目标，记录自己的实验结论。</li></ol><p class="muted">学习进度与笔记仅保存在当前浏览器。</p></section></div>
      <section aria-labelledby="curriculum-heading"><div class="section-heading"><span class="section-num">01 /</span><div><span class="section-label">CURRICULUM</span><h2 id="curriculum-heading">课程路径</h2></div><span>${lessons.length} 讲 · 按模块学习</span></div><div class="search-wrap"><label class="sr-only" for="lesson-search">搜索讲次、概念或英文术语</label><input class="course-search" id="lesson-search" type="search" placeholder="搜索讲次、概念或英文术语…" value="${esc(lessonSearch)}"><span aria-hidden="true">⌕</span></div><div class="modules-list"></div></section>
      ${(course.assignments || []).length ? `<section><div class="section-heading"><span class="section-num">02 /</span><div><span class="section-label">PRACTICE</span><h2>作业与实践</h2></div></div><div class="assignment-list">${course.assignments.map((assignment, index) => `<article class="assignment-card"><span class="eyebrow">PRACTICE ${String(index + 1).padStart(2, '0')}</span><h3>${esc(assignment.title)}</h3><p>${esc(assignment.description || '')}</p>${link(assignment.url, '打开原始任务 ↗')}</article>`).join('')}</div></section>` : ''}${footer()}`;
    renderModuleList();
    main.querySelector('#lesson-search').addEventListener('input', event => { lessonSearch = event.target.value; renderModuleList(); });
  }

  function resourceLabel(type) {
    return ({pdf: 'PDF 讲义', slides: '课件', lecture: '讲义', video: '视频', code: '代码', reading: '阅读', paper: '论文', assignment: '作业', notebook: 'Notebook', website: '网站', notes: '笔记', link: '链接'})[String(type).toLowerCase()] || type || '资料';
  }
  function resourceCard(resource, compact = false) {
    const local = resource.local;
    if (compact) return `<div class="resource-link"><span class="resource-type">${esc(resourceLabel(resource.type))}</span>${link(resource.url || local, esc(resource.title))}${local ? `<a class="resource-download" href="${esc(safeUrl(local))}" download>下载 ↓</a>` : ''}</div>`;
    return `<article class="resource-card"><div class="resource-card-head"><span class="resource-type">${esc(resourceLabel(resource.type))}</span><span>${local ? '已归档 ↓' : resource.status === 'unpublished' ? '尚未公开' : resource.status === 'restricted' ? '需原站授权' : '来源链接 ↗'}</span></div><h3>${esc(resource.title)}</h3>${resource.note ? `<p class="muted">${esc(resource.note)}</p>` : ''}${resource.lessonId ? `<p class="muted">对应第 ${esc(resource.lessonId)} 讲</p>` : ''}<div class="resource-actions">${link(resource.url || local, '查看来源 ↗')}${local ? `<a href="${esc(safeUrl(local))}" download>下载文件 ↓</a>` : ''}</div></article>`;
  }
  function renderResourceList() {
    const query = resourceSearch.trim().toLocaleLowerCase();
    const matched = resources.filter(resource => (resourceType === 'all' || resource.type === resourceType) && (!query || [resource.title, resource.type, resource.url, resource.lessonId].join(' ').toLocaleLowerCase().includes(query)));
    main.querySelector('.resource-grid').innerHTML = matched.map(resource => resourceCard(resource)).join('') || '<p class="empty-state" role="status">没有匹配的资料。试试其他关键词或类型。</p>';
    main.querySelector('.resource-count').textContent = `${matched.length} / ${resources.length} 份资料`;
    main.querySelectorAll('[data-resource-filter]').forEach(button => {
      const selected = button.dataset.resourceFilter === resourceType;
      button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected));
    });
  }
  function resourcePage() {
    const types = [...new Set(resources.map(resource => resource.type).filter(Boolean))];
    main.innerHTML = `<header class="lesson-header"><span class="eyebrow">${esc(course.code)} / SOURCE LIBRARY</span><h1 class="lesson-title">原始资料库</h1><p class="lesson-summary">按类型查找课件、代码与延伸阅读。已归档文件可直接下载，其余入口跳转原始来源。</p><p><a href="sources.json" download>下载完整来源索引 JSON ↓</a> · <a href="../ai/">五门课学习路径 ↗</a></p><p class="muted">课程材料与许可归原作者；受限或尚未公开的材料不会作为可下载文件提供。</p></header><div class="resource-toolbar"><div class="search-wrap"><label class="sr-only" for="resource-search">搜索资料名称</label><input class="course-search" id="resource-search" type="search" placeholder="搜索资料名称、讲次或关键词…" value="${esc(resourceSearch)}"><span aria-hidden="true">⌕</span></div><div class="resource-filters" aria-label="按资料类型筛选"><button type="button" data-resource-filter="all">全部</button>${types.map(type => `<button type="button" data-resource-filter="${esc(type)}">${esc(resourceLabel(type))}</button>`).join('')}</div><p class="resource-count" role="status"></p></div><div class="resource-grid"></div>${footer()}`;
    renderResourceList();
    main.querySelector('#resource-search').addEventListener('input', event => { resourceSearch = event.target.value; renderResourceList(); });
    main.querySelectorAll('[data-resource-filter]').forEach(button => button.addEventListener('click', () => { resourceType = button.dataset.resourceFilter; renderResourceList(); }));
  }

  function contentSection(section) {
    const paragraphs = Array.isArray(section.body) ? section.body : section.body ? String(section.body).split(/\n\n+/) : [];
    return `<section class="lesson-section"><h2>${esc(section.title)}</h2>${paragraphs.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}${section.formula ? `<div class="formula-block" role="math">${esc(section.formula)}</div>` : ''}${section.code ? `<pre class="code-block"><code>${esc(section.code)}</code></pre>` : ''}${section.bullets?.length ? `<ul class="takeaway-list">${section.bullets.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : ''}</section>`;
  }
  function quizMarkup(lesson) {
    if (!lesson.quiz?.length) return '';
    return `<section class="quiz-panel"><span class="eyebrow">CHECK YOUR UNDERSTANDING</span><h2>随堂自测</h2><p class="muted">${quizUpdated ? '题目已更新，请重新自测。' : ''}选择答案查看解析。可以重新作答，检验自己的理解。</p>${lesson.quiz.map((question, qi) => `<div class="quiz-question" data-question="${qi}"><h3><span>${String(qi + 1).padStart(2, '0')}.</span> ${esc(question.question)}</h3><div class="quiz-options" role="group" aria-label="第 ${qi + 1} 题选项">${question.options.map((option, oi) => `<button class="quiz-option" type="button" data-question="${qi}" data-answer="${oi}" aria-pressed="false"><span>${String.fromCharCode(65 + oi)}</span>${esc(option)}</button>`).join('')}</div><div class="quiz-feedback" aria-live="polite"></div></div>`).join('')}</section>`;
  }
  function updateQuiz(lesson, questionIndex, answerIndex) {
    const question = lesson.quiz[questionIndex];
    if (!question || !Number.isInteger(answerIndex) || !question.options[answerIndex]) return;
    const element = main.querySelector(`.quiz-question[data-question="${questionIndex}"]`);
    if (!element) return;
    const isCorrect = Number(question.answer) === answerIndex;
    element.querySelectorAll('.quiz-option').forEach(button => {
      const index = Number(button.dataset.answer);
      button.classList.toggle('selected', index === answerIndex);
      button.classList.toggle('correct', index === Number(question.answer));
      button.classList.toggle('incorrect', index === answerIndex && !isCorrect);
      button.setAttribute('aria-pressed', String(index === answerIndex));
    });
    const feedback = element.querySelector('.quiz-feedback');
    feedback.className = `quiz-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    feedback.innerHTML = `<strong>${isCorrect ? '回答正确 ✓' : '再想一想 · 正确答案是 ' + String.fromCharCode(65 + Number(question.answer))}</strong><p>${esc(question.explanation || '')}</p>`;
  }
  function lessonPage(lesson) {
    state.resume = lesson.id; save();
    const index = lessons.indexOf(lesson);
    const previous = lessons[index - 1]; const next = lessons[index + 1];
    const module = modules.find(item => item.id === lesson.module);
    main.innerHTML = `<header class="lesson-header"><div class="lesson-breadcrumb"><a href="#overview">课程总览</a><span>/</span><span>${esc(module?.title || course.code)}</span></div><div class="lesson-kicker"><span class="eyebrow">LESSON ${esc(lesson.id)} / ${esc(course.code)}</span><span>${index + 1} / ${lessons.length}</span></div><h1 class="lesson-title">${esc(lesson.title)}</h1><p class="lesson-original">${esc(lesson.originalTitle || '')}</p><p class="lesson-summary">${esc(lesson.summary)}</p><div class="lesson-meta"><span>${objectives(lesson).length} 个学习目标</span><span>${lesson.quiz?.length || 0} 道自测</span>${(lesson.lab || lesson.visual) ? '<span>含交互实验</span>' : ''}<span>中文社区导学</span></div></header>
      <div class="lesson-body"><div class="lesson-content" data-lesson-id="${esc(lesson.id)}"><section class="objectives"><span class="eyebrow">LEARNING OBJECTIVES</span><h2>这一讲，要掌握什么？</h2>${objectives(lesson).map((objective, i) => `<label class="objective-item"><input type="checkbox" data-objective="${i}"${state.obj[objKey(lesson, i)] ? ' checked' : ''}><span>${esc(objective)}</span></label>`).join('')}</section>
      ${(lesson.sections || []).map(contentSection).join('')}
      ${lesson.lab ? `<section class="lab-panel"><span class="eyebrow">INTERACTIVE LAB</span><h2>动手观察机制</h2><div data-lab="${esc(lesson.lab)}"></div></section>` : ''}
      ${lesson.exercise ? `<section class="exercise-panel"><span class="eyebrow">PUT IT INTO PRACTICE</span><h2>${esc(lesson.exercise.title || '动手练习')}</h2><ol>${(lesson.exercise.instructions || []).map(item => `<li>${esc(item)}</li>`).join('')}</ol>${lesson.exercise.deliverable ? `<div class="deliverable"><strong>完成标准</strong><p>${esc(lesson.exercise.deliverable)}</p></div>` : ''}</section>` : ''}
      ${quizMarkup(lesson)}</div><aside class="lesson-aside"><section class="aside-panel"><span class="eyebrow">ORIGINAL MATERIALS</span><h2>本讲资料</h2><div class="resource-links">${(lesson.resources || []).map(resource => resourceCard(resource, true)).join('') || '<p class="muted">更多原始资料见课程资料库。</p>'}</div><a class="text-link" href="#resources">完整资料库 ↗</a></section><section class="aside-panel"><span class="eyebrow">YOUR FIELD NOTES</span><h2><label for="lesson-note">学习笔记</label></h2><textarea id="lesson-note" class="note-input" placeholder="写下你理解的机制、仍有的疑问，或实验结果…">${esc(state.notes[lesson.id] || '')}</textarea><p class="note-status" role="status">${storageAvailable ? '自动保存在当前浏览器' : '浏览器存储不可用，请自行复制保存'}</p></section><div class="lesson-actions"><button type="button" class="btn primary" id="complete-lesson">${done(lesson) ? '已掌握 · 取消标记' : '标记本讲已掌握 ✓'}</button><p class="muted" id="lesson-status">已掌握 ${lessonCount(lesson)} / ${objectives(lesson).length} 个目标</p></div></aside></div>
      <nav class="lesson-pagination" aria-label="相邻讲次">${previous ? `<a class="prev-next" href="#lesson-${esc(previous.id)}"><span>← 上一讲 / ${esc(previous.id)}</span><strong>${esc(previous.title)}</strong></a>` : '<a class="prev-next" href="#overview"><span>← 返回</span><strong>课程总览</strong></a>'}${next ? `<a class="prev-next" href="#lesson-${esc(next.id)}"><span>下一讲 / ${esc(next.id)} →</span><strong>${esc(next.title)}</strong></a>` : '<a class="prev-next" href="#overview"><span>回顾学习路径 →</span><strong>返回课程总览</strong></a>'}</nav>${footer()}`;
    main.querySelectorAll('[data-objective]').forEach(input => input.addEventListener('change', () => {
      state.obj[objKey(lesson, Number(input.dataset.objective))] = input.checked;
      save(); updateProgress();
    }));
    main.querySelector('#complete-lesson').addEventListener('click', () => {
      const checked = !done(lesson);
      objectives(lesson).forEach((_, i) => { state.obj[objKey(lesson, i)] = checked; });
      main.querySelectorAll('[data-objective]').forEach(input => { input.checked = checked; });
      save(); updateProgress();
    });
    main.querySelector('#lesson-note').addEventListener('input', event => {
      state.notes[lesson.id] = event.target.value; save();
      main.querySelector('.note-status').textContent = storageAvailable ? '已自动保存 · 仅当前浏览器' : '浏览器存储不可用，请自行复制保存';
    });
    main.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
      const qi = Number(button.dataset.question); const ai = Number(button.dataset.answer);
      const quizKey = `L${lesson.id}`;
      const answers = state.quiz[quizKey]?.answers || {};
      answers[qi] = ai;
      state.quiz[quizKey] = {answers}; save(); updateQuiz(lesson, qi, ai);
    }));
    const savedAnswers = state.quiz[`L${lesson.id}`]?.answers || {};
    Object.entries(savedAnswers).forEach(([qi, ai]) => updateQuiz(lesson, Number(qi), Number(ai)));
    if (typeof window.initCourseLabs === 'function') window.initCourseLabs(main);
    document.dispatchEvent(new CustomEvent('course:render', {detail: {course: course.id, lesson: lesson.id, container: main}}));
  }
  function updateProgress() {
    root.querySelector('#progress-caption').textContent = `${currentCount()} / ${totalObjectives} 个目标`;
    root.querySelector('#progress-percent').textContent = `${currentPercent()}%`;
    const bar = root.querySelector('.progress-track');
    bar.setAttribute('aria-valuenow', String(currentPercent())); bar.firstElementChild.style.width = `${currentPercent()}%`;
    root.querySelectorAll('[data-lesson]').forEach(anchor => {
      const lesson = lessons.find(item => item.id === anchor.dataset.lesson);
      anchor.classList.toggle('done', done(lesson));
      anchor.querySelector('.nav-num').textContent = done(lesson) ? '✓' : lesson.id;
    });
    if (activeLesson) {
      main.querySelector('#complete-lesson').textContent = done(activeLesson) ? '已掌握 · 取消标记' : '标记本讲已掌握 ✓';
      main.querySelector('#lesson-status').textContent = `已掌握 ${lessonCount(activeLesson)} / ${objectives(activeLesson).length} 个目标`;
    }
  }
  function render(initial = false) {
    const hash = location.hash.slice(1);
    route = hash || 'overview';
    activeLesson = route.startsWith('lesson-') ? lessons.find(lesson => lesson.id === route.slice(7)) : null;
    if (activeLesson) lessonPage(activeLesson);
    else if (route === 'resources') resourcePage();
    else if (route === 'overview' || !hash) overview();
    else main.innerHTML = `<section class="empty-state"><span class="eyebrow">PAGE NOT FOUND</span><h1>没有找到这一讲</h1><p>链接可能已经更新。请从课程目录重新选择。</p><a class="btn primary" href="#overview">返回课程总览</a></section>${footer()}`;
    root.querySelectorAll('.course-nav a').forEach(anchor => {
      const selected = anchor.getAttribute('href') === `#${route}`;
      anchor.classList.toggle('active', selected);
      if (selected) anchor.setAttribute('aria-current', 'page'); else anchor.removeAttribute('aria-current');
    });
    document.title = `${activeLesson ? activeLesson.title : route === 'resources' ? '原始资料库' : course.title} · ${course.code} · Keep Learning Lab`;
    closeMenu();
    if (!initial) { window.scrollTo({top: 0, behavior: 'instant'}); main.focus({preventScroll: true}); }
  }
  window.addEventListener('hashchange', () => render());
  render(true);
})();
