import { defineConfig } from 'vitepress';
import { getSidebar, getNav } from '../../doc-deal/getNavAndSidebar';

const organizationName = 'readVueCode';
const repositoryName = 'vite';

export default defineConfig({
  lang: 'zh-CN',
  base: `/${repositoryName}/`,
  title: `${repositoryName}源码解析`,
  description: `@vue/${repositoryName}源码解析`,
  head: [['link', { rel: 'icon', href: `/${repositoryName}/favicon.ico` }]],
  lastUpdated: true,
  markdown: {
    lineNumbers: true,
    // https://github.com/shikijs/shiki/blob/main/docs/themes.md#all-themes
    theme: {
      light: 'min-dark',
      dark: 'one-dark-pro',
    },
  },
  themeConfig: {
    logo: {
      light: '/logo-light.svg',
      dark: '/logo-dark.svg',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: `Copyright © 2022.4-${new Date().getFullYear()}.${
        new Date().getMonth() + 1
      }`,
    },
    lastUpdatedText: '更新日期',
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    darkModeSwitchLabel: '主题',
    outlineTitle: '索引',
    sidebarMenuLabel: '目录',
    returnToTopLabel: '回到顶部',
    editLink: {
      pattern: `https://github.com/${organizationName}/${repositoryName}/edit/master/docs/:path`,
      text: '在GitHub编辑此页',
    },
    socialLinks: [
      {
        icon: 'github',
        link: `https://github.com/${organizationName}/${repositoryName}`,
      },
    ],
    nav: getNav(),
    sidebar: getSidebar(),
  },
});
