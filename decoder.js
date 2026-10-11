/* Entweder Oder: Decoder für Codes im Format PT17 (Bereich 2, siehe code-format.md).
   Läuft im Browser (window.PT17) und unter Node (require("./decoder.js")).
   Kennt die Kartentexte nicht, nur Indizes. Die Texte kommen aus fragen.json bzw. der Auswertung.

   decode(code)      → {version, name, partner, self:{items:[{value,time}]}, other:{items:[{value,time}]}}
                       value: 0 = A, 1 = B. time: Zeitklasse 0 bis 3. Index = Position in der Spielreihenfolge.
                       Wirft einen Fehler mit verständlicher Meldung, wenn der Code nicht passt.
   decodeAll(text)   → [{ok:true, data} | {ok:false, code, error}] für alle PT17-Codes im Text
   findCodes(text)   → alle PT17-Codes im Text, z. B. in einer kopierten WhatsApp-Nachricht
   findOldCodes(text)→ Codes älterer Versionen (PT13 bis PT16), damit die Auswertung freundlich darauf hinweisen kann
   toText(d, titel)  → kurze Textfassung zum Nachsehen */
(function(root){
"use strict";
var PREFIX="PT17", N=28, BYTES=21;
var OLD=["PT13","PT14","PT15","PT16"];

function fromB64(s){
  s=String(s).replace(/-/g,"+").replace(/_/g,"/");
  while(s.length%4)s+="=";
  var bin=typeof atob==="function"?atob(s):Buffer.from(s,"base64").toString("binary");
  var out=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
  return out;
}
function utf8(bytes){
  if(typeof TextDecoder!=="undefined")return new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  return Buffer.from(bytes).toString("utf8");
}
function BitR(bytes){this.y=bytes;this.p=0;}
BitR.prototype.r=function(n){var v=0;for(var k=0;k<n;k++){var by=this.y[this.p>>3];v=(v<<1)|((by>>(7-(this.p&7)))&1);this.p++;}return v;};

function decode(code){
  code=String(code||"").trim();
  var parts=code.split(".");
  if(parts.length!==3)throw new Error("Das sieht nicht wie ein Code aus.");
  if(parts[0]!==PREFIX){
    if(OLD.indexOf(parts[0])>=0)throw new Error("Dieser Code stammt aus einer älteren Version ("+parts[0]+") und passt nicht zu den neuen Karten.");
    throw new Error("Unbekannte Version: "+parts[0]+".");
  }
  var head;
  try{head=JSON.parse(utf8(fromB64(parts[1])));}catch(e){throw new Error("Die Namen im Code lassen sich nicht lesen.");}
  if(!head||typeof head.n!=="string"||typeof head.p!=="string"||!head.n.trim()||!head.p.trim())throw new Error("Im Code fehlen die Namen.");
  var bytes;
  try{bytes=fromB64(parts[2]);}catch(e){throw new Error("Der Code ist beschädigt.");}
  if(bytes.length!==BYTES)throw new Error(bytes.length<BYTES?"Der Code ist unvollständig.":"Der Code ist zu lang.");
  var r=new BitR(bytes),i,self=[],other=[];
  for(i=0;i<N;i++)self.push({value:r.r(1),time:0});
  for(i=0;i<N;i++)other.push({value:r.r(1),time:0});
  for(i=0;i<N;i++)self[i].time=r.r(2);
  for(i=0;i<N;i++)other[i].time=r.r(2);
  return {version:PREFIX,name:head.n,partner:head.p,self:{items:self},other:{items:other}};
}
var RE=new RegExp(PREFIX+"\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+","g");
var RE_OLD=new RegExp("(?:"+OLD.join("|")+")\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+","g");
function findCodes(text){return (String(text||"").match(RE)||[]);}
function findOldCodes(text){return (String(text||"").match(RE_OLD)||[]);}
function decodeAll(text){
  return findCodes(text).map(function(c){
    try{return {ok:true,data:decode(c)};}catch(e){return {ok:false,code:c,error:e.message};}
  });
}
function toText(d,titel){
  var z=[d.name+" über sich und über "+d.partner+" ("+d.version+")"];
  for(var i=0;i<N;i++){
    var t=titel&&titel[i]?titel[i]:"Karte "+(i+1);
    z.push((i+1)+". "+t+": selbst "+"AB"[d.self.items[i].value]+", Tipp über "+d.partner+" "+"AB"[d.other.items[i].value]+
      ", Zeit "+d.self.items[i].time+"/"+d.other.items[i].time);
  }
  return z.join("\n");
}
var api={PREFIX:PREFIX,N:N,BYTES:BYTES,OLD:OLD,decode:decode,decodeAll:decodeAll,findCodes:findCodes,findOldCodes:findOldCodes,toText:toText};
if(typeof module!=="undefined"&&module.exports)module.exports=api;
root.PT17=api;
})(typeof window!=="undefined"?window:this);
