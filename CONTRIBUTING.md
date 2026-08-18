# 参与贡献

感谢你帮助改进 dsh-yamada-night-shift。提交 Issue 或 Pull Request 前，请先确认改动仍然符合以下边界：

- 皮肤只改变展示层，不修改模型、会话、工具、文件或权限行为。
- 相册只读取本地照片，不上传照片，也不把用户照片提交进仓库。
- 新增视觉素材必须确认来源、许可和是否包含个人信息。
- 同时更新对应的 `README`、`NOTICE` 或资产清单，避免发布说明与实际行为不一致。

## 本地检查

```sh
cd yamada-night-shift
npm install
npm run build
npm test

cd ../photo-album
pnpm install
pnpm run typecheck
pnpm run test
pnpm run build
```

提交前运行 `git diff --check`。Bug 报告请附 DSH Web/Desktop 版本、profile、操作步骤和不含隐私的截图。
