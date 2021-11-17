import { render as MustacheRender } from 'mustache';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

const VIEW_DIR = join(__dirname, '..', '..', '..', 'views'); // todo - get frm config

export const renderFile = (view, options?: any, cb?: any) => {
  if (typeof options === 'function') {
    // eslint-disable-next-line no-param-reassign
    cb = options;
  }
  if (typeof cb !== 'function') {
    // eslint-disable-next-line no-param-reassign
    cb = function cbFunc() {};
  }

  const viewDir = options.viewDir || VIEW_DIR;
  const file = existsSync(view) ? view : join(viewDir, view);
  const content = readFileSync(file, 'utf8');
  cb(null, MustacheRender(content, options));
};
