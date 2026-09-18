/* Round-Trip: führt das Original-Script aus index.html in einer Node-VM aus (DOM gestubbt),
   erzeugt mit dem echten buildCode() Codes und prüft sie gegen decoder.js. */
"use strict";
var fs=require("fs"),vm=require("vm"),path=require("path");
var htmlPath=process.argv[2]||path.join(__dirname,"index.html");
var html=fs.readFileSync(htmlPath,"utf8");
var script=html.match(/<script>([\s\S]*)<\/script>/)[1];

/* Minimaler DOM-Stub: alles, was render() beim Start anfasst */
function node(){var n={innerHTML:"",textContent:"",content:"",offsetWidth:0,classList:{add(){},remove(){},toggle(){}},
  querySelectorAll:function(){return[];},querySelector:function(){return null;},dataset:{},
  setAttribute(){},getAttribute(){}};return n;}
var ctx={
  document:{getElementById:function(){return node();},querySelector:function(){return node();},querySelectorAll:function(){return[];},
    addEventListener(){},body:node(),createElement:function(){return node();}},
  window:{matchMedia:null},localStorage:{getItem:function(){return null;},setItem(){},removeItem(){}},
  navigator:{},setTimeout:setTimeout,clearTimeout:clearTimeout,Date:Date,Math:Math,JSON:JSON,Array:Array,String:String,
  btoa:btoa,TextEncoder:TextEncoder,confirm:function(){return true;},console:console
};
vm.createContext(ctx);
vm.runInContext(script,ctx);
vm.runInContext("this.__enc={buildCode:buildCode,setS:function(s){S=s;},getS:function(){return S;},fresh:fresh,N_ITEMS:N_ITEMS,N_GED:N_GED,VERSION:VERSION};",ctx);
var enc=ctx.__enc, PT13=require("./decoder.js");
if(enc.VERSION!=="v1.3")throw new Error("index.html ist nicht v1.3: "+enc.VERSION);

var TIMES=[0,1999,2000,4999,5000,14999,15000,60000,350,7200];
function tcOf(ms){return ms<2000?0:ms<5000?1:ms<15000?2:3;}
function pick(a){return a[Math.floor(Math.random()*a.length)];}
var NAMES=["Anna","Jörg","Großmutter","Maria-Luise","Ömer","Zoë","O'Neil","Björn"];
var GROUPS=["Familie Müller","Skifreunde 2026","Ärztehaus & Co","Straße 7"];

function mkState(type,target,known){
  var S=enc.fresh();S.group=pick(GROUPS);S.name=pick(NAMES);S.edit=false;
  var c={type:type,target:type==="self"?"__self":target,i:0,intro:false,flip:{},self:null,ged:null,ans:null,t:[]};
  var i;
  for(i=0;i<enc.N_ITEMS+enc.N_GED;i++)c.t.push(pick(TIMES));
  if(type==="self"){
    c.self=[];c.ged=[];
    for(i=0;i<enc.N_ITEMS;i++)c.self.push(Math.random()<.5?0:1);
    for(i=0;i<enc.N_GED;i++)c.ged.push(Math.random()<.5?0:1);
  }else{
    S.others=[target];S.known=[known];
    c.ans=[];var skips=0;
    for(i=0;i<enc.N_ITEMS;i++){
      var r=Math.random();
      if(r<.12&&skips<5){c.ans.push({v:null,u:false,s:true});skips++;}
      else c.ans.push({v:Math.random()<.5?0:1,u:Math.random()<.3,s:false});
    }
  }
  S.cur=c;return S;
}
function eq(a,b,msg){if(a!==b)throw new Error(msg+": erwartet "+JSON.stringify(b)+", bekommen "+JSON.stringify(a));}

var n=0,fails=0,sample={};
for(var trial=0;trial<2000;trial++){
  var isSelf=trial%2===0, known=trial%3, target=pick(NAMES);
  var S=mkState(isSelf?"self":"other",target,known);
  enc.setS(S);
  var code=enc.buildCode(),c=S.cur;
  try{
    var d=PT13.decode(code);
    eq(d.group,S.group,"group");eq(d.name,S.name,"name");
    if(isSelf){
      eq(d.type,"self","type");eq(d.target,null,"target");eq(d.known,null,"known");
      for(var i=0;i<enc.N_ITEMS;i++){eq(d.items[i].value,c.self[i],"self item "+i);eq(d.items[i].time,tcOf(c.t[i]),"self time "+i);}
      for(var j=0;j<enc.N_GED;j++){eq(d.gedanken[j].value,c.ged[j],"ged "+j);eq(d.gedanken[j].time,tcOf(c.t[enc.N_ITEMS+j]),"ged time "+j);}
    }else{
      eq(d.type,"other","type");eq(d.target,target,"target");eq(d.known,known,"known");
      for(var k=0;k<enc.N_ITEMS;k++){
        var a=c.ans[k],x=d.items[k];
        eq(x.skipped,a.s,"skipped "+k);
        if(!a.s){eq(x.value,a.v,"value "+k);eq(x.unsure,a.u,"unsure "+k);}else eq(x.value,null,"value(skip) "+k);
        eq(x.time,tcOf(c.t[k]),"time "+k);
      }
    }
    if(d.warnings.length)throw new Error("Warnungen: "+d.warnings.join("; "));
    eq(d.items[22].control,true,"K-Index");
    if(!sample[d.type])sample[d.type]=code;
    n++;
  }catch(e){fails++;if(fails<=5)console.error("FEHLER Trial "+trial+": "+e.message+"\n  "+code);}
}
console.log("Round-Trip: "+n+" Codes ok, "+fails+" Fehler");

var bad=[["PT12.S.e30.AAAA","Präfix"],["PT13.X.e30.AAAA","Typ"],["PT13.S.e30","Teile"],[sample.self.slice(0,-3),"Byte"],[sample.self.replace(".S.",".F."),"Byte"]];
bad.forEach(function(b){try{PT13.decode(b[0]);console.error("Negativfall nicht erkannt: "+b[1]);fails++;}
  catch(e){if(e.message.indexOf(b[1])<0){console.error("Falsche Meldung für "+b[1]+": "+e.message);fails++;}}});

var bulk=["# Gruppe Test",sample.self,"","  "+sample.other+"  ","PT13.S.kaputt.x","WhatsApp-Zeile ohne Code"].join("\n");
var all=PT13.decodeAll(bulk);
eq(all.length,3,"decodeAll Anzahl");eq(all.filter(function(r){return r.ok;}).length,2,"decodeAll ok");
console.log("Negativfälle und Sammeldatei: ok");

console.log("\nBeispiel Selbstcode ("+sample.self.length+" Zeichen):\n"+sample.self);
console.log("\nBeispiel Fremdcode ("+sample.other.length+" Zeichen):\n"+sample.other);
console.log("\n"+PT13.toText(PT13.decode(sample.other)));
process.exit(fails?1:0);
