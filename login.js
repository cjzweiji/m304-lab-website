const authClient = window.m304Supabase;
const authMessage = document.querySelector("#auth-message");
const signInForm = document.querySelector("#sign-in-form");
const onboarding = document.querySelector("#onboarding-form");
const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");

function setMessage(message, type = "") {
  authMessage.textContent = message;
  authMessage.className = `auth-message ${type ? `is-${type}` : ""}`;
}

function siteLoginUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

function setInviteMode() {
  document.querySelector("#auth-title").textContent = mode === "reset" ? "设置新密码" : "完成受邀账户设置";
  document.querySelector("#auth-lede").textContent = mode === "reset" ? "为你的 M304 账户设置一个新密码。" : "设置显示名称和密码后，即可进入 M304。";
  signInForm.hidden = true;
  onboarding.hidden = false;
}

async function initializeLogin() {
  lucide.createIcons();
  if (!authClient) {
    document.querySelector("#config-notice").hidden = false;
    signInForm.querySelector("button").disabled = true;
    return;
  }
  const { data: { session } } = await authClient.auth.getSession();
  if (session && (mode === "invite" || mode === "reset")) setInviteMode();
  if (session && !mode) window.location.replace("index.html");
}

signInForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!authClient) return;
  const email = document.querySelector("#sign-in-email").value.trim();
  const password = document.querySelector("#sign-in-password").value;
  setMessage("正在登录...");
  const { error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) return setMessage(error.message, "error");
  window.location.replace("index.html");
});

document.querySelector("#activate-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!authClient) return;
  const name = document.querySelector("#activate-name").value.trim();
  const password = document.querySelector("#activate-password").value;
  const confirmed = document.querySelector("#activate-confirm-password").value;
  if (password !== confirmed) return setMessage("两次输入的密码不一致", "error");
  setMessage("正在保存账户...");
  const { error: updateError } = await authClient.auth.updateUser({ password, data: { display_name: name } });
  if (updateError) return setMessage(updateError.message, "error");
  const { error: profileError } = await authClient.rpc("set_my_display_name", { p_display_name: name });
  if (profileError) return setMessage(profileError.message, "error");
  await authClient.rpc("complete_my_invitation");
  window.location.replace("index.html");
});

document.querySelector("#reset-password").addEventListener("click", async () => {
  if (!authClient) return;
  const email = document.querySelector("#sign-in-email").value.trim();
  if (!email) return setMessage("请先输入需要重置的邮箱", "error");
  setMessage("正在发送重置邮件...");
  const { error } = await authClient.auth.resetPasswordForEmail(email, { redirectTo: `${siteLoginUrl()}?mode=reset` });
  setMessage(error ? error.message : "重置邮件已发送，请检查邮箱。", error ? "error" : "success");
});

initializeLogin();
