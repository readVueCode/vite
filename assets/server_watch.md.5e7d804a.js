import{_ as s,c as n,o as a,U as l}from"./chunks/framework.29dee80d.js";const A=JSON.parse('{"title":"完整代码","description":"","frontmatter":{},"headers":[],"relativePath":"server/watch.md","lastUpdated":1684381496000}'),p={name:"server/watch.md"},o=l(`<h1 id="完整代码" tabindex="-1">完整代码 <a class="header-anchor" href="#完整代码" aria-label="Permalink to &quot;完整代码&quot;">​</a></h1><blockquote><p>文件路径 <code>src/node/watch.ts</code></p></blockquote><div class="language-ts line-numbers-mode"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki one-dark-pro vp-code-dark"><code><span class="line"><span style="color:#C678DD;">import</span><span style="color:#ABB2BF;"> </span><span style="color:#E06C75;">glob</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">from</span><span style="color:#ABB2BF;"> </span><span style="color:#98C379;">&#39;fast-glob&#39;</span></span>
<span class="line"><span style="color:#C678DD;">import</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">type</span><span style="color:#ABB2BF;"> { </span><span style="color:#E06C75;">WatchOptions</span><span style="color:#ABB2BF;"> } </span><span style="color:#C678DD;">from</span><span style="color:#ABB2BF;"> </span><span style="color:#98C379;">&#39;dep-types/chokidar&#39;</span></span>
<span class="line"><span style="color:#C678DD;">import</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">type</span><span style="color:#ABB2BF;"> { </span><span style="color:#E06C75;">ResolvedConfig</span><span style="color:#ABB2BF;"> } </span><span style="color:#C678DD;">from</span><span style="color:#ABB2BF;"> </span><span style="color:#98C379;">&#39;.&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#C678DD;">export</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">function</span><span style="color:#ABB2BF;"> </span><span style="color:#61AFEF;">resolveChokidarOptions</span><span style="color:#ABB2BF;">(</span></span>
<span class="line"><span style="color:#ABB2BF;">  </span><span style="color:#E06C75;font-style:italic;">config</span><span style="color:#ABB2BF;">: </span><span style="color:#E5C07B;">ResolvedConfig</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">  </span><span style="color:#E06C75;font-style:italic;">options</span><span style="color:#ABB2BF;">: </span><span style="color:#E5C07B;">WatchOptions</span><span style="color:#ABB2BF;"> | </span><span style="color:#E5C07B;">undefined</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">): </span><span style="color:#E5C07B;">WatchOptions</span><span style="color:#ABB2BF;"> {</span></span>
<span class="line"><span style="color:#ABB2BF;">  </span><span style="color:#C678DD;">const</span><span style="color:#ABB2BF;"> { </span><span style="color:#E5C07B;">ignored</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> [], ...</span><span style="color:#E5C07B;">otherOptions</span><span style="color:#ABB2BF;"> } </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> </span><span style="color:#E06C75;">options</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">??</span><span style="color:#ABB2BF;"> {}</span></span>
<span class="line"></span>
<span class="line"><span style="color:#ABB2BF;">  </span><span style="color:#C678DD;">const</span><span style="color:#ABB2BF;"> </span><span style="color:#E5C07B;">resolvedWatchOptions</span><span style="color:#ABB2BF;">: </span><span style="color:#E5C07B;">WatchOptions</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> {</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#E06C75;">ignored</span><span style="color:#ABB2BF;">: [</span></span>
<span class="line"><span style="color:#ABB2BF;">      </span><span style="color:#98C379;">&#39;**/.git/**&#39;</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">      </span><span style="color:#98C379;">&#39;**/node_modules/**&#39;</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">      </span><span style="color:#98C379;">&#39;**/test-results/**&#39;</span><span style="color:#ABB2BF;">, </span><span style="color:#7F848E;font-style:italic;">// Playwright</span></span>
<span class="line"><span style="color:#ABB2BF;">      </span><span style="color:#E5C07B;">glob</span><span style="color:#ABB2BF;">.</span><span style="color:#61AFEF;">escapePath</span><span style="color:#ABB2BF;">(</span><span style="color:#E5C07B;">config</span><span style="color:#ABB2BF;">.</span><span style="color:#E06C75;">cacheDir</span><span style="color:#ABB2BF;">) </span><span style="color:#56B6C2;">+</span><span style="color:#ABB2BF;"> </span><span style="color:#98C379;">&#39;/**&#39;</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">      ...(</span><span style="color:#E5C07B;">Array</span><span style="color:#ABB2BF;">.</span><span style="color:#61AFEF;">isArray</span><span style="color:#ABB2BF;">(</span><span style="color:#E06C75;">ignored</span><span style="color:#ABB2BF;">) </span><span style="color:#C678DD;">?</span><span style="color:#ABB2BF;"> </span><span style="color:#E06C75;">ignored</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">:</span><span style="color:#ABB2BF;"> [</span><span style="color:#E06C75;">ignored</span><span style="color:#ABB2BF;">]),</span></span>
<span class="line"><span style="color:#ABB2BF;">    ],</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#E06C75;">ignoreInitial</span><span style="color:#ABB2BF;">: </span><span style="color:#D19A66;">true</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#E06C75;">ignorePermissionErrors</span><span style="color:#ABB2BF;">: </span><span style="color:#D19A66;">true</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">    ...</span><span style="color:#E06C75;">otherOptions</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">  }</span></span>
<span class="line"></span>
<span class="line"><span style="color:#ABB2BF;">  </span><span style="color:#C678DD;">return</span><span style="color:#ABB2BF;"> </span><span style="color:#E06C75;">resolvedWatchOptions</span></span>
<span class="line"><span style="color:#ABB2BF;">}</span></span>
<span class="line"></span></code></pre><pre class="shiki min-dark vp-code-light"><code><span class="line"><span style="color:#F97583;">import</span><span style="color:#B392F0;"> glob </span><span style="color:#F97583;">from</span><span style="color:#B392F0;"> </span><span style="color:#FFAB70;">&#39;fast-glob&#39;</span></span>
<span class="line"><span style="color:#F97583;">import</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">type</span><span style="color:#B392F0;"> { WatchOptions } </span><span style="color:#F97583;">from</span><span style="color:#B392F0;"> </span><span style="color:#FFAB70;">&#39;dep-types/chokidar&#39;</span></span>
<span class="line"><span style="color:#F97583;">import</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">type</span><span style="color:#B392F0;"> { ResolvedConfig } </span><span style="color:#F97583;">from</span><span style="color:#B392F0;"> </span><span style="color:#FFAB70;">&#39;.&#39;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#F97583;">export</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">function</span><span style="color:#B392F0;"> resolveChokidarOptions(</span></span>
<span class="line"><span style="color:#B392F0;">  config</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> ResolvedConfig</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">  options</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> WatchOptions </span><span style="color:#F97583;">|</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">undefined</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">)</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> WatchOptions {</span></span>
<span class="line"><span style="color:#B392F0;">  </span><span style="color:#F97583;">const</span><span style="color:#B392F0;"> { </span><span style="color:#79B8FF;">ignored</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> []</span><span style="color:#BBBBBB;">,</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">...</span><span style="color:#79B8FF;">otherOptions</span><span style="color:#B392F0;"> } </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> options </span><span style="color:#F97583;">??</span><span style="color:#B392F0;"> {}</span></span>
<span class="line"></span>
<span class="line"><span style="color:#B392F0;">  </span><span style="color:#F97583;">const</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">resolvedWatchOptions</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> WatchOptions </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> {</span></span>
<span class="line"><span style="color:#B392F0;">    ignored</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> [</span></span>
<span class="line"><span style="color:#B392F0;">      </span><span style="color:#FFAB70;">&#39;**/.git/**&#39;</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">      </span><span style="color:#FFAB70;">&#39;**/node_modules/**&#39;</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">      </span><span style="color:#FFAB70;">&#39;**/test-results/**&#39;</span><span style="color:#BBBBBB;">,</span><span style="color:#B392F0;"> </span><span style="color:#6B737C;">// Playwright</span></span>
<span class="line"><span style="color:#B392F0;">      </span><span style="color:#79B8FF;">glob</span><span style="color:#B392F0;">.escapePath(</span><span style="color:#79B8FF;">config</span><span style="color:#B392F0;">.cacheDir) </span><span style="color:#F97583;">+</span><span style="color:#B392F0;"> </span><span style="color:#FFAB70;">&#39;/**&#39;</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">      </span><span style="color:#F97583;">...</span><span style="color:#B392F0;">(</span><span style="color:#79B8FF;">Array</span><span style="color:#B392F0;">.isArray(ignored) </span><span style="color:#F97583;">?</span><span style="color:#B392F0;"> ignored </span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> [ignored])</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">    ]</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">    ignoreInitial</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">true</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">    ignorePermissionErrors</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">true</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">    </span><span style="color:#F97583;">...</span><span style="color:#B392F0;">otherOptions</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">  }</span></span>
<span class="line"></span>
<span class="line"><span style="color:#B392F0;">  </span><span style="color:#F97583;">return</span><span style="color:#B392F0;"> resolvedWatchOptions</span></span>
<span class="line"><span style="color:#B392F0;">}</span></span>
<span class="line"></span></code></pre><div class="line-numbers-wrapper" aria-hidden="true"><span class="line-number">1</span><br><span class="line-number">2</span><br><span class="line-number">3</span><br><span class="line-number">4</span><br><span class="line-number">5</span><br><span class="line-number">6</span><br><span class="line-number">7</span><br><span class="line-number">8</span><br><span class="line-number">9</span><br><span class="line-number">10</span><br><span class="line-number">11</span><br><span class="line-number">12</span><br><span class="line-number">13</span><br><span class="line-number">14</span><br><span class="line-number">15</span><br><span class="line-number">16</span><br><span class="line-number">17</span><br><span class="line-number">18</span><br><span class="line-number">19</span><br><span class="line-number">20</span><br><span class="line-number">21</span><br><span class="line-number">22</span><br><span class="line-number">23</span><br><span class="line-number">24</span><br><span class="line-number">25</span><br></div></div><p>从这里看，vite是使用<code>chokidar</code>这个库做文件监听的，这里是编写了一个<code>resolvedWatchOptions</code>函数解析和合并<code>chokidar</code>的配置选项</p><h2 id="解析和合并chokidar的选项对象" tabindex="-1">解析和合并<code>chokidar</code>的选项对象 <a class="header-anchor" href="#解析和合并chokidar的选项对象" aria-label="Permalink to &quot;解析和合并\`chokidar\`的选项对象&quot;">​</a></h2><div class="language-ts line-numbers-mode"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki one-dark-pro vp-code-dark"><code><span class="line"><span style="color:#C678DD;">export</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">function</span><span style="color:#ABB2BF;"> </span><span style="color:#61AFEF;">resolveChokidarOptions</span><span style="color:#ABB2BF;">(</span></span>
<span class="line"><span style="color:#ABB2BF;">  </span><span style="color:#E06C75;font-style:italic;">config</span><span style="color:#ABB2BF;">: </span><span style="color:#E5C07B;">ResolvedConfig</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">  </span><span style="color:#E06C75;font-style:italic;">options</span><span style="color:#ABB2BF;">: </span><span style="color:#E5C07B;">WatchOptions</span><span style="color:#ABB2BF;"> | </span><span style="color:#E5C07B;">undefined</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">): </span><span style="color:#E5C07B;">WatchOptions</span><span style="color:#ABB2BF;"> {</span></span>
<span class="line"><span style="color:#ABB2BF;">  ...</span></span>
<span class="line"><span style="color:#ABB2BF;">}</span></span>
<span class="line"></span></code></pre><pre class="shiki min-dark vp-code-light"><code><span class="line"><span style="color:#F97583;">export</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">function</span><span style="color:#B392F0;"> resolveChokidarOptions(</span></span>
<span class="line"><span style="color:#B392F0;">  config</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> ResolvedConfig</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">  options</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> WatchOptions </span><span style="color:#F97583;">|</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">undefined</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">)</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> WatchOptions {</span></span>
<span class="line"><span style="color:#B392F0;">  </span><span style="color:#F97583;">...</span></span>
<span class="line"><span style="color:#B392F0;">}</span></span>
<span class="line"></span></code></pre><div class="line-numbers-wrapper" aria-hidden="true"><span class="line-number">1</span><br><span class="line-number">2</span><br><span class="line-number">3</span><br><span class="line-number">4</span><br><span class="line-number">5</span><br><span class="line-number">6</span><br></div></div><p>该函数接受两个参数：<code>config</code>和<code>options</code>。函数的目的是解析和合并<code>chokidar</code>的选项对象，返回一个新的选项对象。</p><p>这个函数在<code>src/node/server/index.ts</code>中被调用，具体内容请查看<code>index.md</code></p><h2 id="导出配置项-options-中的-ignored-与其他属性" tabindex="-1">导出配置项 <code>options</code> 中的 <code>ignored</code> 与其他属性 <a class="header-anchor" href="#导出配置项-options-中的-ignored-与其他属性" aria-label="Permalink to &quot;导出配置项 \`options\` 中的 \`ignored\` 与其他属性&quot;">​</a></h2><div class="language-ts line-numbers-mode"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki one-dark-pro vp-code-dark"><code><span class="line"><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">const</span><span style="color:#ABB2BF;"> { </span><span style="color:#E5C07B;">ignored</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> [], ...</span><span style="color:#E5C07B;">otherOptions</span><span style="color:#ABB2BF;"> } </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> </span><span style="color:#E06C75;">options</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">??</span><span style="color:#ABB2BF;"> {}</span></span>
<span class="line"></span></code></pre><pre class="shiki min-dark vp-code-light"><code><span class="line"><span style="color:#B392F0;"> </span><span style="color:#F97583;">const</span><span style="color:#B392F0;"> { </span><span style="color:#79B8FF;">ignored</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> []</span><span style="color:#BBBBBB;">,</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">...</span><span style="color:#79B8FF;">otherOptions</span><span style="color:#B392F0;"> } </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> options </span><span style="color:#F97583;">??</span><span style="color:#B392F0;"> {}</span></span>
<span class="line"></span></code></pre><div class="line-numbers-wrapper" aria-hidden="true"><span class="line-number">1</span><br></div></div><p>这段代码使用 JavaScript 中的解构赋值语法。它的作用是从 <code>options</code> 对象中提取属性值并将其赋给新的变量</p><ol><li><p>使用空值合并运算符(<code>??</code>)来确保如果<code>options</code>为<code>undefined</code>或<code>null</code>，则<code>options ?? {}</code>的结果是一个空对象<code>{}</code>，以避免出现解构赋值的错误</p><div class="language-js line-numbers-mode"><button title="Copy Code" class="copy"></button><span class="lang">js</span><pre class="shiki one-dark-pro vp-code-dark"><code><span class="line"><span style="color:#C678DD;">let</span><span style="color:#ABB2BF;"> { ...</span><span style="color:#E06C75;">z</span><span style="color:#ABB2BF;"> } </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> </span><span style="color:#D19A66;">null</span><span style="color:#ABB2BF;">; </span><span style="color:#7F848E;font-style:italic;">// 运行时错误</span></span>
<span class="line"><span style="color:#C678DD;">let</span><span style="color:#ABB2BF;"> { ...</span><span style="color:#E06C75;">z</span><span style="color:#ABB2BF;"> } </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> </span><span style="color:#D19A66;">undefined</span><span style="color:#ABB2BF;">; </span><span style="color:#7F848E;font-style:italic;">// 运行时错误</span></span>
<span class="line"></span></code></pre><pre class="shiki min-dark vp-code-light"><code><span class="line"><span style="color:#F97583;">let</span><span style="color:#B392F0;"> { </span><span style="color:#F97583;">...</span><span style="color:#B392F0;">z } </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">null</span><span style="color:#B392F0;">; </span><span style="color:#6B737C;">// 运行时错误</span></span>
<span class="line"><span style="color:#F97583;">let</span><span style="color:#B392F0;"> { </span><span style="color:#F97583;">...</span><span style="color:#B392F0;">z } </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">undefined</span><span style="color:#B392F0;">; </span><span style="color:#6B737C;">// 运行时错误</span></span>
<span class="line"></span></code></pre><div class="line-numbers-wrapper" aria-hidden="true"><span class="line-number">1</span><br><span class="line-number">2</span><br></div></div></li><li><p>在解构赋值过程中，如果被解构的对象的属性不存在或值为<code>undefined</code>，则对应的变量将被赋予默认值，因此<code>ignored = []</code>表达式将为<code>ignored</code>变量提供默认值。这意味着在缺少<code>ignored</code>属性或其值为<code>undefined</code>的情况下，<code>ignored</code>将被赋予一个空数组<code>[]</code>。</p></li><li><p><code>...otherOptions</code>的语法是对象展开运算符的一种应用，它可以用于将一个对象中的所有属性展开到另一个对象中。具体来说，它的作用是将<code>options</code>对象中除了<code>ignored</code>属性之外的所有属性展开，并将它们合并到一个新的对象中。</p><div class="language-js line-numbers-mode"><button title="Copy Code" class="copy"></button><span class="lang">js</span><pre class="shiki one-dark-pro vp-code-dark"><code><span class="line"><span style="color:#C678DD;">let</span><span style="color:#ABB2BF;"> { </span><span style="color:#E06C75;">x</span><span style="color:#ABB2BF;">, </span><span style="color:#E06C75;">y</span><span style="color:#ABB2BF;">, ...</span><span style="color:#E06C75;">z</span><span style="color:#ABB2BF;"> } </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> { </span><span style="color:#E06C75;">x</span><span style="color:#ABB2BF;">: </span><span style="color:#D19A66;">1</span><span style="color:#ABB2BF;">, </span><span style="color:#E06C75;">y</span><span style="color:#ABB2BF;">: </span><span style="color:#D19A66;">2</span><span style="color:#ABB2BF;">, </span><span style="color:#E06C75;">a</span><span style="color:#ABB2BF;">: </span><span style="color:#D19A66;">3</span><span style="color:#ABB2BF;">, </span><span style="color:#E06C75;">b</span><span style="color:#ABB2BF;">: </span><span style="color:#D19A66;">4</span><span style="color:#ABB2BF;"> };</span></span>
<span class="line"><span style="color:#E06C75;">x</span><span style="color:#ABB2BF;"> </span><span style="color:#7F848E;font-style:italic;">// 1</span></span>
<span class="line"><span style="color:#E06C75;">y</span><span style="color:#ABB2BF;"> </span><span style="color:#7F848E;font-style:italic;">// 2</span></span>
<span class="line"><span style="color:#E06C75;">z</span><span style="color:#ABB2BF;"> </span><span style="color:#7F848E;font-style:italic;">// { a: 3, b: 4 }</span></span>
<span class="line"></span></code></pre><pre class="shiki min-dark vp-code-light"><code><span class="line"><span style="color:#F97583;">let</span><span style="color:#B392F0;"> { x</span><span style="color:#BBBBBB;">,</span><span style="color:#B392F0;"> y</span><span style="color:#BBBBBB;">,</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">...</span><span style="color:#B392F0;">z } </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> { x</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> </span><span style="color:#F8F8F8;">1</span><span style="color:#BBBBBB;">,</span><span style="color:#B392F0;"> y</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> </span><span style="color:#F8F8F8;">2</span><span style="color:#BBBBBB;">,</span><span style="color:#B392F0;"> a</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> </span><span style="color:#F8F8F8;">3</span><span style="color:#BBBBBB;">,</span><span style="color:#B392F0;"> b</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> </span><span style="color:#F8F8F8;">4</span><span style="color:#B392F0;"> };</span></span>
<span class="line"><span style="color:#B392F0;">x </span><span style="color:#6B737C;">// 1</span></span>
<span class="line"><span style="color:#B392F0;">y </span><span style="color:#6B737C;">// 2</span></span>
<span class="line"><span style="color:#B392F0;">z </span><span style="color:#6B737C;">// { a: 3, b: 4 }</span></span>
<span class="line"></span></code></pre><div class="line-numbers-wrapper" aria-hidden="true"><span class="line-number">1</span><br><span class="line-number">2</span><br><span class="line-number">3</span><br><span class="line-number">4</span><br></div></div></li><li><p>解构赋值、对象展开运算符的学习可以查看<a href="https://www.bookstack.cn/read/es6-3rd/spilt.6.docs-object.md" target="_blank" rel="noreferrer">阮一峰es6教程</a></p></li></ol><h2 id="生成一个完整的chokidar选项对象" tabindex="-1">生成一个完整的chokidar选项对象 <a class="header-anchor" href="#生成一个完整的chokidar选项对象" aria-label="Permalink to &quot;生成一个完整的chokidar选项对象&quot;">​</a></h2><div class="language-ts line-numbers-mode"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki one-dark-pro vp-code-dark"><code><span class="line"><span style="color:#ABB2BF;">  </span><span style="color:#C678DD;">const</span><span style="color:#ABB2BF;"> </span><span style="color:#E5C07B;">resolvedWatchOptions</span><span style="color:#ABB2BF;">: </span><span style="color:#E5C07B;">WatchOptions</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> {</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#E06C75;">ignored</span><span style="color:#ABB2BF;">: [</span></span>
<span class="line"><span style="color:#ABB2BF;">      </span><span style="color:#98C379;">&#39;**/.git/**&#39;</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">      </span><span style="color:#98C379;">&#39;**/node_modules/**&#39;</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">      </span><span style="color:#98C379;">&#39;**/test-results/**&#39;</span><span style="color:#ABB2BF;">, </span><span style="color:#7F848E;font-style:italic;">// Playwright</span></span>
<span class="line"><span style="color:#ABB2BF;">      </span><span style="color:#E5C07B;">glob</span><span style="color:#ABB2BF;">.</span><span style="color:#61AFEF;">escapePath</span><span style="color:#ABB2BF;">(</span><span style="color:#E5C07B;">config</span><span style="color:#ABB2BF;">.</span><span style="color:#E06C75;">cacheDir</span><span style="color:#ABB2BF;">) </span><span style="color:#56B6C2;">+</span><span style="color:#ABB2BF;"> </span><span style="color:#98C379;">&#39;/**&#39;</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">      ...(</span><span style="color:#E5C07B;">Array</span><span style="color:#ABB2BF;">.</span><span style="color:#61AFEF;">isArray</span><span style="color:#ABB2BF;">(</span><span style="color:#E06C75;">ignored</span><span style="color:#ABB2BF;">) </span><span style="color:#C678DD;">?</span><span style="color:#ABB2BF;"> </span><span style="color:#E06C75;">ignored</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">:</span><span style="color:#ABB2BF;"> [</span><span style="color:#E06C75;">ignored</span><span style="color:#ABB2BF;">]),</span></span>
<span class="line"><span style="color:#ABB2BF;">    ],</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#E06C75;">ignoreInitial</span><span style="color:#ABB2BF;">: </span><span style="color:#D19A66;">true</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#E06C75;">ignorePermissionErrors</span><span style="color:#ABB2BF;">: </span><span style="color:#D19A66;">true</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">    ...</span><span style="color:#E06C75;">otherOptions</span><span style="color:#ABB2BF;">,</span></span>
<span class="line"><span style="color:#ABB2BF;">  }</span></span>
<span class="line"></span></code></pre><pre class="shiki min-dark vp-code-light"><code><span class="line"><span style="color:#B392F0;">  </span><span style="color:#F97583;">const</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">resolvedWatchOptions</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> WatchOptions </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> {</span></span>
<span class="line"><span style="color:#B392F0;">    ignored</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> [</span></span>
<span class="line"><span style="color:#B392F0;">      </span><span style="color:#FFAB70;">&#39;**/.git/**&#39;</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">      </span><span style="color:#FFAB70;">&#39;**/node_modules/**&#39;</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">      </span><span style="color:#FFAB70;">&#39;**/test-results/**&#39;</span><span style="color:#BBBBBB;">,</span><span style="color:#B392F0;"> </span><span style="color:#6B737C;">// Playwright</span></span>
<span class="line"><span style="color:#B392F0;">      </span><span style="color:#79B8FF;">glob</span><span style="color:#B392F0;">.escapePath(</span><span style="color:#79B8FF;">config</span><span style="color:#B392F0;">.cacheDir) </span><span style="color:#F97583;">+</span><span style="color:#B392F0;"> </span><span style="color:#FFAB70;">&#39;/**&#39;</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">      </span><span style="color:#F97583;">...</span><span style="color:#B392F0;">(</span><span style="color:#79B8FF;">Array</span><span style="color:#B392F0;">.isArray(ignored) </span><span style="color:#F97583;">?</span><span style="color:#B392F0;"> ignored </span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> [ignored])</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">    ]</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">    ignoreInitial</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">true</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">    ignorePermissionErrors</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">true</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">    </span><span style="color:#F97583;">...</span><span style="color:#B392F0;">otherOptions</span><span style="color:#BBBBBB;">,</span></span>
<span class="line"><span style="color:#B392F0;">  }</span></span>
<span class="line"></span></code></pre><div class="line-numbers-wrapper" aria-hidden="true"><span class="line-number">1</span><br><span class="line-number">2</span><br><span class="line-number">3</span><br><span class="line-number">4</span><br><span class="line-number">5</span><br><span class="line-number">6</span><br><span class="line-number">7</span><br><span class="line-number">8</span><br><span class="line-number">9</span><br><span class="line-number">10</span><br><span class="line-number">11</span><br><span class="line-number">12</span><br></div></div><ul><li><code>ignored</code>属性是一个数组，包含了要忽略的文件/目录的匹配模式。默认情况下，包括<code>.git</code>目录、<code>node_modules</code>目录、<code>test-results</code>目录、以及通过<code>glob.escapePath</code>函数对<code>config.cacheDir</code>进行转义后的路径，最后再根据<code>ignored</code>参数的类型进行合并。</li><li><code>ignoreInitial</code>属性被设置为<code>true</code>，表示初始扫描时忽略文件变化事件。</li><li><code>ignorePermissionErrors</code>属性被设置为<code>true</code>，表示忽略权限错误。</li></ul><ol><li>使用对象展开运算符(<code>...</code>)将<code>otherOptions</code>中的属性合并到<code>resolvedWatchOptions</code>对象中。</li><li>返回最终的<code>resolvedWatchOptions</code>对象作为函数的结果。</li></ol><p>简而言之，这段代码用于根据传入的<code>options</code>参数和默认的忽略规则，生成一个完整的Chokidar选项对象，并将其返回。</p>`,17),e=[o];function c(r,t,B,y,i,F){return a(),n("div",null,e)}const b=s(p,[["render",c]]);export{A as __pageData,b as default};