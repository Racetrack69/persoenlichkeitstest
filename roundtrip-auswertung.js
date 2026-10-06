/* Round-Trip für die Auswertung (Bereich 3): erzeugt mit dem echten buildCode() aus index.html die Codes zweier
   Personen, schickt sie als WhatsApp-Text durch decoder.js und den Kern von auswertung.html und vergleicht mit den
   Rohantworten. Aufruf: node roundtrip-auswertung.js index.html auswertung.html */
"use strict";
var fs=require("fs"),vm=require("vm"),path=require("path");
var D=require("./decoder.js");
function kern(file){
  var m=fs.readFileSync(file,"utf8").match(/<script id="kern">([\s\S]*?)<\/script>/);
  if(!m)throw new Error("Kern-Script fehlt in "+file);
  var ctx={btoa:btoa,TextEncoder:TextEncoder,JSON:JSON,Math:Math,String:String,Array:Array};vm.createContext(ctx);vm.runInContext(m[1],ctx);return ctx;
}
var K=kern(process.argv[2]||path.join(__dirname,"index.html")).EOK;
var A=kern(process.argv[3]||path.join(__dirname,"auswertung.html")).AUSW;

var fails=0;
function eq(a,b,msg){if(a!==b)throw new Error(msg+": erwartet "+JSON.stringify(b)+", bekommen "+JSON.stringify(a));}
function check(name,fn){try{fn();console.log("ok   "+name);}catch(e){fails++;console.error("FEHL "+name+": "+e.message);}}

check("Version, Blocknamen und Texte gleich index.html",function(){
  eq(A.VERSION,K.VERSION,"Version");
  eq(JSON.stringify(A.BLOCKNAMEN),JSON.stringify(K.BLOCKNAMEN),"Blocknamen");
  eq(A.ITEMS.length,K.ITEMS.length,"Anzahl Items");eq(A.GEDANKEN.length,K.GEDANKEN.length,"Anzahl Gedanken");
  K.ITEMS.forEach(function(it,i){["b","t","qs","qo","a","z","ao","zo","g"].forEach(function(f){eq(A.ITEMS[i][f],it[f],"Item "+(i+1)+" "+f);});});
  K.GEDANKEN.forEach(function(g,i){["t","q","a","z","g"].forEach(function(f){eq(A.GEDANKEN[i][f],g[f],"G"+(i+1)+" "+f);});});
  /* Name und Pronomen: kein Platzhalter darf übrig bleiben, Ich- und Du-Fassung haben keine */
  K.ITEMS.forEach(function(it,i){
    ["qo","ao","zo"].forEach(function(f){["er","sie"].forEach(function(p){var t=K.fill(it[f],"Lea",p);if(/[{}]/.test(t))throw new Error("Platzhalter übrig in "+(i+1)+" "+f+" ("+p+"): "+t);});});
    ["qs","a","z","g"].forEach(function(f){if(/[{}]/.test(it[f]))throw new Error("Platzhalter in "+(i+1)+" "+f);});
    if(it.qo.indexOf("{n}")<0)throw new Error("Frage "+(i+1)+" über die andere Person ohne Namen");
  });
});

function bit(){return Math.random()<.5?0:1;}
function person(me,partner){
  var skips=0,S={me:me,partner:partner,self:{ans:[],ged:[],t:[]},other:{ans:[],t:[]}};
  for(var i=0;i<K.N;i++){
    S.self.ans.push(bit());S.self.t.push(3000);S.other.t.push(3000);
    if(Math.random()<.1&&skips<K.MAX_SKIP){skips++;S.other.ans.push({v:null,u:false,s:true});}
    else S.other.ans.push({v:bit(),u:Math.random()<.3,s:false});
  }
  for(var j=0;j<K.NG;j++){S.self.ged.push(bit());S.self.t.push(3000);}
  return S;
}
function wa(from,to,code){return "[05.10., 20:14] "+from+": Entweder Oder: mein Code für dich, "+to+".\n\n"+code+"\n\nZum Auswerten: https://example.org/auswertung.html";}

