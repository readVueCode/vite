import{_ as s,c as a,o as n,U as e}from"./chunks/framework.29dee80d.js";const F=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"指南/plugin-legacy.md","lastUpdated":1682653683000}'),l={name:"指南/plugin-legacy.md"},o=e(`<h2 id="loadbabel" tabindex="-1">loadBabel <a class="header-anchor" href="#loadbabel" aria-label="Permalink to &quot;loadBabel&quot;">​</a></h2><div class="language-ts line-numbers-mode"><button title="Copy Code" class="copy"></button><span class="lang">ts</span><pre class="shiki one-dark-pro vp-code-dark"><code><span class="line"><span style="color:#7F848E;font-style:italic;">// lazy load babel since it&#39;s not used during dev</span></span>
<span class="line"><span style="color:#7F848E;font-style:italic;">// eslint-disable-next-line @typescript-eslint/consistent-type-imports</span></span>
<span class="line"><span style="color:#C678DD;">let</span><span style="color:#ABB2BF;"> </span><span style="color:#E06C75;">babel</span><span style="color:#ABB2BF;">: </span><span style="color:#C678DD;">typeof</span><span style="color:#ABB2BF;"> </span><span style="color:#61AFEF;">import</span><span style="color:#ABB2BF;">(</span><span style="color:#98C379;">&#39;@babel/core&#39;</span><span style="color:#ABB2BF;">) | </span><span style="color:#E5C07B;">undefined</span></span>
<span class="line"><span style="color:#C678DD;">async</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">function</span><span style="color:#ABB2BF;"> </span><span style="color:#61AFEF;">loadBabel</span><span style="color:#ABB2BF;">() {</span></span>
<span class="line"><span style="color:#ABB2BF;">  </span><span style="color:#C678DD;">if</span><span style="color:#ABB2BF;"> (</span><span style="color:#56B6C2;">!</span><span style="color:#E06C75;">babel</span><span style="color:#ABB2BF;">) {</span></span>
<span class="line"><span style="color:#ABB2BF;">    </span><span style="color:#E06C75;">babel</span><span style="color:#ABB2BF;"> </span><span style="color:#56B6C2;">=</span><span style="color:#ABB2BF;"> </span><span style="color:#C678DD;">await</span><span style="color:#ABB2BF;"> </span><span style="color:#61AFEF;">import</span><span style="color:#ABB2BF;">(</span><span style="color:#98C379;">&#39;@babel/core&#39;</span><span style="color:#ABB2BF;">)</span></span>
<span class="line"><span style="color:#ABB2BF;">  }</span></span>
<span class="line"><span style="color:#ABB2BF;">  </span><span style="color:#C678DD;">return</span><span style="color:#ABB2BF;"> </span><span style="color:#E06C75;">babel</span></span>
<span class="line"><span style="color:#ABB2BF;">}</span></span>
<span class="line"></span></code></pre><pre class="shiki min-dark vp-code-light"><code><span class="line"><span style="color:#6B737C;">// lazy load babel since it&#39;s not used during dev</span></span>
<span class="line"><span style="color:#6B737C;">// eslint-disable-next-line @typescript-eslint/consistent-type-imports</span></span>
<span class="line"><span style="color:#F97583;">let</span><span style="color:#B392F0;"> babel</span><span style="color:#F97583;">:</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">typeof</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">import</span><span style="color:#B392F0;">(</span><span style="color:#FFAB70;">&#39;@babel/core&#39;</span><span style="color:#B392F0;">) </span><span style="color:#F97583;">|</span><span style="color:#B392F0;"> </span><span style="color:#79B8FF;">undefined</span></span>
<span class="line"><span style="color:#F97583;">async</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">function</span><span style="color:#B392F0;"> loadBabel() {</span></span>
<span class="line"><span style="color:#B392F0;">  </span><span style="color:#F97583;">if</span><span style="color:#B392F0;"> (</span><span style="color:#F97583;">!</span><span style="color:#B392F0;">babel) {</span></span>
<span class="line"><span style="color:#B392F0;">    babel </span><span style="color:#F97583;">=</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">await</span><span style="color:#B392F0;"> </span><span style="color:#F97583;">import</span><span style="color:#B392F0;">(</span><span style="color:#FFAB70;">&#39;@babel/core&#39;</span><span style="color:#B392F0;">)</span></span>
<span class="line"><span style="color:#B392F0;">  }</span></span>
<span class="line"><span style="color:#B392F0;">  </span><span style="color:#F97583;">return</span><span style="color:#B392F0;"> babel</span></span>
<span class="line"><span style="color:#B392F0;">}</span></span>
<span class="line"></span></code></pre><div class="line-numbers-wrapper" aria-hidden="true"><span class="line-number">1</span><br><span class="line-number">2</span><br><span class="line-number">3</span><br><span class="line-number">4</span><br><span class="line-number">5</span><br><span class="line-number">6</span><br><span class="line-number">7</span><br><span class="line-number">8</span><br><span class="line-number">9</span><br></div></div><ol><li>定义了一个变量 <code>babel</code>，类型为 <code>typeof import(&#39;@babel/core&#39;) | undefined</code>。</li><li>类型注释 <code>typeof import(&#39;@babel/core&#39;)</code> 表示变量 <code>babel</code> 的类型与 <code>@babel/core</code> 模块的类型相同。它告诉 TypeScript 编译器，<code>babel</code> 变量在加载 <code>@babel/core</code> 模块之后将包含该模块的类型信息。这个类型注释通常称为“导入类型”。</li><li><code>| undefined</code> 表示 <code>babel</code> 变量可能是 <code>undefined</code>。这意味着在 <code>babel</code> 变量被赋值之前，它将始终为 <code>undefined</code>。因为在加载 <code>@babel/core</code> 模块之前，我们不知道 <code>babel</code> 变量的类型，因此需要将其初始化为 <code>undefined</code>。这个类型注释通常称为“可选类型”。</li><li>开发期间不需要使用 <code>babel</code>，因此可以进行懒加载。由于 <code>babel</code> 在此期间未使用，因此可以延迟加载以提高性能。需要时再异步加载 <code>@babel/core</code> 模块并将其赋值给变量 <code>babel</code>。</li><li>函数 <code>loadBabel()</code>，用于加载 <code>babel</code> 模块。如果 <code>babel</code> 变量尚未定义，则调用 <code>import(&#39;@babel/core&#39;)</code> 异步加载 <code>@babel/core</code> 模块并将其赋值给 <code>babel</code>。该函数返回 <code>babel</code> 变量。</li><li>函数返回值是一个 <code>Promise</code> 对象，因为 <code>import()</code> 返回一个 <code>Promise</code> 对象，可以使用 <code>await</code> 等待模块加载完成。如果模块已经加载完成，则不需要等待，函数立即返回缓存的 <code>babel</code> 变量。</li></ol>`,3),p=[o];function c(t,r,d,i,b,y){return n(),a("div",null,p)}const u=s(l,[["render",c]]);export{F as __pageData,u as default};
