import{_ as n,c as a,C as l,U as p,o,D as e}from"./chunks/framework.29dee80d.js";const b=JSON.parse('{"title":"起步","description":"","frontmatter":{},"headers":[],"relativePath":"指南/1.热更新.md","lastUpdated":1681825019000}'),t={name:"指南/1.热更新.md"},c=p(`<h1 id="起步" tabindex="-1">起步 <a class="header-anchor" href="#起步" aria-label="Permalink to &quot;起步&quot;">​</a></h1><blockquote><p>src/node/server/hmr.ts</p></blockquote><p>处理热更新</p><h2 id="readmodifiedfile函数" tabindex="-1">readModifiedFile函数 <a class="header-anchor" href="#readmodifiedfile函数" aria-label="Permalink to &quot;readModifiedFile函数&quot;">​</a></h2><div class="language-js line-numbers-mode"><button title="Copy Code" class="copy"></button><span class="lang">js</span><pre class="shiki one-dark-pro vp-code-dark"><code><span class="line"><span style="color:#7F848E;font-style:italic;">// vitejs/vite#610 when hot-reloading Vue files, we read immediately on file</span></span>
<span class="line"><span style="color:#7F848E;font-style:italic;">// change event and sometimes this can be too early and get an empty buffer.</span></span>
<span class="line"><span style="color:#7F848E;font-style:italic;">// Poll until the file&#39;s modified time has changed before reading again.</span></span>
<span class="line"><span style="color:#7F848E;font-style:italic;">// 在 hot-reloading Vue 文件时，我们会立即读取文件变化事件，有时这可能太早了，导致读取到空缓冲区。因此，我们需要在再次读取之前轮询文件的修改时间是否已更改。</span></span>
<span class="line"></span>
<span class="line"><span style="color:#7F848E;font-style:italic;">// 这是一个异步函数 readModifiedFile，其作用是读取指定文件的内容并返回一个 Promise。</span></span>
<span class="line"><span style="color:#7F848E;font-style:italic;">// 函数首先使用 Node.js 的 fsp.readFile 方法读取文件内容，如果文件内容为空，则表示可能在读取时太早了，因此需要等待一段时间，以便文件在磁盘上真正地修改完毕。为了达到这个目的，该函数会启动一个简单的轮询机制，定期检查文件的修改时间，直到文件的修改时间发生变化或者超过了 10 次检查，就会停止轮询并返回一个空字符串。</span></span>
<span class="line"><span style="color:#7F848E;font-style:italic;">// 如果文件内容不为空，则表示文件已经完全更新，直接返回文件内容。</span></span>
<span class="line"><span style="color:#C678DD;">async</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">function</span><span style="color:#ABB2BF;"> </span><span style="color:#61AFEF;">readModifiedFile</span><span style="color:#ABB2BF;">(</span><span style="color:#E06C75;font-style:italic;">file</span><span style="color:#ABB2BF;">: </span><span style="color:#E5C07B;">string</span><span style="color:#ABB2BF;">): </span><span style="color:#E5C07B;">Promise</span><span style="color:#ABB2BF;">&lt;</span><span style="color:#E5C07B;">string</span><span style="color:#ABB2BF;">&gt; {</span></span>
<span class="line"><span style="color:#ABB2BF;">  </span><span style="color:#C678DD;">const</span><span style="color:#ABB2BF;"> </span><span style="color:#E5C07B;">content</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">await</span><span style="color:#ABB2BF;"> </span><span style="color:#E5C07B;">fsp</span><span style="color:#ABB2BF;">.</span><span style="color:#61AFEF;">readFile</span><span style="color:#ABB2BF;">(</span><span style="color:#E06C75;">file</span><span style="color:#ABB2BF;">, </span><span style="color:#98C379;">&#39;utf-8&#39;</span><span style="color:#ABB2BF;">)</span></span>
<span class="line"><span style="color:#ABB2BF;">  </span><span style="color:#C678DD;">if</span><span style="color:#ABB2BF;"> (</span><span style="color:#56B6C2;">!</span><span style="color:#E06C75;">content</span><span style="color:#ABB2BF;">) {</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#7F848E;font-style:italic;">// 获取指定文件的修改时间，使用了 fs/promises 模块中的 stat() 方法来获取文件的 stats 对象，然后从中取出 mtimeMs 属性，即文件的修改时间（以毫秒为单位）。</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#C678DD;">const</span><span style="color:#ABB2BF;"> </span><span style="color:#E5C07B;">mtime</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> (</span><span style="color:#C678DD;">await</span><span style="color:#ABB2BF;"> </span><span style="color:#E5C07B;">fsp</span><span style="color:#ABB2BF;">.</span><span style="color:#61AFEF;">stat</span><span style="color:#ABB2BF;">(</span><span style="color:#E06C75;">file</span><span style="color:#ABB2BF;">)).</span><span style="color:#E06C75;">mtimeMs</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#7F848E;font-style:italic;">// 这段代码轮询十次也就是100毫秒，为什么这样设计？</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#7F848E;font-style:italic;">// 这种设计可以避免过于频繁的文件读取，同时又可以在文件更新后立即读取最新的文件内容。如果没有这个轮询的等待，可能会导致读取到旧的、缓存的文件内容，因为文件系统的更新可能会有一定的延迟。同时，如果轮询时间过长，会导致文件更新后无法立即获取最新内容，影响程序的正确性。因此，轮询时间需要在保证及时获取最新内容的同时，尽量减少不必要的文件读取操作。在这段代码中，轮询间隔是10毫秒，轮询10次即总共等待100毫秒，这个时间可以根据具体应用场景的需要进行调整</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#C678DD;">await</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">new</span><span style="color:#ABB2BF;"> </span><span style="color:#E5C07B;">Promise</span><span style="color:#ABB2BF;">((</span><span style="color:#E06C75;font-style:italic;">r</span><span style="color:#ABB2BF;">) </span><span style="color:#C678DD;">=&gt;</span><span style="color:#ABB2BF;"> {</span></span>
<span class="line"><span style="color:#ABB2BF;">      </span><span style="color:#C678DD;">let</span><span style="color:#ABB2BF;"> </span><span style="color:#E06C75;">n</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> </span><span style="color:#D19A66;">0</span></span>
<span class="line"><span style="color:#ABB2BF;">      </span><span style="color:#C678DD;">const</span><span style="color:#ABB2BF;"> </span><span style="color:#61AFEF;">poll</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">async</span><span style="color:#ABB2BF;"> () </span><span style="color:#C678DD;">=&gt;</span><span style="color:#ABB2BF;"> {</span></span>
<span class="line"><span style="color:#ABB2BF;">        </span><span style="color:#E06C75;">n</span><span style="color:#56B6C2;">++</span></span>
<span class="line"><span style="color:#ABB2BF;">        </span><span style="color:#C678DD;">const</span><span style="color:#ABB2BF;"> </span><span style="color:#E5C07B;">newMtime</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> (</span><span style="color:#C678DD;">await</span><span style="color:#ABB2BF;"> </span><span style="color:#E5C07B;">fsp</span><span style="color:#ABB2BF;">.</span><span style="color:#61AFEF;">stat</span><span style="color:#ABB2BF;">(</span><span style="color:#E06C75;">file</span><span style="color:#ABB2BF;">)).</span><span style="color:#E06C75;">mtimeMs</span></span>
<span class="line"><span style="color:#ABB2BF;">        </span><span style="color:#C678DD;">if</span><span style="color:#ABB2BF;"> (</span><span style="color:#E06C75;">newMtime</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">!==</span><span style="color:#ABB2BF;"> </span><span style="color:#E06C75;">mtime</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">||</span><span style="color:#ABB2BF;"> </span><span style="color:#E06C75;">n</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">&gt;</span><span style="color:#ABB2BF;"> </span><span style="color:#D19A66;">10</span><span style="color:#ABB2BF;">) {</span></span>
<span class="line"><span style="color:#ABB2BF;">          </span><span style="color:#7F848E;font-style:italic;">// 这里的r(0)有啥用?</span></span>
<span class="line"><span style="color:#ABB2BF;">          </span><span style="color:#7F848E;font-style:italic;">// 将 Promise 的状态从等待中变为已完成（fulfilled），同时将结果值设置为 0</span></span>
<span class="line"></span>
<span class="line"><span style="color:#ABB2BF;">          </span><span style="color:#7F848E;font-style:italic;">// 直接r()不行吗?</span></span>
<span class="line"><span style="color:#ABB2BF;">          </span><span style="color:#7F848E;font-style:italic;">// 可以的，r()和r(undefined)的效果是一样的。在这个函数中，r(0)只是为了返回一个假值，以便后续代码可以判断是否需要重新读取文件内容。如果r()或r(undefined)会更清晰明了，也可以这么写。</span></span>
<span class="line"><span style="color:#ABB2BF;">          </span><span style="color:#61AFEF;">r</span><span style="color:#ABB2BF;">(</span><span style="color:#D19A66;">0</span><span style="color:#ABB2BF;">)</span></span>
<span class="line"><span style="color:#ABB2BF;">        } </span><span style="color:#C678DD;">else</span><span style="color:#ABB2BF;"> {</span></span>
<span class="line"><span style="color:#ABB2BF;">          </span><span style="color:#61AFEF;">setTimeout</span><span style="color:#ABB2BF;">(</span><span style="color:#E06C75;">poll</span><span style="color:#ABB2BF;">, </span><span style="color:#D19A66;">10</span><span style="color:#ABB2BF;">)</span></span>
<span class="line"><span style="color:#ABB2BF;">        }</span></span>
<span class="line"><span style="color:#ABB2BF;">      }</span></span>
<span class="line"><span style="color:#ABB2BF;">      </span><span style="color:#61AFEF;">setTimeout</span><span style="color:#ABB2BF;">(</span><span style="color:#E06C75;">poll</span><span style="color:#ABB2BF;">, </span><span style="color:#D19A66;">10</span><span style="color:#ABB2BF;">)</span></span>
<span class="line"><span style="color:#ABB2BF;">    })</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#C678DD;">return</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">await</span><span style="color:#ABB2BF;"> </span><span style="color:#E5C07B;">fsp</span><span style="color:#ABB2BF;">.</span><span style="color:#61AFEF;">readFile</span><span style="color:#ABB2BF;">(</span><span style="color:#E06C75;">file</span><span style="color:#ABB2BF;">, </span><span style="color:#98C379;">&#39;utf-8&#39;</span><span style="color:#ABB2BF;">)</span></span>
<span class="line"><span style="color:#ABB2BF;">  } </span><span style="color:#C678DD;">else</span><span style="color:#ABB2BF;"> {</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#C678DD;">return</span><span style="color:#ABB2BF;"> </span><span style="color:#E06C75;">content</span></span>
<span class="line"><span style="color:#ABB2BF;">  }</span></span>
<span class="line"><span style="color:#ABB2BF;">}</span></span>
<span class="line"></span></code></pre><pre class="shiki min-dark vp-code-light"><code><span class="line"><span style="color:#6B737C;">// vitejs/vite#610 when hot-reloading Vue files, we read immediately on file</span></span>
<span class="line"><span style="color:#6B737C;">// change event and sometimes this can be too early and get an empty buffer.</span></span>
<span class="line"><span style="color:#6B737C;">// Poll until the file&#39;s modified time has changed before reading again.</span></span>
<span class="line"><span style="color:#6B737C;">// 在 hot-reloading Vue 文件时，我们会立即读取文件变化事件，有时这可能太早了，导致读取到空缓冲区。因此，我们需要在再次读取之前轮询文件的修改时间是否已更改。</span></span>
<span class="line"></span>
<span class="line"><span style="color:#6B737C;">// 这是一个异步函数 readModifiedFile，其作用是读取指定文件的内容并返回一个 Promise。</span></span>
<span class="line"><span style="color:#6B737C;">// 函数首先使用 Node.js 的 fsp.readFile 方法读取文件内容，如果文件内容为空，则表示可能在读取时太早了，因此需要等待一段时间，以便文件在磁盘上真正地修改完毕。为了达到这个目的，该函数会启动一个简单的轮询机制，定期检查文件的修改时间，直到文件的修改时间发生变化或者超过了 10 次检查，就会停止轮询并返回一个空字符串。</span></span>
<span class="line"><span style="color:#6B737C;">// 如果文件内容不为空，则表示文件已经完全更新，直接返回文件内容。</span></span>
<span class="line"><span style="color:#F97583;">async</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">function</span><span style="color:#B392F0;"> readModifiedFile(file</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">string</span><span style="color:#B392F0;">)</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> Promise&lt;</span><span style="color:#79B8FF;">string</span><span style="color:#B392F0;">&gt; {</span></span>
<span class="line"><span style="color:#B392F0;">  </span><span style="color:#F97583;">const</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">content</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">await</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">fsp</span><span style="color:#B392F0;">.readFile(file</span><span style="color:#BBBBBB;">,</span><span style="color:#B392F0;"> </span><span style="color:#FFAB70;">&#39;utf-8&#39;</span><span style="color:#B392F0;">)</span></span>
<span class="line"><span style="color:#B392F0;">  </span><span style="color:#F97583;">if</span><span style="color:#B392F0;"> (</span><span style="color:#F97583;">!</span><span style="color:#B392F0;">content) {</span></span>
<span class="line"><span style="color:#B392F0;">    </span><span style="color:#6B737C;">// 获取指定文件的修改时间，使用了 fs/promises 模块中的 stat() 方法来获取文件的 stats 对象，然后从中取出 mtimeMs 属性，即文件的修改时间（以毫秒为单位）。</span></span>
<span class="line"><span style="color:#B392F0;">    </span><span style="color:#F97583;">const</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">mtime</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> (</span><span style="color:#F97583;">await</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">fsp</span><span style="color:#B392F0;">.stat(file)).mtimeMs</span></span>
<span class="line"><span style="color:#B392F0;">    </span><span style="color:#6B737C;">// 这段代码轮询十次也就是100毫秒，为什么这样设计？</span></span>
<span class="line"><span style="color:#B392F0;">    </span><span style="color:#6B737C;">// 这种设计可以避免过于频繁的文件读取，同时又可以在文件更新后立即读取最新的文件内容。如果没有这个轮询的等待，可能会导致读取到旧的、缓存的文件内容，因为文件系统的更新可能会有一定的延迟。同时，如果轮询时间过长，会导致文件更新后无法立即获取最新内容，影响程序的正确性。因此，轮询时间需要在保证及时获取最新内容的同时，尽量减少不必要的文件读取操作。在这段代码中，轮询间隔是10毫秒，轮询10次即总共等待100毫秒，这个时间可以根据具体应用场景的需要进行调整</span></span>
<span class="line"><span style="color:#B392F0;">    </span><span style="color:#F97583;">await</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">new</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">Promise</span><span style="color:#B392F0;">((r) </span><span style="color:#F97583;">=&gt;</span><span style="color:#B392F0;"> {</span></span>
<span class="line"><span style="color:#B392F0;">      </span><span style="color:#F97583;">let</span><span style="color:#B392F0;"> n </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> </span><span style="color:#F8F8F8;">0</span></span>
<span class="line"><span style="color:#B392F0;">      </span><span style="color:#F97583;">const</span><span style="color:#B392F0;"> poll </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">async</span><span style="color:#B392F0;"> () </span><span style="color:#F97583;">=&gt;</span><span style="color:#B392F0;"> {</span></span>
<span class="line"><span style="color:#B392F0;">        n</span><span style="color:#F97583;">++</span></span>
<span class="line"><span style="color:#B392F0;">        </span><span style="color:#F97583;">const</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">newMtime</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> (</span><span style="color:#F97583;">await</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">fsp</span><span style="color:#B392F0;">.stat(file)).mtimeMs</span></span>
<span class="line"><span style="color:#B392F0;">        </span><span style="color:#F97583;">if</span><span style="color:#B392F0;"> (newMtime </span><span style="color:#F97583;">!==</span><span style="color:#B392F0;"> mtime </span><span style="color:#F97583;">||</span><span style="color:#B392F0;"> n </span><span style="color:#F97583;">&gt;</span><span style="color:#B392F0;"> </span><span style="color:#F8F8F8;">10</span><span style="color:#B392F0;">) {</span></span>
<span class="line"><span style="color:#B392F0;">          </span><span style="color:#6B737C;">// 这里的r(0)有啥用?</span></span>
<span class="line"><span style="color:#B392F0;">          </span><span style="color:#6B737C;">// 将 Promise 的状态从等待中变为已完成（fulfilled），同时将结果值设置为 0</span></span>
<span class="line"></span>
<span class="line"><span style="color:#B392F0;">          </span><span style="color:#6B737C;">// 直接r()不行吗?</span></span>
<span class="line"><span style="color:#B392F0;">          </span><span style="color:#6B737C;">// 可以的，r()和r(undefined)的效果是一样的。在这个函数中，r(0)只是为了返回一个假值，以便后续代码可以判断是否需要重新读取文件内容。如果r()或r(undefined)会更清晰明了，也可以这么写。</span></span>
<span class="line"><span style="color:#B392F0;">          r(</span><span style="color:#F8F8F8;">0</span><span style="color:#B392F0;">)</span></span>
<span class="line"><span style="color:#B392F0;">        } </span><span style="color:#F97583;">else</span><span style="color:#B392F0;"> {</span></span>
<span class="line"><span style="color:#B392F0;">          setTimeout(poll</span><span style="color:#BBBBBB;">,</span><span style="color:#B392F0;"> </span><span style="color:#F8F8F8;">10</span><span style="color:#B392F0;">)</span></span>
<span class="line"><span style="color:#B392F0;">        }</span></span>
<span class="line"><span style="color:#B392F0;">      }</span></span>
<span class="line"><span style="color:#B392F0;">      setTimeout(poll</span><span style="color:#BBBBBB;">,</span><span style="color:#B392F0;"> </span><span style="color:#F8F8F8;">10</span><span style="color:#B392F0;">)</span></span>
<span class="line"><span style="color:#B392F0;">    })</span></span>
<span class="line"><span style="color:#B392F0;">    </span><span style="color:#F97583;">return</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">await</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">fsp</span><span style="color:#B392F0;">.readFile(file</span><span style="color:#BBBBBB;">,</span><span style="color:#B392F0;"> </span><span style="color:#FFAB70;">&#39;utf-8&#39;</span><span style="color:#B392F0;">)</span></span>
<span class="line"><span style="color:#B392F0;">  } </span><span style="color:#F97583;">else</span><span style="color:#B392F0;"> {</span></span>
<span class="line"><span style="color:#B392F0;">    </span><span style="color:#F97583;">return</span><span style="color:#B392F0;"> content</span></span>
<span class="line"><span style="color:#B392F0;">  }</span></span>
<span class="line"><span style="color:#B392F0;">}</span></span>
<span class="line"></span></code></pre><div class="line-numbers-wrapper" aria-hidden="true"><span class="line-number">1</span><br><span class="line-number">2</span><br><span class="line-number">3</span><br><span class="line-number">4</span><br><span class="line-number">5</span><br><span class="line-number">6</span><br><span class="line-number">7</span><br><span class="line-number">8</span><br><span class="line-number">9</span><br><span class="line-number">10</span><br><span class="line-number">11</span><br><span class="line-number">12</span><br><span class="line-number">13</span><br><span class="line-number">14</span><br><span class="line-number">15</span><br><span class="line-number">16</span><br><span class="line-number">17</span><br><span class="line-number">18</span><br><span class="line-number">19</span><br><span class="line-number">20</span><br><span class="line-number">21</span><br><span class="line-number">22</span><br><span class="line-number">23</span><br><span class="line-number">24</span><br><span class="line-number">25</span><br><span class="line-number">26</span><br><span class="line-number">27</span><br><span class="line-number">28</span><br><span class="line-number">29</span><br><span class="line-number">30</span><br><span class="line-number">31</span><br><span class="line-number">32</span><br><span class="line-number">33</span><br><span class="line-number">34</span><br><span class="line-number">35</span><br><span class="line-number">36</span><br><span class="line-number">37</span><br><span class="line-number">38</span><br></div></div>`,5);function r(B,y,i,F,A,m){const s=e("git-talk");return o(),a("div",null,[c,l(s)])}const f=n(t,[["render",r]]);export{b as __pageData,f as default};
