import { test, expect, type Page } from '@playwright/test';

/**
 * devtool-local E2E 测试。
 *
 * 验证 Panel UI ↔ Inject ↔ Paper.js 的真实端到端交互，
 * 覆盖单测盲区：通信链路、真实 Paper.js 节点操作、UI 交互。
 *
 * 注意：store 默认 expandedNodes 含 'root'，root 已展开，子节点（layers）直接可见。
 * 测试中不应点击 root 的展开图标（会折叠它），直接操作已渲染的子节点。
 */

/** 等待 Panel 显示"已连接" */
async function waitForConnected(page: Page) {
  await expect(page.locator('.connection-status')).toContainText('已连接', { timeout: 15_000 });
}

/** 等待场景树出现多个节点（root + 至少一个 layer 子节点） */
async function waitForSceneTreeLoaded(page: Page) {
  await waitForConnected(page);
  await expect(page.locator('.tree-node').first()).toBeVisible({ timeout: 10_000 });
  // 等待子节点渲染（root 默认展开，layers 应直接可见）
  await expect(page.locator('.tree-node')).toHaveCount(await page.locator('.tree-node').count());
  await expect(page.locator('.tree-node').nth(1)).toBeVisible({ timeout: 10_000 });
}

test.describe('devtool-local 端到端', () => {

  test('页面加载后连接 Paper.js 并显示场景树', async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);
    // root + 子节点
    const nodeCount = await page.locator('.tree-node').count();
    expect(nodeCount).toBeGreaterThan(1);
  });

  test('场景树显示子节点（root 默认展开）', async ({ page }) => {
    await page.goto('/');
    await waitForSceneTreeLoaded(page);
    // root 是第一个，子节点（layers）应已可见
    const nodeCount = await page.locator('.tree-node').count();
    expect(nodeCount).toBeGreaterThan(1);
    // 第二个节点应有 node-name
    await expect(page.locator('.tree-node .node-name').nth(1)).toBeVisible();
  });

  test('选中子节点触发高亮', async ({ page }) => {
    await page.goto('/');
    await waitForSceneTreeLoaded(page);

    // 点击第二个节点的名称（第一个是 root，第二个是 layer）
    const nodeName = page.locator('.tree-node .node-name').nth(1);
    await nodeName.click();

    // 该节点应被选中（tree-node 加 selected 类）
    await expect(page.locator('.tree-node.selected').first()).toBeVisible();
  });

  test('切换子节点可见性', async ({ page }) => {
    await page.goto('/');
    await waitForSceneTreeLoaded(page);

    // 点击第二个节点的 visibility-icon（第一个是 root）
    const visibilityIcon = page.locator('.tree-node .visibility-icon.visible').nth(1);
    await visibilityIcon.click();

    // 应出现 hidden 状态的 visibility-icon
    await expect(page.locator('.tree-node .visibility-icon.hidden').first()).toBeVisible({ timeout: 10_000 });
  });

  test('创建新画布后 Scope 下拉框更新', async ({ page }) => {
    await page.goto('/');
    await waitForConnected(page);

    // 初始只有一个 scope，不显示下拉框（显示 scope-label）
    await expect(page.locator('.scope-label')).toBeVisible();

    // 点击"创建画布"按钮
    await page.locator('#add-canvas-btn').click();

    // 等待第二个 scope 注册（SCOPE_CHANGE 事件传播）
    await expect(page.locator('.scope-selector')).toBeVisible({ timeout: 10_000 });
    await page.locator('.scope-selector').click();
    const optionCount = await page.locator('.scope-option').count();
    expect(optionCount).toBeGreaterThanOrEqual(2);
  });

  test('选中节点后属性面板显示属性', async ({ page }) => {
    await page.goto('/');
    await waitForSceneTreeLoaded(page);

    // 选中第二个节点
    await page.locator('.tree-node .node-name').nth(1).click();
    await expect(page.locator('.tree-node.selected').first()).toBeVisible();

    // 属性面板应显示属性条目（.properties-panel 有外层容器和内层面板两个，取内层）
    const propertiesPanel = page.locator('.properties-panel').last();
    await expect(propertiesPanel).toBeVisible();
    // 至少有属性编辑控件
    const controls = propertiesPanel.locator('input, .ant-input-number, .ant-select');
    await expect(controls.first()).toBeVisible({ timeout: 10_000 });
    expect(await controls.count()).toBeGreaterThan(0);
  });
});
