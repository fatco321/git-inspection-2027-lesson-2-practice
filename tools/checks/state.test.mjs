import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PracticeState, PLAN } from '../../src/practice/PracticeState.ts';
const prepared = () => { const s=new PracticeState();s.found=true;s.inspected=true;for(let i=0;i<3;i++){s.survey(i);s.estimate(i);}assert.equal(s.plan(PLAN.map((_,i)=>i)),'');assert.equal(s.approveBudget(),'');return s; };
test('dependencies prevent work and plans without field estimates',()=>{const s=new PracticeState();assert.ok(s.start(0));s.inspected=true;assert.ok(s.plan(PLAN.map((_,i)=>i)));assert.equal(s.day,0);assert.equal(s.budget,false);});
test('extension is pending until response, not instantly granted',()=>{const s=prepared();assert.equal(s.requestExtension('duration'),'');assert.equal(s.extension,'pending');assert.equal(s.deadline,12);s.advance();assert.equal(s.extension,'approved');assert.equal(s.deadline,20);});
test('wrong photo returns and correct resubmission is accepted',()=>{const s=prepared();s.start(0);while(s.jobs[0].status==='working')s.advance();s.receive(0);s.addPhoto(0,false,'cropped');assert.equal(s.report(0,1,'gos'),'');assert.equal(s.jobs[0].status,'review');s.advance();assert.equal(s.jobs[0].status,'returned');s.addPhoto(0,true,'whole');s.report(0,2,'gos');s.advance();assert.equal(s.jobs[0].status,'accepted');});
test('unsupported channel does not send or advance time',()=>{const s=prepared();s.start(0);while(s.jobs[0].status==='working')s.advance();s.receive(0);s.addPhoto(0,true,'x');const day=s.day;assert.ok(s.report(0,1,'email'));assert.equal(s.day,day);assert.equal(s.jobs[0].status,'ready');});
test('parallel work and staged reporting complete with extension',()=>{const s=prepared();s.requestExtension('duration');for(let i=0;i<3;i++)s.start(i);for(let i=0;i<3;i++){while(s.jobs[i].status==='working')s.advance();s.receive(i);s.addPhoto(i,true,'x');assert.equal(s.report(i,i+1,'gos'),'');}while(!s.complete&&!s.overdue)s.advance();assert.equal(s.complete,true);assert.equal(s.overdue,false);});
test('review after deadline cannot award completion',()=>{const s=prepared();s.jobs[0].status=s.jobs[1].status='accepted';s.jobs[2].status='review';s.jobs[2].validReport=true;s.jobs[2].reviewAt=13;s.day=12;s.advance();assert.equal(s.overdue,true);assert.equal(s.complete,false);});

import { canStand, STATIONS } from '../../src/scenes/courtyard/practiceLayout.ts';
test('all interaction points reachable from spawn without crossing buildings',()=>{
  const step=.2, queue=[[-1.2,4]], visited=new Set();
  const reached=new Set();
  for(let at=0;at<queue.length;at++) {
    const [x,z]=queue[at], key=`${Math.round(x/step)},${Math.round(z/step)}`;
    if(visited.has(key))continue;visited.add(key);
    for(const s of STATIONS)if(Math.hypot(x-s.x,z-s.z)<1.1)reached.add(s.id);
    for(const [dx,dz] of [[step,0],[-step,0],[0,step],[0,-step]])if(canStand(x+dx,z+dz))queue.push([x+dx,z+dz]);
  }
  assert.equal(reached.size,STATIONS.length);
  assert.equal(canStand(-6,-3.3),false);assert.equal(canStand(9.9,0),false);
});

import {canStandInOffice, OFFICE_STATIONS} from '../../src/scenes/administration/administrationLayout.ts';
test('office desk and exit reachable, furniture and walls block walking',()=>{
 const q=[[1.5,1.7]],seen=new Set(),reached=new Set();
 for(let i=0;i<q.length;i++){
  const [x,z]=q[i],key=`${Math.round(x*10)},${Math.round(z*10)}`;
  if(seen.has(key))continue;seen.add(key);
  for(const s of OFFICE_STATIONS)if(Math.hypot(x-s.x,z-s.z)<1.1)reached.add(s.id);
  for(const [dx,dz] of [[.2,0],[-.2,0],[0,.2],[0,-.2]])if(canStandInOffice(x+dx,z+dz))q.push([x+dx,z+dz]);
 }
 assert.equal(reached.size,OFFICE_STATIONS.length);
 assert.equal(canStandInOffice(0,-1.1),false);
 assert.equal(canStandInOffice(-3.05,-1.7),false);
 assert.equal(canStandInOffice(4,0),false);
});

import {canStandInProtection,PROTECTION_STATIONS,CABINET} from '../../src/scenes/protection/protectionLayout.ts';
test('protection room cabinet and exit reachable, furniture blocks walking',()=>{
 const q=[[1.5,1.7]],seen=new Set(),reached=new Set();
 for(let i=0;i<q.length;i++){
  const [x,z]=q[i],key=`${Math.round(x*10)},${Math.round(z*10)}`;
  if(seen.has(key))continue;seen.add(key);
  for(const s of PROTECTION_STATIONS)if(Math.hypot(x-s.x,z-s.z)<1.1)reached.add(s.id);
  for(const [dx,dz] of [[.2,0],[-.2,0],[0,.2],[0,-.2]])if(canStandInProtection(x+dx,z+dz))q.push([x+dx,z+dz]);
 }
 assert.equal(reached.size,PROTECTION_STATIONS.length);
 assert.equal(canStandInProtection(CABINET.x,CABINET.z),false);
 assert.equal(canStandInProtection(-3.1,-1.8),false);
 assert.equal(canStandInProtection(4,0),false);
 assert.equal(STATIONS.some(s=>s.id==='task1'),false);
 assert.equal(STATIONS.some(s=>s.id==='enter-protection'),true);
});

