/* PT16-Decoder, Bereich 2. Liest einen Code aus index.html v1.6 (ein Code pro Person).
   Nach code-format.md geschrieben, unabhängig vom Encoder. Läuft in Node und im Browser. */
(function(root){
"use strict";
var PREFIX="PT16", N=24, NG=6, BYTES=30, PAD=6;
var STUFE=["ganz klar A","eher A","eher B","ganz klar B"];
var GED=["A","B"];
var TIME=["unter 2 s","2 bis 5 s","5 bis 15 s","ab 15 s"];

function b64urlToBytes(s){
  if(!/^[A-Za-z0-9_-]*$/.test(s))throw new Error("Unerlaubte Zeichen");
  s=s.replace(/-/g,"+").replace(/_/g,"/");while(s.length%4)s+="=";
  var bin=typeof atob==="function"?atob(s):Buffer.from(s,"base64").toString("binary");
  var out=new Array(bin.length);for(var i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;
}
function bytesToUtf8(b){
  if(typeof TextDecoder==="function")return new TextDecoder("utf-8").decode(new Uint8Array(b));
  return Buffer.from(b).toString("utf8");
}
function BitR(bytes){this.b=bytes;this.pos=0;}
BitR.prototype.read=function(n){
  var v=0;
  for(var k=0;k<n;k++){
    var byte=this.b[this.pos>>3];
    if(byte===undefined)throw new Error("Nutzdaten zu kurz (Bit "+this.pos+")");
    v=(v<<1)|((byte>>(7-(this.pos&7)))&1);this.pos++;
  }
  return v;
};

/* Stufe 0 bis 3: Seite (value) 0 = A, 1 = B; klar = ganz klar statt eher. */
function decode(code){
  code=String(code).trim();
  var parts=code.split(".");
  if(parts.length!==3)throw new Error("Erwartet 3 Teile, gefunden "+parts.length);
  if(parts[0]!==PREFIX)throw new Error("Falsches Präfix: "+parts[0]+" (erwartet "+PREFIX+")");
  var head;
  try{head=JSON.parse(bytesToUtf8(b64urlToBytes(parts[1])));}catch(e){throw new Error("Header nicht lesbar: "+e.message);}
  if(!head||typeof head.n!=="string"||typeof head.p!=="string")throw new Error("Header-Feld fehlt: n oder p");
  var bytes=b64urlToBytes(parts[2]);
  if(bytes.length!==BYTES)throw new Error("Nutzdaten: "+bytes.length+" Byte, erwartet "+BYTES);
  var r=new BitR(bytes), i, out={version:PREFIX,name:head.n,partner:head.p,self:{items:[],gedanken:[]},other:{items:[],skipped:0},warnings:[]};
  var sv=[],gv=[],ov=[];
  for(i=0;i<N;i++)sv.push(r.read(2));
  for(i=0;i<NG;i++)gv.push(r.read(1));
  for(i=0;i<N;i++)ov.push(r.read(3));
  for(i=0;i<N;i++){var l=sv[i];out.self.items.push({index:i,level:l,value:l<2?0:1,klar:l===0||l===3,label:STUFE[l],time:r.read(2)});}
  for(i=0;i<NG;i++)out.self.gedanken.push({index:i,value:gv[i],label:GED[gv[i]],time:r.read(2)});
  for(i=0;i<N;i++){
    var a=ov[i];
    if(a>4)out.warnings.push("Karte "+(i+1)+": ungültiger Antwortwert "+a);
    var sk=a===4, ok=a<4;
    var it={index:i,raw:a,level:ok?a:null,value:ok?(a<2?0:1):null,klar:ok?(a===0||a===3):null,skipped:sk,
      label:ok?STUFE[a]:sk?"kann nicht beurteilen":"ungültig "+a,time:r.read(2)};
    if(sk)out.other.skipped++;
    out.other.items.push(it);
  }
  out.self.items.forEach(function(it){it.timeLabel=TIME[it.time];});
  out.self.gedanken.forEach(function(it){it.timeLabel=TIME[it.time];});
  out.other.items.forEach(function(it){it.timeLabel=TIME[it.time];});
  if(r.read(PAD)!==0)out.warnings.push("Füllbits nicht 0");
  if(out.other.skipped>4)out.warnings.push(out.other.skipped+" Mal „kann nicht beurteilen“, Limit ist 4");
  return out;
}

function toText(d){
  var L=["PT16 · von: "+d.name+" · über: "+d.partner];
  L.push("Nr  über sich      über "+d.partner);
  for(var i=0;i<N;i++){
    var s=d.self.items[i],o=d.other.items[i];
    L.push(String(i+1).padStart(2,"0")+"  "+s.label.padEnd(14)+" "+o.label);
  }
  L.push("Gedanken: "+d.self.gedanken.map(function(g){return "G"+(g.index+1)+" "+g.label;}).join(", "));
  if(d.warnings.length)L.push("Hinweise: "+d.warnings.join("; "));
  return L.join("\n");
}

/* Findet alle PT16-Codes in beliebigem Text, etwa in kopierten WhatsApp-Nachrichten. */
function findCodes(text){return String(text).match(/PT16\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[];}
/* Codes aus älteren Versionen (andere Fragen), damit die Auswertung freundlich darauf hinweisen kann. */
function findOldCodes(text){return String(text).match(/PT1[3-5]\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[];}
function decodeAll(text){
  return findCodes(text).map(function(c){
    try{return {ok:true,code:c,data:decode(c)};}catch(e){return {ok:false,code:c,error:e.message};}
  });
}

var api={PREFIX:PREFIX,decode:decode,decodeAll:decodeAll,findCodes:findCodes,findOldCodes:findOldCodes,toText:toText};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.PT16=api;
})(typeof window!=="undefined"?window:this);
