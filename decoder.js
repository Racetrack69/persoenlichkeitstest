/* PT15-Decoder, Bereich 2. Liest einen Code aus index.html v1.5 (ein Code pro Person).
   Nach code-format.md geschrieben, unabhängig vom Encoder. Läuft in Node und im Browser. */
(function(root){
"use strict";
var PREFIX="PT15", N=24, NG=6, BYTES=27, PAD=6;
var BLOCK_OF=[];for(var i=0;i<N;i++)BLOCK_OF.push(i<6?1:i<12?2:i<18?3:4);
var ANSWER=["A","B","A (unsicher)","B (unsicher)","kann nicht beurteilen"];
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
  for(i=0;i<N;i++)sv.push(r.read(1));
  for(i=0;i<NG;i++)gv.push(r.read(1));
  for(i=0;i<N;i++)ov.push(r.read(3));
  for(i=0;i<N;i++)out.self.items.push({index:i,block:BLOCK_OF[i],value:sv[i],label:ANSWER[sv[i]],time:r.read(2)});
  for(i=0;i<NG;i++)out.self.gedanken.push({index:i,value:gv[i],label:ANSWER[gv[i]],time:r.read(2)});
  for(i=0;i<N;i++){
    var a=ov[i];
    if(a>4)out.warnings.push("Frage "+(i+1)+": ungültiger Antwortwert "+a);
    var it={index:i,block:BLOCK_OF[i],raw:a,value:a>=4?null:(a&1),unsure:a===2||a===3,skipped:a===4,label:ANSWER[a]||("ungültig "+a),time:r.read(2)};
    if(it.skipped)out.other.skipped++;
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
  var L=["PT15 · von: "+d.name+" · über: "+d.partner];
  L.push("Nr  Block  über sich        über "+d.partner);
  for(var i=0;i<N;i++){
    var s=d.self.items[i],o=d.other.items[i];
    L.push(String(i+1).padStart(2,"0")+"  B"+s.block+"     "+s.label.padEnd(16)+" "+o.label);
  }
  L.push("Gedanken: "+d.self.gedanken.map(function(g){return "G"+(g.index+1)+" "+g.label;}).join(", "));
  if(d.warnings.length)L.push("Hinweise: "+d.warnings.join("; "));
  return L.join("\n");
}

/* Findet alle PT15-Codes in beliebigem Text, etwa in kopierten WhatsApp-Nachrichten. */
function findCodes(text){return String(text).match(/PT15\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)||[];}
function decodeAll(text){
  return findCodes(text).map(function(c){
    try{return {ok:true,code:c,data:decode(c)};}catch(e){return {ok:false,code:c,error:e.message};}
  });
}

var api={PREFIX:PREFIX,decode:decode,decodeAll:decodeAll,findCodes:findCodes,toText:toText};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.PT15=api;
})(typeof window!=="undefined"?window:this);
