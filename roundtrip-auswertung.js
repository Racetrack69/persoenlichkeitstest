/* Round-Trip für die Auswertung (Bereich 3): erzeugt mit dem echten buildCode() aus index.html die vier Codes
   eines Paars, schickt sie als WhatsApp-Text durch den Kern von auswertung.html und vergleicht mit den Rohantworten.
   Aufruf: node roundtrip-auswertung.js index.html auswertung.html */
"use strict";
var fs=require("fs"),vm=require("vm"),path=require("path");
var idxPath=process.argv[2]||path.join(__dirname,"index.html"), ausPath=process.argv[3]||path.join(__dirname,"auswertung.html");
var PT13=require("./decoder.js");

/* Encoder aus index.html, DOM gestubbt (wie roundtrip.js) */
function node(){return {innerHTML:"",textContent:"",content:"",offsetWidth:0,classList:{add(){},remove(){},toggle(){}},
  querySelectorAll:function(){return[];},querySelector:function(){return null;},dataset:{},setAttribute(){},getAttribute(){}};}
var ctx={document:{getElementById:function(){return node();},querySelector:function(){return node();},querySelectorAll:function(){return[];},
    addEventListener(){},body:node(),createElement:function(){return node();}},
  window:{matchMedia:null},localStorage:{getItem:function(){return null;},setItem(){},removeItem(){}},
  navigator:{},setTimeout:setTimeout,clearTimeout:clearTimeout,Date:Date,Math:Math,JSON:JSON,Array:Array,String:String,
  btoa:btoa,TextEncoder:TextEncoder,confirm:function(){return true;},console:console};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(idxPath,"utf8").match(/<script>([\s\S]*)<\/script>/)[1],ctx);
vm.runInContext("this.__enc={buildCode:buildCode,projectionRate:projectionRate,setS:function(s){S=s;},fresh:fresh,ITEMS:ITEMS,GEDANKEN:GEDANKEN,VERSION:VERSION};",ctx);
var enc=ctx.__enc;

/* Kern aus auswertung.html */
var kctx={};vm.createContext(kctx);
vm.runInContext(fs.readFileSync(ausPath,"utf8").match(/<script id="kern">([\s\S]*?)<\/script>/)[1],kctx);
var A=kctx.AUSW;

var fails=0;
function eq(a,b,msg){if(a!==b){throw new Error(msg+": erwartet "+JSON.stringify(b)+", bekommen "+JSON.stringify(a));}}
function check(name,fn){try{fn();console.log("ok   "+name);}catch(e){fails++;console.error("FEHL "+name+": "+e.message);}}

check("Version und Texte gleich index.html",function(){
  eq(A.VERSION,enc.VERSION,"Version");eq(A.ITEMS.length,enc.ITEMS.length,"Anzahl Items");eq(A.GEDANKEN.length,enc.GEDANKEN.length,"Anzahl Gedanken");
  enc.ITEMS.forEach(function(it,i){["b","q","a","z"].forEach(function(f){eq(A.ITEMS[i][f],it[f],"Item "+i+" Feld "+f);});eq(!!A.ITEMS[i].k,!!it.k,"K "+i);});
  enc.GEDANKEN.forEach(function(g,i){["q","a","z"].forEach(function(f){eq(A.GEDANKEN[i][f],g[f],"Gedanke "+i+" Feld "+f);});});
  eq(A.ITEMS[A.K_INDEX].k,true,"K-Index");
});

function rnd(){return Math.random()<.5?0:1;}
function selfState(group,name){
  var S=enc.fresh();S.group=group;S.name=name;S.edit=false;
  S.cur={type:"self",target:"__self",i:0,intro:false,flip:{},self:enc.ITEMS.map(rnd),ged:enc.GEDANKEN.map(rnd),ans:null,t:new Array(41).fill(3000)};
  return S;
}
function otherState(group,name,target,selfRaw){
  var S=enc.fresh();S.group=group;S.name=name;S.edit=false;S.others=[target];S.known=[0];S.selfRaw=selfRaw;
  var skips=0,ans=enc.ITEMS.map(function(){
    if(Math.random()<.1&&skips<5){skips++;return {v:null,u:false,s:true};}
    return {v:rnd(),u:Math.random()<.3,s:false};});
  S.cur={type:"other",target:target,i:0,intro:false,flip:{},self:null,ged:null,ans:ans,t:new Array(41).fill(3000)};
  return S;
}
function wa(group,name,about,code){return "[18.09., 20:14] "+name+": Entweder Oder — "+group+"\n"+name+" über "+about+"\n\n"+code;}

