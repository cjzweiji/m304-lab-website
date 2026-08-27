const adminClient = window.m304Supabase;
const adminContent = document.querySelector("#admin-content");
const deniedContent = document.querySelector("#admin-denied");
const inviteResult = document.querySelector("#invite-result");

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function showInviteResult(message, isError = false) {
  inviteResult.hidden = false;
  inviteResult.textContent = message;
  inviteResult.style.borderColor = isError ? "#e9b6ae" : "#b9d4bf";
  inviteResult.style.background = isError ? "#fff1ef" : "#edf8ef";
  inviteResult.style.color = isError ? "#933d31" : "#275e35";
}

async function loadInviteHistory() {
  const { data, error } = await adminClient.from("invitation_audit").select("email, assigned_role, status, created_at").order("created_at", { ascending: false }).limit(12);
  const list = document.querySelector("#invite-history");
  if (error) { list.innerHTML = "<li><span>暂无邀请记录</span></li>"; return; }
  list.innerHTML = data.length ? data.map((invite) => `<li><div><strong>${escapeHtml(invite.email)}</strong><span>${invite.assigned_role === "moderator" ? "社区协管" : "成员"} · ${new Date(invite.created_at).toLocaleDateString("zh-CN")}</span></div><span>${escapeHtml(invite.status)}</span></li>`).join("") : "<li><span>暂无邀请记录</span></li>";
}

async function initializeAdmin() {
  lucide.createIcons();
  if (!adminClient) { deniedContent.innerHTML = "<p class=\"eyebrow\">CONFIGURATION REQUIRED</p><h1>尚未配置数据服务</h1><p>请先在 supabase-config.js 填入项目 URL 与匿名密钥。</p>"; return; }
  const { data: { user } } = await adminClient.auth.getUser();
  if (!user) { window.location.replace("login.html"); return; }
  const { data: profile } = await adminClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") { deniedContent.innerHTML = "<p class=\"eyebrow\">ADMIN ONLY</p><h1>没有管理员权限</h1><p>当前账户不能发送成员邀请。</p>"; return; }
  deniedContent.hidden = true;
  adminContent.hidden = false;
  await loadInviteHistory();
}

document.querySelector("#invite-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!adminClient) return;
  const { data: { session } } = await adminClient.auth.getSession();
  const button = event.currentTarget.querySelector("button");
  button.disabled = true;
  const response = await fetch(`${window.M304_SUPABASE_CONFIG.url}/functions/v1/send-invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: window.M304_SUPABASE_CONFIG.anonKey, Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ email: document.querySelector("#invite-email").value.trim(), role: document.querySelector("#invite-role").value })
  });
  const payload = await response.json();
  button.disabled = false;
  if (!response.ok) return showInviteResult(payload.error || "邀请发送失败", true);
  showInviteResult(`邀请已发送。邀请码：${payload.inviteCode}，有效至 ${new Date(payload.expiresAt).toLocaleDateString("zh-CN")}。`);
  event.currentTarget.reset();
  await loadInviteHistory();
});

initializeAdmin();
