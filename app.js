const categoryLabels = {
  all: "全部讨论",
  algorithm: "算法训练",
  software: "软件开发",
  competition: "竞赛交流",
  recruitment: "纳新问答"
};

const seedTopics = [];

const storageKey = "m304-forum-topics-v2";
const userKey = "m304-forum-user-v1";
const studySessionKey = "m304-study-sessions-v1";
let activeCategory = "all";
let searchTerm = "";
let activeReplyId = null;
let topics = loadTopics();
let currentUser = loadUser();
let studySessions = loadStudySessions();
let studyTimerId = null;

const topicList = document.querySelector("#topic-list");
const postCount = document.querySelector("#post-count");
const feedState = document.querySelector("#feed-state");
const topicForm = document.querySelector("#new-topic-form");
const loginDialog = document.querySelector("#login-dialog");
const toast = document.querySelector("#toast");
const loginTriggers = document.querySelectorAll(".login-trigger");
const composerTriggers = document.querySelectorAll(".composer-trigger");
const channel = "BroadcastChannel" in window ? new BroadcastChannel("m304-forum") : null;
const remoteClient = window.m304Supabase || null;
const accountLoginLink = document.querySelector("#account-login-link");
const accountMenuTrigger = document.querySelector("#account-menu-trigger");
const accountMenu = document.querySelector("#account-menu");
const accountName = document.querySelector("#account-name");
const accountAvatar = document.querySelector("#account-avatar");
const accountLogout = document.querySelector("#account-logout");
const profileEditTrigger = document.querySelector("#profile-edit-trigger");
const profileDialog = document.querySelector("#profile-dialog");
const profileForm = document.querySelector("#profile-form");
const profileMessage = document.querySelector("#profile-message");

function cloneTopics(value) {
  return value.map((topic) => ({ ...topic, replies: [...topic.replies] }));
}

function loadTopics() {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : cloneTopics(seedTopics);
  } catch {
    return cloneTopics(seedTopics);
  }
}

function saveTopics() {
  if (remoteClient) return;
  localStorage.setItem(storageKey, JSON.stringify(topics));
  channel?.postMessage({ type: "topics-updated" });
}

