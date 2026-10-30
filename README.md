# AISupplyChainGalaxy

AI Supply Chain Galaxy（AISCG）数据处理仓库：从 HuggingFace 模型元数据构建许可证合规图谱数据，供前端仓库 [AISupplyChainGalaxyCode](https://github.com/YaoYao-Pig/AISupplyChainGalaxyCode) 加载展示。

- 研究论文：[AI Supply Chain Galaxy: 3D Visual Analytics for License Compliance](https://arxiv.org/abs/2606.16292)

## 处理流程

整体管线分三步：

### 1. HuggingFace 采集与图入库（`HF_neo4j/`）

- `hf_apis.py`：调用 HuggingFace Hub API 分页抓取模型列表，并从模型卡读取 `base_model` 派生关系（运行前填入你自己的 HF Token）
- `neo4j_client.py`：Neo4j 客户端封装，负责图数据的写入与更新
- `procedure.py`：将模型详情（许可证、cardData 等）批量写入 Neo4j 图
- 环境依赖：Python 3（`requests`、`huggingface_hub`、`neo4j`）与一个本地 Neo4j 实例（可用目录内的 `neo4j.dump` 初始化）

### 2. 图谱导出与 3D 布局（`GraphCode/`）

```bash
npm install ngraph.offline.layout
node --max-old-space-size=8192 convert_script.js
node --max-old-space-size=8192 convert_script2.js
node --max-old-space-size=8192 filter_isolated_nodes.js
```

输入为 Neo4j 导出的 JSON；两个 `convert_script` 依次构建图与离线布局，`filter_isolated_nodes.js` 过滤入度与出度均为 0 的孤立节点。产出前端可直接加载的布局数据文件。

### 3. 前端加载

产出的数据文件由 [AISupplyChainGalaxyCode](https://github.com/YaoYao-Pig/AISupplyChainGalaxyCode) 按清单异步加载并渲染。

## 目录说明

| 目录 | 内容 |
|------|------|
| `HF_neo4j/` | HuggingFace 采集、Neo4j 图入库脚本与 `neo4j.dump` |
| `GraphCode/` | 图谱导出与 ngraph 离线布局脚本 |
| `paper/` | 研究背景参考论文 |
| `videos/` | 系统演示视频 |

## License

[MIT](./LICENSE) · Copyright (c) 2025 The AISupplyChainGalaxy Authors
