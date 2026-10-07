/* Round-Trip PT16: führt den Kern aus index.html in einer Node-VM aus, erzeugt mit dem echten
   buildCode() Zufallsdatensätze und prüft sie gegen decoder.js. Aufruf: node roundtrip.js index.html */
"use strict";
var fs=require("fs"),vm=require("vm"),path=require("path");
var html=fs.readFileSync(process.argv[2]||path.join(__dirname,"index.html"),"utf8");
var m=html.match(/<script id="kern">([\s\S]*?)<\/script>/);
if(!m)throw new Error("Kern-Script in index.html nicht gefunden");
var ctx={btoa:btoa,TextEncoder:TextEncoder,JSON:JSON,Math:Math,String:String};
vm.createContext(ctx);vm.runInContext(m[1],ctx);
var K=ctx.EOK, D=require("./decoder.js");
if(K.VERSION!=="v1.6"||K.PREFIX!=="PT16")throw new Error("index.html ist nicht v1.6/PT16");

var TIMES=[0,1999,2000,4999,5000,14999,15000,60000];
var NAMES=["Anna","Jörg","Zoë","O'Neil","Maria-Luise","Ömer","Björn Bo","李"];
function pick(a){return a[Math.floor(Math.random()*a.length)];}
function bit(){return Math.random()<.5?0:1;}
function lvl(){return Math.floor(Math.random()*4);}
function tc(ms){return ms<2000?0:ms<5000?1:ms<15000?2:3;}
function state(){
  var skips=0,S={me:pick(NAMES),partner:pick(NAMES),self:{ans:[],ged:[],t:[]},other:{ans:[],t:[]}};
  for(var i=0;i<K.N;i++){
    S.self.ans.push(lvl());S.self.t.push(pick(TIMES));S.other.t.push(pick(TIMES));
    if(Math.random()<.12&&skips<K.MAX_SKIP){skips++;S.other.ans.push({v:null,s:true});}
    else S.other.ans.push({v:lvl(),s:false});
  }
  for(var j=0;j<K.NG;j++){S.self.ged.push(bit());S.self.t.push(pick(TIMES));}
  return S;
}
function eq(a,b,msg){if(a!==b)throw new Error(msg+": erwartet "+JSON.stringify(b)+", bekommen "+JSON.stringify(a));}

/* Stufen-Helfer */
eq([0,1,2,3].map(K.seite).join(""),"0011","seite");
eq([K.stufe(0,true),K.stufe(0,false),K.stufe(1,false),K.stufe(1,true)].join(""),"0123","stufe");

var ok=0,fails=0,sample=null;
for(var n=0;n<3000;n++){
  var S=state(),code=K.buildCode(S);
  try{
    var d=D.decode(code);
    eq(d.name,S.me,"name");eq(d.partner,S.partner,"partner");
    for(var i=0;i<K.N;i++){
      var s=d.self.items[i];
      eq(s.level,S.self.ans[i],"self "+i);eq(s.value,S.self.ans[i]<2?0:1,"self Seite "+i);eq(s.klar,S.self.ans[i]===0||S.self.ans[i]===3,"self klar "+i);
      eq(s.time,tc(S.self.t[i]),"self t "+i);
      var a=S.other.ans[i],o=d.other.items[i];
      eq(o.skipped,a.s,"skip "+i);eq(o.level,a.s?null:a.v,"other "+i);eq(o.value,a.s?null:(a.v<2?0:1),"other Seite "+i);
      eq(o.time,tc(S.other.t[i]),"other t "+i);
    }
    for(var j=0;j<K.NG;j++){eq(d.self.gedanken[j].value,S.self.ged[j],"ged "+j);eq(d.self.gedanken[j].time,tc(S.self.t[K.N+j]),"ged t "+j);}
    if(d.warnings.length)throw new Error("Warnungen: "+d.warnings.join("; "));
    sample=sample||code;ok++;
  }catch(e){fails++;if(fails<=5)console.error("FEHLER: "+e.message+"\n  "+code);}
}
console.log("Round-Trip: "+ok+" Codes ok, "+fails+" Fehler");

var bad=[["PT15.e30.AAAA","Präfix"],["PT16.e30","Teile"],[sample.slice(0,-4),"Byte"],[sample+"AAAA","Byte"],["PT16.e30."+sample.split(".")[2],"Header"]];
bad.forEach(function(b){try{D.decode(b[0]);console.error("Negativfall nicht erkannt: "+b[1]);fails++;}
  catch(e){if(e.message.indexOf(b[1])<0){console.error("Falsche Meldung für "+b[1]+": "+e.message);fails++;}}});
var old="PT15.eyJuIjoiQSIsInAiOiJCIn0.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
var wa="[05.10., 20:14] Ben: Entweder Oder: mein Code für dich, Anna.\n\n"+sample+"\n\nZum Aufdecken: https://example.org/auswertung.html\n"+old;
eq(D.findCodes(wa).length,1,"Code in WhatsApp-Nachricht");eq(D.findCodes(wa)[0],sample,"Code exakt");
eq(D.findOldCodes(wa).length,1,"alter Code erkannt");
console.log("Negativfälle, alte Codes und WhatsApp-Text: ok");
console.log("Beispielcode ("+sample.length+" Zeichen): "+sample);
process.exit(fails?1:0);
