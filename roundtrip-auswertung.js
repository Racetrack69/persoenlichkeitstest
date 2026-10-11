/* Round-Trip für die Auswertung (Bereich 3), v1.7: erzeugt mit dem echten buildCode() aus index.html die Codes zweier
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
var Q=JSON.parse(fs.readFileSync(path.join(__dirname,"fragen.json"),"utf8"));

var fails=0;
function eq(a,b,msg){if(a!==b)throw new Error(msg+": erwartet "+JSON.stringify(b)+", bekommen "+JSON.stringify(a));}
function check(name,fn){try{fn();console.log("ok   "+name);}catch(e){fails++;console.error("FEHL "+name+": "+e.message);}}

check("Version, Blöcke und Texte gleich in index.html, auswertung.html und fragen.json",function(){
  eq(A.VERSION,K.VERSION,"Version");
  eq(JSON.stringify(A.BLOECKE),JSON.stringify(K.BLOECKE),"Blöcke");eq(JSON.stringify(K.BLOECKE),JSON.stringify(Q.bloecke),"Blöcke fragen.json");
  eq(A.N,K.N,"Anzahl Karten");eq(K.N,Q.karten.length,"Anzahl fragen.json");eq(D.N,K.N,"Anzahl decoder.js");
  eq(A.NG,K.NG,"Anzahl Gedankenexperimente");
  K.KARTEN.forEach(function(it,i){
    ["t","qs","qo","a","z","ao","zo","ka","kz","g","gd"].forEach(function(f){eq(A.KARTEN[i][f],it[f],"Karte "+(i+1)+" "+f);});
    ["t","qs","qo","a","z","ao","zo","ka","kz"].forEach(function(f){eq(Q.karten[i][f],it[f],"fragen.json "+(i+1)+" "+f);});
    eq(Q.karten[i].g||"",it.g,"fragen.json "+(i+1)+" g");
    eq(it.gd,Q.karten[i].typ==="gedanke"?1:0,"Typ "+(i+1));
  });
  /* Name und Pronomen: kein Platzhalter darf übrig bleiben, Ich- und Du-Fassung haben keine */
  K.KARTEN.forEach(function(it,i){
    ["qo","ao","zo"].forEach(function(f){["er","sie"].forEach(function(p){var t=K.fill(it[f],"Lea",p);if(/[{}]/.test(t))throw new Error("Platzhalter übrig in "+(i+1)+" "+f+" ("+p+"): "+t);});});
    ["qs","a","z","g"].forEach(function(f){if(/[{}]/.test(it[f]))throw new Error("Platzhalter in "+(i+1)+" "+f);});
    if(!it.gd&&it.qo.indexOf("{n}")<0)throw new Error("Alltagskarte "+(i+1)+" über die andere Person ohne Namen");
  });
});

function bit(){return Math.random()<.5?0:1;}
function person(me,partner){
  var S={me:me,partner:partner,self:{ans:[],t:[]},other:{ans:[],t:[]}};
  for(var i=0;i<K.N;i++){S.self.ans.push(bit());S.other.ans.push(bit());S.self.t.push(3000);S.other.t.push(3000);}
  return S;
}
function wa(from,to,code){return "[11.10., 20:14] "+from+": Entweder oder: mein Code für dich, "+to+".\n\n"+code+"\n\nZum Aufdecken: https://example.org/auswertung.html";}
function dec(c){return D.decode(c);}

