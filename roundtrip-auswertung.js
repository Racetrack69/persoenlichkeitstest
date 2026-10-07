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
var Q=JSON.parse(fs.readFileSync(path.join(__dirname,"fragen.json"),"utf8"));

var fails=0;
function eq(a,b,msg){if(a!==b)throw new Error(msg+": erwartet "+JSON.stringify(b)+", bekommen "+JSON.stringify(a));}
function check(name,fn){try{fn();console.log("ok   "+name);}catch(e){fails++;console.error("FEHL "+name+": "+e.message);}}
function seite(l){return l<2?0:1;}

check("Version, Runden und Texte gleich index.html und fragen.json",function(){
  eq(A.VERSION,K.VERSION,"Version");
  eq(JSON.stringify(A.RUNDEN),JSON.stringify(K.RUNDEN),"Runden");eq(JSON.stringify(K.RUNDEN),JSON.stringify(Q.runden),"Runden fragen.json");
  eq(A.ITEMS.length,K.ITEMS.length,"Anzahl Karten");eq(A.GEDANKEN.length,K.GEDANKEN.length,"Anzahl Gedanken");eq(K.ITEMS.length,Q.items.length,"Anzahl fragen.json");
  K.ITEMS.forEach(function(it,i){["t","qs","qo","a","z","ao","zo","g"].forEach(function(f){eq(A.ITEMS[i][f],it[f],"Karte "+(i+1)+" "+f);eq(Q.items[i][f],it[f],"fragen.json "+(i+1)+" "+f);});});
  K.GEDANKEN.forEach(function(g,i){["t","q","a","z","g"].forEach(function(f){eq(A.GEDANKEN[i][f],g[f],"G"+(i+1)+" "+f);});});
  /* Name und Pronomen: kein Platzhalter darf übrig bleiben, Ich- und Du-Fassung haben keine */
  K.ITEMS.forEach(function(it,i){
    ["qo","ao","zo"].forEach(function(f){["er","sie"].forEach(function(p){var t=K.fill(it[f],"Lea",p);if(/[{}]/.test(t))throw new Error("Platzhalter übrig in "+(i+1)+" "+f+" ("+p+"): "+t);});});
    ["qs","a","z","g"].forEach(function(f){if(/[{}]/.test(it[f]))throw new Error("Platzhalter in "+(i+1)+" "+f);});
    if(it.qo.indexOf("{n}")<0)throw new Error("Karte "+(i+1)+" über die andere Person ohne Namen");
  });
});

function bit(){return Math.random()<.5?0:1;}
function lvl(){return Math.floor(Math.random()*4);}
function person(me,partner){
  var skips=0,S={me:me,partner:partner,self:{ans:[],ged:[],t:[]},other:{ans:[],t:[]}};
  for(var i=0;i<K.N;i++){
    S.self.ans.push(lvl());S.self.t.push(3000);S.other.t.push(3000);
    if(Math.random()<.1&&skips<K.MAX_SKIP){skips++;S.other.ans.push({v:null,s:true});}
    else S.other.ans.push({v:lvl(),s:false});
  }
  for(var j=0;j<K.NG;j++){S.self.ged.push(bit());S.self.t.push(3000);}
  return S;
}
function wa(from,to,code){return "[05.10., 20:14] "+from+": Entweder Oder: mein Code für dich, "+to+".\n\n"+code+"\n\nZum Aufdecken: https://example.org/auswertung.html";}

