/* PT13-Decoder, Bereich 2. Liest einen Code aus index.html v1.3 und gibt ein lesbares Objekt zurück.
   Unabhängig vom Encoder nach code-format.md geschrieben. Läuft in Node und im Browser. */
(function(root){
"use strict";
var PREFIX="PT13", N_ITEMS=33, N_GED=8, K_INDEX=22;
var BLOCK_OF=[];for(var i=0;i<33;i++)BLOCK_OF.push(i<8?1:i<16?2:i<27?3:4);
var KNOWN=["fast täglich","regelmäßig","selten"];
var ANSWER=["A","B","A (unsicher)","B (unsicher)","kann nicht beurteilen"];
var TIME=["unter 2 s","2 bis 5 s","5 bis 15 s","ab 15 s"];

function b64urlToBytes(s){
  s=s.replace(/-/g,"+").replace(/_/g,"/");
  while(s.length%4)s+="=";
  var bin;
  if(typeof atob==="function")bin=atob(s);
  else bin=Buffer.from(s,"base64").toString("binary");
  var out=new Array(bin.length);
  for(var i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);
  return out;
}
function bytesToUtf8(bytes){
  if(typeof TextDecoder==="function")return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  return Buffer.from(bytes).toString("utf8");
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
  if(parts.length!==4)throw new Error("Erwartet 4 Teile, gefunden "+parts.length);
  if(parts[0]!==PREFIX)throw new Error("Falsches Präfix: "+parts[0]+" (erwartet "+PREFIX+")");
  var type=parts[1];
  if(type!=="S"&&type!=="F")throw new Error("Typ muss S oder F sein: "+type);
  var head;
  try{head=JSON.parse(bytesToUtf8(b64urlToBytes(parts[2])));}catch(e){throw new Error("Header nicht lesbar: "+e.message);}
  ["g","n","t","k"].forEach(function(f){if(!(f in head))throw new Error("Header-Feld fehlt: "+f);});
  var bytes=b64urlToBytes(parts[3]);
  var expect=type==="S"?16:21;
  if(bytes.length!==expect)throw new Error("Nutzdaten: "+bytes.length+" Byte, erwartet "+expect);
  var r=new BitR(bytes), out={
    version:PREFIX, type:type==="S"?"self":"other",
    group:head.g, name:head.n, target:type==="S"?null:head.t,
    known:head.k, knownLabel:(head.k===null||head.k===undefined)?null:(KNOWN[head.k]||("unbekannt: "+head.k)),
    items:[], gedanken:null, warnings:[]
  };
  if(type==="S"){
    if(head.t!=="")out.warnings.push("Selbstcode mit Zielperson im Header: "+head.t);
    var ans=[],ged=[],t=[],i;
    for(i=0;i<N_ITEMS;i++)ans.push(r.read(1));
    for(i=0;i<N_GED;i++)ged.push(r.read(1));
    for(i=0;i<N_ITEMS+N_GED;i++)t.push(r.read(2));
    for(i=0;i<N_ITEMS;i++)out.items.push({index:i,block:BLOCK_OF[i],control:i===K_INDEX,value:ans[i],label:ANSWER[ans[i]],time:t[i],timeLabel:TIME[t[i]]});
    out.gedanken=[];
    for(i=0;i<N_GED;i++)out.gedanken.push({index:i,value:ged[i],label:ANSWER[ged[i]],time:t[N_ITEMS+i],timeLabel:TIME[t[N_ITEMS+i]]});
    var pad=r.read(5);if(pad!==0)out.warnings.push("Füllbits nicht 0");
  }else{
    if(!head.t)out.warnings.push("Fremdcode ohne Zielperson");
    if(head.k===null||head.k===undefined||head.k<0||head.k>2)out.warnings.push("Bekanntheitsgrad fehlt oder ungültig: "+head.k);
    var skipped=0;
    for(var j=0;j<N_ITEMS;j++){
      var a=r.read(3),tk=r.read(2);
      if(a>4)out.warnings.push("Item "+j+": ungültiger Antwortwert "+a);
      var it={index:j,block:BLOCK_OF[j],control:j===K_INDEX,raw:a,
        value:a===4?null:(a&1), unsure:a===2||a===3, skipped:a===4,
        label:ANSWER[a]||("ungültig "+a), time:tk, timeLabel:TIME[tk]};
      if(it.skipped)skipped++;
      out.items.push(it);
    }
    out.skipped=skipped;
    if(skipped>5)out.warnings.push(skipped+" übersprungen, Limit ist 5");
    var pad2=r.read(3);if(pad2!==0)out.warnings.push("Füllbits nicht 0");
  }
  return out;
}

function toText(d){
  var L=[];
  L.push("PT13 "+(d.type==="self"?"Selbstteil":"Fremdteil")+" · Gruppe: "+d.group+" · von: "+d.name+(d.target?" · über: "+d.target+" · kennt: "+d.knownLabel:""));
  d.items.forEach(function(it){
    var num=it.index<K_INDEX?it.index+1:it.index; /* Itemliste zählt K nicht mit */
    L.push((it.control?"K   ":"#"+String(num).padStart(2,"0")+" ")+"B"+it.block+"  "+it.label.padEnd(22)+" "+it.timeLabel);
  });
  if(d.gedanken){L.push("Gedanken:");d.gedanken.forEach(function(g){L.push("G"+(g.index+1)+"   "+g.label.padEnd(22)+" "+g.timeLabel);});}
  if(d.skipped!==undefined)L.push("Übersprungen: "+d.skipped+" von 5");
  if(d.warnings.length)L.push("Hinweise: "+d.warnings.join("; "));
  return L.join("\n");
}

/* Sammeldatei: ein Code pro Zeile, alles ohne PT13-Präfix wird ignoriert */
function decodeAll(text){
  var res=[];
  String(text).split(/\r?\n/).forEach(function(line,n){
    line=line.trim();if(line.indexOf(PREFIX+".")!==0)return;
    try{res.push({line:n+1,ok:true,data:decode(line)});}
    catch(e){res.push({line:n+1,ok:false,error:e.message,code:line});}
  });
  return res;
}

var api={decode:decode,decodeAll:decodeAll,toText:toText};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.PT13=api;
})(typeof window!=="undefined"?window:this);
