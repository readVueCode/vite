import fs from 'fs';
import path from 'path';

const mdFilePath = path.join(__dirname, '../docs/');
// 排除文件
const excludeFile = [
  '.vitepress',
  'public',
  'imgs',
  'index.md',
  'vite.config.js',
];
interface sidebar {
  text: string;
  collapsed: boolean;
  items: sidebarItem[];
}
interface sidebarItem {
  text: string;
  link: string;
}
export function getSidebar(sidebar = <sidebar[]>[]) {
  fs.readdirSync(mdFilePath).forEach((dirName) => {
    if (!excludeFile.includes(dirName)) {
      const text = dirName.replace(/\d*\./, '');
      sidebar[text] = {
        text,
        collapsed: false,
        items: [],
      };
      const filepath = path.join(mdFilePath, dirName);
      fs.readdirSync(filepath).forEach((filename) => {
        sidebar[text].items.push({
          text: filename.replace('.md', '').replace(/\d*\./, ''),
          link: `/${dirName}/${filename}`,
        });
      });
    }
  });
  return Object.values(sidebar);
}

interface nav {
  text: string;
  items: navItem[];
}
interface navItem {
  text: string;
  link: string;
  activeMatch: string;
}
export function getNav(nav = <nav[]>[]) {
  fs.readdirSync(mdFilePath).forEach((dirName) => {
    if (!excludeFile.includes(dirName)) {
      const text = dirName.replace(/\d*\./, '');
      nav[text] = {
        text,
        items: [],
      };
      fs.readdirSync(path.join(mdFilePath, dirName)).forEach((filename) => {
        nav[text].items.push({
          text: filename.replace('.md', '').replace(/\d*\./, ''),
          link: `/${dirName}/${filename}`,
          activeMatch: `/${dirName}/${filename}`,
        });
      });
    }
  });
  return Object.values(nav);
}
