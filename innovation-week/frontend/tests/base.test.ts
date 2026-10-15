import { test } from 'node:test';
import assert from 'node:assert/strict';
import { joinBase, stripBasePath } from '../src/base.ts';

test('joinBase prefixa caminhos absolutos', () => {
  assert.equal(joinBase('/innovation-week/', '/jogo'), '/innovation-week/jogo');
  assert.equal(joinBase('/innovation-week/', '/'), '/innovation-week/');
  assert.equal(joinBase('/innovation-week/', 'models/x.glb'), '/innovation-week/models/x.glb');
  assert.equal(joinBase('/', '/jogo'), '/jogo');
});

test('stripBasePath remove o prefixo só no início', () => {
  assert.equal(stripBasePath('/innovation-week/', '/innovation-week/01/123/10/l1/21/AO'), '/01/123/10/l1/21/AO');
  assert.equal(stripBasePath('/innovation-week/', '/innovation-week'), '/');
  assert.equal(stripBasePath('/innovation-week/', '/innovation-week/'), '/');
  assert.equal(stripBasePath('/innovation-week/', '/innovation-weekend'), '/innovation-weekend');
  assert.equal(stripBasePath('/innovation-week/', '/outra/coisa'), '/outra/coisa');
  assert.equal(stripBasePath('/', '/jogo'), '/jogo');
});
