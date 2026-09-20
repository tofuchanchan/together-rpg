import {CODEX_CATEGORIES,CODEX_ENTRIES,findCodexEntry,filterCodexEntries} from './codex-data.js';
import {createCodexImage} from './codex-image.js';

const ROLES={all:'全部职业',warrior:'战士',mage:'法师',archer:'弓手',universal:'通用'};
const KINDS={role:'职业',active:'主动技能',core:'职业核心',form:'技能形态',evolution:'职业进化',passive:'被动组件',awakening:'通用觉醒',attribute:'升级属性',weapon:'武器',armor:'防具',affix:'装备词条','equipment-rarity':'装备品质',enemy:'普通怪物',boss:'首领','enemy-rarity':'怪物稀有度',trait:'怪物词条'};
const scopeName=entry=>entry.category==='monsters'?'林间生态':entry.role==='all'?'通用':ROLES[entry.role];
const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;};
const button=(className,text,click)=>{const node=el('button',className,text);node.type='button';node.addEventListener('click',click);return node;};
let nextId=0;

export function createCodexView(host,{onClose=null,onSelect=null,initialId=null}={}){
 const instance=++nextId,state={category:'skills',role:'all',kind:'all',query:'',selectedId:null,visibleCount:36,detail:false},root=el('section','codex-shell');
 root.dataset.detail='false';root.setAttribute('aria-label','冒险图鉴');
 const heading=el('div','codex-heading'),titleBlock=el('div');titleBlock.append(el('p','codex-eyebrow','FIELD NOTES / 林间远征'),el('h1',null,'冒险图鉴'),el('p','codex-subtitle','查阅招式，寻找搭配，认识下一场战斗。'));
 const headingRight=el('div','codex-heading-right');headingRight.append(el('span','codex-total',`${CODEX_ENTRIES.length} 条冒险记录`));
 const closeButton=onClose?button('codex-close','返回游戏 · Start',onClose):null;
 if(closeButton)headingRight.append(closeButton);else headingRight.append(el('span','codex-edition','全部条目公开查阅'));
 heading.append(titleBlock,headingRight);
 const tabs=el('nav','codex-tabs');tabs.setAttribute('aria-label','图鉴分类');
 for(const category of CODEX_CATEGORIES){const count=CODEX_ENTRIES.filter(e=>e.category===category.id).length;const tab=button('codex-tab',`${category.name}  ${count}`,()=>{state.category=category.id;state.role='all';state.kind='all';state.visibleCount=36;state.detail=false;render();});tab.dataset.category=category.id;tabs.append(tab);}
 const toolbar=el('div','codex-toolbar'),searchLabel=el('label','codex-search');searchLabel.append(el('span',null,'搜索图鉴'));const search=el('input');search.type='search';search.placeholder='名称、效果或构筑关键词';search.autocomplete='off';search.maxLength=100;search.addEventListener('input',()=>{state.query=search.value;state.visibleCount=36;state.detail=false;render();});searchLabel.append(search);
 const kindLabel=el('label','codex-kind');kindLabel.append(el('span',null,'条目类型'));const kindSelect=el('select');kindSelect.addEventListener('change',()=>{state.kind=kindSelect.value;state.visibleCount=36;state.detail=false;render();});kindLabel.append(kindSelect);toolbar.append(searchLabel,kindLabel);
 const roles=el('div','codex-roles');roles.setAttribute('aria-label','按职业筛选');for(const [id,name]of Object.entries(ROLES)){const b=button('codex-role',name,()=>{state.role=id;state.visibleCount=36;state.detail=false;render();});b.dataset.role=id;roles.append(b);}
 const layout=el('div','codex-layout'),results=el('section','codex-results'),resultsHeading=el('div','codex-results-heading'),count=el('span'),clear=button('codex-reset','清除筛选',()=>{state.role='all';state.kind='all';state.query='';search.value='';state.visibleCount=36;state.detail=false;render();});count.setAttribute('aria-live','polite');resultsHeading.append(count,clear);
 const cards=el('div','codex-cards'),more=button('codex-more','查看更多',()=>{state.visibleCount+=36;renderCards();});results.append(resultsHeading,cards,more);
 const detail=el('article','codex-detail');detail.id=`codex-detail-${instance}`;detail.tabIndex=-1;detail.setAttribute('aria-label','条目详情');layout.append(results,detail);
 const note=el('div','codex-note','构筑仍需在冒险中随机获得；装备与怪物数值随关卡和品质变化。');
 const controllerHint=el('div','codex-controller-hint');controllerHint.setAttribute('aria-live','polite');note.append(controllerHint);
 const artStatus=el('p','codex-art-status','插画载入中…');artStatus.setAttribute('role','status');
 root.append(heading,tabs,toolbar,roles,layout,note,artStatus);host.replaceChildren(root);
 let visible=[],artReady=false,artFailed=false,disposed=false,resolveReady,padActive=false,padFocus=null;
 const isShown=node=>node&&!node.hidden&&node.getClientRects().length>0;
 function hint(){controllerHint.textContent=state.detail?'手柄：↑↓ 阅读滚动 · ←→ 选择关联条目 / 重试 · A 确认 · B 返回列表 · LB/RB 分类':'手柄：方向键 / 左摇杆选择 · A 查看 · B 返回游戏 · LB/RB 分类；类型筛选用 ←→ 切换';}
 function markFocus(node,{scroll=true}={}){
  if(!node)return;
  padFocus?.removeAttribute('data-controller-focus');padFocus=node;padActive=true;root.dataset.controller='true';node.dataset.controllerFocus='true';node.focus({preventScroll:true});
  if(scroll)node.scrollIntoView({block:'nearest',inline:'nearest'});
 }
 root.addEventListener('pointerdown',()=>{padActive=false;delete root.dataset.controller;padFocus?.removeAttribute('data-controller-focus');padFocus=null;});
 const ready=new Promise(resolve=>{resolveReady=resolve;});
 function updateArtStatus(changed){
  if(disposed||(changed&&!root.contains(changed)))return;
  const illustrations=[...root.querySelectorAll('.codex-art-surface')],primary=detail.querySelector('.codex-preview');
  // A successful retry also restores failed thumbnails using that same file.
  if(changed?.dataset.art==='ready'){
   const source=changed.querySelector('img').src;
   for(const node of illustrations)if(node.dataset.art==='error'&&node.querySelector('img').src.split('?')[0]===source.split('?')[0]){node.dataset.art='loading';node.setAttribute('aria-busy','true');node.querySelector('img').src=source;}
  }
  artReady=primary?.dataset.art==='ready';artFailed=illustrations.some(node=>node.dataset.art==='error');
  root.dataset.art=artFailed?'partial':artReady?'ready':'loading';
  artStatus.hidden=!artFailed;artStatus.textContent='部分插画暂未载入，可在对应条目内重试；其他内容可正常查阅。';
  if(primary&&primary.dataset.art!=='loading')resolveReady();
 }
 function preview(entry,className){return createCodexImage(entry,className,updateArtStatus);}
 function select(id,{focus=false,notify=true}={}){const entry=findCodexEntry(id);if(!entry)return false;state.selectedId=id;state.detail=true;root.dataset.detail='true';renderDetail();detail.scrollTop=0;hint();for(const node of cards.children)node.setAttribute('aria-pressed',String(node.dataset.entry===id));if(focus)detail.focus({preventScroll:true});if(matchMedia('(max-width:800px)').matches){root.scrollTop=0;detail.scrollTop=0;root.scrollIntoView({block:'start'});}if(padActive)markFocus(detail,{scroll:false});if(notify)onSelect?.(entry);return true;}
 function follow(id){const entry=findCodexEntry(id);if(!entry)return;state.category=entry.category;state.role='all';state.kind='all';state.query='';search.value='';state.visibleCount=36;state.selectedId=id;state.detail=true;render();select(id,{focus:true});}
 function renderDetail(){detail.replaceChildren();const entry=findCodexEntry(state.selectedId);if(!entry){detail.append(el('p','codex-empty-detail','换个关键词，继续翻阅冒险记录。'));updateArtStatus();return;}
  const back=button('codex-back','← 返回条目 · B',returnToList);
  const intro=el('div','codex-detail-intro');intro.append(el('p','codex-eyebrow',`${scopeName(entry)} / ${KINDS[entry.kind]||entry.kind}`),el('h2',null,entry.name));
  const tags=el('div','codex-tags');for(const tag of entry.tags||[])tags.append(el('span',null,tag));
  detail.append(back,preview(entry,'codex-preview'),intro,el('p','codex-summary',entry.summary),tags);updateArtStatus();
  for(const section of entry.sections||[]){const block=el('section','codex-detail-section');block.append(el('h3',null,section.title));const lines=el('ul');for(const line of section.lines||[])lines.append(el('li',null,line));block.append(lines);detail.append(block);}
  const related=(entry.relatedIds||[]).map(findCodexEntry).filter(Boolean);if(related.length){const block=el('section','codex-detail-section');block.append(el('h3',null,'相关条目'));const links=el('div','codex-related');for(const other of related)links.append(button('codex-related-link',`${other.name} ↗`,()=>follow(other.id)));block.append(links);detail.append(block);}
 }
 function renderCards(){cards.replaceChildren();if(!visible.length){const empty=el('div','codex-empty');empty.append(el('strong',null,'没有找到对应记录'),el('p',null,'试试“护盾”“召唤”“暴击”，或清除职业与类型筛选。'));cards.append(empty);more.hidden=true;return;}
  for(const entry of visible.slice(0,state.visibleCount)){const card=button('codex-card','',()=>select(entry.id,{focus:true}));card.dataset.entry=entry.id;card.setAttribute('aria-pressed',String(entry.id===state.selectedId));card.setAttribute('aria-controls',detail.id);const info=el('span','codex-card-info');info.append(el('small',null,`${scopeName(entry)} · ${KINDS[entry.kind]||entry.kind}`),el('strong',null,entry.name),el('span','codex-card-summary',entry.summary));card.append(preview(entry,'codex-thumb'),info);cards.append(card);}more.hidden=visible.length<=state.visibleCount;more.textContent=`继续翻阅 · 还有 ${Math.max(0,visible.length-state.visibleCount)} 条`;
 }
 function render(){
  for(const tab of tabs.children)tab.setAttribute('aria-current',tab.dataset.category===state.category?'page':'false');
  const kinds=[...new Set(CODEX_ENTRIES.filter(e=>e.category===state.category).map(e=>e.kind))];kindSelect.replaceChildren();for(const id of ['all',...kinds]){const option=el('option',null,id==='all'?'全部类型':KINDS[id]||id);option.value=id;kindSelect.append(option);}if(!kinds.includes(state.kind))state.kind='all';kindSelect.value=state.kind;
  roles.hidden=state.category==='monsters';for(const b of roles.children)b.setAttribute('aria-pressed',String(b.dataset.role===state.role));
  visible=filterCodexEntries({category:state.category,role:state.role==='universal'?'all':state.role,query:state.query,kind:state.kind}).filter(e=>state.role!=='universal'||e.role==='all');
  if(!visible.some(e=>e.id===state.selectedId))state.selectedId=visible[0]?.id||null;
  state.visibleCount=Math.max(state.visibleCount,visible.findIndex(e=>e.id===state.selectedId)+1);root.dataset.detail=String(state.detail);count.textContent=`${CODEX_CATEGORIES.find(c=>c.id===state.category)?.name||'图鉴'} · ${visible.length} 条记录`;clear.hidden=state.role==='all'&&state.kind==='all'&&!state.query;
  renderCards();renderDetail();hint();
 }
 const start=findCodexEntry(initialId);if(start){state.category=start.category;state.selectedId=start.id;state.detail=true;}render();
 function selectedCard(){return cards.querySelector(`[data-entry="${CSS.escape(state.selectedId||'')}"]`)||cards.querySelector('.codex-card');}
 function returnToList(){state.detail=false;root.dataset.detail='false';hint();const target=selectedCard()||kindSelect;if(padActive)markFocus(target);else target.focus({preventScroll:true});}
 function focusKey(node){return node?.dataset.entry?`entry:${node.dataset.entry}`:node?.dataset.category?`category:${node.dataset.category}`:node?.dataset.role?`role:${node.dataset.role}`:node===kindSelect?'kind':node===clear?'clear':node===more?'more':node===closeButton?'close':node===detail?'reading':node?.classList.contains('codex-image-retry')?'retry':node?.textContent||null;}
 function rows(){
  const result=[[...tabs.children],[kindSelect],[clear].filter(isShown),[...roles.children].filter(isShown)].filter(row=>row.length);
  const entries=[...cards.querySelectorAll('.codex-card')],columns=getComputedStyle(cards).gridTemplateColumns.split(' ').length||1;
  for(let index=0;index<entries.length;index+=columns)result.push(entries.slice(index,index+columns));
  if(isShown(more))result.push([more]);if(closeButton)result.push([closeButton]);return result;
 }
 function focusCard(node){
  markFocus(node);if(node?.classList.contains('codex-card')&&node.dataset.entry!==state.selectedId){state.selectedId=node.dataset.entry;for(const card of cards.children)card.setAttribute('aria-pressed',String(card===node));renderDetail();}
 }
 function scrollDetail(direction){
  const amount=Math.max(100,Math.min(260,detail.clientHeight*.65));
  if(detail.scrollHeight>detail.clientHeight+1)detail.scrollTop+=direction*amount;
  else if(root.scrollHeight>root.clientHeight+1)root.scrollTop+=direction*amount;
  else window.scrollBy({top:direction*amount,behavior:'instant'});
 }
 function handleInput(input){
  if(disposed)return;
  if(input.cancel){if(state.detail)returnToList();else onClose?.();return;}
  if(input.tabLeft||input.tabRight){const index=CODEX_CATEGORIES.findIndex(c=>c.id===state.category);state.category=CODEX_CATEGORIES[(index+(input.tabRight?1:-1)+CODEX_CATEGORIES.length)%CODEX_CATEGORIES.length].id;state.role='all';state.kind='all';state.detail=false;state.visibleCount=36;render();markFocus(selectedCard()||kindSelect);return;}
  if(!input.up&&!input.down&&!input.left&&!input.right&&!input.confirm)return;
  if(state.detail){
   if(!padActive||!padFocus?.isConnected||!detail.contains(padFocus)&&padFocus!==detail)markFocus(detail,{scroll:false});
   if(input.up||input.down){scrollDetail(input.down?1:-1);return;}
   const actions=[detail,...detail.querySelectorAll('button')].filter(isShown);
   if(input.left||input.right){const current=Math.max(0,actions.indexOf(padFocus));markFocus(actions[(current+(input.right?1:-1)+actions.length)%actions.length]);return;}
   if(input.confirm&&padFocus!==detail)padFocus.click();return;
  }
  const groups=rows();let row=groups.findIndex(nodes=>nodes.includes(padFocus));
  if(!padActive||row<0){markFocus(selectedCard()||kindSelect);row=groups.findIndex(nodes=>nodes.includes(padFocus));}
  const column=groups[row].indexOf(padFocus);
  if((input.left||input.right)&&padFocus===kindSelect){const step=input.right?1:-1,options=[...kindSelect.options];kindSelect.value=options[(kindSelect.selectedIndex+step+options.length)%options.length].value;kindSelect.dispatchEvent(new Event('change'));markFocus(kindSelect);return;}
  if(input.up||input.down){const next=Math.max(0,Math.min(groups.length-1,row+(input.down?1:-1)));focusCard(groups[next][Math.min(column,groups[next].length-1)]);return;}
  if(input.left||input.right){focusCard(groups[row][(column+(input.right?1:-1)+groups[row].length)%groups[row].length]);return;}
  if(input.confirm){
   if(padFocus===kindSelect){handleInput({right:true});return;}
   const key=focusKey(padFocus),wasMore=padFocus===more,wasClose=padFocus===closeButton,oldCount=state.visibleCount;padFocus.click();if(wasClose)return;
   if(state.detail){markFocus(detail,{scroll:false});return;}
   if(wasMore){markFocus(cards.children[oldCount]||more);return;}
   markFocus(rows().flat().find(node=>focusKey(node)===key)||selectedCard()||kindSelect);
  }
 }
 return{root,ready,openEntry:follow,handleInput,focus:()=>{padActive=false;padFocus?.removeAttribute('data-controller-focus');padFocus=null;(state.detail?detail:selectedCard()||kindSelect).focus({preventScroll:true});},snapshot:()=>({...state,count:visible.length,artReady,artFailed,controllerFocus:padActive?focusKey(padFocus):null}),destroy(){disposed=true;host.replaceChildren();}};
}

export function createCodexDialog({onOpen,onClose}={}){
 const dialog=el('dialog','codex-dialog');dialog.setAttribute('aria-label','冒险图鉴');document.body.append(dialog);let view=null,previousFocus=null;
 function close(){if(!dialog.open)return;dialog.close();}
 // A native search field consumes Escape to clear itself before dialog cancel.
 // Closing must remain one press and must not leak an Escape edge to gameplay.
 dialog.addEventListener('keydown',event=>{if(event.code==='Escape'&&!event.isComposing){event.preventDefault();event.stopPropagation();close();}},true);
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('close',()=>{document.body.classList.remove('codex-modal-open');onClose?.();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});});
 function open(id){if(dialog.open){if(id)view?.openEntry(id);return;}previousFocus=document.activeElement;onOpen?.();view??=createCodexView(dialog,{onClose:close});if(id)view.openEntry(id);dialog.showModal();document.body.classList.add('codex-modal-open');view.focus();}
 return{open,close,handleInput:input=>view?.handleInput(input),get isOpen(){return dialog.open;},snapshot:()=>({open:dialog.open,...(view?.snapshot()||{})})};
}
