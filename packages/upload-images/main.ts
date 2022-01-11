import fetch from 'isomorphic-unfetch';
import * as core from '@actions/core';
import * as fs from 'fs';
import * as FormData from 'form-data';
import * as path from 'path';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const clean = (str: string): string =>
  str
    .replace('-expected.png', '')
    .replace('-actual.png', '')
    .replace('-diff.png', '');

const isDiff = (str): boolean => str.includes('diff');
const isActual = (str): boolean => str.includes('actual');

const uploadImage = async () => {
  const p = core.getInput('path');
  const os = core.getInput('os');
  const TOKEN = core.getInput('token');
  const workspace = core.getInput('workspace');
  const fullPath = path.resolve(p);

  const upload = async (file, i = 0) => {
    return file
  };

  const getAllFiles = (currentPath) => {
    let results = [];
    const dirents = fs.readdirSync(currentPath, { withFileTypes: true });
    dirents.forEach((dirent) => {
      if (dirent.name.toLocaleLowerCase().includes('retry')) return;
      const newPath = path.resolve(currentPath, dirent.name);
      const stat = fs.statSync(newPath);
      if (stat && stat.isDirectory()) {
        results = results.concat(getAllFiles(newPath));
      } else {
        results.push(newPath);
      }
    });
    return results;
  };

  let files;
  try {
    files = getAllFiles(fullPath);
  } catch {
    fs.writeFileSync(`${workspace}/images-${os}.json`, JSON.stringify([]));
    return core.setOutput('images', []);
  }

  const resultsP = files.map(async (file) => {
    const img = fs.readFileSync(`${file}`);
    return upload(img);
  });

  const results = await Promise.all(resultsP);

  const formatted = {};
  results.forEach((link, index) => {
    const file = files[index];
    const key = clean(file);

    if (!formatted[key])
      formatted[key] = { actual: {}, diff: {}, expected: {} };

    const subKey = isActual(file)
      ? 'actual'
      : isDiff(file)
      ? 'diff'
      : 'expected';
    const name = path.parse(file).name;

    formatted[key][subKey] = {
      link,
      name,
    };
  });

  const final = JSON.stringify(Object.values(formatted));

  fs.writeFileSync(`${workspace}/images-${os}.json`, final);
  core.setOutput('images', final);
};

uploadImage().catch((err) => {
  core.setFailed(err);
});