check("500 Paare: Treffer, Blöcke, Highlights, Projektion, Gleichheit",function(){
  for(var trial=0;trial<500;trial++){
    /* Schreibweisen weichen bewusst ab: Groß/klein, Leerzeichen, Umlaute, Apostroph */
    var sA=selfState("Wir zwei","Zoë"), sB=selfState("wir  zwei ","O'Neil");
    enc.setS(sA);var cSA=enc.buildCode();enc.setS(sB);var cSB=enc.buildCode();
    var fA=otherState("Wir zwei","Zoë"," o'neil",sA.cur.self), fB=otherState("WIR ZWEI","O'Neil","zoë",sB.cur.self);
    enc.setS(fA);var cFA=enc.buildCode(),projA=enc.projectionRate();
    enc.setS(fB);var cFB=enc.buildCode(),projB=enc.projectionRate();
    var fremd=selfState("Andere Gruppe","Max");enc.setS(fremd);var cX=enc.buildCode();

    var text=[wa("Wir zwei","O'Neil","sich selbst",cSB),wa("Wir zwei","O'Neil","zoë",cFB),cX].join("\n\n")+"\n"+cSA+" "+cFA;
    var found=A.extrahiere(text);eq(found.length,5,"extrahiere");
    var r=A.lies(found,PT13.decode);eq(r.fehler.length,0,"Lesefehler");
    var p=A.findePaar(r.gut,"Zoë");
    eq(p.teile.length,4,"vier Codes im Paar");eq(p.unbenutzt.length,1,"fremde Gruppe aussortiert");
    var zoe=A.norm(p.a.name)==="zoë"?p.a:p.b, on=zoe===p.a?p.b:p.a;
    eq(zoe.selbst.code,cSA,"S Zoë");eq(zoe.tipp.code,cFA,"F Zoë");eq(on.selbst.code,cSB,"S O'Neil");eq(on.tipp.code,cFB,"F O'Neil");

    [[sB.cur.self,fA.cur.ans,on.selbst.data,zoe.tipp.data,zoe.selbst.data,projA],
     [sA.cur.self,fB.cur.ans,zoe.selbst.data,on.tipp.data,on.selbst.data,projB]].forEach(function(x){
      var rawSelf=x[0],rawAns=x[1],v=A.vergleiche(x[2],x[3]),h=A.highlights(v);
      var exp=[0,0,0,0].map(function(){return {t:0,g:0,o:0};}),sd=0,ur=0;
      rawAns.forEach(function(a,i){
        var it=v.items[i];
        eq(it.selbst,rawSelf[i],"selbst "+i);eq(it.offen,a.s,"offen "+i);
        eq(it.tipp,a.s?null:a.v,"tipp "+i);eq(it.treffer,a.s?null:a.v===rawSelf[i],"treffer "+i);
        if(!a.s)eq(it.unsicher,a.u,"unsicher "+i);
        if(enc.ITEMS[i].k)return;
        var E=exp[enc.ITEMS[i].b-1];
        if(a.s)E.o++;else{E.g++;if(a.v===rawSelf[i])E.t++;if(!a.u&&a.v!==rawSelf[i])sd++;if(a.u&&a.v===rawSelf[i])ur++;}
      });
      exp.forEach(function(E,b){eq(v.bloecke[b].treffer,E.t,"Block "+(b+1)+" Treffer");eq(v.bloecke[b].gezaehlt,E.g,"Block "+(b+1)+" gezählt");eq(v.bloecke[b].offen,E.o,"Block "+(b+1)+" offen");});
      eq(v.bloecke.reduce(function(s,B){return s+B.gezaehlt+B.offen;},0),32,"32 gezählte Items ohne K");
      eq(h.sicherDaneben.length,sd,"sicher daneben");eq(h.unsicherRichtig.length,ur,"unsicher richtig");
      eq(h.sicherDaneben.indexOf(A.K_INDEX),-1,"K nicht in Highlights");
      var pr=A.projektion(x[4],x[3]);eq(pr?pr.prozent:null,x[5],"Projektionsrate wie in der App");
    });

    var g=A.gleichheit(zoe.selbst.data,on.selbst.data),same=0;
    enc.ITEMS.forEach(function(it,i){if(!it.k&&sA.cur.self[i]===sB.cur.self[i])same++;});
    eq(g.reduce(function(s,B){return s+B.gleich;},0),same,"Gleichheit");
    eq(g.map(function(B){return B.gesamt;}).join(","),"8,8,10,6","Blockgrößen ohne K");
    sA.cur.ged.forEach(function(v,j){eq(zoe.selbst.data.gedanken[j].value,v,"Gedanke "+j);});
  }
});

check("Teilmenge und Dubletten",function(){
  var sA=selfState("G","Anna");enc.setS(sA);var c1=enc.buildCode();
  var p=A.findePaar(A.lies([c1],PT13.decode).gut,"");eq(p.b.name,null,"nur eine Person");eq(p.teile.length,1,"ein Code");
  var sA2=selfState("G","anna");enc.setS(sA2);var c2=enc.buildCode();
  var r=A.lies([c1,c2],PT13.decode);eq(r.gut.length,1,"Dublette zusammengeführt");eq(r.gut[0].code,c2,"letzter gewinnt");
  eq(A.lies(["PT13.S.kaputt.x"],PT13.decode).fehler.length,1,"kaputter Code gemeldet");
  eq(A.findePaar([],""),null,"leer");
});

console.log(fails?fails+" Prüfung(en) fehlgeschlagen":"Round-Trip Auswertung: alles ok");
process.exit(fails?1:0);