import {interactionDistance} from '../../src/scenes/courtyard/practiceLayout.ts';
test('warehouse passage responds from both sides and front, but not at a distance',()=>{
 const passage=STATIONS.find(s=>s.id==='task2');
 for(const [x,z] of [[3.95,.15],[7.45,.4],[5.7,1.25]]){
  assert.equal(canStand(x,z),true);
  assert.ok(interactionDistance(passage,x,z)<1.18);
 }
 assert.ok(interactionDistance(passage,5.7,3)>1.18);
 const terminal=STATIONS.find(s=>s.id==='terminal');
 assert.equal(interactionDistance(terminal,terminal.x,terminal.z),0);
 assert.ok(interactionDistance(terminal,terminal.x+2,terminal.z)>1.18);
});

test('all estimates require local surveys, partial plan cannot start, collection costs no days',()=>{
 const s=new PracticeState();assert.ok(s.survey(0));assert.ok(s.estimate(0));s.inspected=true;
 for(const i of [2,0]){assert.equal(s.survey(i),'');assert.equal(s.estimate(i),'');}
 assert.ok(s.plan(PLAN.map((_,i)=>i)));assert.ok(s.approveBudget());assert.equal(s.day,0);assert.equal(s.estimatesComplete,false);
 s.survey(1);s.estimate(1);assert.equal(s.estimatesComplete,true);assert.equal(s.day,0);assert.equal(s.plan(PLAN.map((_,i)=>i)),'');assert.equal(s.day,1);
});
test('finished work requires local acceptance before photographs or reporting',()=>{
 const s=prepared();assert.ok(s.receive(0));s.start(0);assert.ok(s.receive(0));while(s.jobs[0].status==='working')s.advance();
 const day=s.day;s.addPhoto(0,true,'too-early');assert.equal(s.photos.length,0);assert.ok(s.report(0,1,'gos'));
 assert.match(s.hint(),/проверка на месте/);assert.equal(s.receive(0),'');assert.equal(s.day,day);
 s.addPhoto(0,true,'accepted');assert.equal(s.photos.length,1);assert.equal(s.report(0,1,'gos'),'');
});

test('plan ordering rejects duplicates and wrong sequence without advancing time',()=>{
 const s=new PracticeState();s.inspected=true;for(let i=0;i<3;i++){s.survey(i);s.estimate(i);}
 assert.ok(s.plan([1,0,2,3,4,5,6]));assert.ok(s.plan([0,1,2,3,4,5,5]));assert.ok(s.plan([0,1]));assert.equal(s.day,0);assert.equal(s.planned,false);
 const order=PLAN.map((_,i)=>i);assert.equal(s.plan(order),'');order.pop();assert.equal(s.planDraft.length,7);assert.equal(s.day,1);
});
test('plan tracks receipt, photos, returned reports and optional extension independently',()=>{
 const s=prepared();assert.equal(s.planProgress()[0].done,true);assert.equal(s.planProgress()[2].done,true);assert.equal(s.planProgress()[3].detail,'При необходимости');
 for(let i=0;i<3;i++){s.jobs[i].status='ready';s.receive(i);s.addPhoto(i,true,'photo');}
 assert.equal(s.planProgress()[4].done,true);assert.equal(s.planProgress()[5].done,false);
 s.jobs[0].status='accepted';s.jobs[1].status='review';s.jobs[2].status='returned';
 assert.match(s.planProgress()[5].detail,/2\/3.*исправить: 1/);assert.equal(s.planProgress()[6].done,false);
 s.jobs.forEach(j=>j.status='accepted');assert.equal(s.planProgress()[6].done,true);
});

test('guide follows partial drafts and diagnoses the first misplaced step',()=>{
 const s=new PracticeState();s.found=true;s.inspected=true;for(let i=0;i<3;i++){s.survey(i);s.estimate(i);}
 const empty=s.hint();s.planDraft=[0];const partial=s.hint();assert.notEqual(empty,partial);assert.match(partial,/Последним ты выбрал/);assert.match(partial,/общую последовательность/);
 s.planDraft=[0,2];assert.match(s.hint(),/раньше своей предпосылки/);assert.match(s.hint(),/Согласовать бюджет/);
 s.planDraft=PLAN.map((_,i)=>i);assert.match(s.hint(),/проверить её целиком/);assert.equal(s.day,0);
});
test('guide changes clues with acceptance, photo and inspector response',()=>{
 const s=prepared();s.jobs[0].status='ready';const before=s.hint();s.receive(0);const received=s.hint();assert.notEqual(before,received);s.addPhoto(0,true,'photo');const photo=s.hint();assert.notEqual(received,photo);
 s.jobs[0].status='returned';assert.match(s.hint(),/замечании есть зацепка/);
 s.jobs.forEach(j=>j.status='review');assert.match(s.hint(),/шаг после отправки/);
});
