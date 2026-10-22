// Run: node --test tests/tmux-wheel.test.mjs
// Public pack script + real tmux parser. End-to-end Pi PTY receipt is separate.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const pack = process.env.WHEEL_PACK_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), '../gastown');
const scratch = join(homedir(), 'work/.cache/wheel-input');
mkdirSync(scratch, { recursive: true });

test('pack forwards only alternate-screen mouse apps and preserves existing tables on reapply', () => {
  const root = mkdtempSync(join(scratch, 'pack-regression-'));
  const socket = `wheel-pack-${process.pid}`;
  const env = { ...process.env, TMUX_TMPDIR: root, GC_TMUX_SOCKET: socket };
  const tmux = (...args) => execFileSync('tmux', ['-L', socket, ...args], { env, encoding: 'utf8' }).trim();
  try {
    tmux('-f', '/dev/null', 'new-session', '-d', '-s', 'synthetic', 'sleep 60');
    const pid = tmux('display-message', '-p', '#{pid}');
    // Existing private mayor table is deliberately not reconciled or removed.
    tmux('bind-key', '-T', 'pi-wheel-mayor', 'WheelUpPane', 'send-keys', '-M');
    const privateBefore = tmux('list-keys', '-T', 'pi-wheel-mayor');
    tmux('new-session', '-d', '-s', 'private-mayor', 'sleep 60');
    tmux('set-option', '-t', 'private-mayor', 'key-table', 'pi-wheel-mayor');
    const copyBefore = tmux('list-keys', '-T', 'copy-mode');
    const viBefore = tmux('list-keys', '-T', 'copy-mode-vi');
    const menuBefore = tmux('list-keys', '-T', 'root', 'MouseDown3Pane');
    const dragBefore = tmux('list-keys', '-T', 'root', 'MouseDrag1Pane');
    tmux('bind-key', '-T', 'prefix', 'F12', 'display-message', 'prefix-survives');
    const prefixBefore = tmux('list-keys', '-T', 'prefix', 'F12');
    tmux('set-option', '-s', 'extended-keys', 'on');
    tmux('set-option', '-s', 'extended-keys-format', 'csi-u');
    // Start with the affected binding on an existing server.
    tmux('bind-key', '-T', 'root', 'WheelUpPane', 'if-shell', '-F', '-t', '=', '#{pane_in_mode}', 'send-keys -M', 'copy-mode -e');
    for (let n = 0; n < 2; n++) {
      execFileSync('sh', [join(pack, 'assets/scripts/tmux-keybindings.sh'), pack], { env });
      const up = tmux('list-keys', '-T', 'root', 'WheelUpPane');
      assert.match(up, /#\{\|\|:#\{pane_in_mode\},#\{&&:#\{alternate_on\},#\{mouse_any_flag\}\}\}/);
      assert.match(up, /"send-keys -M" "copy-mode -e"$/);
      assert.match(tmux('list-keys', '-T', 'root', 'WheelDownPane'), /send-keys -M$/);
      assert.equal(tmux('display-message', '-p', '#{pid}'), pid, 'must not restart tmux');
      assert.equal(tmux('list-keys', '-T', 'pi-wheel-mayor'), privateBefore);
      assert.equal(tmux('show-options', '-v', '-t', 'private-mayor', 'key-table'), 'pi-wheel-mayor');
      assert.equal(tmux('list-keys', '-T', 'copy-mode'), copyBefore);
      assert.equal(tmux('list-keys', '-T', 'copy-mode-vi'), viBefore);
      assert.equal(tmux('list-keys', '-T', 'root', 'MouseDown3Pane'), menuBefore);
      assert.equal(tmux('list-keys', '-T', 'root', 'MouseDrag1Pane'), dragBefore);
      assert.equal(tmux('list-keys', '-T', 'prefix', 'F12'), prefixBefore);
      assert.equal(tmux('show-options', '-sv', 'extended-keys'), 'on');
      assert.equal(tmux('show-options', '-sv', 'extended-keys-format'), 'csi-u');
      assert.equal(tmux('show-options', '-gqv', 'key-table'), 'root');
      // Future root updates remain visible, unlike a copied session template.
      tmux('bind-key', '-T', 'root', 'F12', 'display-message', 'future-root');
    }
    assert.match(tmux('list-keys', '-T', 'root', 'F12'), /future-root/);
    tmux('new-session', '-d', '-s', 'replacement', 'sleep 60');
    assert.equal(tmux('show-options', '-Av', '-t', 'replacement', 'key-table'), 'root');
  } finally {
    try { tmux('kill-server'); } finally { rmSync(root, { recursive: true, force: true }); }
  }
});