check("1000 Paare: Paarfindung, gleich/verschieden, größte Unterschiede, Projektion, Gleichheit",function(){
  for(var n=0;n<1000;n++){
    /* Schreibweisen weichen bewusst ab: Groß/klein, Leerzeichen, Umlaute, Apostroph */
    var SA=person("Zoë","o'neil "), SB=person("O'Neil","zoë");
    var cA=K.buildCode(SA), cB=K.buildCode(SB), cX=K.buildCode(person("Max","Moritz"));
    var text=wa("O'Neil","Zoë",cB)+"\n"+cX+"\n"+cA+" "+cA;
    var list0=D.decodeAll(text).map(function(r){if(!r.ok)throw new Error(r.error);return r.data;});
    eq(list0.length,4,"Codes gefunden");
    var list=A.sammle(list0);eq(list.length,3,"Dublette zusammengeführt");
    var p=A.findePaar(list,"zoë");
    if(!p)throw new Error("Paar nicht gefunden");
    eq(A.norm(p.a.name),"zoë","ich zuerst");eq(A.norm(p.b.name),"o'neil","Partner");
    var vA=A.vergleiche(p.a,p.b), vB=A.vergleiche(p.b,p.a);
    [[SA,SB,vA],[SB,SA,vB]].forEach(function(x){
      var ueber=x[0],tipper=x[1],v=x[2],g=0;
      for(var i=0;i<K.N;i++){
        var t=tipper.other.ans[i],s=ueber.self.ans[i],it=v.items[i];
        eq(it.selbst,s,"selbst "+i);eq(it.tipp,t,"tipp "+i);eq(it.gleich,s===t,"gleich "+i);eq(it.gewicht,s===t?0:1,"gewicht "+i);
        if(s===t)g++;
      }
      eq(v.gleich,g,"gleich gezählt");eq(v.gezaehlt,K.N,"alle Karten");
    });
    /* größte Unterschiede: höchstens drei, nur mit mindestens einer verschiedenen Richtung, zuerst beide verschieden, dann spätere Karte */
    var top=A.groessteUnterschiede(vA,vB,3), cand=[];
    for(var i=0;i<K.N;i++){var w=vA.items[i].gewicht+vB.items[i].gewicht;if(w)cand.push({i:i,w:w});}
    cand.sort(function(a,b){return (b.w-a.w)||(b.i-a.i);});
    eq(top.join(","),cand.slice(0,3).map(function(x){return x.i;}).join(","),"Top-Karten");
    var prA=A.projektion(p.a),kA=K.projection(SA);eq(prA.prozent,kA.prozent,"Projektion A wie App");eq(prA.gleich,kA.gleich,"Projektion A Zähler");
    var prB=A.projektion(p.b),kB=K.projection(SB);eq(prB.prozent,kB.prozent,"Projektion B wie App");
    var gl=A.gleichheit(p.a,p.b),same=0;for(var k=0;k<K.N;k++)if(SA.self.ans[k]===SB.self.ans[k])same++;
    eq(gl.gleich,same,"Gleichheit");eq(gl.gleich+gl.verschieden.length,K.N,"Gleichheit vollständig");
    var bd=A.beideVerschieden(vA,vB),bdExp=0;for(var q=0;q<K.N;q++)if(SB.other.ans[q]!==SA.self.ans[q]&&SA.other.ans[q]!==SB.self.ans[q])bdExp++;eq(bd.length,bdExp,"beide verschieden");
  }
});

check("Größte Unterschiede: feste Beispiele",function(){
  var SA=person("Anna","Ben"),SB=person("Ben","Anna");
  for(var i=0;i<K.N;i++){SA.self.ans[i]=0;SB.self.ans[i]=0;SA.other.ans[i]=0;SB.other.ans[i]=0;}
  var a=dec(K.buildCode(SA)),b=dec(K.buildCode(SB));
  eq(A.groessteUnterschiede(A.vergleiche(a,b),A.vergleiche(b,a),3).length,0,"alles gleich: keine Top-Karten");
  SB.other.ans[5]=1;                  /* Ben sieht Anna bei Karte 6 anders: Gewicht 1 */
  SB.other.ans[9]=1;SA.other.ans[9]=1;/* Karte 10 in beide Richtungen: Gewicht 2 */
  SA.other.ans[3]=1;SB.other.ans[3]=1;/* Karte 4 in beide Richtungen: Gewicht 2, früher als Karte 10 */
  SA.other.ans[20]=1;                 /* Gewicht 1, später als Karte 6 */
  a=dec(K.buildCode(SA));b=dec(K.buildCode(SB));
  var vA=A.vergleiche(a,b),vB=A.vergleiche(b,a);
  eq(A.groessteUnterschiede(vA,vB,3).join(","),"9,3,20","Reihenfolge der Top-Karten");
  eq(A.groessteUnterschiede(vA,vB,9).join(","),"9,3,20,5","alle Kandidaten");
  /* Kurzformen für die Blasen: nach Antwort, ohne Ich und ohne Pronomen */
  A.KARTEN.forEach(function(it,i){
    eq(A.kurz(it,0),it.ka,"Kurzform A "+(i+1));eq(A.kurz(it,1),it.kz,"Kurzform B "+(i+1));
    [it.ka,it.kz].forEach(function(k){
      if(!k||k.length>24)throw new Error("Kurzform leer oder zu lang: "+(i+1)+" "+k);
      if(/(^|[^\wäöüß])(ich|mich|mir|du|dich|dir|er|sie|ihn|ihm|sich)(?![\wäöüß])/i.test(k))throw new Error("Kurzform mit Ich oder Pronomen: "+(i+1)+" "+k);
    });
    if(it.ka===it.kz)throw new Error("Kurzformen A und B gleich: "+(i+1));
  });
  eq(A.kurzantwort(A.KARTEN[0],1),"„"+A.KARTEN[0].kz+"“","Kurzantwort B");
  eq(A.antwort(A.KARTEN[0],0),"„Herrlich“","Zitat-Karte ohne doppelte Anführungszeichen und Schlusspunkt");
  eq(A.antwort(A.KARTEN[1],1),"„Es kommt aufs Konto“","Antworttext ohne Schlusspunkt");
});

