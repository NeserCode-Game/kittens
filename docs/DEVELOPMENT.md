# 开发与上游说明

本文面向参与开发、验证或维护本项目的读者。玩家安装、操作与存档说明请回到
[README](../README.md)。

项目保留固定版本的 Kittens Game 上游模拟逻辑和原版存档格式，但不加载原版
页面、原版 CSS 或 iframe；游戏界面由 React 和 Tailwind 重新实现。

当前应用版本：`1.0.0`；上游逻辑版本：`1.6.1.6`。
产品名为“猫国建设者”，应用标识为 `com.nesercode.kittensgame`，二进制名为
`kittens-game`。

## 当前状态

已交付 M1 内核、M2 核心界面、M3 中后期系统、M4 工程闭环和 M5 数值验收：

- 无原版页面 UI 启动完整 `GamePage` 模拟内核。
- 5 Hz 游戏循环、资源生产、采集、精炼和价格增长由上游逻辑驱动。
- 建筑解锁、可购状态、建造与批量数量展示来自上游模型。
- 村庄职业分配、空闲猫、幸福度与职业效果来自上游村庄管理器。
- 科技与政策研究复用上游控制器，政策确认和取消由新 UI 对话框承接。
- 工坊制作、批量制作、工程猫进度和永久升级沿用上游价格与购买规则。
- 贸易、宗教、太空、时间与挑战操作均通过上游控制器结算价格、随机收获和副作用。
- 时间页提供原生转生预览；业力、领导力、幸福、存储、产出和斑马继承由上游
  `_resetInternal()` 结算，确认后自动载入新一轮存档。
- 进度页展示伦理成就、星标、徽章、跨存档统计和本局统计。
- 游戏设置直接读写上游布尔选项，并通过原版存档格式保留。
- 使用原版 `com.nuclearunicorn.kittengame.savedata` 存档键和序列化格式。
- 存档管理支持压缩文本导出、文件下载、文本/文件导入、恢复点、重置和
  v14 到 v15 迁移。
- 损坏存档会暂停模拟且禁止自动保存覆盖，可通过有效存档、备份或手动重置恢复。
- 新的资源总览、系统导航、存档面板和响应式应用外壳；资源、日期与存档控件
  整合进应用标题栏，游戏设置并入应用设置。
- 原生游戏界面提供亮色鼠尾草纸面与暗色森林夜主题，系统导航、状态提示、
  移动抽屉和存档对话框共享同一套语义色板。
- 中文词典覆盖上游全部 2611 个键；原生界面、标题栏、资源浮窗、存档管理、
  游戏设置、确认框和无障碍标签支持中英文运行时切换，切换语言不会丢失进度。
- 标题栏日历使用固定宽度和数字等宽排版，年份、季节和日期增长不会改变按钮
  几何尺寸；新界面同时提供键盘快捷键和焦点管理。
- Playwright 覆盖采集、精炼、建造、职业分配、研究、政策确认、制作、升级、
  设置、保存、刷新恢复、M3 中后期操作、M4 存档迁移与错误恢复，以及 M5
  季节、批量价格、离线时间、随机贸易和转生继承差分；亮暗主题测试同时检查
  关键文本对比度和 1440、1024、800 像素视口的横向溢出。国际化测试扫描全部
  游戏页签、标题栏、资源浮窗、存档管理和游戏设置，确保英文界面不残留中文。

M5 数值验收已完成：同一夹具与命令在隔离的原版 `GamePage` 和原生内核中逐字段
一致，包括完整序列化存档；业力、领导力、低温舱猫、挑战、perk、计时状态和
跨轮统计均由原版重置路径生成。

## 架构

```text
src/game/upstream/       固定提交的上游逻辑和语言资源
        |
        v
src/game/kernel/         隔离闭包、类型化快照、命令与调度
        |
        v
src/features/kittens/    React 订阅与游戏交互
        |
        v
src/views/KittensGame    全新游戏界面
```

