const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const root={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};
const document={head:{appendChild(){}},getElementById:id=>id==='pantalla'?root:null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({}),addEventListener(){}};
const ctx={document,alert(){ctx.alerted=true},setTimeout(){},setInterval(){},clearInterval(){},scrollTo(){},mvCapPilotUsuario:{perfil:'SUPERVISOR',misFunciones:false}};ctx.window=ctx;vm.createContext(ctx);
const course=fs.readFileSync(__dirname+'/capacitacion_mis_funciones_v460.js','utf8').replace('  function progreso(){',`  window.testCourse={screens:PANTALLAS,show:(p,e=0)=>{paso=p;etapaCierre=e;render()}};\n  function progreso(){`);
vm.runInContext(course,ctx);ctx.mv467AbrirMisFunciones();assert.equal(root.innerHTML,'');assert.equal(ctx.alerted,true);
ctx.mvCapPilotUsuario={perfil:'TECNICO',misFunciones:true};ctx.mv467AbrirMisFunciones();assert.ok(root.innerHTML.includes('Conoce tus funciones'));
const screens=ctx.testCourse.screens;assert.equal(screens.length,10);
for(let i=0;i<screens.length;i++){ctx.testCourse.show(i);assert.ok(root.innerHTML.includes(screens[i].paso));if(screens[i].modo==='secuencia'){assert.ok(!root.innerHTML.includes('data-next'));ctx.testCourse.show(i,screens[i].items.length);assert.ok(root.innerHTML.includes('data-next'))}}
const evalCode=fs.readFileSync(__dirname+'/capacitacion_mis_funciones_evaluacion_v474.js','utf8').replace('  function porcentaje(){',`  window.testEval={questions:PREGUNTAS,score:answers=>{respuestas=answers;finalizar()}};\n  function porcentaje(){`);vm.runInContext(evalCode,ctx);
const questions=ctx.testEval.questions;assert.equal(questions.length,8);ctx.testEval.score(questions.map(q=>q.c));assert.ok(root.innerHTML.includes('100%'));assert.ok(root.innerHTML.includes('8 de 8'));
ctx.testEval.score(questions.map(q=>(q.c+1)%q.o.length));assert.ok(root.innerHTML.includes('0 de 8'));assert.equal((root.innerHTML.match(/Reforzar pregunta/g)||[]).length,8);assert.ok(root.innerHTML.includes('ni se guarda este resultado'));
ctx.mvCapPilotUsuario=null;root.innerHTML='';ctx.mv467AbrirMisFunciones();assert.equal(root.innerHTML,'');
console.log('PASS: role gate; 10 screens; mandatory closure sequence; 8-question grading 100% and 0%; logout blocks course. Minimal DOM simulation, not visual QA.');