check("Sonderfälle: kein Paar, fremde Namen, Kürzel, kaputte Codes",function(){
  var c1=K.buildCode(person("Anna","Ben")), c2=K.buildCode(person("Anna","Bea"));
  eq(A.findePaar(A.sammle([dec(c1),dec(c2)]),"Anna"),null,"Anna/Ben und Anna/Bea sind kein Paar");
  eq(A.findePaar([],""),null,"leer");
  eq(A.kuerzel("Anna","Ben").join(","),"A,B","Kürzel einfach");
  eq(A.kuerzel("Anna","Annika").join(","),"A1,A2","Kürzel bei gleichem Anfang");
  eq(A.kuerzel("Lea","Lukas").join(","),"LE,LU","Kürzel Lea/Lukas");
  var r=D.decodeAll("x "+c1.slice(0,-3)+" y");eq(r.length,1,"abgeschnittener Code gefunden");eq(r[0].ok,false,"abgeschnittener Code abgelehnt");
  eq(D.findOldCodes("PT16.eyJuIjoiQSJ9.AAAA").length,1,"alter Code erkannt");eq(D.findCodes("PT16.eyJuIjoiQSJ9.AAAA").length,0,"alter Code nicht als PT17");
});

check("Sammlung: Paare über Namen, unvollständige Paare, Konflikte",function(){
  var anna=person("Anna","Ben"), annaT=person("Anna","Thomas"), ben=person("ben ","anna"), tom=person("Thomas","Lea");
  annaT.self=anna.self; /* dieselbe Anna, Teil 1 einmal */
  var codes=[K.buildCode(anna),K.buildCode(annaT),K.buildCode(ben),K.buildCode(tom)];
  var list=A.sammle(codes.map(dec));
  var pr=A.paare(list,"Anna");
  eq(pr.length,3,"drei Paare");
  eq(pr[0].ready,true,"Anna und Ben komplett");eq(A.norm(pr[0].nameA),"anna","ich zuerst");eq(A.norm(pr[0].nameB),"ben","Partner");
  var at=pr.filter(function(x){return A.norm(x.nameB)==="thomas"||A.norm(x.nameA)==="thomas";});
  eq(at.length,2,"Anna/Thomas und Thomas/Lea");at.forEach(function(x){eq(x.ready,false,"unvollständig");});
  eq(A.personen(list),3,"drei Autoren");
  eq(A.konflikte(list).length,0,"kein Konflikt bei gleichem Teil 1");
  var anna2=person("Anna","Max");anna2.self=JSON.parse(JSON.stringify(anna.self));anna2.self.ans[0]=anna.self.ans[0]^1;
  var l2=A.sammle(codes.concat([K.buildCode(anna2)]).map(dec));
  eq(A.konflikte(l2).join(),"Anna","Konflikt bei anderer Antwort erkannt");
  eq(A.paare(list,"Ben")[0].key,pr[0].key,"Schlüssel stabil");
});

check("Feedback: Zählungen gegen die Rohdaten",function(){
  var P=[person("Anna","Ben"),person("Ben","Anna"),person("Cleo","Anna"),person("Anna","Cleo"),person("Dana","Erik")];
  P[3].self=P[0].self;
  P.forEach(function(S){S.self.t=S.self.t.map(function(){return Math.random()<.3?20000:3000;});S.other.t=S.other.t.map(function(){return Math.random()<.3?20000:3000;});});
  var list=A.sammle(P.map(function(S){return dec(K.buildCode(S));}));
  var F=A.feedback(list);
  eq(F.codes,5,"Codes");eq(F.personen,4,"Personen");
  var selfs={anna:P[3],ben:P[1],cleo:P[2],dana:P[4]}; /* je Person der letzte Code */
  for(var i=0;i<K.N;i++){
    var x=F.items[i],a=0,lang=0,paare=0,richtig=0;
    Object.keys(selfs).forEach(function(k){var S=selfs[k];if(S.self.ans[i]===0)a++;if(S.self.t[i]>=15000)lang++;});
    P.forEach(function(S){
      var z=selfs[S.partner.toLowerCase()];
      if(z){paare++;if(S.other.ans[i]===z.self.ans[i])richtig++;}
      if(S.other.t[i]>=15000)lang++;
    });
    eq(x.a,a,"A "+i);eq(x.b,4-a,"B "+i);eq(x.lang,lang,"lang "+i);eq(x.karten,9,"karten "+i);
    eq(x.paare,paare,"Tipps mit bekanntem Ziel "+i);eq(x.richtig,richtig,"richtig "+i);eq(x.paare,4,"Erik fehlt, also 4 "+i);
    eq(x.gd,!!K.KARTEN[i].gd,"Typ "+i);
  }
});

console.log(fails?fails+" Prüfung(en) fehlgeschlagen":"Round-Trip Auswertung: alles ok");
process.exit(fails?1:0);
