import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

class E {
 constructor(tag='div'){this.tag=tag;this.style={};this.dataset={};this.events={};this.children=[];this.textContent='';this.value='';this.files=[];}
 append(...items){this.children.push(...items)}
 appendChild(item){this.append(item)}
 replaceChildren(...items){this.children=[...items]}
 addEventListener(name,cb){this.events[name]=cb}
 setAttribute(name,val){this[name]=val}
 remove(){if(this.parent)this.parent.notes=this.parent.notes.filter(x=>x!==this)}
}
class Info extends E {
 constructor(id){super('span');this.id=id;this.notes=[]}
 append(...items){for(const item of items){item.parent=this;this.notes.push(item)}}
}
class Roster {
 constructor(){this.rows=Object.fromEntries(Array.from({length:10},(_,i)=>[i+1,new Info(i+1)]))}
 querySelectorAll(selector){assert.equal(selector,'[data-hermes-note]');return Object.values(this.rows).flatMap(x=>x.notes.filter(n=>n.dataset.hermesNote))}
 querySelector(selector){const id=/^\[data-worker="(\d+)"\] \.db-worker-info$/.exec(selector);return id?this.rows[Number(id[1])]:null}
}
const snapshot=()=>({schema:1,captured_at:1793457575,workers:Array.from({length:10},(_,i)=>({
 id:'staff'+String(i+1).padStart(2,'0'),state:'approved_history',pending:0,approved:i===0?2:i===2?1:i===5?1:i===7?1:0,rejected:0,stale:i===0?2:i===2?1:i===5?1:i===7?1:0,blocked:0
}))});

test('real Hermes approval counts attach only to verified numeric office identities',async()=>{
 const roster=new Roster(),nodes=[],events={},browser={};
 const doc={
  readyState:'complete',
  body:{append(item){nodes.push(item)}},
  createElement(tag){const x=new E(tag);nodes.push(x);return x},
  getElementById(id){return id==='db-roster'?roster:null},
  addEventListener(name,cb){events[name]=cb}
 };
 const js=readFileSync(new URL('../hermes-bridge/dashboard.js',import.meta.url),'utf8');
 vm.runInNewContext(js,{document:doc,window:browser,URL,AbortSignal,fetch(){throw Error('no network allowed')},structuredClone});
 const input=nodes.find(n=>n.tag==='input'&&n.type==='file');
 assert.ok(input,'manual status import must exist');
 input.files=[{size:2000,text:async()=>JSON.stringify(snapshot())}];
 await input.events.change();
 const notes=id=>roster.rows[id].notes.map(x=>x.textContent).join('|');
 assert.match(notes(2),/승인 기록 2건/,'office id 2 is staff01 임채리');
 assert.match(notes(3),/승인 기록 1건/,'office id 3 is staff03 임민채');
 assert.match(notes(8),/승인 기록 1건/,'office id 8 is staff06 SNS');
 assert.match(notes(4),/승인 기록 1건/,'office id 4 is staff08 검수');
 assert.match(notes(1),/승인 기록 0건/,'office id 1 is staff10 동백매니저, not staff01');
 for(const id of [5,6,7,9,10])assert.equal(notes(id),'','uncertain staff must not be guessed');
 assert.equal(roster.querySelectorAll('[data-hermes-note]').length,5);
 events['dongbaek-scene']();
 assert.equal(roster.querySelectorAll('[data-hermes-note]').length,5,'scene redraw must not duplicate badges');
 assert.equal(browser.DongbaegHermesBridge.connected(),false,'manual import is not automatic sync');
});