check("1000 Paare: Paarfindung, Treffer, Blöcke, Highlights, Projektion, Gleichheit, Gedanken",function(){
  for(var n=0;n<1000;n++){
    /* Schreibweisen weichen bewusst ab: Groß/klein, Leerzeichen, Umlaute, Apostroph */
    var SA=person("Zoë","o'neil "), SB=person("O'Neil","zoë");
    var cA=K.buildCode(SA), cB=K.buildCode(SB), cX=K.buildCode(person("Max","Moritz"));
    var text=wa("O'Neil","Zoë",cB)+"\n"+cX+"\n"+cA+" "+cA;
    var dec=D.decodeAll(text).map(function(r){if(!r.ok)throw new Error(r.error);return r.data;});
    eq(dec.length,4,"Codes gefunden");
    var list=A.sammle(dec);eq(list.length,3,"Dublette zusammengeführt");
    var p=A.findePaar(list,"zoë");
    if(!p)throw new Error("Paar nicht gefunden");
    eq(A.norm(p.a.name),"zoë","ich zuerst");eq(A.norm(p.b.name),"o'neil","Partner");
    var vA=A.vergleiche(p.a,p.b), vB=A.vergleiche(p.b,p.a);
    [[SA,SB,vA],[SB,SA,vB]].forEach(function(x){
      var ueber=x[0],tipper=x[1],v=x[2],exp=[0,0,0,0].map(function(){return {t:0,g:0,o:0};}),sd=0,ur=0;
      for(var i=0;i<K.N;i++){
        var a=tipper.other.ans[i],s=ueber.self.ans[i],it=v.items[i];
        eq(it.selbst,s,"selbst "+i);eq(it.offen,a.s,"offen "+i);eq(it.tipp,a.s?null:a.v,"tipp "+i);
        eq(it.treffer,a.s?null:a.v===s,"treffer "+i);eq(it.unsicher,!a.s&&a.u,"unsicher "+i);
        var E=exp[K.ITEMS[i].b-1];
        if(a.s)E.o++;else{E.g++;if(a.v===s)E.t++;if(!a.u&&a.v!==s)sd++;if(a.u&&a.v===s)ur++;}
      }
      exp.forEach(function(E,b){eq(v.bloecke[b].treffer,E.t,"Block "+(b+1)+" Treffer");eq(v.bloecke[b].gezaehlt,E.g,"Block "+(b+1)+" gezählt");eq(v.bloecke[b].offen,E.o,"Block "+(b+1)+" offen");});
      eq(v.bloecke.reduce(function(s,B){return s+B.gezaehlt+B.offen;},0),K.N,"alle Fragen gezählt");
      var h=A.highlights(v);eq(h.sicherDaneben.length,sd,"sicher daneben");eq(h.unsicherRichtig.length,ur,"unsicher richtig");
    });
    var prA=A.projektion(p.a),kA=K.projection(SA);eq(prA.prozent,kA.prozent,"Projektion A wie App");eq(prA.gesamt,kA.gesamt,"Projektion A Nenner");
    var prB=A.projektion(p.b),kB=K.projection(SB);eq(prB.prozent,kB.prozent,"Projektion B wie App");
    var g=A.gleichheit(p.a,p.b),same=0;for(var i=0;i<K.N;i++)if(SA.self.ans[i]===SB.self.ans[i])same++;
    eq(g.reduce(function(s,B){return s+B.gleich;},0),same,"Gleichheit");
    eq(g.map(function(B){return B.gesamt;}).join(","),"6,6,6,6","Blockgrößen");
    var bd=A.beideDaneben(vA,vB),bdExp=0;for(var k=0;k<K.N;k++)if(vA.items[k].treffer===false&&vB.items[k].treffer===false)bdExp++;eq(bd.length,bdExp,"beide daneben");
    for(var j=0;j<K.NG;j++){eq(p.a.self.gedanken[j].value,SA.self.ged[j],"G A "+j);eq(p.b.self.gedanken[j].value,SB.self.ged[j],"G B "+j);}
  }
});

check("Sonderfälle: kein Paar, fremde Namen, Kürzel",function(){
  var c1=K.buildCode(person("Anna","Ben")), c2=K.buildCode(person("Anna","Bea"));
  eq(A.findePaar(A.sammle([D.decode(c1),D.decode(c2)]),"Anna"),null,"Anna/Ben und Anna/Bea sind kein Paar");
  eq(A.findePaar([],""),null,"leer");
  eq(A.kuerzel("Anna","Ben").join(","),"A,B","Kürzel einfach");
  eq(A.kuerzel("Anna","Annika").join(","),"A1,A2","Kürzel bei gleichem Anfang");
  eq(A.kuerzel("Ben","Bea").join(","),"B1,B2","Kürzel Ben/Bea");
  eq(A.kuerzel("Lea","Lukas").join(","),"LE,LU","Kürzel Lea/Lukas");
  var k=A.kuerzel("Anna","Annika");if(k[0]===k[1])throw new Error("Kürzel gleich: "+k);
  k=A.kuerzel("Anna","Andreas");if(k[0]===k[1])throw new Error("Kürzel gleich: "+k);
  k=A.kuerzel("Ömer","özlem");if(k[0]===k[1])throw new Error("Kürzel gleich: "+k);
});

