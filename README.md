# 猫国建设者

Kittens Game 的原生桌面重制界面。项目保留固定版本的上游模拟逻辑和原版存档
格式，但不加载原版页面、原版 CSS 或 iframe；游戏界面由 React 和 Tailwind
重新实现。

## 当前状态

已交付 M1 内核、M2 核心界面、M3 中后期系统和 M4 工程闭环：

- 无原版页面 UI 启动完整 `GamePage` 模拟内核。
- 5 Hz 游戏循环、资源生产、采集、精炼和价格增长由上游逻辑驱动。
- 建筑解锁、可购状态、建造与批量数量展示来自上游模型。
- 村庄职业分配、空闲猫、幸福度与职业效果来自上游村庄管理器。
- 科技与政策研究复用上游控制器，政策确认和取消由新 UI 对话框承接。
- 工坊制作、批量制作、工程猫进度和永久升级沿用上游价格与购买规则。
- 贸易、宗教、太空、时间与挑战操作均通过上游控制器结算价格、随机收获和副作用。
- 进度页展示伦理成就、星标、徽章、跨存档统计和本局统计。
- 游戏设置直接读写上游布尔选项，并通过原版存档格式保留。
- 使用原版 `com.nuclearunicorn.kittengame.savedata` 存档键和序列化格式。
- 存档管理支持压缩文本导出、文件下载、文本/文件导入、恢复点、重置和
  v14 到 v15 迁移。
- 损坏存档会暂停模拟且禁止自动保存覆盖，可通过有效存档、备份或手动重置恢复。
- 新的资源总览、系统导航、存档面板和响应式应用外壳。
- 中文词典覆盖上游全部 2611 个键，新增界面提供键盘快捷键和焦点管理。
- Playwright 覆盖采集、精炼、建造、职业分配、研究、政策确认、制作、升级、
  设置、保存、刷新恢复、M3 中后期操作以及 M4 存档迁移和错误恢复。

后续里程碑为长程数值差分验收，重点覆盖季节、离线时间、批量价格、随机收获、
转生和完整存档状态一致性。

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
`restoreBackup`、`resetGame` 等命令执行原版逻辑。

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

开发服务器默认使用 `http://localhost:8888`。

## 上游来源

- 仓库：https://github.com/nuclear-unicorn/kittensgame
- 提交：`781e379f79f1e7512d168849cba21ed111502644`
- 版本：`1.6.1.6`
- 逻辑目录：`src/game/upstream/`
- 文件哈希清单：`src/game/upstream/SOURCE.json`

`pnpm kittensgame:manifest` 更新清单，`pnpm kittensgame:verify` 校验固定逻辑
源没有被意外修改。

## 许可

应用框架代码沿用仓库的 MIT 许可。Kittens Game 逻辑和随附资源使用 WET PAWS
LICENSE，仅允许个人或教育用途，禁止商业使用或商业衍生。完整说明见
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 和
[src/game/upstream/license.txt](src/game/upstream/license.txt)。