React 不直接修改管理器内部对象。内核将可序列化状态映射为快照，并通过
`gather`、`craftWood`、`buyBuilding`、`assignJob`、`research`、`craft`、
`buyUpgrade`、`trade`、`praise`、`launchSpaceProgram`、`shatterTime`、
`toggleChallenge`、`setSetting`、`exportSave`、`importSave`、`createBackup`、
`restoreBackup`、`resetTimeline`、`resetGame` 等命令执行原版逻辑。

## 开发

要求 Node.js 18+、pnpm 9+、Rust stable 和对应 Tauri 平台依赖。

```bash
pnpm install
pnpm dev
pnpm tauri dev
```

常用检查：

```bash
pnpm kittensgame:verify
pnpm kittensgame:i18n
pnpm lint
pnpm build
cargo check --manifest-path src-tauri/Cargo.toml
pnpm kittensgame:smoke
pnpm test
```

更新上游图标或 `app-icon.png` 后，使用 Tauri 官方生成器重建平台图标：

```bash
pnpm tauri icon app-icon.png
```

开发服务器默认使用 `http://localhost:8888`。

## 上游来源

- 仓库：https://github.com/nuclear-unicorn/kittensgame
- 提交：`781e379f79f1e7512d168849cba21ed111502644`
- 版本：`1.6.1.6`
- 逻辑目录：`src/game/upstream/`
- 文件哈希清单：`src/game/upstream/SOURCE.json`
- 图标源：上游 `res/favicon.gif`，SHA-256
  `A2A05F1658F7ED95E8B920C6DF01FEB75AA50872E364F76C3FD3F5F8E82FF1AB`
- 图标中间源：`app-icon.png`，由原版图标的透明像素按最近邻整数倍率放大
- 平台图标：`src-tauri/icons/`，由 `pnpm tauri icon app-icon.png` 生成

`pnpm kittensgame:manifest` 更新清单，`pnpm kittensgame:verify` 校验固定逻辑
源没有被意外修改。

## 发布打包

发布前依次通过 Lint、TypeScript/Vite 构建、Rust 检查和浏览器测试，然后执行：

```bash
pnpm tauri build
```

Windows 安装包输出在 `src-tauri/target/release/bundle/`。制作安装包前不得用
开发构建替换上游哈希清单或 `src/game/upstream/` 源文件。

本次 `1.0.0` 发布构建结果：

- MSI：
  `src-tauri/target/release/bundle/msi/猫国建设者_1.0.0_x64_zh-CN.msi`，
  `6.10 MiB`，SHA-256
  `C22C1BDB586AA4A967DC5ED8027063D31C73194B0D15EC158BB6E3F34A31918F`。
- NSIS：
  `src-tauri/target/release/bundle/nsis/猫国建设者_1.0.0_x64-setup.exe`，
  `4.35 MiB`，SHA-256
  `135DE80A159D93C748193AA1EB8B78F50296DA0298FE620C4EA5B9B50E703096`。
- 独立可执行文件：
  `src-tauri/target/release/kittens-game.exe`，`16.17 MiB`，SHA-256
  `B229CAA1B3963AD60A09D80823AFDF15CE3CDFB772B85B052C97E1678D69B99F`。

Windows NSIS 与 MSI 安装器当前均未签名。发布或分发前应使用可信代码签名证书
签名；签名会改变安装包哈希，因此发布页必须记录实际分发文件的哈希。
MSI 固定升级代码为 `975c22c7-2402-5a53-94e6-76c690ef7d25`，不能随版本变化。

## 许可

应用框架代码沿用仓库的 MIT 许可。Kittens Game 逻辑和随附资源使用 WET PAWS
LICENSE，仅允许个人或教育用途，禁止商业使用或商业衍生。完整说明见
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和
[src/game/upstream/license.txt](src/game/upstream/license.txt)。
