// convert_script_final_attempt.js

const createGraphNgraph = require('ngraph.graph');
const createLayout = require('ngraph.offline.layout'); // 确保这是正确的库
const fs = require('fs-extra');
const path = require('path');
const cliProgress = require('cli-progress');
const JSONStream = require('JSONStream');
const through2 = require('through2');
// --- 配置项 ---
const INPUT_JSON_PATH = './hf_database_filtered.json';
const OUTPUT_DIR = './galaxy_output_data';
const GRAPH_NAME = 'my_model_galaxy';
const VERSION_NAME = 'v1';
const LAYOUT_ITERATIONS = 20000; // 这个参数现在会传递给 layout 的 options
const LOG_INTERVAL = 20000;
// --- 配置结束 ---

async function convertData() {
  let overallProgressBar = null; // 在 try 外部声明并初始化
  // let layoutProgressBar = null; // 如果 layout.run() 不支持迭代回调，这个可能不再需要

  try {
    console.log(`🚀 开始转换数据，图谱名称: "${GRAPH_NAME}"`);

    const graph = createGraphNgraph();
    const displayLabels = [];
    const nodeOriginalIdToInternalIdMap = new Map();
    let internalIdCounter = 0;
    let nodesProcessed = 0;
    let relationshipsProcessed = 0;
    let fileSize = 0;

    try {
        const stats = await fs.stat(INPUT_JSON_PATH);
        fileSize = stats.size;
    } catch (e) {
        console.warn("⚠️ 无法获取文件大小用于进度条。");
    }

    console.log(`📄 正在流式处理JSON文件: ${INPUT_JSON_PATH}`);
    overallProgressBar = new cliProgress.SingleBar({ // 赋值
        format: 'JSON 处理 |' + '{bar}' + '| {percentage}% || {value_MB}/{total_MB}MB ({status_msg})',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true
    });
    if (fileSize > 0) {
        overallProgressBar.start(Math.round(fileSize / (1024 * 1024)), 0, {
            value_MB: 0,
            total_MB: Math.round(fileSize / (1024 * 1024)),
            status_msg: "准备中..."
        });
    }

    // === 阶段1: 处理节点 (双流读取的第一部分) ===
    if (overallProgressBar) overallProgressBar.update(0, { status_msg: "处理节点..." });
    const nodesFileStream = fs.createReadStream(INPUT_JSON_PATH, { encoding: 'utf8' });
    let nodeStreamBytesRead = 0;
    // ... (nodesFileStream.on('data', ... ) 和 nodeProcessor 的逻辑保持不变，确保 label 变量正确)
    // 请确保 nodeProcessor 内部的 let label = ... 是正确的
    // ... (nodesFileStream.pipe(...).on('error',...).on('finish', async () => { ... }))
    // 确保在 nodeProcessor 内部的 let_label 已修正为 let label

    // 为了简洁，我将省略节点和关系流的详细代码，假设它们与您之前成功的版本（在heap error之前）类似
    // 并假设您已修复了 let_label -> let label 的问题。
    // 这里是 Promise 包装流处理的核心结构：
    await new Promise((resolveNodePromise, rejectNodePromise) => {
        nodesFileStream.on('data', chunk => {
            nodeStreamBytesRead += chunk.length;
            if (fileSize > 0 && overallProgressBar) {
                overallProgressBar.update(Math.round(nodeStreamBytesRead / (1024*1024)), {
                    value_MB: Math.round(nodeStreamBytesRead / (1024*1024)),
                    status_msg: `处理节点... (${nodesProcessed})`
                });
            }
        });
        const nodeProcessor = through2.obj(function (node, enc, callback) {
            try {
                if (!node || typeof node.id === 'undefined') { return callback(); }
                if (nodeOriginalIdToInternalIdMap.has(node.id)) { return callback(); }
                const currentInternalId = internalIdCounter++;
                nodeOriginalIdToInternalIdMap.set(node.id, currentInternalId);
                let label = node.properties?.model_id || node.id; // 确保是 'label'
                displayLabels[currentInternalId] = label;
                graph.addNode(currentInternalId, { originalId: node.id }); // 优化存储
                nodesProcessed++;
                if (nodesProcessed % LOG_INTERVAL === 0) {
                   if (fileSize > 0 && overallProgressBar) overallProgressBar.update(Math.round(nodeStreamBytesRead / (1024*1024)), { status_msg: `处理节点... (${nodesProcessed})` });
                   else process.stdout.write(`已处理节点: ${nodesProcessed}\r`);
                }
            } catch (e) { console.error('\n❌ 处理单个节点时出错:', e); }
            callback();
        });
        nodesFileStream.pipe(JSONStream.parse('nodes.*')).pipe(nodeProcessor)
            .on('error', rejectNodePromise)
            .on('finish', resolveNodePromise);
        nodesFileStream.on('error', rejectNodePromise);
    }).catch(err => {
        if (overallProgressBar) overallProgressBar.stop();
        console.error('\n❌ 节点JSON解析或处理流错误:', err);
        throw err; // 重新抛出，由外层catch处理
    });
    if (overallProgressBar && fileSize > 0) overallProgressBar.update(Math.round(nodeStreamBytesRead/(1024*1024)), { status_msg: `节点处理完毕 (${nodesProcessed})`});
    else process.stdout.write(`\n✅ 所有节点 (${nodesProcessed}) 已从流中处理并添加到图谱中。\n`);


    // === 阶段2: 处理关系 (双流读取的第二部分) ===
    if (overallProgressBar) overallProgressBar.update(0, { status_msg: "处理关系..." }); // 可以重置或用新进度条
    const relationshipsFileStream = fs.createReadStream(INPUT_JSON_PATH, { encoding: 'utf8' });
    let relationshipStreamBytesRead = 0;
    // ... (relationshipsFileStream.on('data', ... ) 和 relationshipProcessor 的逻辑保持不变)
    // ... (relationshipsFileStream.pipe(...).on('error',...).on('finish', () => { ... }))
    await new Promise((resolveRelPromise, rejectRelPromise) => {
        relationshipsFileStream.on('data', chunk => {
            relationshipStreamBytesRead += chunk.length;
            if (fileSize > 0 && overallProgressBar) {
                overallProgressBar.update(Math.round(relationshipStreamBytesRead/(1024*1024)), {
                    value_MB: Math.round(relationshipStreamBytesRead/(1024*1024)),
                    status_msg: `处理关系... (${relationshipsProcessed})`
                });
            }
        });
        const relationshipProcessor = through2.obj(function (rel, enc, callback) {
            try {
                if (!rel || typeof rel.start_node_id === 'undefined' || typeof rel.end_node_id === 'undefined') { return callback(); }
                const sourceInternalId = nodeOriginalIdToInternalIdMap.get(rel.start_node_id);
                const targetInternalId = nodeOriginalIdToInternalIdMap.get(rel.end_node_id);
                if (sourceInternalId === undefined || targetInternalId === undefined) { return callback(); }
                graph.addLink(sourceInternalId, targetInternalId, { type: rel.type }); // 优化存储
                relationshipsProcessed++;
                if (relationshipsProcessed % LOG_INTERVAL === 0) {
                    if (fileSize > 0 && overallProgressBar) overallProgressBar.update(Math.round(relationshipStreamBytesRead/(1024*1024)), { status_msg: `处理关系... (${relationshipsProcessed})` });
                    else process.stdout.write(`已处理关系: ${relationshipsProcessed}\r`);
                }
            } catch (e) { console.error('\n❌ 处理单个关系时出错:', e); }
            callback();
        });
        relationshipsFileStream.pipe(JSONStream.parse('relationships.*')).pipe(relationshipProcessor)
            .on('error', rejectRelPromise)
            .on('finish', resolveRelPromise);
        relationshipsFileStream.on('error', rejectRelPromise);
    }).catch(err => {
        if (overallProgressBar) overallProgressBar.stop();
        console.error('\n❌ 关系JSON解析或处理流错误:', err);
        throw err;
    });
    if (overallProgressBar && fileSize > 0) overallProgressBar.update(Math.round(relationshipStreamBytesRead/(1024*1024)), { status_msg: `关系处理完毕 (${relationshipsProcessed})`});
    else process.stdout.write(`\n✅ 所有关系 (${relationshipsProcessed}) 已从流中处理并添加到图谱中。\n`);
    if (overallProgressBar) overallProgressBar.stop(); // 停止JSON处理进度条


    console.log(`✅ 图谱构建完成: ${graph.getNodesCount()} 个节点, ${graph.getLinksCount()} 条边。`);
    if (graph.getNodesCount() === 0 && (nodesProcessed > 0 || fileSize > 0) ) { // 改进检查条件
        console.error("❌ 图谱中没有节点，但似乎处理过JSON数据。无法进行布局。请检查JSONStream路径或节点/关系处理逻辑。");
        process.exit(1);
    }
     if (graph.getNodesCount() === 0 ) {
        console.error("❌ 图谱中没有节点，无法进行布局。");
        process.exit(1);
    }


    console.log(`🎨 正在计算3D布局 (使用 layout.run(), 迭代次数: ${LAYOUT_ITERATIONS})...`);
    const layout = createLayout(graph, {
      dimensions: 3,
      iterations: LAYOUT_ITERATIONS, // 将迭代次数作为选项传递
      //根据需要调整其他物理参数
      springLength: 20000,
      springCoefficient: 0.0000001, // 注意：ngraph.physics.simulator 通常用 springCoefficient
      gravity: -10000,
      theta: 0.8,
      dragCoefficient: 0.01 // 注意：ngraph.physics.simulator 通常用 dragCoefficient,
    });

    if (!layout || typeof layout.run !== 'function') {
        console.error('❌ createLayout 没有返回有效的布局 对象或缺少 run 方法！');
        console.log('[DEBUG LAYOUT] Layout object:', layout);
        // overallProgressBar 此时应该已经被停掉了
        throw new Error('布局对象创建失败或API不匹配。');
    }

    console.log("⏳ 开始执行 layout.run()... 这可能需要较长时间，且此阶段可能没有逐迭代进度条。");
    layout.run(); // 直接运行布局
    console.log('\n✅ 3D布局计算完成 (layout.run() 已结束)。');


    // --- 后续保存文件逻辑 (与之前版本相同) ---
    const positionsArray = new Int32Array(graph.getNodesCount() * 3);
    // ... (填充 positionsArray 的逻辑)
    graph.forEachNode(node => {
      const pos = layout.getNodePosition(node.id); // 假设 getNodePosition 仍然可用
      if (!pos) {
          console.error(`❌ 未能获取节点 ${node.id} 的位置信息!`);
          // 可以选择填充默认值或抛出错误
          positionsArray[node.id * 3]     = 0;
          positionsArray[node.id * 3 + 1] = 0;
          positionsArray[node.id * 3 + 2] = 0;
      } else {
          positionsArray[node.id * 3]     = Math.round(pos.x);
          positionsArray[node.id * 3 + 1] = Math.round(pos.y);
          positionsArray[node.id * 3 + 2] = Math.round(pos.z);
      }
    });
    
    const versionSpecificPath = path.join(OUTPUT_DIR, GRAPH_NAME, VERSION_NAME);
    // ... (fs.ensureDir, fs.writeJson for labels, fs.writeFile for positions, links, manifest 的逻辑)
    // 请确保这里的变量名和逻辑与您之前成功的版本一致

    await fs.ensureDir(versionSpecificPath);
    console.log(`📁 输出目录已确保/创建: ${versionSpecificPath}`);

    const labelsFilePath = path.join(versionSpecificPath, 'labels.json');
    await fs.writeJson(labelsFilePath, displayLabels, { spaces: 2 });
    console.log(`💾 Saved labels.json (包含 ${displayLabels.length} 个标签)`);

    const positionsFilePath = path.join(versionSpecificPath, 'positions.bin');
    await fs.writeFile(positionsFilePath, Buffer.from(positionsArray.buffer));
    console.log(`💾 Saved positions.bin`);

    const linksDataArray = [];
    graph.forEachNode(node => {
      linksDataArray.push(-node.id - 1);
      graph.forEachLinkedNode(node.id, (linkedNode, link) => {
        linksDataArray.push(linkedNode.id + 1);
      }, true);
    });
    const linksBuffer = new Int32Array(linksDataArray).buffer;
    const linksFilePath = path.join(versionSpecificPath, 'links.bin');
    await fs.writeFile(linksFilePath, Buffer.from(linksBuffer));
    console.log(`💾 Saved links.bin`);

    const manifestFilePath = path.join(OUTPUT_DIR, GRAPH_NAME, 'manifest.json');
    const manifestContent = { all: [VERSION_NAME], last: VERSION_NAME };
    await fs.writeJson(manifestFilePath, manifestContent, { spaces: 2 });
    console.log(`💾 Saved manifest.json`);


    console.log('\n🎉 --- 数据转换全部完成! --- 🎉');
    // ... (后续指引)

  } catch (error) {
    console.error('❌ 处理过程中发生致命错误 (最外层catch):', error);
    // 确保所有可能已启动的进度条都被停止
    if (overallProgressBar && typeof overallProgressBar.stop === 'function' && overallProgressBar.isActive) { // isActive 是 cli-progress 的一个属性
        overallProgressBar.stop();
    }
    // if (layoutProgressBar && typeof layoutProgressBar.stop === 'function' && layoutProgressBar.isActive) {
    //    layoutProgressBar.stop(); // 如果 layoutProgressBar 仍然在使用
    // }
    process.exit(1);
  }
}

convertData();