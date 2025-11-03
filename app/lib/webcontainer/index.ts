// Stub for webcontainer - not used in design tool mode
export const webcontainer = Promise.resolve({
  workdir: '/home/project',
  fs: {
    mkdir: async () => {},
    writeFile: async () => {},
    readFile: async () => '',
    readdir: async () => [],
  },
});
