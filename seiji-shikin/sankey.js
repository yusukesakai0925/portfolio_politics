// 収支フロー図（サンキー図）の描画。公式サイトのトップ（/index.html の「05 政治資金」）と
// /seiji-shikin/ の両方から読み込む。直すときはこの1か所だけを直す。
function sankeyEsc(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ================================================================
// Sankey 図を SVG で描く（4列構造）
//   1列目 : 収入カテゴリ（income sources）
//   2列目 : 収入合計ノード
//   3列目 : 支出合計ノード
//   4列目 : 支出カテゴリ
//   帯    : 収入ソース→収入合計・収入合計→支出合計・支出合計→支出費目 の3段ベジェ
//
// availW: コンテナ実幅（px）を渡すことでスマホでも正寸で描画し、
//         viewBox 縮小によるラベル縮小を回避する。
// ================================================================
function buildSankey(incomeByCategory, expenseByCategory, availW) {
  if (!incomeByCategory.length && !expenseByCategory.length) return '';

  const W   = Math.max(availW || 520, 260);
  const PAD = 10;

  // ノード幅: 外側（費目）は W に比例しつつ上限 130 / 下限 64、中央の合計2つは少し細く
  const N_W       = Math.min(Math.max(Math.floor(W * 0.21), 64), 130);
  const M_W       = Math.min(Math.max(Math.floor(W * 0.17), 56), 110);
  const GAP_M     = Math.min(Math.max(Math.floor(W * 0.04), 8), 40);
  const gapSpace  = W - 2 * PAD - 2 * N_W - 2 * M_W - GAP_M;
  const GAP       = Math.max(10, Math.floor(gapSpace / 2));

  const X_L  = PAD;
  const X_MI = X_L + N_W + GAP;      // 収入合計
  const X_MO = X_MI + M_W + GAP_M;   // 支出合計
  const X_R  = X_MO + M_W + GAP;

  const totalInc = incomeByCategory.reduce((s, c) => s + c.amount, 0);
  const totalExp = expenseByCategory.reduce((s, c) => s + c.amount, 0);
  const total    = Math.max(totalInc, totalExp, 1);

  const NODE_GAP  = 6;
  const MIN_H     = 20;
  // フォントサイズ: ノード幅から計算し 11-13px に収める
  const FONT_SZ   = Math.max(11, Math.min(13, Math.floor(N_W * 0.155)));

  // 行数は左右の多い方に合わせる
  const maxRows = Math.max(incomeByCategory.length, expenseByCategory.length, 1);
  // usable: 配置の基準値。実際の下端は layoutNodes 後に計算するため H はここでは決めない
  const usable  = Math.max(maxRows * (MIN_H + NODE_GAP) - NODE_GAP, 120);

  // ノード配置
  function layoutNodes(cats, x) {
    const nodes = cats.map(c => ({
      ...c, x,
      h: Math.max(MIN_H, Math.round(
        (c.amount / total) * (usable - (cats.length - 1) * NODE_GAP)
      )),
    }));
    const sumH = nodes.reduce((s, n) => s + n.h, 0);
    const gaps = (nodes.length - 1) * NODE_GAP;
    let y = PAD + Math.max(0, (usable - sumH - gaps) / 2);
    return nodes.map(n => { const nd = {...n, y}; y += n.h + NODE_GAP; return nd; });
  }

  const incNodes = layoutNodes(incomeByCategory, X_L);
  const expNodes = layoutNodes(expenseByCategory, X_R);

  // 収入合計ノードの高さ = 収入ノード群の上端〜下端、支出合計も同様に支出ノード群に合わせる
  function span(nodes) {
    const top = nodes.length ? nodes[0].y : PAD;
    const bot = nodes.length ? nodes[nodes.length - 1].y + nodes[nodes.length - 1].h : PAD + usable;
    return { top, bot, h: Math.max(bot - top, 1) };
  }
  // 合計2つは同じ縮尺で描く（同額なら同じ高さ）。費目側は最小高さで膨らむので、広い方の幅に合わせる
  const spIn  = span(incNodes), spOut = span(expNodes);
  const poolTop = Math.min(spIn.top, spOut.top);
  const unit    = (Math.max(spIn.bot, spOut.bot) - poolTop) / total;
  const inPool  = { top: poolTop, h: Math.max(Math.round(totalInc * unit), 1) };
  const outPool = { top: poolTop, h: Math.max(Math.round(totalExp * unit), 1) };
  inPool.bot  = inPool.top + inPool.h;
  outPool.bot = outPool.top + outPool.h;
  const poolBot = Math.max(inPool.bot, outPool.bot);

  // SVG 高さ: 実際のノード下端から計算（費目が多いと usable を超えるため事前推算は使わない）
  const bottomInc = incNodes.length ? incNodes[incNodes.length - 1].y + incNodes[incNodes.length - 1].h : PAD;
  const bottomExp = expNodes.length ? expNodes[expNodes.length - 1].y + expNodes[expNodes.length - 1].h : PAD;
  const H = Math.max(bottomInc, bottomExp, poolBot) + PAD; // 下余白のみ（凡例は SVG 外）

  const INC_COLORS = ['#2a7a3b', '#3dab55', '#5ac972', '#84d897'];
  const EXP_COLORS = ['#5B8DEF', '#3b6fd4', '#2a55b0', '#7aa8f5', '#a0c4ff', '#c5d8ff'];
  const BAND_OP    = 0.28;

  let svg = `<svg class="sankey-svg" width="${W}" height="${H}" `
          + `xmlns="http://www.w3.org/2000/svg" aria-label="収支フロー図">`;

  // --- 帯: 収入ソース → 収入合計 ---
  let cL = inPool.top;
  incNodes.forEach((n, i) => {
    const bh  = Math.max(2, Math.round((n.amount / Math.max(totalInc, 1)) * inPool.h));
    const mx  = X_L + N_W + GAP * 0.45;
    const p   = `M${X_L+N_W},${n.y} C${mx},${n.y} ${mx},${cL} ${X_MI},${cL} `
              + `L${X_MI},${cL+bh} C${mx},${cL+bh} ${mx},${n.y+n.h} ${X_L+N_W},${n.y+n.h}Z`;
    svg += `<path d="${p}" fill="${INC_COLORS[i % INC_COLORS.length]}" opacity="${BAND_OP}"/>`;
    cL += bh;
  });

  // --- 帯: 収入合計 → 支出合計（支出に回った額の分だけ） ---
  if (totalInc > 0 && totalExp > 0) {
    const used = Math.min(totalInc, totalExp);
    const ih   = Math.max(2, Math.round((used / totalInc) * inPool.h));
    const oh   = Math.max(2, Math.round((used / totalExp) * outPool.h));
    const x1   = X_MI + M_W, x2 = X_MO, mx = (x1 + x2) / 2;
    const p    = `M${x1},${inPool.top} C${mx},${inPool.top} ${mx},${outPool.top} ${x2},${outPool.top} `
               + `L${x2},${outPool.top+oh} C${mx},${outPool.top+oh} ${mx},${inPool.top+ih} ${x1},${inPool.top+ih}Z`;
    svg += `<path d="${p}" fill="#4a6fa5" opacity="${BAND_OP}"/>`;
  }

  // --- 帯: 支出合計 → 支出費目 ---
  let cR = outPool.top;
  expNodes.forEach((n, i) => {
    const bh  = Math.max(2, Math.round((n.amount / Math.max(totalExp, 1)) * outPool.h));
    const mx  = X_MO + M_W + GAP * 0.45;
    const p   = `M${X_MO+M_W},${cR} C${mx},${cR} ${mx},${n.y} ${X_R},${n.y} `
              + `L${X_R},${n.y+n.h} C${mx},${n.y+n.h} ${mx},${cR+bh} ${X_MO+M_W},${cR+bh}Z`;
    svg += `<path d="${p}" fill="${EXP_COLORS[i % EXP_COLORS.length]}" opacity="${BAND_OP}"/>`;
    cR += bh;
  });

  // --- ノード描画ヘルパー（rect + 2行テキスト）---
  function nodeEl(x, y, w, h, color, label, amount) {
    const cx     = x + w / 2;
    const cy     = y + h / 2;
    const maxCh  = Math.max(3, Math.floor(w / (FONT_SZ * 0.62)));
    const lbl    = label.length > maxCh ? label.slice(0, maxCh - 1) + '…' : label;
    const amtStr = Number(amount).toLocaleString('ja-JP') + '円';
    let el = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" rx="2"/>`;
    if (h >= 34) {
      // 2行: ラベル + 金額
      el += `<text x="${cx}" y="${cy - FONT_SZ * 0.6}" dominant-baseline="middle" `
          + `text-anchor="middle" font-size="${FONT_SZ}" fill="#fff" `
          + `font-family="sans-serif">${sankeyEsc(lbl)}</text>`;
      el += `<text x="${cx}" y="${cy + FONT_SZ * 0.9}" dominant-baseline="middle" `
          + `text-anchor="middle" font-size="${Math.max(11, FONT_SZ - 2)}" `
          + `fill="rgba(255,255,255,0.82)" font-family="monospace">${amtStr}</text>`;
    } else {
      // 1行: ラベルのみ
      el += `<text x="${cx}" y="${cy}" dominant-baseline="middle" `
          + `text-anchor="middle" font-size="${FONT_SZ}" fill="#fff" `
          + `font-family="sans-serif">${sankeyEsc(lbl)}</text>`;
    }
    return el;
  }

  // 収入ソードノード（左列）
  incNodes.forEach((n, i) => {
    svg += nodeEl(X_L, n.y, N_W, n.h, INC_COLORS[i % INC_COLORS.length], n.label, n.amount);
  });
  // 収入合計・支出合計ノード（中央の2列）
  svg += nodeEl(X_MI, inPool.top, M_W, inPool.h, '#4a6fa5', '収入合計', totalInc);
  svg += nodeEl(X_MO, outPool.top, M_W, outPool.h, '#3d5a85', '支出合計', totalExp);
  // 支出費目ノード（右列）
  expNodes.forEach((n, i) => {
    svg += nodeEl(X_R, n.y, N_W, n.h, EXP_COLORS[i % EXP_COLORS.length], n.label, n.amount);
  });

  svg += '</svg>';

  // 凡例は SVG 外の HTML として返す（ノードと重ならないよう）
  const legendHtml = `<div class="sankey-legend">`
    + `<span>← 収入</span><span>支出 →</span>`
    + `</div>`;

  return svg + legendHtml;
}
