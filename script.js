const M={A:'.-',B:'-...',C:'-.-.',D:'-..',E:'.',F:'..-.',G:'--.',H:'....',I:'..',J:'.---',K:'-.-',L:'.-..',M:'--',N:'-.',O:'---',P:'.--.',Q:'--.-',R:'.-.',S:'...',T:'-',U:'..-',V:'...-',W:'.--',X:'-..-',Y:'-.--',Z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.','.':'.-.-.-',',':'--..--','?':'..--..','/':'-..-.'};
const NEW=['ETIANM','SURWDKGO','HVFLPJBXCYZQ','0123456789','.,?/'];
const TOTAL=20, $=id=>document.getElementById(id);
let mode='listen',level=0,chars=[],target='',round=0,done=0,score=0,streak=0,right=0,busy=false,playing=false;
let ac,osc,gain,lampT=[],nextT,gapT,down=false,t0=0,buf='';

/* audio */
function A(){
  if(!ac){ac=new (window.AudioContext||window.webkitAudioContext)();osc=ac.createOscillator();gain=ac.createGain();gain.gain.value=0;osc.type='sine';osc.connect(gain).connect(ac.destination);osc.start();}
  if(ac.state==='suspended')ac.resume();
}
const unit=()=>1.2/$('wpm').value;
function lamp(on){$('lamp').classList.toggle('on',on)}
function play(p){
  A();osc.frequency.value=+$('tone').value;
  const g=gain.gain,now=ac.currentTime;g.cancelScheduledValues(now);g.setValueAtTime(0,now);
  lampT.forEach(clearTimeout);lampT=[];
  const u=unit();let t=0.08;
  for(const s of p){
    const d=(s==='.'?1:3)*u;
    g.setTargetAtTime(.3,now+t,.004);g.setTargetAtTime(0,now+t+d,.004);
    lampT.push(setTimeout(()=>lamp(true),t*1000),setTimeout(()=>lamp(false),(t+d)*1000));
    t+=d+u;
  }
}
function tone(on){A();osc.frequency.value=+$('tone').value;const t=ac.currentTime;gain.gain.cancelScheduledValues(t);gain.gain.setTargetAtTime(on?.3:0,t,.005);lamp(on)}

/* helpers */
function pat(el,s){el.innerHTML=[...s].map(x=>`<i class="${x==='.'?'dit':'dah'}"></i>`).join('')}
function fb(t,c){const e=$('fb');e.textContent=t;e.className='fb '+(c||'')}
function stats(){
  $('sScore').textContent=score;$('sStreak').textContent=streak;
  $('sRound').textContent=Math.min(round,TOTAL)+'/'+TOTAL;
  $('sAcc').textContent=done?Math.round(right/done*100)+'%':'–';
  $('fill').style.width=(done/TOTAL*100)+'%';
}

/* setup */
$('lvl').innerHTML=NEW.map((_,i)=>{const s=[...NEW[i]].join(' ');return `<option value="${i}">Level ${i+1}: ${i?'adds ':''}${s}</option>`}).join('');
$('modeSeg').onclick=e=>{
  const b=e.target.closest('button');if(!b)return;
  mode=b.dataset.m;[...$('modeSeg').children].forEach(x=>x.classList.toggle('on',x===b));
  $('hintRow').hidden=mode!=='send';howto();
};
function howto(){
  $('howto').textContent=mode==='listen'
    ?'You will hear a character in Morse. Type it on your keyboard or tap it. Space plays it again.'
    :'You will see a character. Key it with short presses for dots and long presses for dashes. The speed setting sets the dot length.';
}
howto();
$('wpm').oninput=e=>$('wv').textContent=e.target.value;
$('tone').oninput=e=>$('tv').textContent=e.target.value;

/* chart */
$('chart').innerHTML=Object.keys(M).map(k=>`<button data-c="${k}"><b>${k}</b><span>${M[k].replace(/\./g,'·').replace(/-/g,'−')}</span></button>`).join('');
$('chart').onclick=e=>{const b=e.target.closest('button');if(b){play(M[b.dataset.c]);b.blur()}};

/* game */
function start(){
  A();level=+$('lvl').value;chars=[...NEW.slice(0,level+1).join('')];
  round=done=score=streak=right=0;playing=true;busy=false;buf='';
  $('setup').hidden=true;$('play').hidden=false;$('end').hidden=true;$('quit').parentElement.hidden=false;
  $('listenUI').hidden=mode!=='listen';$('sendUI').hidden=mode!=='send';
  $('pad').innerHTML=chars.map(c=>`<button data-c="${c}">${c}</button>`).join('');
  if(document.activeElement)document.activeElement.blur();
  next();
}
function next(){
  if(!playing)return;
  if(done>=TOTAL)return finish();
  busy=false;round=done+1;buf='';
  const nw=NEW[level],pool=(level>0&&Math.random()<.5)?nw:chars.join('');
  let c;do{c=pool[Math.floor(Math.random()*pool.length)]}while(c===target);
  target=c;fb('');pat($('mine'),'');
  if(mode==='listen'){$('big').textContent='?';pat($('pat'),'');setTimeout(()=>playing&&play(M[target]),350)}
  else{$('big').textContent=target;pat($('pat'),$('hint').checked?M[target]:'')}
  stats();
}
function judge(ok){
  busy=true;done++;
  if(ok){right++;streak++;score+=10+Math.min(streak,10);fb('Correct','good')}
  else{streak=0;fb('It was '+target,'bad')}
  $('big').textContent=target;pat($('pat'),M[target]);
  if(!ok)setTimeout(()=>playing&&play(M[target]),250);
  stats();
  nextT=setTimeout(next,ok?800:2000);
}
function answer(c){if(playing&&!busy&&mode==='listen')judge(c===target)}
$('pad').onclick=e=>{const b=e.target.closest('button');if(b){answer(b.dataset.c);b.blur()}};
$('replay').onclick=e=>{if(playing&&target)play(M[target]);e.target.blur()};

/* sending */
function keyDown(){
  if(!playing||mode!=='send'||busy||down)return;
  down=true;t0=performance.now();clearTimeout(gapT);tone(true);$('key').classList.add('down');
}
function keyUp(){
  if(!down)return;
  down=false;tone(false);$('key').classList.remove('down');
  buf+=(performance.now()-t0<unit()*2000)?'.':'-';
  pat($('mine'),buf);
  gapT=setTimeout(()=>{if(playing&&!busy&&buf){const ok=buf===M[target];judge(ok)}},unit()*5000);
}
const kb=$('key');
kb.onpointerdown=e=>{e.preventDefault();kb.setPointerCapture(e.pointerId);keyDown()};
kb.onpointerup=kb.onpointercancel=keyUp;

addEventListener('keydown',e=>{
  if(!playing||e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.code==='Space'){e.preventDefault();if(e.repeat)return;if(mode==='send')keyDown();else if(target)play(M[target]);return}
  if(mode==='listen'&&!e.repeat){const c=e.key.toUpperCase();if(chars.includes(c))answer(c)}
});
addEventListener('keyup',e=>{if(e.code==='Space'&&mode==='send'){e.preventDefault();keyUp()}});

function finish(){
  playing=false;lamp(false);
  const acc=Math.round(right/TOTAL*100),k=`morse-best-${mode}-${level}`;
  let best=0;try{best=+localStorage.getItem(k)||0}catch(e){}
  const isBest=score>best;if(isBest){try{localStorage.setItem(k,score)}catch(e){}}
  $('listenUI').hidden=$('sendUI').hidden=true;$('quit').parentElement.hidden=true;
  $('big').textContent=acc+'%';pat($('pat'),'');fb('');
  $('endH').textContent=isBest?'New best score: '+score:'Score: '+score;
  $('endP').textContent=`${right} of ${TOTAL} correct. `+(best&&!isBest?`Best on this level is ${best}. `:'')+
    (acc>=90&&level<NEW.length-1?'Strong round. Try the next level.':acc<60?'Try a lower speed or repeat this level.':'Keep going to build speed.');
  $('end').hidden=false;
}
function toSetup(){playing=false;clearTimeout(nextT);clearTimeout(gapT);lamp(false);target='';$('play').hidden=true;$('setup').hidden=false}
$('go').onclick=start;$('again').onclick=start;$('back').onclick=toSetup;$('quit').onclick=toSetup;