# 第三方组件与许可

- **js-md5 0.9.2**：MIT。用于 B站官方音轨请求签名；代码嵌入 bridge.js，许可在 extension/js-md5-LICENSE.txt。上游：https://github.com/emn178/js-md5
- **Kuromoji 0.1.2**：Apache-2.0。浏览器构建在 extension/vendor/kuromoji.js，许可在 extension/vendor/LICENSE-2.0.txt。上游：https://github.com/takuyaa/kuromoji.js
- **mecab-ipadic-2.7.0-20070801 词典**：保留原许可与免责声明，完整条款见 extension/vendor/NOTICE.md。词典 gzip 文件位于 extension/vendor/dict/。
- Kuromoji 浏览器构建包含 **async、doublearray、zlibjs**；相关许可分别在 extension/vendor/async-LICENSE.txt、doublearray-LICENSE.txt、zlibjs-LICENSE.txt。

本地修改：Kuromoji 的 DictionaryLoader 用带末尾斜线的 URL 与文件名直接拼接，避免 path.join 破坏 chrome-extension:// 协议。修改说明已追加到 vendor/NOTICE.md。

项目 MIT 许可不替代上述第三方组件和词典的许可。Playwright 与开发用 js-md5 由 npm 安装，仅用于测试，不随浏览器插件运行。