function loadUser() {
  try {
    const saved = localStorage.getItem(userKey);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function loadStudySessions() {
  try {
    const saved = localStorage.getItem(studySessionKey);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveStudySessions() {
  if (remoteClient) return;
  localStorage.setItem(studySessionKey, JSON.stringify(studySessions));
  channel?.postMessage({ type: "sessions-updated" });
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDayKey(offset = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return getDateKey(date);
}

function getWeekDayKeys() {
  const date = new Date();
  const day = date.getDay() || 7;
  return Array.from({ length: 7 }, (_, index) => localDayKey(index - day + 1));
}

function currentUserId() {
  return currentUser?.id || currentUser?.email || currentUser?.name || "";
}

function formatRelativeTime(iso) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  return `${Math.floor(hours / 24)} 天前`;
}

async function getRemoteProfiles(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return new Map();
  const { data, error } = await remoteClient.from("profiles").select("id, display_name, avatar_url").in("id", uniqueIds);
  if (error) { console.error("fetch profiles:", error.message); return new Map(); }
  return new Map((data || []).map((profile) => [profile.id, profile]));
}

async function fetchRemoteStudySessions() {
  if (!remoteClient || !currentUser) return;
  const { data, error } = await remoteClient.from("study_sessions").select("id, user_id, started_at, ended_at").order("started_at", { ascending: true });
  if (error) { console.error("fetch study sessions:", error.message); return; }
  const profiles = await getRemoteProfiles((data || []).map((session) => session.user_id));
  studySessions = (data || []).map((session) => ({
    id: session.id,
    userId: session.user_id,
    name: profiles.get(session.user_id)?.display_name || "成员",
    avatarUrl: profiles.get(session.user_id)?.avatar_url || "",
    startedAt: session.started_at,
    endedAt: session.ended_at
  }));
  renderCheckin();
}

async function fetchRemoteTopics() {
  if (!remoteClient || !currentUser) return;
  const { data: topicRows, error: topicError } = await remoteClient
    .from("topics")
    .select("id, author_id, category, title, excerpt, created_at")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (topicError) { console.error("fetch topics:", topicError.message); return; }
  const { data: replyRows, error: replyError } = await remoteClient.from("replies").select("topic_id, body");
  if (replyError) console.error("fetch replies:", replyError.message);
  const profiles = await getRemoteProfiles((topicRows || []).map((topic) => topic.author_id));
  const repliesByTopic = new Map();
  (replyRows || []).forEach((reply) => repliesByTopic.set(reply.topic_id, [...(repliesByTopic.get(reply.topic_id) || []), reply.body]));
  topics = (topicRows || []).map((topic) => ({
    id: topic.id,
    category: topic.category,
    title: topic.title,
    excerpt: topic.excerpt,
    author: profiles.get(topic.author_id)?.display_name || "成员",
    avatarUrl: profiles.get(topic.author_id)?.avatar_url || "",
    role: topic.author_id === currentUser.id ? "我" : "社区成员",
    time: formatRelativeTime(topic.created_at),
    replies: repliesByTopic.get(topic.id) || []
  }));
  updateCategoryCounts();
  renderTopics();
}

async function resolveRemoteUser() {
  if (!remoteClient) return;
  const { data: { user } } = await remoteClient.auth.getUser();
  if (!user) { currentUser = null; updateUserInterface(); renderCheckin(); return; }
  const { data: profile } = await remoteClient.from("profiles").select("display_name, gender, avatar_url, profile_completed_at").eq("id", user.id).maybeSingle();
  currentUser = {
    id: user.id,
    email: user.email,
    name: profile?.display_name || user.user_metadata?.display_name || user.email.split("@")[0],
    gender: profile?.gender || "prefer_not",
    avatarUrl: profile?.avatar_url || "",
    profileCompleted: Boolean(profile?.profile_completed_at)
  };
  updateUserInterface();
  if (!currentUser.profileCompleted) window.setTimeout(openProfileDialog, 250);
  await Promise.all([fetchRemoteStudySessions(), fetchRemoteTopics()]);
}

function initializeRemoteData() {
  if (!remoteClient) return;
  resolveRemoteUser();
  remoteClient.auth.onAuthStateChange(() => resolveRemoteUser());
  remoteClient.channel("m304-live-data")
    .on("postgres_changes", { event: "*", schema: "public", table: "study_sessions" }, fetchRemoteStudySessions)
    .on("postgres_changes", { event: "*", schema: "public", table: "topics" }, fetchRemoteTopics)
    .on("postgres_changes", { event: "*", schema: "public", table: "replies" }, fetchRemoteTopics)
    .subscribe();
}

function formatMinutes(minutes) {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return hours ? `${hours}小时${remainder}分钟` : `${remainder}分钟`;
}

function formatElapsed(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function getSessionMinutes(session, now = Date.now()) {
  const startedAt = new Date(session.startedAt).getTime();
  const endedAt = session.endedAt ? new Date(session.endedAt).getTime() : now;
  return Math.max(0, Math.floor((endedAt - startedAt) / 60000));
}

function getUserSessions(userId = currentUserId()) {
  return userId ? studySessions.filter((session) => session.userId === userId) : [];
}

function getActiveStudySession(userId = currentUserId()) {
  return [...getUserSessions(userId)].reverse().find((session) => !session.endedAt) || null;
}

function getUserDayMinutes(dayKey, userId = currentUserId()) {
  return getUserSessions(userId)
    .filter((session) => getDateKey(new Date(session.startedAt)) === dayKey)
    .reduce((total, session) => total + getSessionMinutes(session), 0);
}

function getUserWeekMinutes(userId = currentUserId()) {
  return getWeekDayKeys().reduce((total, dayKey) => total + getUserDayMinutes(dayKey, userId), 0);
}

function getUserTotalMinutes(userId = currentUserId()) {
  return getUserSessions(userId).reduce((total, session) => total + getSessionMinutes(session), 0);
}

function getUserStreak(userId = currentUserId()) {
  let streak = 0;
  for (let offset = 0; getUserDayMinutes(localDayKey(-offset), userId) > 0; offset += 1) streak += 1;
  return streak;
}

function getWeeklyLeaders() {
  const leaders = new Map();
  const weekDays = new Set(getWeekDayKeys());
  studySessions.forEach((session) => {
    if (weekDays.has(getDateKey(new Date(session.startedAt)))) {
      const existing = leaders.get(session.userId) || { userId: session.userId, name: session.name, avatarUrl: session.avatarUrl || "", minutes: 0 };
      existing.minutes += getSessionMinutes(session);
      leaders.set(session.userId, existing);
    }
  });
  return [...leaders.values()].filter((entry) => entry.minutes > 0).sort((a, b) => b.minutes - a.minutes || a.name.localeCompare(b.name, "zh-CN"));
}

function updateStudyTimer() {
  const activeSession = getActiveStudySession();
  const timer = document.querySelector("#study-timer");
  const state = document.querySelector("#study-timer-state");
  const todayDuration = document.querySelector("#checkin-today");
  if (!timer || !state || !todayDuration) return;

  if (activeSession) {
    timer.textContent = formatElapsed(Date.now() - new Date(activeSession.startedAt).getTime());
    state.textContent = "正在学习";
  } else {
    timer.textContent = "00:00:00";
    state.textContent = currentUser ? "准备开始下一次学习" : "登录后开始学习";
  }
  todayDuration.textContent = formatMinutes(getUserDayMinutes(localDayKey()));
}

function syncStudyTimer() {
  window.clearInterval(studyTimerId);
  updateStudyTimer();
  if (getActiveStudySession()) studyTimerId = window.setInterval(updateStudyTimer, 1000);
}

function renderCheckin() {
  const today = new Date();
  const todayText = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(today);
  const activeSession = getActiveStudySession();
  const weeklyMinutes = getUserWeekMinutes();
  const totalMinutes = getUserTotalMinutes();
  const leaders = getWeeklyLeaders();
  const userRank = currentUser ? leaders.findIndex((entry) => entry.userId === currentUserId()) + 1 : 0;
  const button = document.querySelector("#checkin-button");

  document.querySelector("#checkin-date").textContent = todayText;
  document.querySelector("#checkin-streak").textContent = getUserStreak();
  document.querySelector("#checkin-weekly").textContent = formatMinutes(weeklyMinutes);
  document.querySelector("#checkin-total").textContent = formatMinutes(totalMinutes);
  document.querySelector("#checkin-rank").textContent = userRank ? `#${userRank}` : "--";
  document.querySelector("#goal-label").textContent = `${formatMinutes(weeklyMinutes)} / 10小时`;
  document.querySelector("#goal-progress").style.width = `${Math.min(weeklyMinutes / 600, 1) * 100}%`;
  button.classList.toggle("is-active", Boolean(activeSession));
  button.innerHTML = activeSession
    ? '<i data-lucide="square-stop"></i><span>结束并记录</span>'
    : '<i data-lucide="play"></i><span>开始学习</span>';

  const leaderboard = document.querySelector("#leaderboard-list");
  leaderboard.innerHTML = leaders.length
    ? leaders.map((entry, index) => `<li class="leaderboard-entry">
        <span class="leaderboard-position">${index + 1}</span>
        <span class="leaderboard-person">${entry.avatarUrl ? `<img src="${escapeHtml(entry.avatarUrl)}" alt="" />` : escapeHtml(getInitial(entry.name))}</span>
        <span class="leaderboard-name">${escapeHtml(entry.name)}</span>
        <span class="leaderboard-days">${formatMinutes(entry.minutes)}</span>
      </li>`).join("")
    : '<li class="leaderboard-empty">本周还没有学习记录。<br />从现在开始计时吧。</li>';
  syncStudyTimer();
  lucide.createIcons();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getInitial(name) {
  return Array.from(name.trim())[0]?.toUpperCase() || "M";
}

function filteredTopics() {
  const query = searchTerm.trim().toLowerCase();
  return topics.filter((topic) => {
    const categoryMatches = activeCategory === "all" || topic.category === activeCategory;
    const text = `${topic.title} ${topic.excerpt} ${topic.author}`.toLowerCase();
    return categoryMatches && (!query || text.includes(query));
  });
}

function topicMarkup(topic) {
  const replyForm = activeReplyId === topic.id
    ? `<form class="reply-form" data-reply-form="${topic.id}">
        <input maxlength="240" required aria-label="回复内容" placeholder="写下你的回复" />
        <button class="button button-primary" type="submit">回复</button>
      </form>`
    : "";

  const avatar = topic.avatarUrl
    ? `<img src="${escapeHtml(topic.avatarUrl)}" alt="" />`
    : escapeHtml(getInitial(topic.author));
  return `<article class="topic-card">
    <div class="topic-card-top">
      <div class="topic-avatar" aria-hidden="true">${avatar}</div>
      <div class="topic-main">
        <div class="topic-meta">
          <strong>${escapeHtml(topic.author)}</strong>
          <span>${escapeHtml(topic.role)}</span>
          <span class="category-tag">${categoryLabels[topic.category]}</span>
          <span>${escapeHtml(topic.time)}</span>
        </div>
        <h3><button type="button" data-open-topic="${topic.id}">${escapeHtml(topic.title)}</button></h3>
        <p class="topic-excerpt">${escapeHtml(topic.excerpt)}</p>
      </div>
    </div>
    <div class="topic-footer">
      <button class="topic-action" type="button" data-reply-topic="${topic.id}"><i data-lucide="message-square"></i>回复 ${topic.replies.length}</button>
      <button class="topic-action" type="button" data-share-topic="${topic.id}"><i data-lucide="link"></i>分享</button>
    </div>
    ${replyForm}
  </article>`;
}

function renderTopics() {
  const filtered = filteredTopics();
  feedState.textContent = searchTerm ? `搜索结果：${searchTerm}` : categoryLabels[activeCategory];
  postCount.textContent = `${filtered.length} 个话题`;
  if (filtered.length) {
    topicList.innerHTML = filtered.map(topicMarkup).join("");
  } else if (topics.length || searchTerm || activeCategory !== "all") {
    topicList.innerHTML = '<p class="empty-state">没有找到相关话题，换个关键词或分区试试。</p>';
  } else {
    topicList.innerHTML = `<div class="empty-state empty-community-state">
      <i data-lucide="message-circle-plus"></i>
      <strong>还没有话题</strong>
      <p>成为第一个提出问题的人。</p>
      <button class="button button-primary" type="button" data-start-topic>提出问题 <i data-lucide="square-pen"></i></button>
    </div>`;
  }
  lucide.createIcons();
}

function updateCategoryCounts() {
  document.querySelectorAll(".category-item").forEach((button) => {
    const category = button.dataset.category;
    const count = category === "all" ? topics.length : topics.filter((topic) => topic.category === category).length;
    button.querySelector("span").textContent = count;
  });
}

function updateUserInterface() {
  loginTriggers.forEach((button) => {
    button.textContent = currentUser ? currentUser.name : "登录社区";
    button.classList.toggle("is-user", Boolean(currentUser));
  });
  if (accountLoginLink) accountLoginLink.hidden = Boolean(remoteClient && currentUser);
  if (accountMenuTrigger) accountMenuTrigger.hidden = !(remoteClient && currentUser);
  if (accountMenuTrigger && !currentUser) accountMenuTrigger.setAttribute("aria-expanded", "false");
  if (accountName && currentUser) accountName.textContent = currentUser.name || "成员";
  if (accountAvatar && currentUser) {
    accountAvatar.innerHTML = currentUser.avatarUrl
      ? `<img src="${escapeHtml(currentUser.avatarUrl)}" alt="" />`
      : escapeHtml(getInitial(currentUser.name || "M"));
  }
}

function setProfileMessage(message, type = "") {
  if (!profileMessage) return;
  profileMessage.textContent = message;
  profileMessage.className = `profile-message ${type ? `is-${type}` : ""}`;
}

function renderProfilePreview() {
  if (!currentUser) return;
  const avatar = document.querySelector("#profile-avatar-preview");
  const name = document.querySelector("#profile-preview-name");
  const email = document.querySelector("#profile-preview-email");
  name.textContent = currentUser.name || "新成员";
  email.textContent = currentUser.email || "成员邮箱";
  avatar.innerHTML = currentUser.avatarUrl
    ? `<img src="${escapeHtml(currentUser.avatarUrl)}" alt="" />`
    : escapeHtml(getInitial(currentUser.name || "M"));
}

function openProfileDialog() {
  if (!profileDialog || !currentUser || !remoteClient) return;
  document.querySelector("#profile-name").value = currentUser.name || "";
  document.querySelector("#profile-gender").value = currentUser.gender || "prefer_not";
  document.querySelector("#profile-avatar").value = "";
  setProfileMessage(currentUser.profileCompleted ? "" : "请先完善资料，再开始使用成员功能。");
  renderProfilePreview();
  if (!profileDialog.open) profileDialog.showModal();
}

function isImageFile(file) {
  return file && ["image/jpeg", "image/png", "image/webp"].includes(file.type);
}

async function uploadAvatar(file) {
  if (!file) return currentUser?.avatarUrl || null;
  if (!isImageFile(file)) throw new Error("头像仅支持 JPG、PNG 或 WebP 格式");
  if (file.size > 2 * 1024 * 1024) throw new Error("头像大小不能超过 2 MB");
  const extension = file.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${currentUser.id}/avatar-${Date.now()}.${extension}`;
  const { error } = await remoteClient.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
  if (error) throw error;
  return remoteClient.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function openLogin() {
  if (currentUser) {
    showToast(`当前以 ${currentUser.name} 的身份登录`);
    return;
  }
  if (remoteClient) {
    window.location.href = "login.html";
    return;
  }
  loginDialog.showModal();
  document.querySelector("#login-name").focus();
}

function toggleComposer() {
  if (!currentUser) {
    openLogin();
    return;
  }
  topicForm.hidden = !topicForm.hidden;
  if (!topicForm.hidden) document.querySelector("#topic-title").focus();
}

function relativeTimeNow() {
  return "刚刚";
}

document.querySelector(".nav-toggle").addEventListener("click", () => {
  document.querySelector(".site-nav").classList.toggle("is-open");
});

document.querySelectorAll(".site-nav a").forEach((link) => {
  link.addEventListener("click", () => document.querySelector(".site-nav").classList.remove("is-open"));
});

loginTriggers.forEach((trigger) => trigger.addEventListener("click", openLogin));
composerTriggers.forEach((trigger) => trigger.addEventListener("click", toggleComposer));

document.querySelector(".close-composer").addEventListener("click", () => {
  topicForm.hidden = true;
});

document.querySelector(".close-dialog").addEventListener("click", () => loginDialog.close());
document.querySelector(".close-profile").addEventListener("click", () => profileDialog.close());
profileEditTrigger?.addEventListener("click", () => {
  accountMenu.hidden = true;
  accountMenuTrigger?.setAttribute("aria-expanded", "false");
  openProfileDialog();
});
accountMenuTrigger?.addEventListener("click", () => {
  const isOpen = accountMenu.hidden;
  accountMenu.hidden = !isOpen;
  accountMenuTrigger.setAttribute("aria-expanded", String(isOpen));
});
accountLogout?.addEventListener("click", async () => {
  if (!remoteClient) return;
  accountLogout.disabled = true;
  const { error } = await remoteClient.auth.signOut();
  accountLogout.disabled = false;
  if (error) return showToast(error.message);
  accountMenu.hidden = true;
  showToast("已退出登录");
});
document.addEventListener("click", (event) => {
  if (!accountMenu || accountMenu.hidden || event.target.closest(".header-account")) return;
  accountMenu.hidden = true;
  accountMenuTrigger?.setAttribute("aria-expanded", "false");
});

document.querySelector("#profile-avatar")?.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file || !isImageFile(file)) return;
  const preview = document.querySelector("#profile-avatar-preview");
  preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="" />`;
});

profileForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!remoteClient || !currentUser) return;
  const name = document.querySelector("#profile-name").value.trim();
  const gender = document.querySelector("#profile-gender").value;
  const avatarFile = document.querySelector("#profile-avatar").files[0];
  if (!name) return setProfileMessage("请输入用户名", "error");
  const button = event.currentTarget.querySelector("button[type='submit']");
  button.disabled = true;
  setProfileMessage("正在保存资料...");
  try {
    const avatarUrl = await uploadAvatar(avatarFile);
    const { data, error } = await remoteClient.rpc("update_my_profile", { p_display_name: name, p_gender: gender, p_avatar_url: avatarUrl });
    if (error) throw error;
    currentUser = { ...currentUser, name, gender, avatarUrl, profileCompleted: true };
    updateUserInterface();
    renderProfilePreview();
    profileDialog.close();
    showToast("个人资料已更新");
    await Promise.all([fetchRemoteStudySessions(), fetchRemoteTopics()]);
  } catch (error) {
    setProfileMessage(error.message || "资料保存失败", "error");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  currentUser = { name: form.get("name").trim(), email: form.get("email").trim() };
  localStorage.setItem(userKey, JSON.stringify(currentUser));
  loginDialog.close();
  updateUserInterface();
  renderCheckin();
  showToast(`欢迎来到 M304 社区，${currentUser.name}`);
});

document.querySelector("#checkin-button").addEventListener("click", async () => {
  if (!currentUser) return openLogin();
  const activeSession = getActiveStudySession();
  if (remoteClient) {
    const request = activeSession
      ? remoteClient.rpc("end_study_session", { p_session_id: activeSession.id })
      : remoteClient.rpc("start_study_session");
    const { error } = await request;
    if (error) return showToast(error.message);
    await fetchRemoteStudySessions();
    showToast(activeSession ? "本次学习已记录" : "已开始学习，计时已启动");
    return;
  }
  if (activeSession) {
    activeSession.endedAt = new Date().toISOString();
    saveStudySessions();
    renderCheckin();
    showToast(`本次学习已记录：${formatMinutes(getSessionMinutes(activeSession))}`);
    return;
  }
  studySessions.push({
    id: `session-${Date.now()}`,
    userId: currentUserId(),
    name: currentUser.name,
    startedAt: new Date().toISOString(),
    endedAt: null
  });
  saveStudySessions();
  renderCheckin();
  showToast("已开始学习，计时已启动");
});

document.querySelector("#forum-search").addEventListener("input", (event) => {
  searchTerm = event.target.value;
  renderTopics();
});

document.querySelectorAll(".category-item").forEach((button) => {
  button.addEventListener("click", () => {
    activeCategory = button.dataset.category;
    document.querySelectorAll(".category-item").forEach((item) => item.classList.toggle("is-active", item === button));
    renderTopics();
  });
});

topicForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) return openLogin();
  const title = document.querySelector("#topic-title").value.trim();
  const category = document.querySelector("#topic-category").value;
  if (!title) return;

  if (remoteClient) {
    const { error } = await remoteClient.from("topics").insert({
      author_id: currentUser.id,
      category,
      title,
      excerpt: "这是一条新发布的话题，欢迎大家在下方回复交流。"
    });
    if (error) return showToast(error.message);
    topicForm.reset();
    topicForm.hidden = true;
    activeCategory = "all";
    document.querySelectorAll(".category-item").forEach((item) => item.classList.toggle("is-active", item.dataset.category === "all"));
    await fetchRemoteTopics();
    showToast("话题已发布");
    return;
  }

  topics.unshift({
    id: `topic-${Date.now()}`,
    category,
    title,
    excerpt: "这是一条新发布的话题，欢迎大家在下方回复交流。",
    author: currentUser.name,
    role: "社区成员",
    time: relativeTimeNow(),
    replies: []
  });
  topicForm.reset();
  topicForm.hidden = true;
  activeCategory = "all";
  document.querySelectorAll(".category-item").forEach((item) => item.classList.toggle("is-active", item.dataset.category === "all"));
  saveTopics();
  updateCategoryCounts();
  renderTopics();
  showToast("话题已发布");
});

