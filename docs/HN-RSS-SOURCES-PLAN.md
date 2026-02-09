# HN 热门博客 RSS 源配置方案

## 信源信息

- **来源**: https://gist.github.com/emschwartz/e6d2bf860ccc367fe37ff953ba6de66b
- **说明**: HN Popularity Contest 2025 年度结果
- **总数**: 92 个热门技术博客
- **格式**: OPML (Outline Processor Markup Language)

## 博客列表预览（前 20）

1. simonwillison.net - https://simonwillison.net/atom/everything/
2. jeffgeerling.com - https://www.jeffgeerling.com/blog.xml
3. seangoedecke.com - https://www.seangoedecke.com/rss.xml
4. krebsonsecurity.com - https://krebsonsecurity.com/feed/
5. daringfireball.net - https://daringfireball.net/feeds/main
6. antirez.com - http://antirez.com/rss
7. pluralistic.net - https://pluralistic.net/feed/
8. mitchellh.com - https://mitchellh.com/feed.xml
9. xeiaso.net - https://xeiaso.net/blog.rss
10. righto.com - https://www.righto.com/feeds/posts/default
11. overreacted.io - https://overreacted.io/rss.xml (Dan Abramov)
12. paulgraham.com - http://www.aaronsw.com/2002/feeds/pgessays.rss
13. matklad.github.io - https://matklad.github.io/feed.xml
14. gwern.net - https://gwern.substack.com/feed
15. troyhunt.com - https://www.troyhunt.com/rss/
16. anildash.com - https://anildash.com/feed.xml
17. computer.rip - https://computer.rip/rss.xml
18. devblogs.microsoft.com/oldnewthing - Microsoft Old New Thing
19. lucumr.pocoo.org - Armin Ronacher (Flask 作者)
20. rachelbythebay.com - https://rachelbythebay.com/w/atom.xml

## 三种配置方案

### 方案 1：添加 OPML 导入功能 ⭐ (推荐)

**优点**:
- 用户可以导入任何 OPML 文件
- 支持从 Feedly、Inoreader 等 RSS 阅读器导出的订阅
- 一次性批量添加
- 最灵活，适合高级用户

**实现步骤**:
1. 在 `SubscriptionDialog` 添加"导入 OPML"按钮
2. 创建 `importOPML` 服务函数解析 OPML 文件
3. 批量创建订阅记录

### 方案 2：扩展预设订阅列表 ⚡ (快速)

**优点**:
- 无需额外开发
- 用户可以直接选择添加
- 简单直观

**实现步骤**:
1. 将 92 个博客添加到 `PRESET_COMPANIES` 数组
2. 按分类整理（Tech、AI、Programming、Security 等）
3. 用户从下拉菜单选择添加

### 方案 3：创建批量导入脚本 🔧 (开发者)

**优点**:
- 一次性导入所有订阅
- 适合初始化演示数据
- 可以自定义分类和关键词

**实现步骤**:
1. 创建 Node.js 脚本解析 OPML
2. 生成 SQL 或 JSON 数据
3. 直接导入到 IndexedDB

## 推荐方案组合

**短期（立即可用）**: 方案 2 - 将热门博客加入预设列表
**长期（功能完善）**: 方案 1 - 添加 OPML 导入功能

## 下一步

请选择你想要的方案：

1. **方案 1** - 我来实现完整的 OPML 导入功能
2. **方案 2** - 快速扩展预设列表，添加这 92 个博客
3. **方案 3** - 创建批量导入脚本
4. **组合方案** - 先做方案 2（快），再做方案 1（完善）

你想要哪种方案？