check("1000 Paare: Paarfindung, gleich/verschieden, Abstand, größte Unterschiede, Projektion, Gleichheit, Gedanken",function(){
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
      var ueber=x[0],tipper=x[1],v=x[2],g=0,z=0,o=0;
      for(var i=0;i<K.N;i++){
        var a=tipper.other.ans[i],s=ueber.self.ans[i],it=v.items[i];
        eq(it.selbst,s,"selbst "+i);eq(it.offen,a.s,"offen "+i);eq(it.tipp,a.s?null:a.v,"tipp "+i);
        eq(it.gleich,a.s?null:seite(a.v)===seite(s),"gleich "+i);eq(it.abstand,a.s?null:Math.abs(a.v-s),"abstand "+i);
        eq(it.gewicht,a.s?0:Math.abs(a.v-s)+(seite(a.v)===seite(s)?0:1),"gewicht "+i);
        if(a.s)o++;else{z++;if(seite(a.v)===seite(s))g++;}
      }
      eq(v.gleich,g,"gleich gezählt");eq(v.gezaehlt,z,"gezählt");eq(v.offen,o,"offen gezählt");eq(z+o,K.N,"alle Karten");
    });
    /* größte Unterschiede: höchstens drei, nur mit verschiedener Seite, absteigend nach Gewicht beider Richtungen */
    var top=A.groessteUnterschiede(vA,vB,3), cand=[];
    for(var i=0;i<K.N;i++){if(vA.items[i].gleich===false||vB.items[i].gleich===false)cand.push(vA.items[i].gewicht+vB.items[i].gewicht);}
    eq(top.length,Math.min(3,cand.length),"Anzahl Top");
    cand.sort(function(a,b){return b-a;});
    top.forEach(function(i,k){eq(vA.items[i].gewicht+vB.items[i].gewicht,cand[k],"Top "+(k+1)+" Gewicht");
      if(vA.items[i].gleich!==false&&vB.items[i].gleich!==false)throw new Error("Top ohne verschiedene Seite");});
    var prA=A.projektion(p.a),kA=K.projection(SA);eq(prA.prozent,kA.prozent,"Projektion A wie App");eq(prA.gesamt,kA.gesamt,"Projektion A Nenner");
    var prB=A.projektion(p.b),kB=K.projection(SB);eq(prB.prozent,kB.prozent,"Projektion B wie App");
    var gl=A.gleichheit(p.a,p.b),same=0;for(var k=0;k<K.N;k++)if(seite(SA.self.ans[k])===seite(SB.self.ans[k]))same++;
    eq(gl.gleich,same,"Gleichheit");eq(gl.gleich+gl.verschieden.length,K.N,"Gleichheit vollständig");
    var bd=A.beideVerschieden(vA,vB),bdExp=0;for(var q=0;q<K.N;q++)if(vA.items[q].gleich===false&&vB.items[q].gleich===false)bdExp++;eq(bd.length,bdExp,"beide verschieden");
    for(var j=0;j<K.NG;j++){eq(p.a.self.gedanken[j].value,SA.self.ged[j],"G A "+j);eq(p.b.self.gedanken[j].value,SB.self.ged[j],"G B "+j);}
  }
});

check("Größte Unterschiede: feste Beispiele",function(){
  var SA=person("Anna","Ben"),SB=person("Ben","Anna");
  for(var i=0;i<K.N;i++){SA.self.ans[i]=0;SB.self.ans[i]=0;SA.other.ans[i]={v:0,s:false};SB.other.ans[i]={v:0,s:false};}
  var a=D.decode(K.buildCode(SA)),b=D.decode(K.buildCode(SB));
  eq(A.groessteUnterschiede(A.vergleiche(a,b),A.vergleiche(b,a),3).length,0,"alles gleich: keine Top-Karten");
  SB.other.ans[5]={v:3,s:false};   /* Ben sieht Anna bei Karte 6 ganz klar B, Anna sich ganz klar A: Gewicht 4 */
  SB.other.ans[9]={v:2,s:false};   /* eher B: Gewicht 3 */
  SA.other.ans[9]={v:2,s:false};   /* Karte 10 in beide Richtungen: 3 + 3 = 6 */
  SB.other.ans[12]={v:1,s:false};  /* gleiche Seite, nur „eher“: kein Top */
  SA.other.ans[20]={v:2,s:false};  /* Gewicht 3 */
  a=D.decode(K.buildCode(SA));b=D.decode(K.buildCode(SB));
  var vA=A.vergleiche(a,b),vB=A.vergleiche(b,a);
  eq(A.groessteUnterschiede(vA,vB,3).join(","),"9,5,20","Reihenfolge der Top-Karten");
  eq(vA.items[12].gleich,true,"eher A gegen ganz klar A ist gleich");eq(vA.items[12].abstand,1,"Abstand 1");
  eq(A.antwort(A.ITEMS[0],1),"eher „"+A.ITEMS[0].a.replace(/\.$/,"")+"“","Antworttext ohne Schlusspunkt");eq(A.antwort(A.ITEMS[0],3),"ganz klar „"+A.ITEMS[0].z.replace(/\.$/,"")+"“","Antworttext B");
});

