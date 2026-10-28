export const RANKS = 'AKQJT98765432'.split('');
export const SUITS = {s:{symbol:'♠',className:'spades'},h:{symbol:'♥',className:'hearts'},d:{symbol:'♦',className:'diamonds'},c:{symbol:'♣',className:'clubs'}};
export const COLORS = {check:'#64bda2',call:'#64bda2',bet:'#d39860',raise:'#bd6e63',fold:'#719db8'};
export function calculate(spot) {
  const effective = Math.min(spot.stacks.BTN, spot.stacks.BB);
  const requestedBet = spot.pot * spot.betPercent / 100;
  const bet = Math.min(requestedBet, effective);
  const afterPot = spot.pot + bet * 2;
  return {effective, spr:effective/spot.pot, requestedBet, bet, afterPot, afterSpr:(effective-bet)/afterPot, equity:bet/afterPot*100};
}
export function signature(spot) { return JSON.stringify([spot.board,spot.pot,spot.stacks.BTN,spot.stacks.BB]); }
export function handName(i,j) { return i === j ? RANKS[i]+RANKS[j] : i < j ? RANKS[i]+RANKS[j]+'s' : RANKS[j]+RANKS[i]+'o'; }
export function describeHand(hero, board) {
  const all=[...hero,...board], ranks=all.map(c=>'23456789TJQKA'.indexOf(c[0])+2);
  const counts={};ranks.forEach(r=>counts[r]=(counts[r]||0)+1);
  const groups=Object.values(counts).sort((a,b)=>b-a);
  const flushSuit=Object.keys(SUITS).find(s=>all.filter(c=>c[1]===s).length>=5);
  const straight=(nums)=>{const sorted=[...new Set(nums)].sort((a,b)=>a-b);if(sorted.includes(14))sorted.unshift(1);let run=1;for(let i=1;i<sorted.length;i++){run=sorted[i]===sorted[i-1]+1?run+1:1;if(run>=5)return true;}return false;};
  if(flushSuit&&straight(all.filter(c=>c[1]===flushSuit).map(c=>'23456789TJQKA'.indexOf(c[0])+2)))return 'ストレートフラッシュ';
  if(groups[0]===4)return 'フォーカード';
  if(groups[0]===3&&groups[1]>=2)return 'フルハウス';
  if(flushSuit)return 'フラッシュ';
  if(straight(ranks))return 'ストレート';
  if(groups[0]===3)return 'スリーカード';
  if(groups[0]===2&&groups[1]===2)return 'ツーペア';
  if(groups[0]===2){
    const br=board.map(c=>'23456789TJQKA'.indexOf(c[0])+2).sort((a,b)=>b-a);
    if(hero[0][0]===hero[1][0])return ranks[0]>br[0]?'オーバーペア':'ポケットペア';
    if(new Set(br).size===br.length){const pair=Number(Object.keys(counts).find(r=>counts[r]===2));const n=br.indexOf(pair);if(n===0)return 'トップペア';if(n===1)return 'セカンドペア';if(n===br.length-1)return 'ボトムペア';return 'ワンペア';}
    return 'ワンペア';
  }
  return 'ハイカード';
}
function requireValue(condition,message){if(!condition)throw new Error(message);}
function number(value,name,min=0,max=100000){requireValue(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max,`${name}は${min}〜${max}の数値で指定してください。`);return value;}
function string(value,name,max=120){requireValue(typeof value==='string'&&value.trim().length>0&&value.length<=max,`${name}は1〜${max}文字で指定してください。`);return value;}
export function validateData(data) {
  requireValue(data&&typeof data==='object'&&data.schemaVersion===1,'schemaVersion: 1 のJSONを指定してください。');
  const s=data.spot;requireValue(s&&typeof s==='object','spotが必要です。');
  requireValue(Array.isArray(s.board)&&s.board.length>=3&&s.board.length<=5,'boardは3〜5枚です。');
  requireValue(Array.isArray(s.hero)&&s.hero.length===2,'heroは2枚です。');
  const cards=[...s.board,...s.hero];requireValue(cards.every(c=>typeof c==='string'&&/^[AKQJT2-9][shdc]$/.test(c)),'カードはJh / 8d / Asの形式で指定してください。');
  requireValue(new Set(cards).size===cards.length,'同じカードが重複しています。');
  const spot={board:[...s.board],hero:[...s.hero],pot:number(s.pot,'pot',.1),stacks:{BTN:number(s.stacks?.BTN,'BTN stack'),BB:number(s.stacks?.BB,'BB stack')},betPercent:number(s.betPercent??33,'betPercent',0,100000000)};
  if(!data.strategy)return {schemaVersion:1,spot};
  const st=data.strategy;requireValue(st.source&&['demo','solver'].includes(st.source.kind),'source.kindはdemo または solverです。');
  const strategy={source:{kind:st.source.kind,label:string(st.source.label,'source.label')},players:{}};
  requireValue(st.players&&typeof st.players==='object','strategy.playersが必要です。');
  for(const position of ['BTN','BB']){
    const p=st.players[position];if(!p)continue;
    requireValue(Array.isArray(p.actions)&&p.actions.length>=1&&p.actions.length<=8,`${position}.actionsは1〜8件です。`);
    const actions=p.actions.map(a=>{requireValue(Object.hasOwn(COLORS,a.type),'action.typeはcheck / call / bet / raise / foldです。');return {id:string(a.id,'action.id',30),label:string(a.label,'action.label',60),type:a.type,frequency:number(a.frequency,'frequency',0,100)};});
    requireValue(new Set(actions.map(a=>a.id)).size===actions.length,'action.idが重複しています。');
    requireValue(Math.abs(actions.reduce((a,b)=>a+b.frequency,0)-100)<.01,'actionsのfrequencyは合計100にしてください。');
    const player={node:string(p.node,'node'),actions,hands:{}};
    if(position==='BB')player.facingBetPercent=number(p.facingBetPercent,'BB.facingBetPercent',0,100000000);
    requireValue(p.hands===undefined||(p.hands&&typeof p.hands==='object'&&!Array.isArray(p.hands)),'handsはオブジェクトです。');
    const legalHands=new Set(RANKS.flatMap((_,i)=>RANKS.map((_,j)=>handName(i,j))));
    for(const [hand,h] of Object.entries(p.hands||{})){
      requireValue(legalHands.has(hand),`ハンド分類が不正です：${hand}`);
      requireValue(h&&Array.isArray(h.frequencies)&&h.frequencies.length===actions.length,`${hand}.frequenciesはactionsと同じ順序・件数にしてください。`);
      const frequencies=h.frequencies.map(v=>number(v,`${hand}.frequency`,0,100));
      requireValue(Math.abs(frequencies.reduce((a,b)=>a+b,0)-100)<.01,`${hand}の頻度は合計100にしてください。`);
      player.hands[hand]={frequencies};
    }
    strategy.players[position]=player;
  }
  requireValue(Object.keys(strategy.players).length>0,'BTNまたはBBの戦略が必要です。');
  return {schemaVersion:1,spot,strategy};
}
export const SAMPLE={schemaVersion:1,spot:{board:['Jh','8d','5h'],hero:['As','8s'],pot:5.5,stacks:{BTN:97.5,BB:97.5},betPercent:33},strategy:{source:{kind:'demo',label:'説明用サンプル（ソルバー未計算）'},players:{BTN:{node:'BBのチェック後',actions:[{id:'check',label:'Check',type:'check',frequency:17},{id:'bet33',label:'Bet 33%',type:'bet',frequency:65},{id:'bet67',label:'Bet 67%',type:'bet',frequency:18}],hands:{AA:{frequencies:[10,65,25]},KK:{frequencies:[15,65,20]},QQ:{frequencies:[10,70,20]},JJ:{frequencies:[15,35,50]},'88':{frequencies:[15,30,55]},'55':{frequencies:[10,30,60]},AJs:{frequencies:[10,75,15]},AJo:{frequencies:[15,75,10]},KJs:{frequencies:[15,75,10]},QJs:{frequencies:[20,70,10]},JTs:{frequencies:[20,70,10]},J8s:{frequencies:[10,40,50]},A8s:{frequencies:[60,35,5]},T9s:{frequencies:[20,50,30]},'76s':{frequencies:[35,40,25]},AKs:{frequencies:[50,45,5]},AQs:{frequencies:[55,40,5]}}},BB:{node:'BTN 33% betに対して',facingBetPercent:33,actions:[{id:'fold',label:'Fold',type:'fold',frequency:31},{id:'call',label:'Call',type:'call',frequency:58},{id:'raise',label:'Raise',type:'raise',frequency:11}],hands:{JJ:{frequencies:[0,25,75]},'88':{frequencies:[0,25,75]},'55':{frequencies:[0,20,80]},AJs:{frequencies:[0,90,10]},KJs:{frequencies:[0,95,5]},QJs:{frequencies:[0,95,5]},JTs:{frequencies:[0,95,5]},J8s:{frequencies:[0,45,55]},A8s:{frequencies:[5,95,0]},T9s:{frequencies:[10,70,20]},'76s':{frequencies:[10,70,20]},A5s:{frequencies:[20,75,5]},KQo:{frequencies:[70,25,5]}}}}}};
