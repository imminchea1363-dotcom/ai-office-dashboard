/* Original pixel-art renderer. Shares the simulation's single location/state model. */
(() => {
'use strict';
const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const project=(u,v,z=0)=>[135+u*1.35,210+v*.82-z];
const at=(u,v,z,html)=>{const [x,y]=project(u,v,z);return `<g transform="translate(${x} ${y})">${html}</g>`;};
const rect=(x,y,w,h,fill,stroke='',sw=3)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" ${stroke?`stroke="${stroke}" stroke-width="${sw}"`:''}/>`;
const label=(x,y,text,w=190)=>`<g transform="translate(${x} ${y})">${rect(-w/2,-13,w,28,'#fff2cb','#77633d',2)}<text y="6" text-anchor="middle" font-size="13" fill="#55472f">${E(text)}</text></g>`;
const desks=[[235,230],[425,230],[235,505],[425,505],[610,100],[610,505]];
function plant(u,v){return at(u,v,0,`${rect(-17,-9,34,25,'#e1cf9c','#77633e')}${rect(-12,-4,24,15,'#f4e4b9')}${rect(-3,-58,6,48,'#597945')}${rect(-19,-45,18,13,'#749552')}${rect(1,-60,19,13,'#86a65c')}${rect(-16,-71,16,15,'#90ad64')}${rect(3,-34,18,12,'#63884b')}`);}
function chair(u,v){return at(u,v,0,`${rect(-4,-10,8,22,'#596b56')}${rect(-27,8,54,5,'#535e4b')}${rect(-3,10,6,10,'#535e4b')}${rect(-26,-57,52,47,'#315b49','#213d32')}${rect(-20,-50,40,31,'#50785d')}${rect(-27,-18,54,13,'#456c52','#284735',2)}`);}
function table(u,v,w=150){return at(u,v,0,`${rect(4,-48,w*1.35,48,'#9e7950','#654e36')}${rect(0,-60,w*1.35,29,'#e4c99a','#715938')}${rect(12,-24,9,36,'#776044')}${rect(w*1.35-17,-24,9,36,'#776044')}`);}
function desk(u,v,index){return at(u,v,0,`${rect(10,-15,10,30,'#7b755b')}${rect(215,-15,10,30,'#7b755b')}${rect(0,-49,236,52,'#c2bc92','#6e684c')}${rect(-4,-63,244,26,'#f4e3ba','#8e8057')}${rect(42,-109,98,60,'#364f48','#243b34')}${rect(49,-102,84,43,['#588185','#687d89','#7a8189'][index%3])}${rect(57,-94,35,5,'#d1e4cb')}${rect(57,-83,61,4,'#c3dbbd')}${rect(57,-74,49,4,'#d1e4cb')}${rect(83,-48,17,13,'#617266')}${rect(61,-30,67,12,'#8d9a7b','#596b53',2)}${rect(172,-43,19,20,'#fff1cf','#97825c',2)}${rect(176,-47,13,5,'#947351')}`);}
function executiveDesk(u,v){return at(u,v,0,`
  ${rect(-6,-40,370,68,'#806348','#4c4434',4)}
  ${rect(0,-35,68,65,'#9c7a54','#675039',3)}${rect(291,-35,68,65,'#9c7a54','#675039',3)}
  ${rect(10,-19,47,3,'#c3a56a')}${rect(10,2,47,3,'#c3a56a')}${rect(303,-19,45,3,'#c3a56a')}${rect(303,2,45,3,'#c3a56a')}
  ${rect(-13,-68,384,32,'#f0dfb6','#9b8355',4)}
  ${rect(105,-155,139,88,'#2c4c47','#203b35',4)}${rect(114,-146,121,66,'#8eaca3')}
  ${rect(123,-134,61,5,'#d8e6cb')}${rect(123,-121,94,4,'#d8e6cb')}${rect(123,-109,74,4,'#d8e6cb')}
  ${rect(165,-66,19,17,'#5d7667')}${rect(140,-49,70,12,'#9ba98b','#637a5c',2)}
  ${rect(235,-47,50,7,'#fff3d4','#c5b188',1)}${rect(239,-51,45,5,'#f2e5bf')}
  ${rect(314,-104,5,57,'#aa8b43')}${rect(297,-108,41,11,'#c1a157')}${rect(303,-119,29,12,'#d4b56e')}${rect(303,-49,30,6,'#af914e')}
  ${rect(31,-83,23,21,'#d8c69b')}${rect(40,-105,4,25,'#688a53')}${rect(31,-114,22,16,'#b86e62')}${rect(39,-110,7,7,'#e4bc6a')}
  ${label(178,-13,'대표',82)}
`);}
function sofa(u,v,w=180){return at(u,v,0,`${rect(-4,-58,w*1.35+8,67,'#294d39','#233d2d')}${rect(4,-50,w*1.35-8,37,'#436b4d')}${rect(8,-9,w*1.35-16,20,'#527c59')}${rect(9,-46,48,30,'#8b9b64')}${rect(w*1.35-57,-46,43,30,'#c4c092')}${rect(8,10,10,13,'#594a35')}${rect(w*1.35-21,10,10,13,'#594a35')}`);}
function elevator(){return at(705,25,0,`${rect(-61,-145,122,160,'#504f43','#312f28',5)}${rect(-50,-134,100,140,'#537163','#374a40')}${rect(-45,-125,40,115,'#799486')}${rect(5,-125,40,115,'#799486')}${rect(-4,-135,8,141,'#40584b')}${rect(-22,-179,44,25,'#2e4337','#8a9c75',2)}<text y="-161" text-anchor="middle" font-size="13" fill="#e4d39b">↕</text>`);}
function room(view){if(view==='office')return atriumRoom();let s=`<defs><pattern id="db-pixel-planks" width="180" height="50" patternUnits="userSpaceOnUse">${rect(0,0,180,50,'#b98251')}${rect(0,0,180,3,'#8d633e')}${rect(0,46,180,4,'#96633d')}${rect(6,9,66,2,'#c59661')}${rect(90,31,72,2,'#c59661')}${rect(85,0,3,25,'#9d6c43')}${rect(27,25,3,25,'#9d6c43')}</pattern></defs>`;
s+=rect(116,181,1118,712,'#292f28')+rect(128,194,1094,682,view==='roof'?'#8aab67':'url(#db-pixel-planks)','#d7bf80',5);
if(view==='roof'){
s+=rect(145,214,1058,640,'#9ab976','#67814c',5);for(let i=0;i<9;i++)s+=rect(175+i*125,213,5,640,'#90b16b');s+=rect(128,171,1094,29,'#b6c7a1','#657851')+rect(128,200,18,677,'#b6c7a1')+rect(1205,200,18,677,'#b6c7a1')+rect(128,863,1094,16,'#b6c7a1');return s+elevator();}
s+=rect(128,82,1094,122,'#8d5940','#4e4533',5);
for(let y=84;y<194;y+=22){s+=rect(131,y,1088,3,'#b1815b');for(let x=132+(y%44?0:42);x<1205;x+=87)s+=rect(x,y,3,22,'#b1815b');}
for(let x=155;x<1045;x+=222){s+=rect(x,91,204,100,'#263f36','#cfbb88',4)+rect(x+6,97,192,87,'#83a69e');for(let j=0;j<5;j++)s+=rect(x+12+j*38,144-j%3*10,24,40+j%3*10,'#597e77');for(let k=1;k<4;k++)s+=rect(x+k*51,94,5,94,'#334f43');s+=rect(x+3,137,197,5,'#334f43');}
s+=rect(120,870,1112,26,'#5d715e','#313e32',3)+rect(120,884,1112,8,'#a4b9a0');
return s+elevator()+label(670,57,'주식회사 동백 · PIXEL OFFICE',340);}
function atriumRoom(){
 let s=`<defs><pattern id="db-atrium-ash" width="150" height="48" patternUnits="userSpaceOnUse">${rect(0,0,150,48,'#cfab7c')}${rect(0,0,150,2,'#b68f61')}${rect(70,0,2,24,'#bd986b')}${rect(20,24,2,24,'#bd986b')}${rect(8,10,42,2,'#dfbd8c')}</pattern></defs>`;
 s+=rect(116,181,1118,712,'#413b2d')+rect(128,194,1094,682,'url(#db-atrium-ash)','#bdae83',5);
 s+=rect(128,82,1094,122,'#e8dfc8','#b5a17b',5);
 for(let x=150;x<350;x+=19)s+=rect(x,87,6,109,'#baa280');
 s+=rect(408,92,510,100,'#506c65','#afc4b0',4)+rect(416,100,494,84,'#b7d7ca');
 for(let x=490;x<910;x+=83)s+=rect(x,98,5,88,'#6e9385');
 s+=rect(415,137,495,4,'#719889');
 // Connected side garden and cream terrazzo path.
 s+=rect(146,216,205,637,'#a5bc88','#718d60',4)+rect(210,236,60,590,'#e1dfbf');
 for(let y=255;y<805;y+=88)s+=rect(219,y,43,43,'#f5edcf','#c3c8a7',2);
 s+=rect(348,216,12,235,'#b1ccc1','#718d7a',2)+rect(348,635,12,218,'#b1ccc1','#718d7a',2);
 s+=rect(365,211,40,646,'#e7e1cb');
 // Camellia emblem on the partition.
 s+=rect(327,397,18,18,'#c4776b')+rect(319,405,34,17,'#c4776b')+rect(328,420,17,13,'#c4776b')+rect(331,407,10,11,'#eed08b');
 for(const x of [560,860])s+=rect(x,86,4,98,'#9d8b62')+rect(x-22,181,49,12,'#b79b5b')+rect(x-16,193,37,13,'#f7e8b5');
 s+=rect(120,870,1112,26,'#6e8472','#3b5142',3)+rect(120,884,1112,8,'#b9cbb5');
 return s+elevator()+label(675,57,'주식회사 동백 · CAMELLIA ATRIUM',410);
}
function atriumFurniture(){
 let s='';
 for(const [u,v]of [[45,150],[135,370],[45,680],[145,730]])s+=plant(u,v);
 // Continuous C-shaped collaboration island, with a clear central aisle.
 s+=at(585,230,0,rect(0,-63,29,251,'#f4e3ba','#8e8057',3));
 for(let i=0;i<desks.length;i++){const [u,v]=desks[i];s+=chair(u+87,v+142)+desk(u,v,i);}
 // Compact coffee alcove; no duplicated lounge against a window wall.
 s+=at(180,65,0,`${rect(-15,-45,168,62,'#b28565','#796046')}${rect(-18,-60,174,21,'#ebd8b0')}${rect(8,-113,47,53,'#3d6256','#29443a')}${rect(14,-105,35,27,'#adc8b7')}${rect(23,-76,16,17,'#fff0c4')}`);
 // Stepped quarter-circle library with blue upholstery.
 s+=at(475,55,0,`${rect(-30,-40,190,65,'#b7a17b','#82704e')}${rect(143,-23,32,115,'#b7a17b','#82704e')}${rect(157,75,33,66,'#b7a17b','#82704e')}${rect(-17,-31,159,8,'#dfc89c')}${rect(-17,-3,159,7,'#dfc89c')}${rect(150,0,18,50,'#7c9b9b')}${rect(166,88,19,39,'#7c9b9b')}`);
 for(let i=0;i<6;i++)s+=at(470+i*20,50,0,rect(0,-25,15,20,['#8ca7a0','#c2a178','#9c8fa7'][i%3]));
 // Oval-inspired stepped glass meeting nook near the side garden.
 s+=at(170,660,0,`${rect(-10,-92,62,108,'#b1cfc5','#719588')}${rect(0,-108,59,20,'#bfd8cf')}${rect(8,-81,42,64,'#d7e8db')}${rect(14,-70,28,8,'#cfab7b')}${rect(14,-52,28,8,'#89aa95')}${rect(14,-34,28,8,'#c99b99')}`);
 s+=plant(755,750)+label(248,828,'동백꽃 산책길',155)+label(727,825,'공유 아일랜드 · 집중석',250);
 return s;
}
function furnishings(view){if(view==='office')return atriumFurniture();let s='';
if(view==='office'){
s+=sofa(80,80,200)+table(365,75,130)+plant(35,130)+plant(620,115);for(let i=0;i<desks.length;i++){const [u,v]=desks[i];s+=chair(u+87,v+142)+desk(u,v,i);}s+=plant(45,750)+plant(760,755);s+=at(690,625,0,`${rect(-45,-95,115,125,'#ab7d4d','#634e33')}${rect(-33,-83,91,99,'#6b8e61')}${rect(-21,-71,67,75,'#e1cda4')}`);
}else if(view==='director'){
// Representative uses the chair built into the seated sprite.
s+=at(390,315,0,`${rect(-39,-104,78,93,'#294c45','#1e3832',4)}${rect(-30,-95,60,66,'#416b5e')}`)+executiveDesk(270,215)+sofa(70,570,220)+table(330,580,150)+plant(40,95)+plant(765,745);
s+=at(140,55,0,`${rect(0,-43,470,61,'#a27c4d','#5b4a33')}${rect(12,-35,447,8,'#d3b77d')}${rect(12,-5,447,7,'#d3b77d')}`)+label(625,130,'대표실 · DONGBAEK',240);
}else if(view==='pantry'){
s+=at(345,30,0,`${rect(-30,-50,340,70,'#b59161','#654f35')}${rect(-35,-65,350,22,'#e0cf9b','#83734e')}${rect(0,-135,61,72,'#3c5749','#243b30')}${rect(8,-127,45,36,'#8eaca0')}${rect(18,-84,25,18,'#f7e4b4')}${rect(225,-182,82,118,'#b6c8ad','#536b51')}${rect(228,-129,76,4,'#6e8c6b')}${rect(289,-157,5,20,'#6e8c6b')}`);
for(const [u,v]of [[200,270],[475,470]])s+=table(u,v,150)+chair(u+65,v+145)+chair(u+65,v-35);s+=sofa(40,620,190)+plant(45,90)+plant(760,750)+label(670,260,'COFFEE & CONNECT',260);
}else if(view==='gym'){
for(const [u,v]of [[150,230],[420,230]])s+=at(u,v,0,`${rect(-10,-10,170,185,'#385e4c','#243f31')}${rect(5,4,140,150,'#597d61')}${rect(0,-99,12,90,'#7a9478')}${rect(140,-99,12,90,'#7a9478')}${rect(-10,-119,170,42,'#3f6251','#253f31')}${rect(5,-110,140,22,'#9cbf9b')}`);
s+=at(430,575,0,`${rect(-15,-25,230,50,'#315e45','#25432f')}${rect(10,25,12,35,'#87977a')}${rect(185,25,12,35,'#87977a')}${rect(-15,-86,230,9,'#536c52')}${rect(-28,-105,24,48,'#304a35')}${rect(200,-105,24,48,'#304a35')}`);s+=at(125,550,0,rect(-15,0,180,155,'#a99cba','#706383'));s+=plant(40,110)+plant(765,745)+label(650,250,'MOVE & RECHARGE',270);
}else if(view==='lobby'){
s+=at(200,265,0,`${rect(-20,-92,390,113,'#9fb185','#50684a')}${rect(-26,-106,402,29,'#e3d1a2','#8e7950')}${rect(22,-152,80,52,'#38594c','#273e32')}${rect(28,-145,68,35,'#92b2a6')}`)+label(600,463,'주식회사 동백 · INFO',270);s+=sofa(40,560,210)+sofa(500,650,210)+table(90,420,130)+plant(45,100)+plant(760,160)+plant(765,745);
}else if(view==='roof'){
s+=sofa(70,500,185)+plant(45,100)+plant(745,140)+plant(60,750)+plant(755,750);
s+=at(530,190,0,`${rect(-16,-30,175,112,'#c99a64','#725333')}${rect(-25,-61,193,35,'#678454','#3d5937')}${rect(-12,-78,167,19,'#7e995c')}${rect(9,-94,125,19,'#91a768')}${rect(27,-107,90,15,'#a0b474')}${rect(39,6,59,76,'#69543a')}${rect(49,-8,39,22,'#69543a')}`)+label(930,445,'동백이 집',160);
for(const [u,v,water,text]of [[490,395,false,'밥그릇'],[555,430,true,'물그릇']])s+=at(u,v,0,`${rect(-27,-10,54,24,water?'#a5c6be':'#c4a06a','#695d3f')}${rect(-20,-8,40,10,water?'#78bfc9':'#7d613b')}${water?rect(-12,-7,18,3,'#d8f6e9'):rect(-13,-6,8,6,'#bd945c')+rect(3,-6,8,6,'#bd945c')}<text y="35" text-anchor="middle" font-size="13" fill="#3a5b31">${text}</text>`);
s+=at(570,650,0,`${rect(-15,-20,30,30,'#dcaf69','#877043')}${rect(-4,-20,7,30,'#fff1bf')}${rect(-15,-10,30,7,'#fff1bf')}`);
for(let i=0;i<5;i++)s+=at(110+i*45,100,0,`${rect(-12,0,24,20,'#b99c67')}${rect(-2,-22,4,22,'#4a793e')}${rect(-9,-33,19,17,i%2?'#eab0bd':'#eed478')}`);
}
return s;}
function avatar(p,{pose='stand',bubble='',stale=false}={}){
if(stale)bubble='갱신 확인 중 Ⅱ';
const working=pose==='work',sitting=working||pose==='sit',female=p.gender==='female',hair=p.hair==='long'?'#6b4337':p.hair==='bob'?'#463a44':'#39382e';
const scale=2.7,labelText=p.job+' · '+p.name,w=Math.max(155,Math.min(300,labelText.length*14+24));
let sprite='';if(female&&p.hair==='long')sprite+=rect(-12,-46,24,31,hair)+rect(-15,-40,5,27,hair)+rect(10,-40,5,27,hair);
if(sitting)sprite+=rect(-17,-19,34,19,'#385e46','#243e30',1)+rect(-11,-28,22,14,'#567e55');
sprite+=`<g class="db-body">`;
if(!sitting)sprite+=`<g class="db-leg-a">${rect(-8,-12,7,13,'#35483f')}${rect(-10,0,10,4,'#253b30')}</g><g class="db-leg-b">${rect(2,-12,7,13,'#3e5144')}${rect(2,0,11,4,'#253b30')}</g>`;
else sprite+=rect(-10,-11,8,12,'#35483f')+rect(3,-11,8,12,'#35483f');
sprite+=rect(-11,-30,22,20,p.color)+rect(-9,-30,6,18,'#ffffff20')+rect(-14,-29,5,16,p.color);
sprite+=`<g class="db-hand">${rect(10,-29,6,16,p.color)}${rect(10,-14,6,5,'#e1b58d')}${pose==='coffee'?rect(12,-20,8,9,'#fff0bd'):pose==='gym'?rect(7,-19,13,4,'#314d36')+rect(6,-24,4,13,'#314d36')+rect(19,-24,4,13,'#314d36'):pose==='report'?rect(12,-28,12,17,'#fff0bc','#796943',1):''}</g>`;
sprite+=rect(-3,-35,6,6,'#d9ac81');
if(working){sprite+=rect(-10,-53,20,20,hair)+rect(-13,-49,26,13,hair)+rect(-7,-51,13,4,'#ffffff10')+rect(-10,-34,4,3,'#655144')+rect(5,-35,4,4,'#655144')+rect(-10,-32,20,3,'#d8ae85');if(female&&p.hair==='bob')sprite+=rect(-13,-45,5,19,hair)+rect(8,-45,5,19,hair);}
else{sprite+=rect(-10,-52,20,23,'#edc797')+rect(-13,-47,26,12,'#edc797')+rect(-11,-55,22,9,hair)+rect(-14,-51,7,13,hair)+rect(8,-51,6,13,hair)+rect(-6,-42,3,4,'#303c2e')+rect(4,-42,3,4,'#303c2e')+rect(-2,-33,5,2,'#a8715d');if(female)sprite+=rect(-8,-44,6,2,'#543b43')+rect(3,-44,6,2,'#543b43');if(p.id===1)sprite+=rect(-9,-44,9,8,'none','#52634b',1)+rect(1,-44,9,8,'none','#52634b',1);}
if(p.hair==='long')sprite+=rect(7,-54,9,6,'#e6a4b2')+rect(14,-57,5,12,'#e6a4b2');
if(p.id===0)sprite+=rect(-11,-59,22,6,'#dfc476')+rect(-11,-65,5,7,'#dfc476')+rect(-2,-68,5,10,'#dfc476')+rect(7,-65,5,7,'#dfc476');
sprite+='</g>';
if(working)sprite+=rect(-14,-19,28,17,'#315d43','#233e2d',1)+rect(-11,-16,22,10,'#527d55')+rect(-2,-1,4,8,'#4e5e46')+rect(-13,7,26,3,'#4e5e46');
let out=`<ellipse class="db-shadow" cy="10" rx="33" ry="10" fill="#4e593c" opacity=".18"/><g transform="scale(${scale})">${sprite}</g>`;
if(bubble)out+=label(0,-193,bubble,Math.max(195,Math.min(300,bubble.length*13+18)));
out+=label(0,42,labelText,w);
return `<g class="db-actor ${working?'db-working':''} ${pose==='walk'?'db-walking':''} ${pose==='gym'?'db-gym':''} ${pose==='wave'||pose==='report'?'db-waving':''}" data-worker="${p.id}" data-pose="${pose}" data-gender="${p.gender}" tabindex="0" role="button" aria-label="${E(labelText)} · 상세 보기">${out}</g>`;
}
function dog(){
  // Stocky black French bulldog: wide flat face, rounded bat ears, short legs.
  const black='#1d2327',shade='#30373c',light='#41494e',deep='#12191d';
  return `<g class="db-dog-route" role="img" aria-label="검정 프렌치불독 동백이" data-character="black-french-bulldog">
    <ellipse cy="12" rx="52" ry="13" fill="#4e593c" opacity=".2"/>
    <g transform="scale(3)"><g class="db-dog-body">
      <g class="db-tail">${rect(-25,-8,7,5,black)}${rect(-28,-11,5,5,black)}</g>
      ${rect(-21,-15,29,19,black)}${rect(-24,-11,35,11,black)}
      ${rect(-17,-14,19,4,shade)}${rect(-19,-9,6,9,shade)}
      ${rect(0,-16,16,20,black)}${rect(1,-11,7,13,shade)}
      <g class="db-dog-leg">${rect(-17,0,7,10,deep)}${rect(-19,7,10,4,deep)}</g>
      <g class="db-dog-leg back">${rect(5,0,8,10,deep)}${rect(4,7,11,4,deep)}</g>
      <!-- Wide-based bat ears, with rounded pixel corners. -->
      ${rect(-1,-34,7,6,black)}${rect(0,-36,5,3,black)}${rect(-2,-32,9,4,black)}
      ${rect(19,-34,7,6,black)}${rect(20,-36,5,3,black)}${rect(18,-32,9,4,black)}
      ${rect(1,-33,3,3,'#514347')}${rect(21,-33,3,3,'#514347')}
      <!-- Broad square head with folds and a very short muzzle. -->
      ${rect(-3,-32,31,23,black)}${rect(-6,-27,37,15,black)}
      ${rect(0,-31,23,5,shade)}${rect(-4,-22,7,10,shade)}${rect(24,-22,6,10,shade)}
      ${rect(3,-25,6,3,deep)}${rect(18,-25,6,3,deep)}
      ${rect(5,-22,4,4,'#6f553a')}${rect(20,-22,4,4,'#6f553a')}
      ${rect(6,-22,2,4,deep)}${rect(21,-22,2,4,deep)}
      ${rect(7,-23,1,1,'#c2b396')}${rect(22,-23,1,1,'#c2b396')}
      ${rect(6,-16,22,10,shade)}${rect(8,-14,5,7,light)}${rect(21,-14,5,7,light)}
      ${rect(13,-18,11,6,deep)}${rect(15,-12,3,5,deep)}${rect(10,-7,15,2,deep)}
      ${rect(17,-6,5,6,'#c88b93')}${rect(18,-1,3,2,'#c88b93')}
      ${rect(1,-5,12,3,'#aa8f54')}${rect(5,-2,4,4,'#d0b473')}
    </g></g>${label(0,52,'동백이 🐾',115)}</g>`;
}
function elevatorScene(){return `${rect(325,130,700,670,'#664f34','#322e23',8)}${rect(360,165,630,590,'#637a66','#a9ae83',6)}<g id="db-cabin">${rect(420,290,510,390,'#d3d7b9','#354f3e',8)}${rect(433,305,484,277,'#9fb7a0')}${rect(433,593,484,73,'#a68b5c')}${rect(450,310,7,264,'#dbe5c8')}${rect(891,310,7,264,'#dbe5c8')}</g>${rect(583,195,185,62,'#233c2d','#b4b485',4)}<text id="db-cabin-display" x="675" y="237" text-anchor="middle" font-size="30" fill="#f3daa0"></text><text x="675" y="850" text-anchor="middle" font-size="18" fill="#e2cc98">직원 이동을 따라가는 중입니다</text>`;}
const style=document.createElement('style');style.textContent=`.db-pixel-theme body{background:#352d24;color:#e8d8ae}.db-pixel-theme .db-sidebar{background:#2b2921;border-color:#6d5a3c}.db-pixel-theme .db-brand{color:#f2e2b6}.db-pixel-theme .db-logo{background:#3b5e46;color:#f3de9c;border-radius:3px;box-shadow:3px 3px #1e251c}.db-pixel-theme .db-header{background:#352e25;border-color:#6a593d}.db-pixel-theme .db-header h1,.db-pixel-theme .db-section-title h2{color:#f5e7bf}.db-pixel-theme .db-header p,.db-pixel-theme .db-breadcrumb,.db-pixel-theme .db-side-note{color:#b4a27f}.db-pixel-theme .db-caption,.db-pixel-theme .db-eyebrow{color:#c7ad76}.db-pixel-theme .db-floor{background:#2c2b22;color:#baa989;border-radius:3px}.db-pixel-theme .db-floor span{background:#3d4733;color:#ded2a7;border-radius:2px}.db-pixel-theme .db-floor.active{background:#465c3e;border-color:#a99357;color:#f6e8bd}.db-pixel-theme .db-card,.db-pixel-theme .db-panel,.db-pixel-theme .db-metric{background:#faf0d7;border:2px solid #9b8152;border-radius:4px;color:#4d4b34;box-shadow:4px 4px #211e1980}.db-pixel-theme .db-worker{background:#faf0d7;border-color:#ded1aa}.db-pixel-theme .db-worker-info small{color:#8c896a}.db-pixel-theme .db-heading p,.db-pixel-theme .db-panel-title span{color:#8e8867}.db-pixel-theme .db-viewport{background:#3b3528}.db-pixel-theme #db-world{shape-rendering:crispEdges;image-rendering:pixelated}.db-pixel-theme #db-world text{shape-rendering:auto;font-family:monospace,'Malgun Gothic',sans-serif}.db-pixel-theme .db-areas button,.db-pixel-theme .db-small,.db-pixel-theme .db-controls button{border-color:#b8a775;border-radius:2px;background:#f7e9c4;color:#6f6846}.db-pixel-theme .db-areas button.active,.db-pixel-theme .db-controls .primary{background:#45694a;color:#f7edc9;border-color:#29452e}.db-pixel-theme .db-help,.db-pixel-theme .db-journey{background:#e9dfbc;color:#817652;border-color:#c2b283}.db-pixel-theme .db-portrait,.db-pixel-theme .db-badge{border-radius:2px}.db-pixel-theme .db-live{background:#425b39;color:#ecdfaa;border-radius:3px}.db-pixel-theme .db-step{border-radius:1px;border-color:#baa679}.db-pixel-theme .db-step.current{background:#4c6c43;color:#fff1c3}.db-pixel-theme .db-scene-bottom{border-color:#ded1a9;color:#8c815c}.db-pixel-theme .db-body{animation:none}.db-pixel-theme .db-working .db-hand{animation:db-type .35s alternate infinite}.db-pixel-theme .db-gym .db-body{animation:db-hop .9s infinite}.db-pixel-theme .db-working .db-body{animation:db-pixel-work 1.2s steps(2) infinite}.db-pixel-theme .db-night #db-room,.db-pixel-theme .db-night #db-furniture{filter:brightness(.48)}@keyframes db-pixel-work{50%{transform:translateY(1px)}}@media(prefers-reduced-motion:reduce){.db-pixel-theme *{animation:none!important}}`;
document.documentElement.classList.add('db-pixel-theme');document.head.append(style);
window.DongbaekPixel={project,desks,room,furnishings,avatar,dog,elevatorScene};
})();
