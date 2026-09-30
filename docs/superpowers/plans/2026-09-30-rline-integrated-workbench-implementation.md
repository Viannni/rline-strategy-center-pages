# R线一体化工作台重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将R线工作台重构为面向领导周会和策略落地的一体化后台，严格区分周维度与首周日维度，围绕目标差值、趋势、业务下钻、QA、SOP、项目闭环和续费转化形成可编辑、可留存的工作流。

**Architecture:** 保留现有 standalone vanilla HTML/ES module 结构，优先改造 `rline-workbench` 内部模块，不引入新依赖。把周报、策略设置、效果分析、续费转化拆成独立 view module；通过 localStorage 保存项目、SOP、QA、数据原件和转化台账；通过父层 URL 参数保存周报趋势筛选状态。

**Tech Stack:** Vanilla HTML/CSS/ES modules, SVG charts, browser localStorage, Node built-in test runner.

## Global Constraints

- 周报标题只展示实际日期 + “周报”，不展示 M1/M2W1 等业务周期标题。
- 周报与今日策略分开；周报同时呈现当周 W1-W4 周目标对比和首周 W1 D1-D5 24:00 日终趋势。
- D2 14:00 不进入趋势和周报分析；24:00 是日终口径。
- Kitty、Taby 是内容IP；扩科/扩品、用户召回、APP部等才是渠道。
- 图表用于回答业务问题；每个数据点展示值，缺失展示“暂无数据”，不得把缺失当0。
- 所有项目/SOP/QA/数据存档/续费记录必须支持增删改或至少可编辑并持久化。

### Task 1: 周报结构和趋势筛选

**Files:**
- Modify: `rline-workbench/app.js`
- Modify: `rline-workbench/modules/views/rline-daily.js`
- Modify: `rline-workbench/modules/views/rline-reporting.js`
- Modify: `rline-workbench/modules/views/rline-charts.js`
- Modify: `rline-workbench/styles.css`

实现周报标题、W1-W4周目标对比、首周D1-D5日终趋势、多选级别/班期筛选、每期独立趋势卡、渠道与IP下钻；删除无意义的归档覆盖图和指导性空话。

### Task 2: 项目推进闭环

**Files:**
- Modify: `rline-workbench/modules/views/rline-reporting.js`
- Modify: `rline-workbench/styles.css`

项目按风险/状态排序并编号，显示目标、当前产出、卡点、协同、截止、下一步、验收标准；增加删除按钮和删除确认，新增项目后可编辑保存。

### Task 3: 策略设置与SOP模块

**Files:**
- Create: `rline-workbench/modules/views/rline-strategy.js`
- Modify: `rline-workbench/modules/views/rline-daily.js`
- Modify: `rline-workbench/styles.css`

新增策略设置总入口，提供月课/年课切换和流程框架、完整流程、SOP设计、流程预览四个子模块；策略阶段、节点、业务目的、用户感受、关键动作、关键指标、私信/社群动作均可新增、编辑、删除并保存。

### Task 4: 效果分析与续费转化

**Files:**
- Create: `rline-workbench/modules/views/rline-effectiveness.js`
- Create: `rline-workbench/modules/views/rline-renewal.js`
- Modify: `rline-workbench/modules/views/rline-daily.js`
- Modify: `rline-workbench/styles.css`

新增效果分析模块，展示策略动作覆盖、触达、回流和完课对照；新增续费转化模块，支持转化台账录入和按班期/IP/渠道分析，明确IP与渠道字段分开。

### Task 5: 验证和发布

**Files:**
- Modify: `tests/rline-standalone.test.mjs`
- Modify: `tests/rline-weekly-reporting.test.mjs`
- Add/Modify: `tests/rline-integrated-workbench.test.mjs`

运行完整测试、静态语法检查、本地HTTP页面检查，核对关键文字和入口，再提交并推送到 `main`。
