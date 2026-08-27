const activityFilters = document.querySelectorAll(".activity-filter");
const activityCards = [...document.querySelectorAll(".activity-card")];
const activitySearch = document.querySelector("#activity-search");
const activityEmpty = document.querySelector("#activity-empty");
const activityResultLabel = document.querySelector("#activity-result-label");
const activityResultCount = document.querySelector("#activity-result-count");
let activeStatus = "all";

function renderActivities() {
  const query = activitySearch.value.trim().toLowerCase();
  const visible = activityCards.filter((card) => {
    const statusMatches = activeStatus === "all" || card.dataset.status === activeStatus;
    const textMatches = !query || card.dataset.search.toLowerCase().includes(query);
    const matches = statusMatches && textMatches;
    card.hidden = !matches;
    return matches;
  });
  document.querySelectorAll(".activity-group").forEach((group) => {
    const groupCards = [...group.querySelectorAll(".activity-card")];
    group.hidden = !groupCards.some((card) => !card.hidden);
  });
  activityEmpty.hidden = visible.length > 0;
  activityResultCount.textContent = `${visible.length} 项`;
  activityResultLabel.textContent = activeStatus === "planned" ? "计划活动" : activeStatus === "past" ? "往期活动" : query ? `搜索结果：${activitySearch.value.trim()}` : "全部活动";
  lucide.createIcons();
}

activityFilters.forEach((filter) => filter.addEventListener("click", () => {
  activeStatus = filter.dataset.status;
  activityFilters.forEach((item) => item.classList.toggle("is-active", item === filter));
  renderActivities();
}));
activitySearch.addEventListener("input", renderActivities);
document.querySelector(".nav-toggle").addEventListener("click", () => document.querySelector(".site-nav").classList.toggle("is-open"));
document.querySelectorAll(".site-nav a").forEach((link) => link.addEventListener("click", () => document.querySelector(".site-nav").classList.remove("is-open")));
lucide.createIcons();
renderActivities();