topicList.addEventListener("click", async (event) => {
  const startTopicButton = event.target.closest("[data-start-topic]");
  const replyButton = event.target.closest("[data-reply-topic]");
  const shareButton = event.target.closest("[data-share-topic]");
  const openButton = event.target.closest("[data-open-topic]");

  if (startTopicButton) {
    toggleComposer();
    return;
  }

  if (replyButton) {
    if (!currentUser) return openLogin();
    activeReplyId = activeReplyId === replyButton.dataset.replyTopic ? null : replyButton.dataset.replyTopic;
    renderTopics();
  }

  if (shareButton) {
    const topic = topics.find((item) => item.id === shareButton.dataset.shareTopic);
    const shareText = `M304 讨论社区：${topic.title}`;
    try {
      await navigator.clipboard.writeText(shareText);
      showToast("话题标题已复制");
    } catch {
      showToast("请复制浏览器地址分享该话题");
    }
  }

  if (openButton) {
    const topic = topics.find((item) => item.id === openButton.dataset.openTopic);
    showToast(`“${topic.title}”当前有 ${topic.replies.length} 条回复`);
  }
});

topicList.addEventListener("submit", async (event) => {
  const form = event.target.closest("[data-reply-form]");
  if (!form) return;
  event.preventDefault();
  if (!currentUser) return openLogin();
  const input = form.querySelector("input");
  const message = input.value.trim();
  if (!message) return;
  const topic = topics.find((item) => item.id === form.dataset.replyForm);
  if (remoteClient) {
    const { error } = await remoteClient.from("replies").insert({
      topic_id: topic.id,
      author_id: currentUser.id,
      body: message
    });
    if (error) return showToast(error.message);
    activeReplyId = null;
    await fetchRemoteTopics();
    showToast("回复已发布");
    return;
  }
  topic.replies.push(message);
  activeReplyId = null;
  saveTopics();
  renderTopics();
  showToast("回复已发布");
});

window.addEventListener("storage", (event) => {
  if (event.key === storageKey) {
    topics = loadTopics();
    updateCategoryCounts();
    renderTopics();
  }
  if (event.key === studySessionKey) {
    studySessions = loadStudySessions();
    renderCheckin();
  }
});

channel?.addEventListener("message", (event) => {
  if (event.data.type === "topics-updated") {
    topics = loadTopics();
    updateCategoryCounts();
    renderTopics();
  }
  if (event.data.type === "sessions-updated") {
    studySessions = loadStudySessions();
    renderCheckin();
  }
});

updateCategoryCounts();
updateUserInterface();
renderTopics();
renderCheckin();
initializeRemoteData();
