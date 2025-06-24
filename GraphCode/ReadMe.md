简单说一下思路：

1. filter_isolated_node.js是一个过滤的文件，用于过滤一部分入度和出度都为0的节点
2. conver的两个文件是用于构件图的，要依次执行
   1. 文件的输入就是导出的json

```js
npm install ngraph.offline.layout
```

```js
node --max-old-space-size=8192 convert_script.js
node --max-old-space-size=8192 convert_script2.js
node --max-old-space-size=8192 filter_isolated_nodes.js
```