check("Sammlung: Paare über Namen, unvollständige Paare, Konflikte",function(){
  var anna=person("Anna","Ben"), annaT=person("Anna","Thomas"), ben=person("ben ","anna"), tom=person("Thomas","Lea");
  annaT.self=anna.self; /* dieselbe Anna, Teil 1 einmal */
  var codes=[K.buildCode(anna),K.buildCode(annaT),K.buildCode(ben),K.buildCode(tom)];
  var list=A.sammle(codes.map(function(c){return D.decode(c);}));
  var pr=A.paare(list,"Anna");
  eq(pr.length,3,"drei Paare");
  eq(pr[0].ready,true,"Anna und Ben komplett");eq(A.norm(pr[0].nameA),"anna","ich zuerst");eq(A.norm(pr[0].nameB),"ben","Partner");
  eq(pr[0].a.name,"Anna","a ist Annas Code");eq(A.norm(pr[0].b.name),"ben","b ist Bens Code");
  var at=pr.filter(function(x){return A.norm(x.nameB)==="thomas"||A.norm(x.nameA)==="thomas";});
  eq(at.length,2,"Anna/Thomas und Thomas/Lea");at.forEach(function(x){eq(x.ready,false,"unvollständig");});
  eq(A.personen(list),3,"drei Autoren");
  eq(A.konflikte(list).length,0,"kein Konflikt bei gleichem Teil 1");
  var anna2=person("Anna","Max");var l2=A.sammle(codes.concat([K.buildCode(anna2)]).map(function(c){return D.decode(c);}));
  if(A.konflikte(l2).join()!=="Anna"&&A.konflikte(l2).join()!=="")throw new Error("Konflikt falsch: "+A.konflikte(l2));
  /* zwei Annas mit zufällig verschiedenen Antworten: Konflikt muss erkannt werden, sofern sie sich unterscheiden */
  var differ=anna2.self.ans.join("")+anna2.self.ged.join("")!==anna.self.ans.join("")+anna.self.ged.join("");
  eq(A.konflikte(l2).length,differ?1:0,"Konflikt erkannt");
  /* Schlüssel unabhängig davon, wer ich bin */
  eq(A.paare(list,"Ben")[0].key,pr[0].key,"Schlüssel stabil");
});

check("Feedback: Zählungen gegen die Rohdaten",function(){
  var P=[person("Anna","Ben"),person("Ben","Anna"),person("Cleo","Anna"),person("Anna","Cleo")];
  P[3].self=P[0].self;
  P.forEach(function(S){S.self.t=S.self.t.map(function(){return Math.random()<.3?20000:3000;});S.other.t=S.other.t.map(function(){return Math.random()<.3?20000:3000;});});
  var list=A.sammle(P.map(function(S){return D.decode(K.buildCode(S));}));
  var F=A.feedback(list);
  eq(F.codes,4,"Codes");eq(F.personen,3,"Personen");
  var selfs=[P[3],P[1],P[2]]; /* je Person der letzte Code */
  for(var i=0;i<K.N;i++){
    var x=F.items[i],a=0,un=0,off=0,lang=0,tip=0;
    selfs.forEach(function(S){if(S.self.ans[i]===0)a++;if(S.self.t[i]>=15000)lang++;});
    P.forEach(function(S){var o=S.other.ans[i];if(o.s)off++;else{tip++;if(o.u)un++;}if(S.other.t[i]>=15000)lang++;});
    eq(x.a,a,"A "+i);eq(x.b,3-a,"B "+i);eq(x.unsicher,un,"unsicher "+i);eq(x.offen,off,"offen "+i);eq(x.getippt,tip,"getippt "+i);eq(x.lang,lang,"lang "+i);eq(x.karten,7,"karten "+i);
  }
  for(var j=0;j<K.NG;j++){var g=F.gedanken[j],ga=0;selfs.forEach(function(S){if(S.self.ged[j]===0)ga++;});eq(g.a,ga,"G A "+j);eq(g.b,3-ga,"G B "+j);}
});

console.log(fails?fails+" Prüfung(en) fehlgeschlagen":"Round-Trip Auswertung: alles ok");
process.exit(fails?1:0);
