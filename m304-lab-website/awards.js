const archiveItems = [
  { id: "cert-01", kind: "national", year: "2026", title: "全国总决赛三等奖", event: "第十七届蓝桥杯 · 软件赛 C/C++ B 组", person: "孙超逸", award: "全国总决赛", image: "cert-01.jpg" },
  { id: "cert-02", kind: "national", year: "2026", title: "全国总决赛三等奖", event: "第十七届蓝桥杯 · 软件赛 C/C++ B 组", person: "许庆博", award: "全国总决赛", image: "cert-02.jpg" },
  { id: "cert-03", kind: "national", year: "2026", title: "全国总决赛三等奖", event: "第十七届蓝桥杯 · 软件赛 Java B 组", person: "侯宗阳", award: "全国总决赛", image: "cert-03.jpg" },
  { id: "cert-04", kind: "national", year: "2026", title: "全国总决赛三等奖", event: "第十七届蓝桥杯 · 软件赛 Python B 组", person: "傅顺顺", award: "全国总决赛", image: "cert-04.jpg" },
  { id: "cert-05", kind: "national", year: "2026", title: "全国总决赛三等奖", event: "第十七届蓝桥杯 · 软件赛 Python B 组", person: "葛叙言", award: "全国总决赛", image: "cert-05.jpg" },
  { id: "cert-06", kind: "cpp", year: "2026", title: "省赛二等奖", event: "第十七届蓝桥杯 · 软件赛 C/C++ B 组", person: "晁嘉振", award: "省赛 C/C++", image: "cert-06.jpg" },
  { id: "cert-07", kind: "cpp", year: "2026", title: "省赛二等奖", event: "第十七届蓝桥杯 · 软件赛 C/C++ B 组", person: "沈志浩", award: "省赛 C/C++", image: "cert-07.jpg" },
  { id: "cert-08", kind: "cpp", year: "2026", title: "省赛二等奖", event: "第十七届蓝桥杯 · 软件赛 C/C++ B 组", person: "孙文鑫", award: "省赛 C/C++", image: "cert-08.jpg" },
  { id: "cert-09", kind: "cpp", year: "2026", title: "省赛二等奖", event: "第十七届蓝桥杯 · 软件赛 C/C++ B 组", person: "张昌瑞", award: "省赛 C/C++", image: "cert-09.jpg" },
  { id: "cert-10", kind: "cpp", year: "2026", title: "省赛二等奖", event: "第十七届蓝桥杯 · 软件赛 C/C++ B 组", person: "张洪阳", award: "省赛 C/C++", image: "cert-10.jpg" },
  { id: "cert-11", kind: "cpp", year: "2026", title: "省赛三等奖", event: "第十七届蓝桥杯 · 软件赛 C/C++ B 组", person: "李硕", award: "省赛 C/C++", image: "cert-11.jpg" },
  { id: "cert-12", kind: "cpp", year: "2026", title: "省赛三等奖", event: "第十七届蓝桥杯 · 软件赛 C/C++ B 组", person: "王延彪", award: "省赛 C/C++", image: "cert-12.jpg" },
  { id: "cert-13", kind: "cpp", year: "2026", title: "省赛一等奖", event: "第十七届蓝桥杯 · 软件赛 C/C++ B 组", person: "孙超逸", award: "省赛 C/C++", image: "cert-13.jpg" },
  { id: "cert-14", kind: "cpp", year: "2026", title: "省赛一等奖", event: "第十七届蓝桥杯 · 软件赛 C/C++ B 组", person: "许庆博", award: "省赛 C/C++", image: "cert-14.jpg" },
  { id: "cert-15", kind: "other", year: "2026", title: "省赛三等奖", event: "第十七届蓝桥杯 · 软件赛 Java B 组", person: "韩坤", award: "省赛 Java", image: "cert-15.jpg" },
  { id: "cert-16", kind: "other", year: "2026", title: "省赛一等奖", event: "第十七届蓝桥杯 · 软件赛 Java B 组", person: "侯宗阳", award: "省赛 Java", image: "cert-16.jpg" },
  { id: "cert-17", kind: "other", year: "2026", title: "省赛二等奖", event: "第十七届蓝桥杯 · 软件赛 Python B 组", person: "王若琳", award: "省赛 Python", image: "cert-17.jpg" },
  { id: "cert-18", kind: "other", year: "2026", title: "省赛二等奖", event: "第十七届蓝桥杯 · 软件赛 Python B 组", person: "王硕", award: "省赛 Python", image: "cert-18.jpg" },
  { id: "cert-19", kind: "other", year: "2026", title: "省赛二等奖", event: "第十七届蓝桥杯 · 软件赛 Python B 组", person: "王永乐", award: "省赛 Python", image: "cert-19.jpg" },
  { id: "cert-20", kind: "other", year: "2026", title: "省赛三等奖", event: "第十七届蓝桥杯 · 软件赛 Python B 组", person: "王晨溪", award: "省赛 Python", image: "cert-20.jpg" },
  { id: "cert-21", kind: "other", year: "2026", title: "省赛三等奖", event: "第十七届蓝桥杯 · 软件赛 Python B 组", person: "袁硕", award: "省赛 Python", image: "cert-21.jpg" },
  { id: "cert-22", kind: "other", year: "2026", title: "省赛一等奖", event: "第十七届蓝桥杯 · 软件赛 Python B 组", person: "傅顺顺", award: "省赛 Python", image: "cert-22.jpg" },
  { id: "cert-23", kind: "other", year: "2026", title: "省赛一等奖", event: "第十七届蓝桥杯 · 软件赛 Python B 组", person: "葛叙言", award: "省赛 Python", image: "cert-23.jpg" },
  { id: "cert-24", kind: "other", year: "2026", title: "省赛二等奖", event: "第十七届蓝桥杯 · 网络安全大学组", person: "侯宗阳", award: "省赛网络安全", image: "cert-24.jpg" },
  { id: "project-01", kind: "project", year: "2026", title: "校级创新训练计划立项", event: "基于 KG-RAG Agent 的算法导学评测系统", person: "乔志祥等", award: "项目立项", image: "project-01.jpg" },
  { id: "project-02", kind: "project", year: "2026", title: "北部区域赛三等奖", event: "中国大学生服务外包创新创业大赛 · 企业命题类", person: "侯宗阳等", award: "项目实践", image: "project-02.jpg" }
];

