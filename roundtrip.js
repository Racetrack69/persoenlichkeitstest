/* Round-Trip für PT17: echter buildCode() aus index.html gegen decoder.js.
   Aufruf: node roundtrip.js [index.html]
   Prüft Zufallsdatensätze, Platzhalter in allen Fassungen, Negativfälle, alte Codes und Codes in WhatsApp-Text. */
"use strict";
const fs=require("fs"), vm=require("vm"), path=require("path");
const file=process.argv[2]||path.join(__dirname,"index.html");
const html=fs.readFileSync(file,"utf8");
const m=html.match(/<script id="kern">([\s\S]*?)<\/script>/);
if(!m){console.error("Kern-Script nicht gefunden.");process.exit(1);}
const ctx={btoa:s=>Buffer.from(s,"binary").toString("base64"),TextEncoder};
vm.createContext(ctx);vm.runInContext(m[1],ctx);
const K=ctx.EOK, D=require("./decoder.js");
let fehler=0;
function check(cond,msg){if(!cond){fehler++;if(fehler<20)console.error("FEHLER:",msg);}}

/* Daten und Blöcke */
check(K.N===28,"28 Karten erwartet, gefunden "+K.N);
check(K.NG===11&&K.NK===17,"17 Karten und 11 Gedankenexperimente erwartet");
check(K.BLOECKE.reduce((s,b)=>s+b.n,0)===K.N,"Blöcke passen nicht zur Kartenzahl");
check(D.N===K.N,"Decoder kennt eine andere Kartenzahl");
check(K.PREFIX===D.PREFIX,"Präfix in index.html und decoder.js verschieden");
K.BLOECKE.forEach((b,bi)=>{for(let i=K.STARTS[bi];i<K.STARTS[bi]+b.n;i++)check(K.isG(i)===(b.typ==="gedanke"),"Typ von Karte "+(i+1)+" passt nicht zum Block");});
const intros=[];for(let i=0;i<K.N;i++)if(K.needsIntro(i))intros.push(i);
check(JSON.stringify(intros)==="[0,6,15,25]","Einstiege an falscher Stelle: "+intros);

/* Platzhalter: In keiner Fassung darf nach dem Einsetzen eine geschweifte Klammer übrig bleiben. */
["er","sie"].forEach(pr=>K.KARTEN.forEach((k,i)=>{
  ["qo","ao","zo"].forEach(f=>{const t=K.fill(k[f],"Ben",pr);check(!/[{}]/.test(t),"Platzhalter übrig in Karte "+(i+1)+" "+f+": "+t);});
  ["qs","a","z"].forEach(f=>check(!/[{}]/.test(k[f]),"Klammer in Karte "+(i+1)+" "+f));
}));

/* Zufallsdatensätze */
function rnd(n){return Math.floor(Math.random()*n);}
const names=["Anna","Ben","Jörg-Ülrich","Ana María","李","Zoë","O'Neill","A".repeat(40)];
const ms=[0,500,1999,2000,4999,5000,14999,15000,90000];
for(let r=0;r<3000;r++){
  const self={ans:[],t:[]}, other={ans:[],t:[]};
  for(let i=0;i<K.N;i++){self.ans.push(rnd(2));other.ans.push(rnd(2));self.t.push(ms[rnd(ms.length)]);other.t.push(ms[rnd(ms.length)]);}
  const me=names[rnd(names.length)], partner=names[rnd(names.length)];
  const code=K.buildCode({me,partner,self,other});
  let d;
  try{d=D.decode(code);}catch(e){check(false,"Decode warf: "+e.message+" bei "+code);continue;}
  check(d.name===me&&d.partner===partner,"Namen falsch: "+d.name+"/"+d.partner);
  for(let i=0;i<K.N;i++){
    check(d.self.items[i].value===self.ans[i],"self "+i);
    check(d.other.items[i].value===other.ans[i],"other "+i);
    check(d.self.items[i].time===K.tc(self.t[i]),"tSelf "+i);
    check(d.other.items[i].time===K.tc(other.t[i]),"tOther "+i);
  }
  check(code.split(".")[2].length===28,"Nutzdaten sollen 28 Zeichen haben, sind "+code.split(".")[2].length);
}

/* Negativfälle */
const good=K.buildCode({me:"Anna",partner:"Ben",self:{ans:Array(28).fill(1),t:Array(28).fill(3000)},other:{ans:Array(28).fill(0),t:Array(28).fill(3000)}});
function throws(c,msg){let t=false;try{D.decode(c);}catch(e){t=true;}check(t,msg);}
throws(good.slice(0,-2),"Abgeschnittener Code muss scheitern");
throws(good+"AA","Zu langer Code muss scheitern");
throws("PT16"+good.slice(4),"Alter Präfix muss scheitern");
throws("PT17.xx.yy","Kaputter Header muss scheitern");
throws("Hallo","Text muss scheitern");

/* WhatsApp-Text mit mehreren Codes, einem doppelten und einem alten */
const other=K.buildCode({me:"Ben",partner:"Anna",self:{ans:Array(28).fill(0),t:Array(28).fill(0)},other:{ans:Array(28).fill(1),t:Array(28).fill(0)}});
const text="Entweder oder: mein Code für dich, Ben.\n\n"+good+"\n\nZum Aufdecken: https://x.github.io/auswertung.html\n"+other+"\n"+good+"\nalt: PT16.eyJuIjoiQSJ9.AAAA";
const all=D.decodeAll(text);
check(all.length===3,"Drei Codes im Text erwartet (einer doppelt), gefunden "+all.length);
check(all.every(r=>r.ok),"Keine fehlerhaften Codes erwartet");
check(new Set(all.map(r=>r.data.name)).size===2,"Zwei Personen im Text erwartet");
check(D.findOldCodes(text).length===1,"Ein alter Code im Text erwartet");

/* Projektion */
const pr=K.projection({self:{ans:Array(28).fill(1)},other:{ans:Array(28).fill(1)}});
check(pr.prozent===100&&pr.gesamt===28,"Projektion falsch");

console.log(fehler?("Round-Trip: "+fehler+" Fehler"):"Round-Trip PT17: 3000 Datensätze, Negativfälle, WhatsApp-Text, Platzhalter er/sie: fehlerfrei.");
console.log("Beispielcode:",good,"("+good.length+" Zeichen)");
process.exit(fehler?1:0);