check("Sonderfälle: kein Paar, fremde Namen, Kürzel",function(){
  var c1=K.buildCode(person("Anna","Ben")), c2=K.buildCode(person("Anna","Bea"));
  eq(A.findePaar(A.sammle([D.decode(c1),D.decode(c2)]),"Anna"),null,"Anna/Ben und Anna/Bea sind kein Paar");
  eq(A.findePaar([],""),null,"leer");
  eq(A.kuerzel("Anna","Ben").join(","),"A,B","Kürzel einfach");
  eq(A.kuerzel("Anna","Annika").join(","),"A1,A2","Kürzel bei gleichem Anfang");
  eq(A.kuerzel("Ben","Bea").join(","),"B1,B2","Kürzel Ben/Bea");
  eq(A.kuerzel("Lea","Lukas").join(","),"LE,LU","Kürzel Lea/Lukas");
  var k=A.kuerzel("Ömer","özlem");if(k[0]===k[1])throw new Error("Kürzel gleich: "+k);
});

check("Sammlung: Paare über Namen, unvollständige Paare, Konflikte",function(){
  var anna=person("Anna","Ben"), annaT=person("Anna","Thomas"), ben=person("ben ","anna"), tom=person("Thomas","Lea");
  annaT.self=anna.self; /* dieselbe Anna, Teil 1 einmal */
  var codes=[K.buildCode(anna),K.buildCode(annaT),K.buildCode(ben),K.buildCode(tom)];
  var list=A.sammle(codes.map(function(c){return D.decode(c);}));
  var pr=A.paare(list,"Anna");
  eq(pr.length,3,"drei Paare");
  eq(pr[0].ready,true,"Anna und Ben komplett");eq(A.norm(pr[0].nameA),"anna","ich zuerst");eq(A.norm(pr[0].nameB),"ben","Partner");
  var at=pr.filter(function(x){return A.norm(x.nameB)==="thomas"||A.norm(x.nameA)==="thomas";});
  eq(at.length,2,"Anna/Thomas und Thomas/Lea");at.forEach(function(x){eq(x.ready,false,"unvollständig");});
  eq(A.personen(list),3,"drei Autoren");
  eq(A.konflikte(list).length,0,"kein Konflikt bei gleichem Teil 1");
  /* gleiche Seite, aber andere Stufe: ist ein anderer Teil 1, also Konflikt */
  var anna2=person("Anna","Max");anna2.self=JSON.parse(JSON.stringify(anna.self));anna2.self.ans[0]=anna.self.ans[0]^1;
  var l2=A.sammle(codes.concat([K.buildCode(anna2)]).map(function(c){return D.decode(c);}));
  eq(A.konflikte(l2).join(),"Anna","Konflikt bei anderer Stufe erkannt");
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
  function eher(l){return l===1||l===2;}
  for(var i=0;i<K.N;i++){
    var x=F.items[i],a=0,es=0,et=0,off=0,lang=0,tip=0;
    selfs.forEach(function(S){if(seite(S.self.ans[i])===0)a++;if(eher(S.self.ans[i]))es++;if(S.self.t[i]>=15000)lang++;});
    P.forEach(function(S){var o=S.other.ans[i];if(o.s)off++;else{tip++;if(eher(o.v))et++;}if(S.other.t[i]>=15000)lang++;});
    eq(x.a,a,"A "+i);eq(x.b,3-a,"B "+i);eq(x.eherSelbst,es,"eher selbst "+i);eq(x.eherTipp,et,"eher Tipp "+i);
    eq(x.offen,off,"offen "+i);eq(x.getippt,tip,"getippt "+i);eq(x.lang,lang,"lang "+i);eq(x.karten,7,"karten "+i);eq(x.antworten,3+tip,"antworten "+i);
  }
  for(var j=0;j<K.NG;j++){var g=F.gedanken[j],ga=0;selfs.forEach(function(S){if(S.self.ged[j]===0)ga++;});eq(g.a,ga,"G A "+j);eq(g.b,3-ga,"G B "+j);}
});

console.log(fails?fails+" Prüfung(en) fehlgeschlagen":"Round-Trip Auswertung: alles ok");
process.exit(fails?1:0);
