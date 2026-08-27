# M304 创新实验室官网

这是一个不需要构建工具的静态网站，可直接部署到 GitHub Pages。

## 本地预览

仅查看静态界面时可以直接双击 `index.html`。启用 Supabase 后，请在本目录运行 `python -m http.server 5500`，再访问 `http://localhost:5500`，这样邮箱登录、云端论坛和学习时长同步才能正常工作。论坛首次打开时不预置任何话题，页面会等待第一位同学提出问题。学习打卡会展示个人的当日状态、连续天数、本周目标与周榜。

## 已完成栏目

- 首页：实验室介绍、培养方向、成员、纳新与联系入口
- 学习计时：开始学习、秒级计时、结束结算、当日/本周/累计学习时长和周榜
- 讨论社区：空白社区、分区、检索、发帖与回复界面
- 成果档案：`awards.html`，支持分类、检索、证书查看和键盘切换
- 社团活动：`activities.html`，分为往期活动与计划活动；未确认的今年安排均标注为“筹备中”。

学习计时与排行榜的数据模型参考了 [ldt471146/lab304](https://github.com/ldt471146/lab304) 的公开实现：学习会话以开始和结束时间结算时长。当前项目未包含其座位预约和管理功能。

## 成员登录与数据库

- `login.html`：仅支持受邀邮箱登录；受邀用户首次进入可设置显示名称和密码。
- `admin.html`：仅管理员可访问，用于向指定邮箱发送邀请码和邀请链接。
- `supabase/schema.sql`：成员、学习时长、论坛、邀请审计和行级权限规则。
- `supabase/profile-migration.sql`：已有 Supabase 项目增加用户名、性别和可选头像功能时执行的迁移脚本。
- `supabase/functions/send-invite`：安全发送邀请码的 Supabase Edge Function。

按 [supabase/README.md](supabase/README.md) 部署。填入 `supabase-config.js` 的只能是项目 URL 与匿名密钥；绝不能填写 `SUPABASE_SERVICE_ROLE_KEY`、QQ 邮箱密码或 SMTP 授权码。

## GitHub Pages 发布

1. 在 GitHub 新建一个公开仓库，例如 `m304-lab-website`。
2. 将本目录的所有文件上传至仓库根目录。
3. 进入仓库的 `Settings` -> `Pages`。
4. 在 `Build and deployment` 中选择 `Deploy from a branch`，分支选择 `main`，目录选择 `/(root)`，保存。
5. 等待发布完成后，通过 GitHub 提供的网址访问。访问者不需要 GitHub 账号。

## 论坛接入 Supabase

真实论坛需要在 Supabase 中创建认证、帖子、回复和存储表，并配置行级安全规则。前端只可使用 Supabase 的匿名公钥，严禁在仓库中提交 `service_role` 密钥、邮箱密码或 SMTP 授权码。

建议的数据表：

- `profiles`：昵称、头像、社区角色
- `topics`：标题、分区、正文、作者、创建时间、置顶状态
- `replies`：话题 ID、作者、正文、创建时间
- `reports`：举报对象、原因、处理状态

上线前还应配置邮箱验证、发布频率限制、举报审核与管理员权限。