const archiveLabels = { all: "全部成果", national: "全国总决赛", cpp: "省赛 C/C++", other: "省赛其他方向", project: "项目实践" };
const grid = document.querySelector("#award-grid");
const dialog = document.querySelector("#award-dialog");
let activeFilter = "all";
let searchTerm = "";
let visibleItems = [...archiveItems];
let activeIndex = 0;

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function getFilteredItems() {
  const query = searchTerm.trim().toLowerCase();
  return archiveItems.filter((item) => {
    const categoryMatches = activeFilter === "all" || item.kind === activeFilter;
    const text = `${item.title} ${item.event} ${item.person} ${item.award}`.toLowerCase();
    return categoryMatches && (!query || text.includes(query));
  });
}

function renderArchive() {
  visibleItems = getFilteredItems();
  document.querySelector("#archive-result-label").textContent = searchTerm ? `搜索：${searchTerm}` : archiveLabels[activeFilter];
  document.querySelector("#archive-result-count").textContent = `${visibleItems.length} 份档案`;
  grid.innerHTML = visibleItems.length
    ? visibleItems.map((item, index) => `<button class="award-card" type="button" data-kind="${item.kind}" data-index="${index}">
        <span class="award-card-image"><img loading="lazy" src="assets/awards/thumbs/${item.image}" alt="${escapeHtml(item.person)}的${escapeHtml(item.title)}证书缩略图" /></span>
        <span class="award-card-content">
          <span class="award-card-topline"><span>${item.year} · ${escapeHtml(item.award)}</span><span>${escapeHtml(item.person)}</span></span>
          <strong>${escapeHtml(item.title)}</strong>
          <span class="award-card-event">${escapeHtml(item.event)}</span>
          <span class="award-card-meta">查看档案 <i data-lucide="expand"></i></span>
        </span>
      </button>`).join("")
    : '<div class="archive-empty">没有找到匹配的成果档案。</div>';
  lucide.createIcons();
}

function showItem(index) {
  activeIndex = index;
  const item = visibleItems[activeIndex];
  if (!item) return;
  document.querySelector("#award-dialog-kicker").textContent = `${item.year} · ${item.award}`;
  document.querySelector("#award-dialog-title").textContent = `${item.person} · ${item.title}`;
  document.querySelector("#award-dialog-image").src = `assets/awards/full/${item.image}`;
  document.querySelector("#award-dialog-image").alt = `${item.person}的${item.title}档案`;
  document.querySelector("#award-dialog-meta").textContent = item.event;
  document.querySelector("#award-dialog-position").textContent = `${activeIndex + 1} / ${visibleItems.length}`;
  document.querySelector(".dialog-prev").disabled = activeIndex === 0;
  document.querySelector(".dialog-next").disabled = activeIndex === visibleItems.length - 1;
  if (!dialog.open) dialog.showModal();
  lucide.createIcons();
}

document.querySelector(".nav-toggle").addEventListener("click", () => document.querySelector(".site-nav").classList.toggle("is-open"));
document.querySelectorAll(".site-nav a").forEach((link) => link.addEventListener("click", () => document.querySelector(".site-nav").classList.remove("is-open")));
document.querySelectorAll(".filter-chip").forEach((button) => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".filter-chip").forEach((item) => item.classList.toggle("is-active", item === button));
  renderArchive();
}));
document.querySelector("#archive-search").addEventListener("input", (event) => { searchTerm = event.target.value; renderArchive(); });
grid.addEventListener("click", (event) => { const card = event.target.closest("[data-index]"); if (card) showItem(Number(card.dataset.index)); });
document.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
document.querySelector(".dialog-prev").addEventListener("click", () => showItem(activeIndex - 1));
document.querySelector(".dialog-next").addEventListener("click", () => showItem(activeIndex + 1));
document.addEventListener("keydown", (event) => {
  if (!dialog.open) return;
  if (event.key === "ArrowLeft" && activeIndex > 0) showItem(activeIndex - 1);
  if (event.key === "ArrowRight" && activeIndex < visibleItems.length - 1) showItem(activeIndex + 1);
});

renderArchive();
