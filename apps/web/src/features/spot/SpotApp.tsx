import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { RANKS, SUITS, COLORS, handName, fixedUnits, parseSpotJson, MAX_JSON_BYTES } from '@gto-analyzer/contracts/spot';
import type { Card as CardCode, Suit, Spot, SpotData, Position } from '@gto-analyzer/contracts/spot';
import { SAMPLE } from '@gto-analyzer/contracts/spot/sample';
import { calculate, allInPercent, describeHand, exportData, signature, strategyState } from '@gto-analyzer/domain/spot';
const fmt = (n: number, digits = 2) => new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(n);
type CardTarget = { type: 'board' | 'hero'; index: number };
function Card({ code, label, onClick, disabled = false }: { code?: CardCode; label: string; onClick: () => void; disabled?: boolean }) {
  const suit = code ? SUITS[code[1] as Suit] : undefined;
  return <button type="button" className={`card ${suit?.className ?? 'empty'}`} aria-label={label} disabled={disabled} onClick={onClick}>
    {code ? <><span>{code[0] === 'T' ? '10' : code[0]}</span><span className="suit">{suit?.symbol}</span></> : <>+<small>{label.includes('ターン') ? 'TURN' : 'RIVER'}</small></>}
  </button>;
}
function Modal({ title, children, onClose, className = '' }: { title: string; children: ReactNode; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current, opener = document.activeElement;
    dialog?.showModal();
    return () => { dialog?.close(); if (opener instanceof HTMLElement && opener.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={ref} className={className} aria-label={title} onCancel={onClose} onClick={e => {
    if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); }
  }}><div className="dialog-head"><h2>{title}</h2><button className="close" aria-label="閉じる" onClick={onClose}>×</button></div>{children}</dialog>;
}
function NumberField({ label, value, min = 0, onChange }: { label: string; value: number; min?: number; onChange: (value: number) => void }) {
  const [text, setText] = useState(String(value));
  const [error, setError] = useState(false);
  useEffect(() => { setText(String(value)); setError(false); }, [value]);
  return <label className="field"><span>{label}</span><div className="number-wrap"><input type="number" aria-label={label} min={min} max="100000" step="0.001" inputMode="decimal" value={text} aria-invalid={error} onChange={e => {
    setText(e.target.value); const n = e.target.valueAsNumber;
    try { if (!Number.isFinite(n) || n < min || n > 100000) throw new Error(); fixedUnits(n, 3, label); setError(false); onChange(n); } catch { setError(true); }
  }} onBlur={() => { if (error) { setText(String(value)); setError(false); } }} /><span>bb</span></div>{error && <small role="status">{min}〜100000、小数3桁までで入力してください。</small>}</label>;
}
export function SpotApp() {
  const [data, setData] = useState<SpotData>(() => structuredClone(SAMPLE));
  const [bound, setBound] = useState(() => signature(SAMPLE.spot));
  const [view, setView] = useState<Position>('BTN');
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<CardTarget | null>(null);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [jsonMessage, setJsonMessage] = useState('');
  const [toast, setToast] = useState('');
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3000); return () => clearTimeout(timer); }, [toast]);
  const s = data.spot, c = calculate(s);
  const update = (change: Partial<Spot>) => setData(current => ({ ...current, spot: { ...current.spot, ...change } }));
  const { player, reason } = strategyState(data, bound, view);
  const frequencies = selected ? player?.hands[selected]?.frequencies : player?.actions.map(a => a.frequency);
  const isDemo = data.strategy?.source.kind === 'demo';
  const chooseCard = (code: CardCode) => {
    if (!target) return; const next = [...s[target.type]]; next[target.index] = code; update({ [target.type]: next }); setTarget(null);
  };
  const download = () => {
    const out = exportData(data, bound), url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'poker-spot.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setToast('現在の局面と有効な戦略を保存しました。');
  };
  return <>
    <header className="app-header"><a className="brand" href="./" aria-label="Poker Spot Visualizer ホーム"><span className="brand-mark">♠</span><span>POKER SPOT<span className="brand-sub">VISUALIZER / STUDY LAB</span></span></a><nav className="header-actions" aria-label="データ操作">
      <button className="quiet" onClick={() => { setData(structuredClone(SAMPLE)); setBound(signature(SAMPLE.spot)); setView('BTN'); setSelected(null); setToast('初期スポットに戻しました。'); }}>初期スポット</button>
      <button className="button" onClick={() => { setJsonText(JSON.stringify(exportData(data, bound), null, 2)); setJsonMessage(''); setJsonOpen(true); }}>JSON 入出力</button>
    </nav></header>
    <main><div className="page-heading"><div><div className="eyebrow">SPOT EXPLORER</div><h1>局面を、動かして理解する。</h1></div><span className="format-label">NLH · HEADS UP · chipEV</span></div>
    <div className="workspace"><section className="visual-area" aria-label="ポーカー卓と計算結果"><div className="metrics">
      <div><span>現在の SPR</span><strong data-testid="spr">{fmt(c.spr)}</strong><small>実効スタック ÷ ポット</small></div>
      <div><span>ポット</span><strong><b>{fmt(s.pot, 3)}</b><em>bb</em></strong><small>ベット前</small></div>
      <div><span>実効スタック</span><strong><b data-testid="effective">{fmt(c.effective, 3)}</b><em>bb</em></strong><small>両者の残りスタックの小さい方</small></div>
    </div><div className="table-area"><div className="table-heading"><span>{['FLOP', 'TURN', 'RIVER'][s.board.length - 3]}</span><span>BTN vs BB</span></div>
    <div className="poker-table"><div className="felt-ring" /><div className="player opponent"><div className="hole-cards mini"><span className="card-back" /><span className="card-back" /></div><div className="seat"><span className="position">BB</span><span><strong>{fmt(s.stacks.BB, 3)}</strong> bb</span></div><span className="seat-note">OUT OF POSITION</span></div>
    <div className="board-center"><div className="pot-chip">POT <strong>{fmt(s.pot, 3)} bb</strong></div><div className="board" aria-label="ボード">{Array.from({ length: 5 }, (_, index) => {
      const code = s.board[index]; return <Card key={index} {...(code ? { code } : {})} label={code ? `ボード ${index + 1} ${code}を変更` : index === 3 ? 'ターンを追加' : 'リバーを追加'} disabled={index === 4 && s.board.length === 3} onClick={() => setTarget({ type: 'board', index })} />;
    })}</div><span className="board-caption">カードをタップして変更</span></div>
    <div className="player hero"><div className="hole-cards">{s.hero.map((code, index) => <Card key={index} code={code} label={`BTN ${index + 1} ${code}を変更`} onClick={() => setTarget({ type: 'hero', index })} />)}</div><div className="seat"><span className="position">BTN</span><span><strong>{fmt(s.stacks.BTN, 3)}</strong> bb</span><span className="dealer" aria-label="ディーラー">D</span></div><span className="seat-note" data-testid="hand-category">{describeHand(s.hero, s.board)}</span></div></div>
    <div className="table-footer"><span><i className="small-line" />残りスタックを表示</span>{s.board.length > 3 && <button className="text-button" onClick={() => update({ board: s.board.slice(0, 3) })}>フロップに戻す</button>}</div></div>
    <div className="insight"><span className="insight-icon">÷</span><p><strong>SPR {fmt(c.spr)}。 </strong>今のポット{fmt(s.pot, 3)} bbに対して、実効スタックが{fmt(c.effective, 3)} bb残っています。</p></div></section>
    <aside className="control-panel"><div className="panel-top"><span className="eyebrow">SCENARIO</span><span className="unit">単位：bb</span></div><h2>スポット設定</h2>
      <NumberField label="ベット前のポット" value={s.pot} min={0.1} onChange={pot => update({ pot })} /><div className="two-fields"><NumberField label="BTN 残り" value={s.stacks.BTN} onChange={BTN => update({ stacks: { ...s.stacks, BTN } })} /><NumberField label="BB 残り" value={s.stacks.BB} onChange={BB => update({ stacks: { ...s.stacks, BB } })} /></div>
      <div className="preset-label">両者の残りを設定</div><div className="chips">{[20, 40, 97.5].map(n => <button key={n} className={s.stacks.BTN === n && s.stacks.BB === n ? 'active' : ''} onClick={() => update({ stacks: { BTN: n, BB: n } })}>{n} bb</button>)}</div>
      <div className="control-divider" /><div className="section-title"><h2>ベットを試す</h2><span className="subtle">BTN → BB</span></div>
      <div className="bet-size-heading"><label htmlFor="bet-slider">ポットに対するサイズ</label><strong>{c.allIn ? '実効 All-in · ' : ''}{fmt(s.betPercent, 2)}%</strong></div>
      <input id="bet-slider" type="range" min="0" max={Math.max(200, Math.ceil(s.betPercent))} step="0.01" value={s.betPercent} aria-label="ベットサイズ（ポット比率%）" onChange={e => update({ betPercent: Number(e.target.value) })} />
      <div className="chips bet-chips">{[33, 50, 67, 100].map(n => <button key={n} className={s.betPercent === n ? 'active' : ''} onClick={() => update({ betPercent: n })}>{n}%</button>)}<button className={c.allIn ? 'active' : ''} onClick={() => update({ betPercent: allInPercent(s) })}>All-in</button></div>
      <div className="bet-amount"><span>実効ベット額</span><strong><span data-testid="bet-amount">{fmt(c.bet, 3)}</span><small> bb</small></strong></div><p className="secondary-note">{c.capped ? '相手がコールできる実効スタックまでに制限しています。' : ''}</p>
      <div className="odds-result"><div><span>BBのコール必要勝率</span><strong data-testid="required-equity">{c.bet > 0 ? fmt(c.equity) : '—'}<small>{c.bet > 0 ? '%' : ''}</small></strong></div><div className="equity-track"><span style={{ width: `${c.equity}%` }} /></div><div className="result-row"><span>コール後のポット</span><b data-testid="after-pot">{fmt(c.afterPot, 3)} bb</b></div><div className="result-row"><span>コール後のSPR</span><b data-testid="after-spr">{fmt(c.afterSpr)}</b></div></div>
      <details className="formula"><summary>計算式と前提</summary><p>必要勝率 = コール額 ÷ コール後のポット<br />コール後のSPR = 残り実効スタック ÷ コール後のポット</p><p>ヘッズアップでBBがチェックし、BTNがベットする場面です。未コールの超過分は除外。レーキ・ICM・将来のベットは含みません。必要勝率は追加投資がない場合の損益分岐点です。</p><p>ベット額は0.001 bb未満を切り捨てて計算します。</p></details>
    </aside></div>
    <section className="strategy-section" aria-labelledby="strategy-title"><div className="strategy-heading"><div><div className="eyebrow">STRATEGY VIEW</div><h2 id="strategy-title">レンジとアクション</h2></div><span className={`badge ${reason ? 'stale' : isDemo ? 'demo' : 'solver'}`}>{reason ? '戦略の表示を保留' : isDemo ? '説明用サンプル' : '取込結果（自己申告）'}</span></div>
    <div className={`strategy-note${reason ? ' stale' : ''}`} data-testid="strategy-note">{reason ?? (isDemo ? '以下の頻度はUIの説明用です。GTOの推奨値・実際のソルバー出力ではありません。レンジ表は一部ハンドのみ掲載しています。' : `出典：${data.strategy?.source.label}。取込者の自己申告データです。アプリによるGTO検証は行っていません。`)}</div>
    <div className="strategy-layout"><div className="range-panel"><div className="range-toolbar"><div className="tabs" aria-label="表示するプレイヤー">{(['BTN', 'BB'] as const).map(p => <button key={p} className={view === p ? 'active' : ''} aria-pressed={view === p} onClick={() => { setView(p); setSelected(null); }}>{p}</button>)}</div><span className="subtle">{player?.node ?? '対応するデータなし'}</span></div>
      <div className="range-grid" aria-label="ハンド別アクション頻度">{RANKS.flatMap((_, i) => RANKS.map((_, j) => {
        const hand = handName(i, j), h = player?.hands[hand]; let cumulative = 0;
        const stops = h?.frequencies.flatMap((f, index) => { const action = player?.actions[index]; if (!action) return []; const start = cumulative; cumulative += f; return [`${COLORS[action.type]} ${start}%`, `${COLORS[action.type]} ${cumulative}%`]; });
        return <button key={hand} className={`range-cell${h ? ' has-data' : ''}${hand === selected ? ' selected' : ''}`} aria-label={`${hand} ${h ? 'アクション頻度を表示' : 'データなし'}`} aria-pressed={hand === selected} style={stops ? { background: `linear-gradient(to right,${stops.join(',')})` } : undefined} onClick={() => setSelected(hand)}>{hand}</button>;
      }))}</div><div className="range-legend"><span><i className="legend-empty" />データなし</span><span>色の割合＝アクション頻度</span></div></div>
    <div className="action-panel"><div className="action-title"><h3>{selected ?? 'レンジ全体'}</h3>{selected && <button className="text-button" onClick={() => setSelected(null)}>全体に戻す</button>}</div><p className="secondary-note">{selected ? '169分類ごとの頻度（スート別コンボではありません）' : '全体頻度は取込値です。下の一部ハンドからの集計ではありません。'}</p>
    {player && frequencies && player.actions.map((action, i) => <div className="action-row" key={action.id}><div className="action-row-head"><span><i className="action-dot" style={{ background: COLORS[action.type] }} />{action.label}</span><strong>{fmt(frequencies[i] ?? 0, 2)}%</strong></div><div className="action-track"><i style={{ width: `${frequencies[i]}%`, background: COLORS[action.type] }} /></div></div>)}
    <div className="hand-detail">{player && frequencies ? selected ? '同じハンド分類でも、スートやブロッカーで戦略は変わります。' : '表のハンドを選ぶと、そのハンドの頻度を確認できます。' : reason ?? 'このハンドの頻度は含まれていません。'}</div><div className="learning-note"><strong>SPRだけで、コミットは決まらない。</strong><p>同じSPRでも、相手のレンジと自分のエクイティで判断は変わります。ボードやスタックを変更した後の戦略は、その条件のソルバー結果を取り込んで確認します。</p></div></div></div></section>
    <footer><span>POKER SPOT / STUDY LAB</span><span>計算はリアルタイム · 戦略は取込データ</span></footer></main>
    {target && <Modal title={target.type === 'hero' ? `BTNのカード ${target.index + 1}` : target.index < 3 ? `フロップ ${target.index + 1}` : target.index === 3 ? 'ターン' : 'リバー'} onClose={() => setTarget(null)}><div className="deck">{(['s', 'h', 'd', 'c'] as const).flatMap(suit => RANKS.map(rank => {
      const code = `${rank}${suit}` as CardCode, current = s[target.type][target.index], used = [...s.board, ...s.hero].filter(c => c !== current);
      return <Card key={code} code={code} label={`${rank}${SUITS[suit].symbol}`} disabled={used.includes(code)} onClick={() => chooseCard(code)} />;
    }))}</div>{target.type === 'board' && target.index >= 3 && <button className="button" onClick={() => { update({ board: s.board.slice(0, target.index) }); setTarget(null); }}>このストリート以降を削除</button>}</Modal>}
    {jsonOpen && <Modal title="JSON 入出力" className="json-dialog" onClose={() => setJsonOpen(false)}><p>共通形式で局面と戦略を取り込めます。各ソルバーの生データは、この形式への変換が必要です。JSONは端末内で処理し、外部へ送信しません。</p>
    <div className="json-tools"><button className="button" onClick={download}>現在の局面を保存</button><button className="quiet" onClick={() => { setJsonText(JSON.stringify(SAMPLE, null, 2)); setJsonMessage('説明用サンプルを表示しました。「取り込む」で反映します。'); }}>サンプルを表示</button><label className="button file-label">ファイルを選択<input type="file" aria-label="JSONファイル" accept=".json,application/json" onChange={async e => {
      const input = e.currentTarget, file = input.files?.[0]; input.value = ''; if (!file) return;
      if (file.size > MAX_JSON_BYTES) { setJsonMessage('ファイルは1 MiB以内にしてください。'); return; }
      try { setJsonText(await file.text()); setJsonMessage('ファイルを読み込みました。「取り込む」で反映します。'); } catch { setJsonMessage('ファイルを読み込めませんでした。'); }
    }} /></label></div><label htmlFor="json-text">JSON データ</label><textarea id="json-text" spellCheck={false} value={jsonText} onChange={e => setJsonText(e.target.value)} aria-describedby="json-message" /><p id="json-message" role="status">{jsonMessage}</p>
    <div className="dialog-bottom"><span className="secondary-note">取り込むと、現在の局面を置き換えます。</span><button className="primary" onClick={() => {
      try { const parsed = parseSpotJson(jsonText); setData(parsed); setBound(signature(parsed.spot)); setSelected(null); setView('BTN'); setJsonOpen(false); setToast('局面データを取り込みました。'); }
      catch (error) { setJsonMessage(error instanceof Error ? error.message : '取り込めませんでした。'); }
    }}>取り込む</button></div><details className="schema-help"><summary>データ形式について</summary><p>schemaVersion: 1。spotにはboard（3〜5枚）、pot、stacks.BTN / BB、hero（2枚）、betPercentを指定します。カードはJh / 8d / Asの形式です。bbは小数3桁、ベット率・頻度は小数2桁まで。頻度の合計は100です。</p><p>strategyは省略できます。source.kindはdemo または solver。solverは取込者の自己申告です。サンプルを表示すると構造を確認できます。条件の異なる戦略は表示・書き出しから除外されます。</p></details></Modal>}
    <div className={`toast${toast ? ' visible' : ''}`} role="status">{toast}</div>
  </>;
}
